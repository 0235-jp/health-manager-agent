/**
 * プラグインリポジトリ
 * プラグインの設定・状態をDBに永続化
 */

import { getDatabase } from '../index.js';

export interface PluginRecord {
  id: number;
  name: string;
  display_name: string;
  version: string;
  type: string;
  description: string | null;
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
  config?: Record<string, unknown>;
  isActive?: boolean;
}

export interface PluginUpdateInput {
  displayName?: string;
  version?: string;
  description?: string;
  config?: Record<string, unknown>;
  isActive?: boolean;
}

function parseConfig(config: string): Record<string, unknown> {
  try {
    return JSON.parse(config);
  } catch {
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
    const now = new Date().toISOString();

    const result = db.prepare(`
      INSERT INTO plugins (name, display_name, version, type, description, config, is_active, installed_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      input.name,
      input.displayName,
      input.version,
      input.type,
      input.description || null,
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
    const db = getDatabase();
    const existing = this.findByName(name);

    if (!existing) {
      return undefined;
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (input.displayName !== undefined) {
      updates.push('display_name = ?');
      values.push(input.displayName);
    }
    if (input.version !== undefined) {
      updates.push('version = ?');
      values.push(input.version);
    }
    if (input.description !== undefined) {
      updates.push('description = ?');
      values.push(input.description);
    }
    if (input.config !== undefined) {
      updates.push('config = ?');
      values.push(JSON.stringify(input.config));
    }
    if (input.isActive !== undefined) {
      updates.push('is_active = ?');
      values.push(input.isActive ? 1 : 0);
    }

    if (updates.length === 0) {
      return existing;
    }

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());

    values.push(name);

    db.prepare(`
      UPDATE plugins SET ${updates.join(', ')} WHERE name = ?
    `).run(...values);

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

    return row ? row.value : null;
  },

  /**
   * 現在のエージェントプラグイン名を設定
   */
  setCurrentAgentName(name: string): void {
    const db = getDatabase();
    db.prepare(`
      INSERT OR REPLACE INTO settings (key, value, updated_at)
      VALUES ('current_agent', ?, ?)
    `).run(name, new Date().toISOString());
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
