// Load environment variables as early as possible
import 'dotenv/config.js';

import app from './app.js';
import './cron/mealCron.js';

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));