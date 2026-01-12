import { getDatabase } from '../index.js';

export interface CustomDataTypeRecord {
  id: number;
  name: string;
  display_name: string;
  unit: string | null;
  is_active: number; // SQLite boolean (0 or 1)
  notification_interval: number;
  created_at: string;
}

export interface CustomDataTypeCreate {
  name: string;
  display_name: string;
  unit?: string;
  notification_interval?: number;
}

export interface CustomDataTypeUpdate {
  display_name?: string;
  unit?: string;
  is_active?: boolean;
  notification_interval?: number;
}

export const customDataTypesRepository = {
  findAll(): CustomDataTypeRecord[] {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM custom_data_types ORDER BY created_at DESC');
    return stmt.all() as CustomDataTypeRecord[];
  },

  findActive(): CustomDataTypeRecord[] {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM custom_data_types WHERE is_active = 1 ORDER BY created_at DESC');
    return stmt.all() as CustomDataTypeRecord[];
  },

  findById(id: number): CustomDataTypeRecord | undefined {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM custom_data_types WHERE id = ?');
    return stmt.get(id) as CustomDataTypeRecord | undefined;
  },

  findByName(name: string): CustomDataTypeRecord | undefined {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM custom_data_types WHERE name = ?');
    return stmt.get(name) as CustomDataTypeRecord | undefined;
  },

  create(data: CustomDataTypeCreate): CustomDataTypeRecord {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO custom_data_types (name, display_name, unit, notification_interval)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(
      data.name,
      data.display_name,
      data.unit ?? null,
      data.notification_interval ?? 0
    );
    return this.findById(result.lastInsertRowid as number)!;
  },

  update(id: number, data: CustomDataTypeUpdate): CustomDataTypeRecord | undefined {
    const db = getDatabase();

    const updates: string[] = [];
    const params: unknown[] = [];

    if (data.display_name !== undefined) {
      updates.push('display_name = ?');
      params.push(data.display_name);
    }
    if (data.unit !== undefined) {
      updates.push('unit = ?');
      params.push(data.unit);
    }
    if (data.is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(data.is_active ? 1 : 0);
    }
    if (data.notification_interval !== undefined) {
      updates.push('notification_interval = ?');
      params.push(data.notification_interval);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    params.push(id);
    const stmt = db.prepare(`UPDATE custom_data_types SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...params);
    return this.findById(id);
  },

  delete(id: number): boolean {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM custom_data_types WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  toggleActive(id: number): CustomDataTypeRecord | undefined {
    const db = getDatabase();
    const current = this.findById(id);
    if (!current) {
      return undefined;
    }

    const stmt = db.prepare('UPDATE custom_data_types SET is_active = ? WHERE id = ?');
    stmt.run(current.is_active ? 0 : 1, id);
    return this.findById(id);
  },

  /**
   * 通知間隔が設定されているカスタムデータタイプを取得
   */
  findWithNotification(): CustomDataTypeRecord[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM custom_data_types
      WHERE is_active = 1 AND notification_interval > 0
      ORDER BY notification_interval ASC
    `);
    return stmt.all() as CustomDataTypeRecord[];
  },
};
