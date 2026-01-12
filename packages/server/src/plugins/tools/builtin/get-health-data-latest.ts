/**
 * get-health-data-latest tool - Get the latest value for each data type
 */

import { healthDataRepository } from '../../../db/repositories/health-data.js';
import { dataTypesRepository } from '../../../db/repositories/data-types.js';
import type { ToolDefinition, ToolResult } from '../interfaces.js';

export const getHealthDataLatestTool: ToolDefinition = {
  name: 'get-health-data-latest',
  description:
    '各データタイプの最新の値を取得します。特定のデータタイプを指定しない場合は、全ての登録済みデータタイプの最新値を取得します。',
  parameters: {
    type: 'object',
    properties: {
      data_types: {
        type: 'array',
        items: { type: 'string' },
        description:
          '取得するデータタイプの配列（例: ["body_weight", "sleep_duration"]）。空または省略時は全てのデータタイプが対象',
      },
    },
    required: [],
  },
};

export interface GetHealthDataLatestArgs {
  data_types?: string[];
}

export function executeGetHealthDataLatest(
  args: GetHealthDataLatestArgs
): ToolResult {
  try {
    let dataTypes = args.data_types ?? [];

    // If no data types specified, get all available data types
    if (dataTypes.length === 0) {
      const allTypes = dataTypesRepository.findAll();
      dataTypes = allTypes.map((dt) => dt.name);
    }

    if (dataTypes.length === 0) {
      return {
        success: true,
        data: { data: {}, count: 0 },
      };
    }

    const latestData = healthDataRepository.getLatest(dataTypes);

    return {
      success: true,
      data: {
        data: latestData,
        count: Object.keys(latestData).length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
