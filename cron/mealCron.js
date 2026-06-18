const cron = require("node-cron");
const { runMealCron } = require("./mealCronTask");

console.log(" FULL DAILY MEAL SYSTEM CRON LOADED");
console.log("SERVER TIME:", new Date().toString());

// Set your time here format min hour  
cron.schedule("06 17 * * *", async () => {
  await runMealCron();
});