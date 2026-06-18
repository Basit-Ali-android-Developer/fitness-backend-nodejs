import express from 'express';
import bodyParser from 'body-parser';
import errorMiddleware from './middleware/errorMiddleware.js';
import requestLogger from './middleware/requestLoggerMiddleware.js';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

import userRoutes from './modules/user/userRoutes.js';
import dietRoutes from './modules/diet/dietRoutes.js';
import mealRoutes from './modules/meal/mealRoutes.js';
import foodRoutes from './modules/food/foodRoutes.js';
import summaryRoutes from './modules/dashBoard/summaryRoutes.js';
import workoutTemplateRoutes from './modules/workoutTemplate/workoutTemplateRoutes.js';
import workoutPlanRoutes from './modules/workoutPlan/workoutPlanRoutes.js';
import workoutTrackingRoutes from './modules/workoutTracking/workoutTrackingRoutes.js';

const app = express();

app.use(helmet());
app.use(cors());

const isWorker = typeof globalThis !== 'undefined' && (globalThis.WebSocketPair || process.env.CF_PAGES || process.env.CLOUDFLARE_WORKER);

if (!isWorker) {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 100 // max requests
  });
  app.use(limiter);
}

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

export default app;
