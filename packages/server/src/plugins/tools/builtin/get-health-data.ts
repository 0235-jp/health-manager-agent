/**
 * get-health-data tool - Query health data with filters and pagination
 */

import { healthDataRepository } from '../../../db/repositories/health-data.js';
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
    const query = {
      data_type: args.data_type,
      source: args.source,
      start_date: args.start_date,
      end_date: args.end_date,
      limit: Math.min(args.limit ?? 100, 1000),
      offset: args.offset ?? 0,
    };

    const result = healthDataRepository.findAll(query);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
