/**
 * Scheduler API Routes
 *
 * - 手動データ収集
 * - 手動日次レポート生成
 * - データ補完
 * - プラグイン収集状態の取得
 */

import { Router } from 'express';
import { getScheduler } from '../../scheduler/index.js';
import { asyncHandler } from '../middlewares/async-handler.js';

export const schedulerRouter = Router();

/**
 * GET /api/scheduler/status
 * プラグインごとの収集状態を取得
 */
schedulerRouter.get(
  '/status',
  asyncHandler((_req, res) => {
    const scheduler = getScheduler();
    const states = scheduler.getPluginStates();

    res.json({
      plugins: states.map((state) => ({
        pluginName: state.plugin_name,
        lastCollectionTime: state.last_collection_time,
        lastSuccessTime: state.last_success_time,
        consecutiveFailures: state.consecutive_failures,
        updatedAt: state.updated_at,
      })),
    });
  })
);

/**
 * POST /api/scheduler/run-collection
 * 手動でデータ収集を実行
 */
schedulerRouter.post(
  '/run-collection',
  asyncHandler(async (_req, res) => {
    const scheduler = getScheduler();
    const result = await scheduler.runDataCollection();

    res.json({
      success: true,
      totalFetched: result.totalFetched,
      inserted: result.inserted,
      skipped: result.skipped,
      plugins: result.pluginResults.map((pr) => ({
        pluginName: pr.pluginName,
        success: pr.success,
        recordCount: pr.data.length,
        errors: pr.errors,
      })),
    });
  })
);

/**
 * POST /api/scheduler/run-daily-report
 * 手動で日次レポートを生成
 */
schedulerRouter.post(
  '/run-daily-report',
  asyncHandler(async (_req, res) => {
    const scheduler = getScheduler();
    await scheduler.runDailyReport();

    res.json({
      success: true,
      message: 'Daily report generated successfully',
    });
  })
);

/**
 * POST /api/scheduler/run-backfill
 * 指定期間のデータ補完を実行
 *
 * Body:
 * - startDate: string (ISO 8601)
 * - endDate: string (ISO 8601)
 * - pluginNames?: string[] (オプション、指定がなければ全プラグイン)
 */
schedulerRouter.post(
  '/run-backfill',
  asyncHandler(async (req, res) => {
    const { startDate, endDate, pluginNames } = req.body as {
      startDate: string;
      endDate: string;
      pluginNames?: string[];
    };

    if (!startDate || !endDate) {
      res.status(400).json({
        error: {
          message: 'startDate and endDate are required',
        },
      });
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      res.status(400).json({
        error: {
          message: 'Invalid date format. Use ISO 8601 format.',
        },
      });
      return;
    }

    if (start > end) {
      res.status(400).json({
        error: {
          message: 'startDate must be before endDate',
        },
      });
      return;
    }

    const scheduler = getScheduler();
    const result = await scheduler.runDataBackfill(start, end, pluginNames);

    res.json({
      success: result.errors.length === 0,
      totalFetched: result.totalFetched,
      inserted: result.inserted,
      skipped: result.skipped,
      errors: result.errors,
    });
  })
);
