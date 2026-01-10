import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { errorHandler } from './api/middlewares/error-handler.js';
import { router } from './api/routes/index.js';

export function createApp(): express.Application {
  const app = express();

  // Middleware
  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json());

  // API Routes
  app.use('/api', router);

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Error handler
  app.use(errorHandler);

  return app;
}
