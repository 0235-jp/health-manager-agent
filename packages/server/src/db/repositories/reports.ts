import { getDatabase } from '../index.js';
import type { ReportContent } from '../../plugins/interfaces/agent.js';
import { nowUTC } from '../../utils/datetime.js';

export type ReportType = 'on_fetch' | 'daily' | 'manual';

export interface ReportRecord {
  id: number;
  report_type: ReportType;
  period_start: string;
  period_end: string;
  content: string;
  created_at: string;
}

export interface ReportWithContent extends Omit<ReportRecord, 'content'> {
  content: ReportContent;
}

export interface ReportQuery {
  report_type?: ReportType;
  start_date?: string;
  end_date?: string;
  limit: number;
  offset: number;
}

export interface CreateReportParams {
  reportType: ReportType;
  periodStart: string;
  periodEnd: string;
  content: ReportContent;
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

function parseReportContent(record: ReportRecord): ReportWithContent {
  return {
    ...record,
    content: JSON.parse(record.content) as ReportContent,
  };
}

export const reportsRepository = {
  findAll(query: ReportQuery): PaginatedResult<ReportWithContent> {
    const db = getDatabase();

    const filters: QueryFilter[] = [];
    if (query.report_type) {
      filters.push({ column: 'report_type', operator: '=', value: query.report_type });
    }
    if (query.start_date) {
      filters.push({ column: 'period_start', operator: '>=', value: query.start_date });
    }
    if (query.end_date) {
      filters.push({ column: 'period_end', operator: '<=', value: query.end_date });
    }

    const { clause: whereClause, params } = buildWhereClause(filters);

    const countStmt = db.prepare(`SELECT COUNT(*) as count FROM reports ${whereClause}`);
    const { count: total } = countStmt.get(...params) as { count: number };

    const dataStmt = db.prepare(`
      SELECT * FROM reports
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);
    const records = dataStmt.all(...params, query.limit, query.offset) as ReportRecord[];

    return {
      data: records.map(parseReportContent),
      pagination: { total, limit: query.limit, offset: query.offset },
    };
  },

  findById(id: number): ReportWithContent | undefined {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM reports WHERE id = ?');
    const record = stmt.get(id) as ReportRecord | undefined;
    return record ? parseReportContent(record) : undefined;
  },

  findLatest(reportType?: ReportType): ReportWithContent | undefined {
    const db = getDatabase();
    const whereClause = reportType ? 'WHERE report_type = ?' : '';
    const stmt = db.prepare(`
      SELECT * FROM reports
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT 1
    `);
    const record = reportType
      ? (stmt.get(reportType) as ReportRecord | undefined)
      : (stmt.get() as ReportRecord | undefined);

    return record ? parseReportContent(record) : undefined;
  },

  create(params: CreateReportParams): ReportWithContent {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO reports (report_type, period_start, period_end, content, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      params.reportType,
      params.periodStart,
      params.periodEnd,
      JSON.stringify(params.content),
      nowUTC()
    );
    return this.findById(result.lastInsertRowid as number)!;
  },

  delete(id: number): boolean {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM reports WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },
};
