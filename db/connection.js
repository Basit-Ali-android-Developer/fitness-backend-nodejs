import 'dotenv/config';

let d1Database = null;

export function setD1Database(db) {
  d1Database = db;
}

export function getD1Database() {
  if (!d1Database) {
    throw new Error("D1 database has not been initialized. Ensure setD1Database(env.DB) is called in the Worker handler.");
  }
  return d1Database;
}

class MockTransaction {
  constructor(pool) {
    this.pool = pool;
  }
  async begin() {
    return Promise.resolve();
  }
  async commit() {
    return Promise.resolve();
  }
  async rollback() {
    return Promise.resolve();
  }
}

class MockRequest {
  constructor(connection) {
    this.connection = connection;
    this.parameters = {};
  }

  input(name, type, value) {
    this.parameters[name] = value;
    return this;
  }

  async query(sqlStr) {
    const db = getD1Database();
    let translatedSql = sqlStr.trim();

    // -- Translate SQL dialects --
    // A. GETDATE() -> CURRENT_TIMESTAMP
    translatedSql = translatedSql.replace(/GETDATE\(\)/gi, 'CURRENT_TIMESTAMP');

    // B. Handle OUTPUT inserted.* / OUTPUT inserted.col by stripping and appending at the end as RETURNING
    let hasOutputInserted = false;
    let returningCols = '';
    translatedSql = translatedSql.replace(/OUTPUT\s+inserted\.(\*|[a-zA-Z0-9_, ]+)/gi, (match, cols) => {
      hasOutputInserted = true;
      returningCols = cols.trim();
      return '';
    });

    // C. OFFSET/FETCH NEXT -> LIMIT/OFFSET
    translatedSql = translatedSql.replace(/OFFSET\s+@([a-zA-Z0-9_]+)\s+ROWS\s+FETCH\s+NEXT\s+@([a-zA-Z0-9_]+)\s+ROWS\s+ONLY/gi, 'LIMIT @$2 OFFSET @$1');
    translatedSql = translatedSql.replace(/OFFSET\s+(\d+)\s+ROWS\s+FETCH\s+NEXT\s+(\d+)\s+ROWS\s+ONLY/gi, 'LIMIT $2 OFFSET $1');

    // D. Convert SELECT TOP 1 -> LIMIT 1
    if (/SELECT\s+TOP\s+1\s+/i.test(translatedSql)) {
      translatedSql = translatedSql.replace(/SELECT\s+TOP\s+1\s+/i, 'SELECT ');
      if (!/LIMIT\s+1/i.test(translatedSql)) {
        translatedSql = translatedSql + ' LIMIT 1';
      }
    }

    // E. Handle SCOPE_IDENTITY()
    let hasScopeIdentity = false;
    if (/SCOPE_IDENTITY/i.test(translatedSql)) {
      hasScopeIdentity = true;
      translatedSql = translatedSql.replace(/;\s*SELECT\s+SCOPE_IDENTITY\(\)\s+AS\s+Id;?/gi, '');
      translatedSql = translatedSql.replace(/SELECT\s+SCOPE_IDENTITY\(\)\s+AS\s+Id;?/gi, '');
      translatedSql = translatedSql.trim();
    }

    // -- Parameter binding --
    const boundValues = [];
    translatedSql = translatedSql.replace(/@([a-zA-Z0-9_]+)/g, (match, pName) => {
      const key = Object.keys(this.parameters).find(k => k.toLowerCase() === pName.toLowerCase());
      if (key !== undefined) {
        boundValues.push(this.parameters[key]);
      } else {
        boundValues.push(null);
      }
      return '?';
    });

    if (hasOutputInserted) {
      translatedSql = translatedSql + ' RETURNING ' + returningCols;
    }

    console.log("Executing D1 SQL:", translatedSql, "with params:", boundValues);

    try {
      const stmt = db.prepare(translatedSql).bind(...boundValues);
      const response = await stmt.all();
      const results = response.results || [];
      const meta = response.meta || {};

      let recordset = results;
      let rowsAffected = [meta.changes || 0];

      if (hasScopeIdentity && recordset.length === 0) {
        recordset = [{ Id: meta.last_row_id }];
      }

      return {
        recordset,
        rowsAffected,
        recordsets: [recordset]
      };
    } catch (err) {
      console.error("D1 Query execution error:", err, "SQL:", translatedSql);
      throw err;
    }
  }
}

class MockPool {
  request() {
    return new MockRequest(this);
  }
}

export const sql = new Proxy({
  Transaction: MockTransaction,
  Request: MockRequest
}, {
  get(target, prop) {
    if (prop in target) {
      return target[prop];
    }
    return Symbol(prop);
  }
});

export const poolPromise = Promise.resolve(new MockPool());