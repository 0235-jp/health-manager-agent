/**
 * カスタムデータタイプAPI
 *
 * 手動入力項目の定義を管理するエンドポイント
 */

import { Router } from 'express';
import type { Request } from 'express';
import { customDataTypesRepository } from '../../db/repositories/custom-data-types.js';
import { asyncHandler } from '../middlewares/async-handler.js';

export const customDataTypesRouter = Router();

const NOT_FOUND_ERROR = { error: { message: 'Custom data type not found' } };
const NAME_EXISTS_ERROR = { error: { message: 'A custom data type with this name already exists' } };

function parseId(req: Request): number {
  return parseInt(req.params.id, 10);
}

/**
 * カスタムデータタイプ一覧取得
 * GET /api/custom-data-types
 */
customDataTypesRouter.get(
  '/',
  asyncHandler((_req, res) => {
    const dataTypes = customDataTypesRepository.findAll();
    res.json({ data: dataTypes });
  })
);

/**
 * 有効なカスタムデータタイプ一覧取得
 * GET /api/custom-data-types/active
 */
customDataTypesRouter.get(
  '/active',
  asyncHandler((_req, res) => {
    const dataTypes = customDataTypesRepository.findActive();
    res.json({ data: dataTypes });
  })
);

/**
 * カスタムデータタイプ個別取得
 * GET /api/custom-data-types/:id
 */
customDataTypesRouter.get(
  '/:id',
  asyncHandler((req, res) => {
    const dataType = customDataTypesRepository.findById(parseId(req));

    if (!dataType) {
      res.status(404).json(NOT_FOUND_ERROR);
      return;
    }

    res.json(dataType);
  })
);

/**
 * カスタムデータタイプ作成
 * POST /api/custom-data-types
 */
customDataTypesRouter.post(
  '/',
  asyncHandler((req, res) => {
    const { name, display_name, unit, notification_interval } = req.body;

    // バリデーション
    if (!name || typeof name !== 'string') {
      res.status(400).json({ error: { message: 'name is required' } });
      return;
    }
    if (!display_name || typeof display_name !== 'string') {
      res.status(400).json({ error: { message: 'display_name is required' } });
      return;
    }

    // 名前の重複チェック
    const existing = customDataTypesRepository.findByName(name);
    if (existing) {
      res.status(409).json(NAME_EXISTS_ERROR);
      return;
    }

    const dataType = customDataTypesRepository.create({
      name,
      display_name,
      unit: unit || undefined,
      notification_interval: notification_interval || 0,
    });

    res.status(201).json(dataType);
  })
);

/**
 * カスタムデータタイプ更新
 * PUT /api/custom-data-types/:id
 */
customDataTypesRouter.put(
  '/:id',
  asyncHandler((req, res) => {
    const { display_name, unit, is_active, notification_interval } = req.body;

    const dataType = customDataTypesRepository.update(parseId(req), {
      display_name,
      unit,
      is_active,
      notification_interval,
    });

    if (!dataType) {
      res.status(404).json(NOT_FOUND_ERROR);
      return;
    }

    res.json(dataType);
  })
);

/**
 * カスタムデータタイプ削除
 * DELETE /api/custom-data-types/:id
 */
customDataTypesRouter.delete(
  '/:id',
  asyncHandler((req, res) => {
    const deleted = customDataTypesRepository.delete(parseId(req));

    if (!deleted) {
      res.status(404).json(NOT_FOUND_ERROR);
      return;
    }

    res.status(204).send();
  })
);

/**
 * カスタムデータタイプの有効/無効切り替え
 * PATCH /api/custom-data-types/:id/toggle
 */
customDataTypesRouter.patch(
  '/:id/toggle',
  asyncHandler((req, res) => {
    const dataType = customDataTypesRepository.toggleActive(parseId(req));

    if (!dataType) {
      res.status(404).json(NOT_FOUND_ERROR);
      return;
    }

    res.json(dataType);
  })
);
