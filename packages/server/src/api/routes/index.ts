import { Router } from 'express';
import { healthDataRouter } from './health-data.js';
import { settingsRouter } from './settings.js';

export const router = Router();

router.use('/health-data', healthDataRouter);
router.use('/settings', settingsRouter);
