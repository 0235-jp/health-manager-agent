/**
 * Plugin Collection State Repository
 *
 * プラグインごとのデータ収集状態を管理するリポジトリ
 */

import { getDatabase } from '../index.js';

export interface PluginCollectionState {
  plugin_name: string;
  last_collection_time: string | null;
  last_success_time: string | null;
  consecutive_failures: number;
  updated_at: string;
}

export interface PluginCollectionStateInput {
  pluginName: string;
  lastCollectionTime: Date | null;
  lastSuccessTime: Date | null;
  consecutiveFailures: number;
}

export const pluginCollectionStateRepository = {
  /**
   * プラグインの収集状態を取得
   */
  get(pluginName: string): PluginCollectionState | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM plugin_collection_state WHERE plugin_name = ?');
    const result = stmt.get(pluginName) as PluginCollectionState | undefined;
    return result || null;
  },

  /**
   * すべてのプラグインの収集状態を取得
   */
  getAll(): PluginCollectionState[] {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM plugin_collection_state ORDER BY plugin_name');
    return stmt.all() as PluginCollectionState[];
  },

  /**
   * プラグインの収集状態を更新または作成
   */
  upsert(state: PluginCollectionStateInput): PluginCollectionState {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO plugin_collection_state (
        plugin_name,
        last_collection_time,
        last_success_time,
        consecutive_failures,
        updated_at
      ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(plugin_name) DO UPDATE SET
        last_collection_time = excluded.last_collection_time,
        last_success_time = excluded.last_success_time,
        consecutive_failures = excluded.consecutive_failures,
        updated_at = CURRENT_TIMESTAMP
    `);

    stmt.run(
      state.pluginName,
      state.lastCollectionTime?.toISOString() || null,
      state.lastSuccessTime?.toISOString() || null,
      state.consecutiveFailures
    );

    return this.get(state.pluginName)!;
  },

  /**
   * 成功時の状態更新（失敗カウンタをリセット）
   */
  markSuccess(pluginName: string, collectionTime: Date): PluginCollectionState {
    return this.upsert({
      pluginName,
      lastCollectionTime: collectionTime,
      lastSuccessTime: collectionTime,
      consecutiveFailures: 0,
    });
  },

  /**
   * 失敗時の状態更新（失敗カウンタをインクリメント）
   */
  markFailure(pluginName: string, collectionTime: Date): PluginCollectionState {
    const current = this.get(pluginName);
    return this.upsert({
      pluginName,
      lastCollectionTime: collectionTime,
      lastSuccessTime: current?.last_success_time
        ? new Date(current.last_success_time)
        : null,
      consecutiveFailures: (current?.consecutive_failures || 0) + 1,
    });
  },

  /**
   * 失敗カウンタをリセット
   */
  resetFailures(pluginName: string): void {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE plugin_collection_state
      SET consecutive_failures = 0, updated_at = CURRENT_TIMESTAMP
      WHERE plugin_name = ?
    `);
    stmt.run(pluginName);
  },

  /**
   * プラグインの状態を削除
   */
  delete(pluginName: string): boolean {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM plugin_collection_state WHERE plugin_name = ?');
    const result = stmt.run(pluginName);
    return result.changes > 0;
  },

  /**
   * すべての状態をクリア
   */
  clear(): void {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM plugin_collection_state');
    stmt.run();
  },
};
