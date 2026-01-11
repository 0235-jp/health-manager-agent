import { Router } from 'express';
import { healthDataRouter } from './health-data.js';
import { settingsRouter } from './settings.js';
import { customInstructionsRouter } from './custom-instructions.js';
import { dataTypesRouter } from './data-types.js';
import { reportsRouter } from './reports.js';
import { pluginsRouter } from './plugins.js';

export const router = Router();

router.use('/health-data', healthDataRouter);
router.use('/settings', settingsRouter);
router.use('/custom-instructions', customInstructionsRouter);
router.use('/data-types', dataTypesRouter);
router.use('/reports', reportsRouter);
router.use('/plugins', pluginsRouter);
