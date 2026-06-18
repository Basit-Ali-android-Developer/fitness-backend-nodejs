const express = require('express');
const bodyParser = require('body-parser');
const errorMiddleware = require('./middleware/errorMiddleware');
const requestLogger = require('./middleware/requestLoggerMiddleware');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const userRoutes = require('./modules/user/userRoutes');
const dietRoutes = require('./modules/diet/dietRoutes');
const mealRoutes = require('./modules/meal/mealRoutes');
const foodRoutes = require('./modules/food/foodRoutes');
const summaryRoutes = require('./modules/dashBoard/summaryRoutes');
const workoutTemplateRoutes = require('./modules/workoutTemplate/workoutTemplateRoutes');
const workoutPlanRoutes = require('./modules/workoutPlan/workoutPlanRoutes');
const workoutTrackingRoutes = require('./modules/workoutTracking/workoutTrackingRoutes');

const app = express();

app.use(helmet());
app.use(cors());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100 // max requests
});
app.use(limiter);

app.use(bodyParser.json());
app.use(requestLogger);

// Mount routes
app.use('/api/users', userRoutes);
app.use('/api/diet', dietRoutes);
app.use('/api/meal', mealRoutes);
app.use('/api/dashboard', summaryRoutes);
app.use('/api/food', foodRoutes);
app.use('/api/workoutTemplate', workoutTemplateRoutes);
app.use('/api/workoutPlan', workoutPlanRoutes);
app.use('/api/workoutTracking', workoutTrackingRoutes);

app.use(errorMiddleware);

module.exports = app;
