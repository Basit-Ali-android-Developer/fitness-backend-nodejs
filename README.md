<h1 align="center">🏋️ Fitness App — Backend</h1>
<p align="center">Modular RESTful backend powering the Fitness mobile app — built with Node.js, Express, and a layered architecture.</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Express.js-000000?style=flat&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/SQL-4169E1?style=flat&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white" />
  <img src="https://img.shields.io/badge/Validation-Joi-orange?style=flat" />
</p>

The API layer for the [Fitness Flutter app](https://github.com/Basit-Ali-android-Developer/fitness-flutter) — handles authentication, user/admin access control, profiles, diets, meals, meal ingredients, meal tracking, workouts, exercises, and progress through structured REST APIs.

---

## 🏗️ Layered Architecture

Clear separation of responsibilities: HTTP handling, business logic, and database operations never mix.

```
Client / Flutter App
        │
        ▼
      Routes
        │
        ▼
    Middleware
        │
        ├── User Authentication
        ├── Admin Authentication
        ├── Async Wrapper
        ├── Request Validation (Joi)
        └── Security (Helmet, Rate Limiting, CORS)
        │
        ▼
    Controllers   — HTTP layer: receive requests, call services, return responses
        │
        ▼
     Services     — Business logic
        │
        ▼
   Repositories   — SQL queries, database interaction
        │
        ▼
    SQL Database
```

- **Controllers** hold no business logic — purely request/response handling
- **Services** contain the actual business logic (e.g. a meal operation: Controller → Meal Service → Meal Repository → Database)
- **Repositories** are the only layer that touches SQL directly

---

## 🔐 Authentication & Authorization

Separate middleware for users and admins, so admin functionality is never reachable through normal user auth:

```
Request → Authentication → User / Admin verification → Authorized? → Controller
```

JWT-based authentication throughout.

---

## 🛡️ Security & Reliability

- **Helmet** — security-related HTTP headers
- **Rate limiting** — protects endpoints from excessive requests/abuse
- **CORS** — controls which clients can reach the API
- **Centralized error handler** — errors from any layer flow into one structured API response format
- **Async wrapper** — wraps async controller operations so rejected promises reach the central error handler without repetitive try/catch blocks

---

## ⚡ Database Design & Optimization

```
Users
 ├── Profiles
 ├── Diets
 │    └── Meals
 │         └── Ingredients
 ├── Workouts
 │    └── Exercises
 └── Tracking / Progress
```

- **Indexing** on frequently searched/filtered columns for query performance
- **Pagination** for large datasets — e.g. `GET /api/meals?page=1&limit=20` — instead of returning full tables
- **Transactions** for multi-record operations (e.g. a meal update touching ingredients + tracking records) — commits only if every step succeeds, rolls back otherwise

---

## ✅ Request Validation

All incoming requests are validated with **Joi** before reaching business logic — invalid requests are rejected early with a proper API error response.

---

## 🏋️ Feature Areas

| Area | Covers |
|---|---|
| 👤 User Management | Registration, authentication, authorization, profile management |
| 🍎 Diet & Nutrition | Diet management, meal management, meal ingredients, nutrition data |
| 🍽️ Meal Tracking | Tracking records, ingredient tracking, related transactional operations |
| 🏋️ Workout System | Workout & exercise management, user-specific workout data |
| 📊 Progress Tracking | Fitness tracking, progress history |
| 👨‍💼 Administration | Separate admin auth, protected admin endpoints and data management |

---

## 🛠️ Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** SQL
- **Authentication:** JWT
- **Validation:** Joi
- **Security:** Helmet, rate limiting, CORS
- **Containerization:** Docker

---

## 🚀 Getting Started

```bash
git clone https://github.com/Basit-Ali-android-Developer/fitness-backend-nodejs.git
cd fitness-backend-nodejs
npm install
```

Create a `.env` file:

```env
DATABASE_URL=your_sql_connection_string
PORT=5000
JWT_SECRET=your_jwt_secret
```

Run locally:

```bash
npm run dev
```

Or with Docker:

```bash
docker compose up --build
```

---

## 📡 API Endpoints

<!-- Replace with your actual routes — grouped by resource. -->

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | User registration |
| POST | `/api/auth/login` | User login |
| GET | `/api/profile` | Get user profile |
| GET | `/api/diets` | List diet plans |
| GET | `/api/meals?page=1&limit=20` | List meals (paginated) |
| GET | `/api/workouts` | List workouts |
| POST | `/api/tracking` | Log fitness progress |
| POST | `/api/admin/login` | Admin login |

---

## 📂 Project Structure

<!-- Replace with your actual folder layout -->
```
src/
 ├─ routes/
 ├─ controllers/
 ├─ services/
 ├─ repositories/
 ├─ middleware/
 ├─ validation/     # Joi schemas
 └─ config/
```

---

<p align="center"><i>Built and maintained by <a href="https://github.com/Basit-Ali-android-Developer">Basit Ali</a></i></p>
