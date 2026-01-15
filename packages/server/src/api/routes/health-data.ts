import { Router } from 'express';
import type { Request } from 'express';
import { healthDataRepository } from '../../db/repositories/health-data.js';
import { asyncHandler } from '../middlewares/async-handler.js';
import { validateQuery, validateBody } from '../middlewares/validation.js';
import {
  healthDataQuerySchema,
  healthDataCreateSchema,
  type HealthDataQuery,
  type HealthDataCreate,
} from '../validators/schemas.js';

export const healthDataRouter = Router();

const NOT_FOUND_ERROR = { error: { message: 'Health data not found' } };

function parseId(req: Request): number {
  return parseInt(req.params.id, 10);
}

function parseDataTypes(param: unknown): string[] {
  if (Array.isArray(param)) {
    return param as string[];
  }
  if (param) {
    return [param as string];
  }
  return [];
}

healthDataRouter.get(
  '/',
  validateQuery(healthDataQuerySchema),
  asyncHandler((req, res) => {
    const query = req.query as unknown as HealthDataQuery;
    const result = healthDataRepository.findAll(query);
    res.json(result);
  })
);

healthDataRouter.get(
  '/latest',
  asyncHandler((req, res) => {
    const dataTypes = parseDataTypes(req.query.data_types);
    const result = healthDataRepository.getLatest(dataTypes);
    res.json(result);
  })
);

healthDataRouter.get(
  '/trend',
  asyncHandler((req, res) => {
    const dataTypes = parseDataTypes(req.query.data_types);
    const days = parseInt(req.query.days as string, 10) || 7;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = healthDataRepository.analyzeTrend(
      dataTypes,
      startDate.toISOString(),
      endDate.toISOString()
    );
    res.json(result);
  })
);

healthDataRouter.get(
  '/:id',
  asyncHandler((req, res) => {
    const record = healthDataRepository.findById(parseId(req));

    if (!record) {
      res.status(404).json(NOT_FOUND_ERROR);
      return;
    }

    res.json(record);
  })
);

healthDataRouter.post(
  '/',
  validateBody(healthDataCreateSchema),
  asyncHandler((req, res) => {
    const data = req.body as HealthDataCreate;
    // UPSERT: 既存データがある場合は更新、なければ作成
    const record = healthDataRepository.create(data);
    res.status(201).json(record);
  })
);

healthDataRouter.put(
  '/:id',
  validateBody(healthDataCreateSchema.partial()),
  asyncHandler((req, res) => {
    const record = healthDataRepository.update(parseId(req), req.body);

    if (!record) {
      res.status(404).json(NOT_FOUND_ERROR);
      return;
    }

    res.json(record);
  })
);

healthDataRouter.delete(
  '/:id',
  asyncHandler((req, res) => {
    const deleted = healthDataRepository.delete(parseId(req));

    if (!deleted) {
      res.status(404).json(NOT_FOUND_ERROR);
      return;
    }

    res.status(204).send();
  })
);
