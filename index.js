const express = require('express');
const bodyParser = require('body-parser');
const userRoutes = require('./modules/user/userRoutes');
const dietRoutes = require('./modules/diet/dietRoutes');
const mealRoutes = require('./modules/meal/mealRoutes');
const foodRoutes = require('./modules/food/foodRoutes');
const summaryRoutes = require('./modules/dashBoard/summaryRoutes');
const workoutRoutes = require('./modules/workout/workoutRoutes');





const app = express();
app.use(bodyParser.json());

// Mount routes
app.use('/api/users', userRoutes);
app.use('/api/diet', dietRoutes);
app.use('/api/meal', mealRoutes);
app.use('/api/dashboard', summaryRoutes);
app.use('/api/food', foodRoutes);
app.use('/api/workout', workoutRoutes);


require('./cron/mealCron');


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));