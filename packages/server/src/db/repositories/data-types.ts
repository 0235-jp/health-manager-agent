import { getDatabase } from '../index.js';
import { pluginsRepository } from './plugins.js';

export interface DataTypeRecord {
  id: number;
  name: string;
  display_name: string;
  category: string | null;
  unit: string | null;
  is_standard: number;
  plugin_name: string | null;
  created_at: string;
}

/**
 * プラグインのsupportedDataTypesの型
 */
interface PluginDataType {
  name: string;
  displayName: string;
  category: string;
  unit: string;
  description?: string;
}

export interface DataTypeQuery {
  category?: string;
  is_standard?: boolean;
}

interface QueryFilter {
  condition: string;
  value: unknown;
}

function buildFilters(query: DataTypeQuery): QueryFilter[] {
  const filters: QueryFilter[] = [];

  if (query.category) {
    filters.push({ condition: 'category = ?', value: query.category });
  }

  if (query.is_standard !== undefined) {
    filters.push({ condition: 'is_standard = ?', value: query.is_standard ? 1 : 0 });
  }

  return filters;
}

export const dataTypesRepository = {
  findAll(query: DataTypeQuery = {}): DataTypeRecord[] {
    const db = getDatabase();
    const filters = buildFilters(query);

    const whereClause = filters.length > 0
      ? `WHERE ${filters.map((f) => f.condition).join(' AND ')}`
      : '';
    const params = filters.map((f) => f.value);

    const stmt = db.prepare(`
      SELECT * FROM data_types
      ${whereClause}
      ORDER BY category, name
    `);

    return stmt.all(...params) as DataTypeRecord[];
  },

  findByName(name: string): DataTypeRecord | undefined {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM data_types WHERE name = ?');
    return stmt.get(name) as DataTypeRecord | undefined;
  },

  /**
   * 標準データタイプ + プラグインのデータタイプを統合して取得
   * @param query フィルター条件
   */
  findAllWithPluginTypes(query: DataTypeQuery = {}): DataTypeRecord[] {
    // 標準データタイプを取得
    const standardTypes = this.findAll(query);
    const existingNames = new Set(standardTypes.map((dt) => dt.name));

    // プラグインのsupportedDataTypesを取得
    const plugins = pluginsRepository.findAll('data-source');
    const pluginTypes: DataTypeRecord[] = [];

    for (const plugin of plugins) {
      if (!plugin.supported_data_types) continue;

      try {
        const supportedTypes = JSON.parse(plugin.supported_data_types) as PluginDataType[];
        for (const pdt of supportedTypes) {
          // 既に存在する場合はスキップ（標準タイプ優先）
          if (existingNames.has(pdt.name)) continue;

          // カテゴリフィルターが指定されている場合はチェック
          if (query.category && pdt.category !== query.category) continue;

          // is_standard=true が指定されている場合はプラグインタイプをスキップ
          if (query.is_standard === true) continue;

          pluginTypes.push({
            id: 0, // プラグインタイプにはDBのIDがない
            name: pdt.name,
            display_name: pdt.displayName,
            category: pdt.category,
            unit: pdt.unit,
            is_standard: 0,
            plugin_name: plugin.name,
            created_at: plugin.installed_at,
          });
          existingNames.add(pdt.name);
        }
      } catch (e) {
        console.warn(`Failed to parse supported_data_types for plugin ${plugin.name}:`, e);
      }
    }

    // マージしてソート
    const allTypes = [...standardTypes, ...pluginTypes];
    allTypes.sort((a, b) => {
      const catA = a.category || '';
      const catB = b.category || '';
      if (catA !== catB) return catA.localeCompare(catB);
      return a.name.localeCompare(b.name);
    });

    return allTypes;
  },
};

/**
 * DataTypeRecordをAPI/Tool出力用にフォーマット
 */
export interface FormattedDataType {
  name: string;
  display_name: string;
  category: string | null;
  unit: string | null;
  is_standard: boolean;
  plugin_name: string | null;
}

export function formatDataTypeRecord(dt: DataTypeRecord): FormattedDataType {
  return {
    name: dt.name,
    display_name: dt.display_name,
    category: dt.category,
    unit: dt.unit,
    is_standard: dt.is_standard === 1,
    plugin_name: dt.plugin_name,
  };
}
