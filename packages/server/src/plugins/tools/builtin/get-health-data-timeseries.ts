/**
 * get-health-data-timeseries tool - Query high-frequency timeseries health data
 */

import { healthDataTimeseriesRepository } from '../../../db/repositories/health-data-timeseries.js';
import { settingsRepository } from '../../../db/repositories/settings.js';
import { normalizeToUTC, utcToTimezone, DEFAULT_TIMEZONE } from '../../../utils/datetime.js';
import type { ToolDefinition, ToolResult } from '../interfaces.js';

export const getHealthDataTimeseriesTool: ToolDefinition = {
  name: 'get-health-data-timeseries',
  description:
    '時系列ヘルスデータを取得します（心拍数、HRV、睡眠フェーズなど高頻度データ）。集計やリサンプリングにも対応しています。',
  parameters: {
    type: 'object',
    properties: {
      data_type: {
        type: 'string',
        description:
          '時系列データタイプ（例: "heart_rate_timeseries", "oura:sleep_hr", "oura:met", "oura:sleep_phase"）',
      },
      start_time: {
        type: 'string',
        description: '開始日時（ISO 8601形式、例: "2025-01-01T00:00:00Z"）',
      },
      end_time: {
        type: 'string',
        description: '終了日時（ISO 8601形式、例: "2025-01-01T23:59:59Z"）',
      },
      source: {
        type: 'string',
        description: 'データソースでフィルタ（例: "oura-ring-plugin"）',
      },
      resample_minutes: {
        type: 'number',
        description:
          'リサンプリング間隔（分）。指定すると、この間隔で平均値を計算します。',
      },
      aggregate: {
        type: 'boolean',
        description:
          'trueの場合、min/max/avg/count を集計して返します。',
      },
      limit: {
        type: 'number',
        description: '最大取得件数（デフォルト: 1000、最大: 10000）',
      },
      offset: {
        type: 'number',
        description: 'オフセット（ページネーション用、デフォルト: 0）',
      },
    },
    required: ['data_type'],
  },
};

export interface GetHealthDataTimeseriesArgs {
  data_type?: string;
  start_time?: string;
  end_time?: string;
  source?: string;
  resample_minutes?: number;
  aggregate?: boolean;
  limit?: number;
  offset?: number;
}

export function executeGetHealthDataTimeseries(
  args: GetHealthDataTimeseriesArgs
): ToolResult {
  if (!args.data_type) {
    return { success: false, error: 'data_type is required' };
  }

  try {
    const settings = settingsRepository.getAll();
    const timezone = (settings.timezone as string) || DEFAULT_TIMEZONE;

    const startTime = args.start_time ? normalizeToUTC(args.start_time) : undefined;
    const endTime = args.end_time ? normalizeToUTC(args.end_time) : undefined;

    // 集計モード
    if (args.aggregate && startTime && endTime) {
      const result = healthDataTimeseriesRepository.aggregate(
        args.data_type,
        startTime,
        endTime,
        args.source
      );
      return { success: true, data: result };
    }

    // リサンプリングモード
    if (args.resample_minutes && startTime && endTime) {
      const result = healthDataTimeseriesRepository.resample(
        args.data_type,
        startTime,
        endTime,
        args.resample_minutes,
        args.source
      );

      const convertedData = result.map((item) => ({
        ...item,
        bucket_start: utcToTimezone(item.bucket_start, timezone),
      }));
      return { success: true, data: convertedData };
    }

    // 通常の取得モード
    const query = {
      data_type: args.data_type,
      source: args.source,
      start_time: startTime,
      end_time: endTime,
      limit: Math.min(args.limit ?? 1000, 10000),
      offset: args.offset ?? 0,
    };

    const result = healthDataTimeseriesRepository.findAll(query);

    const convertedData = result.data.map((item) => ({
      ...item,
      recorded_at: utcToTimezone(item.recorded_at, timezone),
      created_at: utcToTimezone(item.created_at, timezone),
    }));

    return {
      success: true,
      data: { ...result, data: convertedData },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
