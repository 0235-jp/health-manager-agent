import { getDatabase } from './index.js';

export function initializeSchema(): void {
  const db = getDatabase();

  // health_data table
  db.exec(`
    CREATE TABLE IF NOT EXISTS health_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data_type TEXT NOT NULL,
      value REAL NOT NULL,
      unit TEXT,
      source TEXT NOT NULL DEFAULT 'manual',
      recorded_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_health_data_type ON health_data(data_type);
    CREATE INDEX IF NOT EXISTS idx_health_data_recorded_at ON health_data(recorded_at);
    CREATE INDEX IF NOT EXISTS idx_health_data_source ON health_data(source);
  `);

  // data_types table
  db.exec(`
    CREATE TABLE IF NOT EXISTS data_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      category TEXT,
      unit TEXT,
      is_standard INTEGER DEFAULT 0,
      plugin_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // reports table
  db.exec(`
    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_type TEXT NOT NULL,
      period_start DATETIME NOT NULL,
      period_end DATETIME NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(report_type);
    CREATE INDEX IF NOT EXISTS idx_reports_period ON reports(period_start, period_end);
  `);

  // settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // plugins table
  db.exec(`
    CREATE TABLE IF NOT EXISTS plugins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      version TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'notification',
      description TEXT,
      supported_data_types TEXT,
      config TEXT,
      is_active INTEGER DEFAULT 1,
      installed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migration: Add type column to plugins table if it doesn't exist
  const pluginsColumns = db.prepare("PRAGMA table_info(plugins)").all() as { name: string }[];
  const hasTypeColumn = pluginsColumns.some(col => col.name === 'type');
  if (!hasTypeColumn) {
    db.exec("ALTER TABLE plugins ADD COLUMN type TEXT NOT NULL DEFAULT 'notification'");
  }

  // custom_data_types table
  db.exec(`
    CREATE TABLE IF NOT EXISTS custom_data_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      unit TEXT,
      is_active INTEGER DEFAULT 1,
      notification_interval INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // custom_instructions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS custom_instructions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      instruction TEXT NOT NULL,
      priority INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}
