import { getDatabase } from '../index.js';
import type { HealthDataQuery, HealthDataCreate } from '../../api/validators/schemas.js';
import { nowUTC } from '../../utils/datetime.js';

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

export interface AggregateResult {
  data_type: string;
  min: number;
  max: number;
  avg: number;
  count: number;
}

export interface TrendResult {
  data_type: string;
  trend: 'up' | 'down' | 'stable';
  change_percent: number;
  latest_value: number;
  first_value: number;
}

interface QueryFilter {
  column: string;
  operator: string;
  value: unknown;
}

interface FieldUpdate {
  field: string;
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

function collectFieldUpdates(data: Record<string, unknown>, fields: string[]): FieldUpdate[] {
  const updates: FieldUpdate[] = [];
  for (const field of fields) {
    if (data[field] !== undefined) {
      updates.push({ field, value: data[field] });
    }
  }
  return updates;
}

const DEFAULT_SOURCE = 'manual';

const UPSERT_SQL = `
  INSERT INTO health_data (data_type, value, unit, source, recorded_at)
  VALUES (?, ?, ?, ?, ?)
  ON CONFLICT(data_type, source, recorded_at) DO UPDATE SET
    value = excluded.value,
    unit = excluded.unit,
    updated_at = datetime('now')
`;

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

  /**
   * データを作成または更新（UPSERT）
   * 同じ (data_type, source, recorded_at) の組み合わせが存在する場合は値を更新
   * @returns 作成または更新されたレコード
   */
  create(data: HealthDataCreate & { source?: string }): HealthDataRecord {
    const db = getDatabase();
    const source = data.source || DEFAULT_SOURCE;
    const stmt = db.prepare(UPSERT_SQL);
    stmt.run(data.data_type, data.value, data.unit ?? null, source, data.recorded_at);
    // UPSERT後はユニークキーで検索（lastInsertRowidは更新時に信頼できない）
    const findStmt = db.prepare(
      'SELECT * FROM health_data WHERE data_type = ? AND source = ? AND recorded_at = ?'
    );
    return findStmt.get(data.data_type, source, data.recorded_at) as HealthDataRecord;
  },

  /**
   * バッチでデータを作成または更新（UPSERT）
   * 同じ (data_type, source, recorded_at) の組み合わせが存在する場合は値を更新
   * @returns 処理結果（合計件数、挿入/更新件数）
   */
  createBatch(items: Array<HealthDataCreate & { source?: string }>): { total: number; inserted: number } {
    const db = getDatabase();
    const transaction = db.transaction((data: Array<HealthDataCreate & { source?: string }>) => {
      const stmt = db.prepare(UPSERT_SQL);
      let upserted = 0;
      for (const item of data) {
        const source = item.source || DEFAULT_SOURCE;
        const result = stmt.run(item.data_type, item.value, item.unit ?? null, source, item.recorded_at);
        if (result.changes > 0) {
          upserted++;
        }
      }
      return upserted;
    });
    const inserted = transaction(items);
    return { total: items.length, inserted };
  },

  update(id: number, data: Partial<HealthDataCreate>): HealthDataRecord | undefined {
    const db = getDatabase();

    const fieldUpdates = collectFieldUpdates(
      data as Record<string, unknown>,
      ['data_type', 'value', 'unit', 'recorded_at']
    );

    if (fieldUpdates.length === 0) {
      return this.findById(id);
    }

    const setClauses = [...fieldUpdates.map((u) => `${u.field} = ?`), 'updated_at = ?'];
    const params = [...fieldUpdates.map((u) => u.value), nowUTC(), id];

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

  getLatest(dataTypes: string[]): Record<string, HealthDataRecord> {
    const db = getDatabase();
    const result: Record<string, HealthDataRecord> = {};

    if (dataTypes.length === 0) {
      return result;
    }

    const placeholders = dataTypes.map(() => '?').join(', ');
    const stmt = db.prepare(`
      SELECT h1.*
      FROM health_data h1
      INNER JOIN (
        SELECT data_type, MAX(recorded_at) as max_recorded_at
        FROM health_data
        WHERE data_type IN (${placeholders})
        GROUP BY data_type
      ) h2 ON h1.data_type = h2.data_type AND h1.recorded_at = h2.max_recorded_at
    `);

    const records = stmt.all(...dataTypes) as HealthDataRecord[];
    for (const record of records) {
      result[record.data_type] = record;
    }

    return result;
  },

  getRange(dataTypes: string[], startDate: string, endDate: string): HealthDataRecord[] {
    const db = getDatabase();

    if (dataTypes.length === 0) {
      return [];
    }

    const placeholders = dataTypes.map(() => '?').join(', ');
    const stmt = db.prepare(`
      SELECT * FROM health_data
      WHERE data_type IN (${placeholders})
        AND recorded_at >= ?
        AND recorded_at <= ?
      ORDER BY recorded_at ASC
    `);

    return stmt.all(...dataTypes, startDate, endDate) as HealthDataRecord[];
  },

  aggregate(dataTypes: string[], startDate: string, endDate: string): AggregateResult[] {
    const db = getDatabase();

    if (dataTypes.length === 0) {
      return [];
    }

    const placeholders = dataTypes.map(() => '?').join(', ');
    const stmt = db.prepare(`
      SELECT
        data_type,
        MIN(value) as min,
        MAX(value) as max,
        AVG(value) as avg,
        COUNT(*) as count
      FROM health_data
      WHERE data_type IN (${placeholders})
        AND recorded_at >= ?
        AND recorded_at <= ?
      GROUP BY data_type
    `);

    return stmt.all(...dataTypes, startDate, endDate) as AggregateResult[];
  },

  analyzeTrend(dataTypes: string[], startDate: string, endDate: string): TrendResult[] {
    const db = getDatabase();
    const results: TrendResult[] = [];

    if (dataTypes.length === 0) {
      return results;
    }

    for (const dataType of dataTypes) {
      const stmt = db.prepare(`
        SELECT value, recorded_at
        FROM health_data
        WHERE data_type = ?
          AND recorded_at >= ?
          AND recorded_at <= ?
        ORDER BY recorded_at ASC
      `);

      const records = stmt.all(dataType, startDate, endDate) as Array<{ value: number; recorded_at: string }>;

      if (records.length === 0) {
        continue;
      }

      const firstValue = records[0].value;
      const latestValue = records[records.length - 1].value;

      let changePercent = 0;
      if (firstValue !== 0) {
        changePercent = ((latestValue - firstValue) / Math.abs(firstValue)) * 100;
      }

      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (changePercent > 5) {
        trend = 'up';
      } else if (changePercent < -5) {
        trend = 'down';
      }

      results.push({
        data_type: dataType,
        trend,
        change_percent: Math.round(changePercent * 10) / 10,
        latest_value: latestValue,
        first_value: firstValue,
      });
    }

    return results;
  },
};
