import { Router } from 'express';
import { settingsRepository } from '../../db/repositories/settings.js';
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
  asyncHandler((req, res) => {
    settingsRepository.updateMultiple(req.body);
    res.json(settingsRepository.getAll());
  })
);
