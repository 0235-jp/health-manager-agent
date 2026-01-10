import { getDatabase } from '../index.js';

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
};
