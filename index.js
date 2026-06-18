// Load environment variables as early as possible
require('dotenv').config();

const app = require('./app');
require('./cron/mealCron');

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));