import { getDatabase } from '../index.js';
import type { HealthDataQuery, HealthDataCreate } from '../../api/validators/schemas.js';

export interface HealthDataRecord {
  id: number;
  data_type: string;
  value: number;
  unit: string | null;
  source: string;
  recorded_at: string;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

interface QueryFilter {
  column: string;
  operator: string;
  value: unknown;
}

function buildWhereClause(filters: QueryFilter[]): { clause: string; params: unknown[] } {
  if (filters.length === 0) {
    return { clause: '', params: [] };
  }
  const conditions = filters.map((f) => `${f.column} ${f.operator} ?`);
  const params = filters.map((f) => f.value);
  return { clause: `WHERE ${conditions.join(' AND ')}`, params };
}

export const healthDataRepository = {
  findAll(query: HealthDataQuery): PaginatedResult<HealthDataRecord> {
    const db = getDatabase();

    const filters: QueryFilter[] = [];
    if (query.data_type) {
      filters.push({ column: 'data_type', operator: '=', value: query.data_type });
    }
    if (query.source) {
      filters.push({ column: 'source', operator: '=', value: query.source });
    }
    if (query.start_date) {
      filters.push({ column: 'recorded_at', operator: '>=', value: query.start_date });
    }
    if (query.end_date) {
      filters.push({ column: 'recorded_at', operator: '<=', value: query.end_date });
    }

    const { clause: whereClause, params } = buildWhereClause(filters);

    const countStmt = db.prepare(`SELECT COUNT(*) as count FROM health_data ${whereClause}`);
    const { count: total } = countStmt.get(...params) as { count: number };

    const dataStmt = db.prepare(`
      SELECT * FROM health_data
      ${whereClause}
      ORDER BY recorded_at DESC
      LIMIT ? OFFSET ?
    `);
    const data = dataStmt.all(...params, query.limit, query.offset) as HealthDataRecord[];

    return {
      data,
      pagination: { total, limit: query.limit, offset: query.offset },
    };
  },

  findById(id: number): HealthDataRecord | undefined {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM health_data WHERE id = ?');
    return stmt.get(id) as HealthDataRecord | undefined;
  },

  create(data: HealthDataCreate): HealthDataRecord {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO health_data (data_type, value, unit, source, recorded_at)
      VALUES (?, ?, ?, 'manual', ?)
    `);
    const result = stmt.run(data.data_type, data.value, data.unit ?? null, data.recorded_at);
    return this.findById(result.lastInsertRowid as number)!;
  },

  update(id: number, data: Partial<HealthDataCreate>): HealthDataRecord | undefined {
    const db = getDatabase();

    const fieldUpdates: Array<{ field: string; value: unknown }> = [];
    if (data.data_type !== undefined) {
      fieldUpdates.push({ field: 'data_type', value: data.data_type });
    }
    if (data.value !== undefined) {
      fieldUpdates.push({ field: 'value', value: data.value });
    }
    if (data.unit !== undefined) {
      fieldUpdates.push({ field: 'unit', value: data.unit });
    }
    if (data.recorded_at !== undefined) {
      fieldUpdates.push({ field: 'recorded_at', value: data.recorded_at });
    }

    if (fieldUpdates.length === 0) {
      return this.findById(id);
    }

    const setClauses = [...fieldUpdates.map((u) => `${u.field} = ?`), 'updated_at = CURRENT_TIMESTAMP'];
    const params = [...fieldUpdates.map((u) => u.value), id];

    const stmt = db.prepare(`UPDATE health_data SET ${setClauses.join(', ')} WHERE id = ?`);
    stmt.run(...params);
    return this.findById(id);
  },

  delete(id: number): boolean {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM health_data WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },
};
