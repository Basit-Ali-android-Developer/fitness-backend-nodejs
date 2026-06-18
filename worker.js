import { httpServerHandler } from "cloudflare:node";
import app from "./app.js";
import { runMealCron } from "./cron/mealCronTask.js";
import { setD1Database } from "./db/connection.js";

// Bind Express to listen internally on port 3000
app.listen(3000);

// Initialize the httpServerHandler bridge on port 3000
const httpHandler = httpServerHandler({ port: 3000 });

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
    return httpHandler.fetch(request, env, ctx);
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
