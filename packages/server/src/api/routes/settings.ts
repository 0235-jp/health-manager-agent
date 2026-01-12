import { Router } from 'express';
import { settingsRepository } from '../../db/repositories/settings.js';
import { getScheduler } from '../../scheduler/index.js';
import { asyncHandler } from '../middlewares/async-handler.js';
import { validateBody } from '../middlewares/validation.js';
import { settingsUpdateSchema } from '../validators/schemas.js';

export const settingsRouter = Router();

settingsRouter.get(
  '/',
  asyncHandler((_req, res) => {
    res.json(settingsRepository.getAll());
  })
);

settingsRouter.put(
  '/',
  validateBody(settingsUpdateSchema),
  asyncHandler(async (req, res) => {
    settingsRepository.updateMultiple(req.body);

    // スケジューラー再起動（収集間隔・タイムゾーン変更を反映）
    const scheduler = getScheduler();
    await scheduler.restart();

    res.json(settingsRepository.getAll());
  })
);
