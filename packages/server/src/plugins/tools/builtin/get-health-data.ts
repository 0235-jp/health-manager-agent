/**
 * get-health-data tool - Query health data with filters and pagination
 */

import { healthDataRepository } from '../../../db/repositories/health-data.js';
import { settingsRepository } from '../../../db/repositories/settings.js';
import { normalizeToUTC, utcToTimezone, DEFAULT_TIMEZONE } from '../../../utils/datetime.js';
import type { ToolDefinition, ToolResult } from '../interfaces.js';

export const getHealthDataTool: ToolDefinition = {
  name: 'get-health-data',
  description:
    '条件を指定してヘルスデータを取得します。データタイプ、ソース、期間でフィルタリングでき、ページネーションにも対応しています。',
  parameters: {
    type: 'object',
    properties: {
      data_type: {
        type: 'string',
        description: 'データタイプでフィルタ（例: "body_weight", "sleep_duration"）',
      },
      source: {
        type: 'string',
        description: 'データソースでフィルタ（例: "manual", "oura_ring"）',
      },
      start_date: {
        type: 'string',
        description: '開始日時（ISO 8601形式、例: "2025-01-01T00:00:00Z"）',
      },
      end_date: {
        type: 'string',
        description: '終了日時（ISO 8601形式、例: "2025-01-31T23:59:59Z"）',
      },
      limit: {
        type: 'number',
        description: '最大取得件数（デフォルト: 100、最大: 1000）',
      },
      offset: {
        type: 'number',
        description: 'オフセット（ページネーション用、デフォルト: 0）',
      },
    },
    required: [],
  },
};

export interface GetHealthDataArgs {
  data_type?: string;
  source?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

export function executeGetHealthData(args: GetHealthDataArgs): ToolResult {
  try {
    // 設定からタイムゾーンを取得
    const settings = settingsRepository.getAll();
    const timezone = (settings.timezone as string) || DEFAULT_TIMEZONE;

    // 日時パラメータを UTC に正規化
    let startDate: string | undefined;
    let endDate: string | undefined;

    if (args.start_date) {
      startDate = normalizeToUTC(args.start_date);
    }
    if (args.end_date) {
      endDate = normalizeToUTC(args.end_date);
    }

    const query = {
      data_type: args.data_type,
      source: args.source,
      start_date: startDate,
      end_date: endDate,
      limit: Math.min(args.limit ?? 100, 1000),
      offset: args.offset ?? 0,
    };

    const result = healthDataRepository.findAll(query);

    // 出力データの日時を設定タイムゾーンに変換
    const convertedData = result.data.map((item) => ({
      ...item,
      recorded_at: utcToTimezone(item.recorded_at, timezone),
      created_at: utcToTimezone(item.created_at, timezone),
      updated_at: utcToTimezone(item.updated_at, timezone),
    }));

    return {
      success: true,
      data: {
        ...result,
        data: convertedData,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
