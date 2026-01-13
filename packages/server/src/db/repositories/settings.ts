import { getDatabase } from '../index.js';

export interface SettingsRecord {
  key: string;
  value: string;
  updated_at: string;
}

export const settingsRepository = {
  getAll(): Record<string, unknown> {
    const db = getDatabase();
    const stmt = db.prepare('SELECT key, value FROM settings');
    const rows = stmt.all() as SettingsRecord[];

    const settings: Record<string, unknown> = {};
    for (const row of rows) {
      try {
        settings[row.key] = JSON.parse(row.value);
      } catch (error) {
        console.warn(`[SettingsRepository] Failed to parse JSON for '${row.key}':`, error);
        settings[row.key] = row.value;
      }
    }
    return settings;
  },

  get(key: string): unknown {
    const db = getDatabase();
    const stmt = db.prepare('SELECT value FROM settings WHERE key = ?');
    const row = stmt.get(key) as { value: string } | undefined;

    if (!row) return undefined;

    try {
      return JSON.parse(row.value);
    } catch (error) {
      console.warn(`[SettingsRepository] Failed to parse JSON for '${key}':`, error);
      return row.value;
    }
  },

  set(key: string, value: unknown): void {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = CURRENT_TIMESTAMP
    `);
    stmt.run(key, JSON.stringify(value));
  },

  updateMultiple(settings: Record<string, unknown>): void {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = CURRENT_TIMESTAMP
    `);

    const transaction = db.transaction((entries: [string, unknown][]) => {
      for (const [key, value] of entries) {
        stmt.run(key, JSON.stringify(value));
      }
    });

    transaction(Object.entries(settings));
  },
};
