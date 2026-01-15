import { getDatabase } from '../index.js';

export interface TimeseriesRecord {
  id: number;
  data_type: string;
  value: number | null;
  string_value: string | null;
  source: string;
  interval_seconds: number | null;
  recorded_at: string;
  period_date: string;
  parent_id: string | null;
  created_at: string;
}

export interface TimeseriesQuery {
  data_type?: string;
  source?: string;
  start_time?: string;
  end_time?: string;
  period_date?: string;
  limit: number;
  offset: number;
}

export interface TimeseriesCreate {
  data_type: string;
  value?: number;
  string_value?: string;
  source: string;
  interval_seconds?: number;
  recorded_at: string;
  period_date: string;
  parent_id?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

export interface TimeseriesAggregateResult {
  data_type: string;
  min: number | null;
  max: number | null;
  avg: number | null;
  count: number;
}

export interface ResampledPoint {
  bucket_start: string;
  avg_value: number | null;
  min_value: number | null;
  max_value: number | null;
  count: number;
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

const UPSERT_SQL = `
  INSERT INTO health_data_timeseries (data_type, value, string_value, source, interval_seconds, recorded_at, period_date, parent_id)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(data_type, source, recorded_at) DO UPDATE SET
    value = excluded.value,
    string_value = excluded.string_value,
    interval_seconds = excluded.interval_seconds,
    period_date = excluded.period_date,
    parent_id = excluded.parent_id
`;

export const healthDataTimeseriesRepository = {
  findAll(query: TimeseriesQuery): PaginatedResult<TimeseriesRecord> {
    const db = getDatabase();

    const filters: QueryFilter[] = [];
    if (query.data_type) {
      filters.push({ column: 'data_type', operator: '=', value: query.data_type });
    }
    if (query.source) {
      filters.push({ column: 'source', operator: '=', value: query.source });
    }
    if (query.start_time) {
      filters.push({ column: 'recorded_at', operator: '>=', value: query.start_time });
    }
    if (query.end_time) {
      filters.push({ column: 'recorded_at', operator: '<=', value: query.end_time });
    }
    if (query.period_date) {
      filters.push({ column: 'period_date', operator: '=', value: query.period_date });
    }

    const { clause: whereClause, params } = buildWhereClause(filters);

    const countStmt = db.prepare(`SELECT COUNT(*) as count FROM health_data_timeseries ${whereClause}`);
    const { count: total } = countStmt.get(...params) as { count: number };

    const dataStmt = db.prepare(`
      SELECT * FROM health_data_timeseries
      ${whereClause}
      ORDER BY recorded_at DESC
      LIMIT ? OFFSET ?
    `);
    const data = dataStmt.all(...params, query.limit, query.offset) as TimeseriesRecord[];

    return {
      data,
      pagination: { total, limit: query.limit, offset: query.offset },
    };
  },

  findByRange(
    dataType: string,
    startTime: string,
    endTime: string,
    source?: string
  ): TimeseriesRecord[] {
    const db = getDatabase();

    const filters: QueryFilter[] = [
      { column: 'data_type', operator: '=', value: dataType },
      { column: 'recorded_at', operator: '>=', value: startTime },
      { column: 'recorded_at', operator: '<=', value: endTime },
    ];

    if (source) {
      filters.push({ column: 'source', operator: '=', value: source });
    }

    const { clause: whereClause, params } = buildWhereClause(filters);

    const stmt = db.prepare(`
      SELECT * FROM health_data_timeseries
      ${whereClause}
      ORDER BY recorded_at ASC
    `);

    return stmt.all(...params) as TimeseriesRecord[];
  },

  createBatch(items: TimeseriesCreate[]): { total: number; inserted: number } {
    const db = getDatabase();
    const transaction = db.transaction((data: TimeseriesCreate[]) => {
      const stmt = db.prepare(UPSERT_SQL);
      let upserted = 0;
      for (const item of data) {
        const result = stmt.run(
          item.data_type,
          item.value ?? null,
          item.string_value ?? null,
          item.source,
          item.interval_seconds ?? null,
          item.recorded_at,
          item.period_date,
          item.parent_id ?? null
        );
        if (result.changes > 0) {
          upserted++;
        }
      }
      return upserted;
    });
    const inserted = transaction(items);
    return { total: items.length, inserted };
  },

  aggregate(
    dataType: string,
    startTime: string,
    endTime: string,
    source?: string
  ): TimeseriesAggregateResult {
    const db = getDatabase();

    const filters: QueryFilter[] = [
      { column: 'data_type', operator: '=', value: dataType },
      { column: 'recorded_at', operator: '>=', value: startTime },
      { column: 'recorded_at', operator: '<=', value: endTime },
    ];

    if (source) {
      filters.push({ column: 'source', operator: '=', value: source });
    }

    const { clause: whereClause, params } = buildWhereClause(filters);

    const stmt = db.prepare(`
      SELECT
        data_type,
        MIN(value) as min,
        MAX(value) as max,
        AVG(value) as avg,
        COUNT(*) as count
      FROM health_data_timeseries
      ${whereClause}
    `);

    const result = stmt.get(...params) as TimeseriesAggregateResult | undefined;
    return result || { data_type: dataType, min: null, max: null, avg: null, count: 0 };
  },

  resample(
    dataType: string,
    startTime: string,
    endTime: string,
    intervalMinutes: number,
    source?: string
  ): ResampledPoint[] {
    const db = getDatabase();

    const filters: QueryFilter[] = [
      { column: 'data_type', operator: '=', value: dataType },
      { column: 'recorded_at', operator: '>=', value: startTime },
      { column: 'recorded_at', operator: '<=', value: endTime },
    ];

    if (source) {
      filters.push({ column: 'source', operator: '=', value: source });
    }

    const { clause: whereClause, params } = buildWhereClause(filters);

    // SQLiteでは時間バケットを作成するためにstrftimeを使用
    const intervalSeconds = intervalMinutes * 60;
    const stmt = db.prepare(`
      SELECT
        datetime(
          (strftime('%s', recorded_at) / ${intervalSeconds}) * ${intervalSeconds},
          'unixepoch'
        ) as bucket_start,
        AVG(value) as avg_value,
        MIN(value) as min_value,
        MAX(value) as max_value,
        COUNT(*) as count
      FROM health_data_timeseries
      ${whereClause}
      GROUP BY bucket_start
      ORDER BY bucket_start ASC
    `);

    return stmt.all(...params) as ResampledPoint[];
  },

  getDataTypes(): string[] {
    const db = getDatabase();
    const stmt = db.prepare('SELECT DISTINCT data_type FROM health_data_timeseries ORDER BY data_type');
    const results = stmt.all() as Array<{ data_type: string }>;
    return results.map((r) => r.data_type);
  },

  deleteByRange(
    dataType: string,
    startTime: string,
    endTime: string,
    source?: string
  ): number {
    const db = getDatabase();

    const filters: QueryFilter[] = [
      { column: 'data_type', operator: '=', value: dataType },
      { column: 'recorded_at', operator: '>=', value: startTime },
      { column: 'recorded_at', operator: '<=', value: endTime },
    ];

    if (source) {
      filters.push({ column: 'source', operator: '=', value: source });
    }

    const { clause: whereClause, params } = buildWhereClause(filters);

    const stmt = db.prepare(`DELETE FROM health_data_timeseries ${whereClause}`);
    const result = stmt.run(...params);
    return result.changes;
  },
};
