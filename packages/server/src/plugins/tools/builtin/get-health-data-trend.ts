/**
 * get-health-data-trend tool - Analyze health data trends
 */

import { healthDataRepository } from '../../../db/repositories/health-data.js';
import { dataTypesRepository } from '../../../db/repositories/data-types.js';
import { settingsRepository } from '../../../db/repositories/settings.js';
import { utcToTimezone, DEFAULT_TIMEZONE } from '../../../utils/datetime.js';
import type { ToolDefinition, ToolResult } from '../interfaces.js';

export const getHealthDataTrendTool: ToolDefinition = {
  name: 'get-health-data-trend',
  description:
    'ヘルスデータのトレンド分析を取得します。指定した期間内での変化率とトレンド（上昇/下降/安定）を計算します。',
  parameters: {
    type: 'object',
    properties: {
      data_types: {
        type: 'array',
        items: { type: 'string' },
        description:
          '分析するデータタイプの配列（例: ["body_weight", "steps"]）。空または省略時は全てのデータタイプが対象',
      },
      days: {
        type: 'number',
        description: '分析期間（日数、デフォルト: 7）',
      },
    },
    required: [],
  },
};

export interface GetHealthDataTrendArgs {
  data_types?: string[];
  days?: number;
}

export function executeGetHealthDataTrend(
  args: GetHealthDataTrendArgs
): ToolResult {
  try {
    // 設定からタイムゾーンを取得
    const settings = settingsRepository.getAll();
    const timezone = (settings.timezone as string) || DEFAULT_TIMEZONE;

    let dataTypes = args.data_types ?? [];
    const days = args.days ?? 7;

    // If no data types specified, get all available data types
    if (dataTypes.length === 0) {
      const allTypes = dataTypesRepository.findAll();
      dataTypes = allTypes.map((dt) => dt.name);
    }

    if (dataTypes.length === 0) {
      return {
        success: true,
        data: { data: [], count: 0 },
      };
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const trends = healthDataRepository.analyzeTrend(
      dataTypes,
      startDate.toISOString(),
      endDate.toISOString()
    );

    return {
      success: true,
      data: {
        data: trends,
        count: trends.length,
        period: {
          start_date: utcToTimezone(startDate.toISOString(), timezone),
          end_date: utcToTimezone(endDate.toISOString(), timezone),
          days,
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
