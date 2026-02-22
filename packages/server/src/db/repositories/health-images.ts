import { getDatabase } from '../index.js';
import { nowUTC } from '../../utils/datetime.js';

export interface HealthImageRecord {
  id: number;
  title: string;
  memo: string | null;
  file_path: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  recorded_at: string;
  created_at: string;
  updated_at: string;
}

export interface HealthImageCreateInput {
  title: string;
  memo?: string;
  file_path: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  recorded_at: string;
}

export interface HealthImageUpdateInput {
  title?: string;
  memo?: string;
  recorded_at?: string;
}

export interface HealthImageQuery {
  start_date?: string;
  end_date?: string;
  limit: number;
  offset: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

export const healthImagesRepository = {
  findAll(query: HealthImageQuery): PaginatedResult<HealthImageRecord> {
    const db = getDatabase();

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (query.start_date) {
      conditions.push('recorded_at >= ?');
      params.push(query.start_date);
    }
    if (query.end_date) {
      conditions.push('recorded_at <= ?');
      params.push(query.end_date);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countStmt = db.prepare(`SELECT COUNT(*) as count FROM health_images ${whereClause}`);
    const { count: total } = countStmt.get(...params) as { count: number };

    const dataStmt = db.prepare(`
      SELECT * FROM health_images
      ${whereClause}
      ORDER BY recorded_at DESC
      LIMIT ? OFFSET ?
    `);
    const data = dataStmt.all(...params, query.limit, query.offset) as HealthImageRecord[];

    return {
      data,
      pagination: { total, limit: query.limit, offset: query.offset },
    };
  },

  findById(id: number): HealthImageRecord | undefined {
    const db = getDatabase();
    return db.prepare('SELECT * FROM health_images WHERE id = ?').get(id) as HealthImageRecord | undefined;
  },

  create(data: HealthImageCreateInput): HealthImageRecord {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO health_images (title, memo, file_path, original_filename, mime_type, file_size, recorded_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      data.title,
      data.memo ?? null,
      data.file_path,
      data.original_filename,
      data.mime_type,
      data.file_size,
      data.recorded_at
    );
    return this.findById(result.lastInsertRowid as number)!;
  },

  update(id: number, data: HealthImageUpdateInput): HealthImageRecord | undefined {
    const db = getDatabase();

    const updates: string[] = [];
    const params: unknown[] = [];

    if (data.title !== undefined) {
      updates.push('title = ?');
      params.push(data.title);
    }
    if (data.memo !== undefined) {
      updates.push('memo = ?');
      params.push(data.memo);
    }
    if (data.recorded_at !== undefined) {
      updates.push('recorded_at = ?');
      params.push(data.recorded_at);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    updates.push('updated_at = ?');
    params.push(nowUTC());
    params.push(id);

    db.prepare(`UPDATE health_images SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    return this.findById(id);
  },

  delete(id: number): boolean {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM health_images WHERE id = ?').run(id);
    return result.changes > 0;
  },

  findByDateRange(startDate: string, endDate: string, limit: number = 50): HealthImageRecord[] {
    const db = getDatabase();
    return db.prepare(`
      SELECT * FROM health_images
      WHERE recorded_at >= ? AND recorded_at <= ?
      ORDER BY recorded_at DESC
      LIMIT ?
    `).all(startDate, endDate, limit) as HealthImageRecord[];
  },
};
