import { httpServerHandler } from "cloudflare:node";
import app from "./app.js";
import { runMealCron } from "./cron/mealCronTask.js";

// Bind Express to listen internally on port 3000
app.listen(3000);

// Initialize the httpServerHandler bridge on port 3000
const httpHandler = httpServerHandler({ port: 3000 });

export default {
  async fetch(request, env, ctx) {
    // Copy Cloudflare env bindings to process.env to ensure Node.js compatibility 
    // for mssql connection settings and JWT secrets
    if (env) {
      for (const key in env) {
        if (typeof env[key] === "string") {
          process.env[key] = env[key];
        }
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
    }
    await runMealCron();
  }
};
