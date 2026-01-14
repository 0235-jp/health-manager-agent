import { Router } from 'express';
import type { DataTypeQuery } from '../../db/repositories/data-types.js';
import { dataTypesRepository, formatDataTypeRecord } from '../../db/repositories/data-types.js';
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
    // プラグインのデータタイプも含めて取得
    const dataTypes = dataTypesRepository.findAllWithPluginTypes(query);
    res.json({ data: dataTypes.map(formatDataTypeRecord) });
  })
);
