/**
 * get-data-types tool - Get available health data types
 */

import { dataTypesRepository, formatDataTypeRecord } from '../../../db/repositories/data-types.js';
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
    // プラグインのデータタイプも含めて取得
    const dataTypes = dataTypesRepository.findAllWithPluginTypes(args);
    const formattedData = dataTypes.map(formatDataTypeRecord);

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
