/**
 * プラグインリポジトリ
 * プラグインの設定・状態をDBに永続化
 */

import { getDatabase } from '../index.js';
import { nowUTC } from '../../utils/datetime.js';

export interface PluginRecord {
  id: number;
  name: string;
  display_name: string;
  version: string;
  type: string;
  description: string | null;
  supported_data_types: string | null; // JSON文字列
  config: string; // JSON文字列
  is_active: number;
  installed_at: string;
  updated_at: string;
}

export interface PluginCreateInput {
  name: string;
  displayName: string;
  version: string;
  type: string;
  description?: string;
  supportedDataTypes?: unknown[];
  config?: Record<string, unknown>;
  isActive?: boolean;
}

export interface PluginUpdateInput {
  displayName?: string;
  version?: string;
  description?: string;
  supportedDataTypes?: unknown[];
  config?: Record<string, unknown>;
  isActive?: boolean;
}

function parseConfig(config: string): Record<string, unknown> {
  try {
    return JSON.parse(config);
  } catch (error) {
    console.warn('[PluginsRepository] Failed to parse plugin config:', error);
    return {};
  }
}

export const pluginsRepository = {
  /**
   * すべてのプラグインを取得
   */
  findAll(type?: string): PluginRecord[] {
    const db = getDatabase();

    if (type) {
      return db
        .prepare('SELECT * FROM plugins WHERE type = ? ORDER BY name')
        .all(type) as PluginRecord[];
    }

    return db
      .prepare('SELECT * FROM plugins ORDER BY name')
      .all() as PluginRecord[];
  },

  /**
   * プラグインを名前で取得
   */
  findByName(name: string): PluginRecord | undefined {
    const db = getDatabase();
    return db
      .prepare('SELECT * FROM plugins WHERE name = ?')
      .get(name) as PluginRecord | undefined;
  },

  /**
   * プラグインを作成
   */
  create(input: PluginCreateInput): PluginRecord {
    const db = getDatabase();
    const now = nowUTC();

    db.prepare(`
      INSERT INTO plugins (name, display_name, version, type, description, supported_data_types, config, is_active, installed_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      input.name,
      input.displayName,
      input.version,
      input.type,
      input.description || null,
      input.supportedDataTypes ? JSON.stringify(input.supportedDataTypes) : null,
      JSON.stringify(input.config || {}),
      input.isActive !== false ? 1 : 0,
      now,
      now
    );

    return this.findByName(input.name)!;
  },

  /**
   * プラグインを更新
   */
  update(name: string, input: PluginUpdateInput): PluginRecord | undefined {
    const existing = this.findByName(name);
    if (!existing) {
      return undefined;
    }

    const fieldMappings: Array<{ key: keyof PluginUpdateInput; column: string; transform?: (v: unknown) => unknown }> = [
      { key: 'displayName', column: 'display_name' },
      { key: 'version', column: 'version' },
      { key: 'description', column: 'description' },
      { key: 'supportedDataTypes', column: 'supported_data_types', transform: JSON.stringify },
      { key: 'config', column: 'config', transform: JSON.stringify },
      { key: 'isActive', column: 'is_active', transform: (v) => (v ? 1 : 0) },
    ];

    const updates: string[] = [];
    const values: unknown[] = [];

    for (const { key, column, transform } of fieldMappings) {
      if (input[key] !== undefined) {
        updates.push(`${column} = ?`);
        values.push(transform ? transform(input[key]) : input[key]);
      }
    }

    if (updates.length === 0) {
      return existing;
    }

    updates.push('updated_at = ?');
    values.push(nowUTC());
    values.push(name);

    const db = getDatabase();
    db.prepare(`UPDATE plugins SET ${updates.join(', ')} WHERE name = ?`).run(...values);

    return this.findByName(name);
  },

  /**
   * プラグインの設定を更新
   */
  updateConfig(name: string, config: Record<string, unknown>): PluginRecord | undefined {
    const existing = this.findByName(name);
    if (!existing) {
      return undefined;
    }

    const currentConfig = parseConfig(existing.config);
    const newConfig = { ...currentConfig, ...config };

    return this.update(name, { config: newConfig });
  },

  /**
   * プラグインの有効/無効を更新
   */
  setActive(name: string, isActive: boolean): PluginRecord | undefined {
    return this.update(name, { isActive });
  },

  /**
   * プラグインを削除
   */
  delete(name: string): boolean {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM plugins WHERE name = ?').run(name);
    return result.changes > 0;
  },

  /**
   * 現在のエージェントプラグイン名を取得
   */
  getCurrentAgentName(): string | null {
    const db = getDatabase();
    const row = db
      .prepare("SELECT value FROM settings WHERE key = 'current_agent'")
      .get() as { value: string } | undefined;

    if (!row) return null;
    try {
      return JSON.parse(row.value) as string;
    } catch {
      return row.value;
    }
  },

  /**
   * 現在のエージェントプラグイン名を設定
   */
  setCurrentAgentName(name: string): void {
    const db = getDatabase();
    db.prepare(`
      INSERT OR REPLACE INTO settings (key, value, updated_at)
      VALUES ('current_agent', ?, ?)
    `).run(JSON.stringify(name), nowUTC());
  },

  /**
   * プラグインの設定を取得（パース済み）
   */
  getConfig(name: string): Record<string, unknown> | undefined {
    const plugin = this.findByName(name);
    if (!plugin) {
      return undefined;
    }
    return parseConfig(plugin.config);
  },
};
