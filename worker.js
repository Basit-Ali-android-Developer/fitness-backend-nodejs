import { httpServerHandler } from "cloudflare:node";
import app from "./app.js";
import { runMealCron } from "./cron/mealCronTask.js";
import { setD1Database } from "./db/connection.js";
import { bodyMap } from "./utils/bodyMap.js";

import { createServer } from "node:http";

// Initialize the HTTP server with the Express app
const server = createServer(app);

// Initialize the httpServerHandler directly on the server instance
const httpHandler = httpServerHandler(server);

export default {
  async fetch(request, env, ctx) {
    if (env) {
      for (const key in env) {
        if (typeof env[key] === "string") {
          process.env[key] = env[key];
        }
      }
      if (env.DB) {
        setD1Database(env.DB);
      }
    }

    let customRequest = request;
    if (request.method !== "GET" && request.method !== "HEAD") {
      try {
        const bodyText = await request.clone().text();
        const requestId = crypto.randomUUID();
        bodyMap.set(requestId, bodyText);

        const newHeaders = new Headers(request.headers);
        newHeaders.set("x-request-id", requestId);
        customRequest = new Request(request, { headers: newHeaders });
      } catch (err) {
        console.error("Error reading body in worker.js:", err);
      }
    }

    return httpHandler.fetch(customRequest, env, ctx);
  },

  async scheduled(event, env, ctx) {
    console.log("Cloudflare Scheduled Event Triggered:", event.cron);
    if (env) {
      for (const key in env) {
        if (typeof env[key] === "string") {
          process.env[key] = env[key];
        }
      }
      if (env.DB) {
        setD1Database(env.DB);
      }
    }
    await runMealCron();
  }
};
