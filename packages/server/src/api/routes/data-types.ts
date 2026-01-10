import { Router } from 'express';
import type { DataTypeQuery } from '../../db/repositories/data-types.js';
import { dataTypesRepository } from '../../db/repositories/data-types.js';
import { asyncHandler } from '../middlewares/async-handler.js';

export const dataTypesRouter = Router();

function buildQuery(params: { category?: unknown; is_standard?: unknown }): DataTypeQuery {
  const query: DataTypeQuery = {};

  if (typeof params.category === 'string') {
    query.category = params.category;
  }

  if (params.is_standard !== undefined) {
    query.is_standard = params.is_standard === 'true';
  }

  return query;
}

dataTypesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = buildQuery(req.query);
    const dataTypes = dataTypesRepository.findAll(query);

    const formattedData = dataTypes.map((dt) => ({
      name: dt.name,
      display_name: dt.display_name,
      category: dt.category,
      unit: dt.unit,
      is_standard: dt.is_standard === 1,
      plugin_name: dt.plugin_name,
    }));

    res.json({ data: formattedData });
  })
);
