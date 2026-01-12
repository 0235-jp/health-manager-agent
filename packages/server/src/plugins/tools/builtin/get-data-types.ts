/**
 * get-data-types tool - Get available health data types
 */

import { dataTypesRepository } from '../../../db/repositories/data-types.js';
import type { ToolDefinition, ToolResult } from '../interfaces.js';

export const getDataTypesTool: ToolDefinition = {
  name: 'get-data-types',
  description:
    '利用可能なヘルスデータタイプの一覧を取得します。各データタイプの名前、表示名、カテゴリ、単位などの情報が含まれます。',
  parameters: {
    type: 'object',
    properties: {
      category: {
        type: 'string',
        description: 'カテゴリでフィルタリング（例: "睡眠", "活動", "身体"）',
      },
      is_standard: {
        type: 'boolean',
        description: '標準タイプのみ取得する場合はtrue',
      },
    },
    required: [],
  },
};

export interface GetDataTypesArgs {
  category?: string;
  is_standard?: boolean;
}

export function executeGetDataTypes(args: GetDataTypesArgs): ToolResult {
  try {
    const query: { category?: string; is_standard?: boolean } = {};

    if (args.category) {
      query.category = args.category;
    }
    if (args.is_standard !== undefined) {
      query.is_standard = args.is_standard;
    }

    const dataTypes = dataTypesRepository.findAll(query);

    const formattedData = dataTypes.map((dt) => ({
      name: dt.name,
      display_name: dt.display_name,
      category: dt.category,
      unit: dt.unit,
      is_standard: dt.is_standard === 1,
      plugin_name: dt.plugin_name,
    }));

    return {
      success: true,
      data: { data: formattedData, count: formattedData.length },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
