/**
 * PluginRegistry - プラグインインスタンスの管理
 */

import type {
  BasePlugin,
  PluginType,
  PluginManifest,
  DataSourcePlugin,
  AgentPlugin,
  NotificationPlugin,
  ChatPlugin,
} from './interfaces/index.js';

/**
 * プラグインの状態
 */
export interface PluginState {
  plugin: BasePlugin;
  manifest: PluginManifest;
  isActive: boolean;
  config: Record<string, unknown>;
  lastError?: string;
  installedAt: Date;
}

/**
 * プラグインレジストリ
 * プラグインインスタンスの登録・管理・検索を担当
 */
export class PluginRegistry {
  private plugins: Map<string, PluginState> = new Map();

  /**
   * プラグインを登録
   * @param plugin プラグインインスタンス
   * @param config 設定値
   * @param isActive 有効/無効
   */
  register(
    plugin: BasePlugin,
    config: Record<string, unknown> = {},
    isActive = true
  ): void {
    const name = plugin.manifest.name;

    if (this.plugins.has(name)) {
      throw new Error(`Plugin "${name}" is already registered`);
    }

    this.plugins.set(name, {
      plugin,
      manifest: plugin.manifest,
      isActive,
      config,
      installedAt: new Date(),
    });
  }

  /**
   * プラグインを登録解除
   * @param name プラグイン名
   */
  unregister(name: string): void {
    if (!this.plugins.has(name)) {
      throw new Error(`Plugin "${name}" is not registered`);
    }
    this.plugins.delete(name);
  }

  /**
   * プラグインを取得
   * @param name プラグイン名
   */
  get(name: string): PluginState | undefined {
    return this.plugins.get(name);
  }

  /**
   * プラグインが存在するか
   * @param name プラグイン名
   */
  has(name: string): boolean {
    return this.plugins.has(name);
  }

  /**
   * タイプ別にプラグイン状態を取得
   * @param type プラグインタイプ
   */
  getByType(type: PluginType): PluginState[] {
    return Array.from(this.plugins.values()).filter(
      (state) => state.manifest.type === type
    );
  }

  /**
   * タイプ別にアクティブなプラグインを取得
   * @param type プラグインタイプ
   */
  getActiveByType<T extends BasePlugin>(type: PluginType): T[] {
    return this.getByType(type)
      .filter((state) => state.isActive)
      .map((state) => state.plugin as T);
  }

  /**
   * DataSourceプラグインを取得
   */
  getDataSourcePlugins(): DataSourcePlugin[] {
    return this.getActiveByType<DataSourcePlugin>('data-source');
  }

  /**
   * Agentプラグインを取得
   */
  getAgentPlugins(): AgentPlugin[] {
    return this.getActiveByType<AgentPlugin>('agent');
  }

  /**
   * Notificationプラグインを取得
   */
  getNotificationPlugins(): NotificationPlugin[] {
    return this.getActiveByType<NotificationPlugin>('notification');
  }

  /**
   * Chatプラグインを取得
   */
  getChatPlugins(): ChatPlugin[] {
    return this.getActiveByType<ChatPlugin>('chat');
  }

  /**
   * プラグインの有効/無効を設定
   * @param name プラグイン名
   * @param isActive 有効/無効
   */
  setActive(name: string, isActive: boolean): void {
    const state = this.plugins.get(name);
    if (!state) {
      throw new Error(`Plugin "${name}" is not registered`);
    }
    state.isActive = isActive;
  }

  /**
   * プラグインの設定を更新
   * @param name プラグイン名
   * @param config 新しい設定
   */
  updateConfig(name: string, config: Record<string, unknown>): void {
    const state = this.plugins.get(name);
    if (!state) {
      throw new Error(`Plugin "${name}" is not registered`);
    }
    state.config = { ...state.config, ...config };
  }

  /**
   * プラグインのエラーを記録
   * @param name プラグイン名
   * @param error エラーメッセージ
   */
  setError(name: string, error: string | undefined): void {
    const state = this.plugins.get(name);
    if (state) {
      state.lastError = error;
    }
  }

  /**
   * すべてのプラグイン状態を取得
   */
  all(): PluginState[] {
    return Array.from(this.plugins.values());
  }

  /**
   * プラグイン数を取得
   */
  get size(): number {
    return this.plugins.size;
  }

  /**
   * すべてのプラグインをクリア
   */
  clear(): void {
    this.plugins.clear();
  }
}
