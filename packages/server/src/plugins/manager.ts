/**
 * PluginManager - プラグインシステムのオーケストレーター
 */

import * as path from 'path';
import { PluginLoader, type LoadedPlugin } from './loader.js';
import { PluginRegistry, type PluginState } from './registry.js';
import { EventBus } from './event-bus.js';
import type {
  AgentManifest,
  AgentPlugin,
  ChatManifest,
  ChatPlugin,
  FetchOptions,
  GenerateReportParams,
  HealthDataInput,
  NotificationEvent,
  NotificationPlugin,
  PerPluginFetchOptions,
  PluginContext,
  PluginFetchResult,
  PluginManifest,
  PluginType,
  ReportContent,
  TimeseriesDataInput,
} from './interfaces/index.js';
import { pluginsRepository, type PluginRecord } from '../db/repositories/plugins.js';
import { customInstructionsRepository } from '../db/repositories/custom-instructions.js';
import { DefaultToolExecutor, DefaultPromptBuilder } from './tools/index.js';
import type { ToolExecutor, PromptBuilder } from './tools/index.js';

/**
 * プラグインマネージャー
 * プラグインシステム全体の統括を担当
 */
export class PluginManager {
  private static instance: PluginManager | null = null;

  private loader: PluginLoader;
  private registry: PluginRegistry;
  private eventBus: EventBus;
  private pluginsDir: string;
  private currentAgentName: string | null = null;
  private initialized = false;
  private pluginConfigStore: Map<string, Record<string, unknown>> = new Map();
  private pluginUnsubscribers: Map<string, () => void> = new Map();

  // Tool system
  private toolExecutor: ToolExecutor;
  private promptBuilder: PromptBuilder;
  private serverBaseUrl: string;

  private constructor(pluginsDir: string) {
    this.pluginsDir = pluginsDir;
    this.loader = new PluginLoader(pluginsDir);
    this.registry = new PluginRegistry();
    this.eventBus = new EventBus();

    // Initialize tool system
    this.serverBaseUrl = process.env.SERVER_BASE_URL || 'http://localhost:3001';
    this.toolExecutor = new DefaultToolExecutor();
    this.promptBuilder = new DefaultPromptBuilder(this.toolExecutor, this.serverBaseUrl);
  }

  /**
   * シングルトンインスタンスを取得
   * @param pluginsDir プラグインディレクトリ（初回のみ必要）
   */
  static getInstance(pluginsDir?: string): PluginManager {
    if (!PluginManager.instance) {
      if (!pluginsDir) {
        // デフォルトのプラグインディレクトリ
        pluginsDir = path.resolve(process.cwd(), 'data', 'plugins');
      }
      PluginManager.instance = new PluginManager(pluginsDir);
    }
    return PluginManager.instance;
  }

  /**
   * プラグインマネージャーを初期化
   * サーバー起動時に呼び出す
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    console.log('[PluginManager] Initializing...');

    // DBからアクティブなプラグインを取得してロード
    const activePlugins = pluginsRepository.findAll().filter((p) => p.is_active === 1);

    for (const pluginRecord of activePlugins) {
      try {
        const pluginPath = path.join(this.pluginsDir, pluginRecord.name);
        const state = await this.loadPluginFromPath(pluginPath);

        // DBから保存された設定を取得して適用
        const savedConfig = pluginsRepository.getConfig(pluginRecord.name);
        if (savedConfig && Object.keys(savedConfig).length > 0) {
          await this.updatePluginConfig(pluginRecord.name, savedConfig);
        }

        // manifestのsupportedDataTypesをDBに保存（既存プラグインのマイグレーション対応）
        this.migrateSupportedDataTypes(state.manifest, pluginRecord);

        console.log(`[PluginManager] Auto-loaded plugin: ${pluginRecord.name}`);
      } catch (error) {
        console.error(
          `[PluginManager] Failed to auto-load plugin ${pluginRecord.name}:`,
          error
        );
      }
    }

    // DBから保存されたcurrent_agentを復元（agent型プラグインのみ）
    const savedCurrentAgent = pluginsRepository.getCurrentAgentName();
    if (savedCurrentAgent) {
      const state = this.registry.get(savedCurrentAgent);
      if (state && state.manifest.type === 'agent') {
        this.currentAgentName = savedCurrentAgent;
        console.log(`[PluginManager] Restored current agent: ${savedCurrentAgent}`);
      }
    }

    this.initialized = true;
    console.log(`[PluginManager] Initialized (${activePlugins.length} plugins auto-loaded)`);
  }

  /**
   * ZIPからプラグインをインストール
   * @param zipPath ZIPファイルのパス
   * @returns インストールされたプラグイン情報
   */
  async installPlugin(zipPath: string): Promise<PluginState> {
    console.log(`[PluginManager] Installing plugin from ${zipPath}...`);

    const loadedPlugin = await this.loader.installFromZip(zipPath);
    return await this.registerAndInitializePlugin(loadedPlugin);
  }

  /**
   * プラグインディレクトリから直接ロード（開発用）
   * @param pluginPath プラグインディレクトリのパス
   */
  async loadPluginFromPath(pluginPath: string): Promise<PluginState> {
    console.log(`[PluginManager] Loading plugin from ${pluginPath}...`);

    const loadedPlugin = await this.loader.loadPlugin(pluginPath);
    return await this.registerAndInitializePlugin(loadedPlugin);
  }

  /**
   * プラグインをアンインストール
   * @param pluginName プラグイン名
   */
  async uninstallPlugin(pluginName: string): Promise<void> {
    console.log(`[PluginManager] Uninstalling plugin: ${pluginName}...`);

    const state = this.registry.get(pluginName);
    if (!state) {
      throw new Error(`Plugin "${pluginName}" is not installed`);
    }

    // プラグインをdispose
    try {
      await state.plugin.dispose();
    } catch (error) {
      console.error(`[PluginManager] Error disposing plugin ${pluginName}:`, error);
    }

    // 現在のエージェントだった場合はクリア
    if (this.currentAgentName === pluginName) {
      this.currentAgentName = null;
    }

    // EventBusの購読を解除
    const unsubscribe = this.pluginUnsubscribers.get(pluginName);
    if (unsubscribe) {
      unsubscribe();
      this.pluginUnsubscribers.delete(pluginName);
    }

    // レジストリから削除
    this.registry.unregister(pluginName);

    // ファイルを削除
    await this.loader.uninstall(pluginName);

    // 保存された設定を削除
    this.pluginConfigStore.delete(pluginName);

    console.log(`[PluginManager] Plugin ${pluginName} uninstalled`);
  }

  /**
   * プラグインを登録して初期化
   */
  private async registerAndInitializePlugin(
    loadedPlugin: LoadedPlugin
  ): Promise<PluginState> {
    const { manifest, instance } = loadedPlugin;

    // 既存のプラグインがあれば先にdispose
    const existing = this.registry.get(manifest.name);
    if (existing) {
      try {
        await existing.plugin.dispose();
      } catch (error) {
        console.error(`[PluginManager] Error disposing existing plugin:`, error);
      }
      this.registry.unregister(manifest.name);
    }

    // 保存された設定を復元
    const savedConfig = this.pluginConfigStore.get(manifest.name) || {};

    // レジストリに登録
    this.registry.register(instance, savedConfig, true);

    // PluginContextを構築
    const context = this.buildPluginContext(manifest, savedConfig);

    // プラグインを初期化
    try {
      await instance.initialize(context);
      console.log(`[PluginManager] Plugin ${manifest.name} initialized`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.registry.setError(manifest.name, errorMsg);
      console.error(`[PluginManager] Failed to initialize ${manifest.name}:`, error);
    }

    // 通知プラグインの場合、EventBusに登録
    if (manifest.type === 'notification') {
      this.registerNotificationPlugin(instance as NotificationPlugin);
    }

    // ChatプラグインもEventBusに登録
    if (manifest.type === 'chat') {
      this.registerChatPlugin(instance as ChatPlugin);
    }

    // Agentプラグインで現在のエージェントが未設定なら設定
    if (manifest.type === 'agent' && !this.currentAgentName) {
      this.currentAgentName = manifest.name;
    }

    return this.registry.get(manifest.name)!;
  }

  /**
   * プラグイン初期化コンテキストを構築
   */
  private buildPluginContext(
    manifest: LoadedPlugin['manifest'],
    config: Record<string, unknown>
  ): PluginContext {
    const context: PluginContext = { config };

    // 設定永続化コールバック
    context.saveConfig = (newConfig: Record<string, unknown>) => {
      const state = this.registry.get(manifest.name);
      if (state) {
        this.registry.updateConfig(manifest.name, newConfig);
        this.pluginConfigStore.set(manifest.name, state.config);
        pluginsRepository.updateConfig(manifest.name, state.config);
      }
    };

    // Agentプラグインの場合、ToolExecutorとPromptBuilderを提供
    if (manifest.type === 'agent') {
      const agentManifest = manifest as AgentManifest;
      context.toolExecutor = this.toolExecutor;
      context.promptBuilder = this.promptBuilder;
      context.useSkills = agentManifest.capabilities?.skills ?? false;
    }

    // ChatプラグインにもToolExecutorを提供（データ検証用）
    if (manifest.type === 'chat') {
      context.toolExecutor = this.toolExecutor;
    }

    return context;
  }

  /**
   * supportedDataTypesをDBに同期（プラグイン更新時にも反映）
   */
  private migrateSupportedDataTypes(
    manifest: PluginManifest,
    pluginRecord: PluginRecord
  ): void {
    if (manifest.type !== 'data-source') {
      return;
    }

    const dataSourceManifest = manifest as import('./interfaces/index.js').DataSourceManifest;
    pluginsRepository.update(pluginRecord.name, {
      supportedDataTypes: dataSourceManifest.supportedDataTypes,
    });
  }

  /**
   * 通知プラグインをEventBusに登録
   */
  private registerNotificationPlugin(plugin: NotificationPlugin): void {
    const supportedEvents = plugin.manifest.supportedEvents;
    const pluginName = plugin.manifest.name;

    // 既存の購読があれば解除
    const existingUnsubscribe = this.pluginUnsubscribers.get(pluginName);
    if (existingUnsubscribe) {
      existingUnsubscribe();
    }

    const unsubscribe = this.eventBus.subscribeMany(supportedEvents, async (event) => {
      const state = this.registry.get(pluginName);
      if (!state?.isActive) return;

      try {
        await plugin.notify(event);
      } catch (error) {
        console.error(
          `[PluginManager] Notification plugin ${pluginName} failed:`,
          error
        );
      }
    });

    // unsubscribe関数を保存
    this.pluginUnsubscribers.set(pluginName, unsubscribe);
  }

  /**
   * ChatプラグインをEventBusに登録
   */
  private registerChatPlugin(plugin: ChatPlugin): void {
    const supportedEvents = plugin.manifest.supportedEvents;
    const pluginName = plugin.manifest.name;

    // 既存の購読があれば解除
    const existingUnsubscribe = this.pluginUnsubscribers.get(pluginName);
    if (existingUnsubscribe) {
      existingUnsubscribe();
    }

    const unsubscribe = this.eventBus.subscribeMany(supportedEvents, async (event) => {
      const state = this.registry.get(pluginName);
      if (!state?.isActive) return;

      // ChatPluginはreport:generatedイベントのアラートを処理
      if (event.type === 'report:generated' || event.type === 'report:daily') {
        const payload = event.payload as import('./interfaces/notification.js').ReportGeneratedPayload;
        const alerts = payload.content.alerts;

        if (alerts && alerts.length > 0) {
          for (const alert of alerts) {
            try {
              // ChatPluginの設定からターゲットユーザーIDを取得
              const targetUserId = state.config.targetUserId as string;
              if (!targetUserId) {
                console.warn(`[PluginManager] ChatPlugin ${pluginName} has no targetUserId configured`);
                continue;
              }

              await plugin.startConversation({
                externalUserId: targetUserId,
                eventType: event.type,
                alert,
              });
            } catch (error) {
              console.error(
                `[PluginManager] ChatPlugin ${pluginName} failed to start conversation:`,
                error
              );
            }
          }
        }
      }
    });

    // unsubscribe関数を保存
    this.pluginUnsubscribers.set(pluginName, unsubscribe);
  }

  // ========== プラグイン一覧・取得 ==========

  /**
   * プラグイン一覧を取得
   * @param type プラグインタイプでフィルタ（オプション）
   */
  getPlugins(type?: PluginType): PluginState[] {
    if (type) {
      return this.registry.getByType(type);
    }
    return this.registry.all();
  }

  /**
   * プラグインを取得
   * @param name プラグイン名
   */
  getPlugin(name: string): PluginState | undefined {
    return this.registry.get(name);
  }

  // ========== エージェント管理 ==========

  /**
   * 現在のAgentPluginを取得
   */
  getCurrentAgent(): AgentPlugin | null {
    if (!this.currentAgentName) {
      return null;
    }

    const agents = this.registry.getAgentPlugins();
    return agents.find((a) => a.manifest.name === this.currentAgentName) || null;
  }

  /**
   * 現在のエージェント名を取得
   */
  getCurrentAgentName(): string | null {
    return this.currentAgentName;
  }

  /**
   * エージェントを切り替え
   * @param pluginName プラグイン名
   */
  async setCurrentAgent(pluginName: string): Promise<void> {
    const state = this.registry.get(pluginName);

    if (!state) {
      throw new Error(`Plugin "${pluginName}" is not installed`);
    }

    if (state.manifest.type !== 'agent') {
      throw new Error(`Plugin "${pluginName}" is not an agent plugin`);
    }

    this.currentAgentName = pluginName;
    pluginsRepository.setCurrentAgentName(pluginName);
    console.log(`[PluginManager] Current agent set to: ${pluginName}`);
  }

  /**
   * レポートを生成
   * @param params レポート生成パラメータ
   */
  async generateReport(params: GenerateReportParams): Promise<ReportContent> {
    const agent = this.getCurrentAgent();

    if (!agent) {
      throw new Error(
        'No agent plugin installed. Please install an agent plugin from the Plugins page.'
      );
    }

    // カスタム指示が指定されていない場合は取得
    if (!params.customInstructions) {
      const activeInstructions = customInstructionsRepository.findActive();
      params.customInstructions = activeInstructions.map((inst) => ({
        instruction: inst.instruction,
        priority: inst.priority,
      }));
    }

    return agent.generateReport(params);
  }

  // ========== 設定管理 ==========

  /**
   * プラグイン設定を更新
   * @param name プラグイン名
   * @param config 新しい設定
   */
  async updatePluginConfig(
    name: string,
    config: Record<string, unknown>
  ): Promise<void> {
    const state = this.registry.get(name);
    if (!state) {
      throw new Error(`Plugin "${name}" is not installed`);
    }

    // 設定を更新（registry.updateConfigがstate.configをマージする）
    this.registry.updateConfig(name, config);

    // 更新後の設定を保存（state.configは参照なので既に更新済み）
    this.pluginConfigStore.set(name, state.config);

    // PluginContextを構築して再初期化
    const context = this.buildPluginContext(state.manifest, state.config);

    try {
      await state.plugin.dispose();
      await state.plugin.initialize(context);
      this.registry.setError(name, undefined);
      console.log(`[PluginManager] Plugin ${name} reconfigured`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.registry.setError(name, errorMsg);
      throw error;
    }
  }

  /**
   * プラグインの有効/無効を切り替え
   * @param name プラグイン名
   * @param isActive 有効/無効
   */
  async setPluginActive(name: string, isActive: boolean): Promise<void> {
    const state = this.registry.get(name);
    if (!state) {
      throw new Error(`Plugin "${name}" is not installed`);
    }

    this.registry.setActive(name, isActive);
    console.log(`[PluginManager] Plugin ${name} ${isActive ? 'activated' : 'deactivated'}`);
  }

  // ========== イベント発行 ==========

  /**
   * イベントを発行
   * @param event 通知イベント
   */
  async publishEvent(event: NotificationEvent): Promise<void> {
    await this.eventBus.publish(event);
  }

  // ========== DataSource実行 ==========

  /**
   * DataSourceプラグインを実行してデータを取得
   * @param options 取得オプション
   */
  async executeDataSourcePlugins(
    options: FetchOptions
  ): Promise<HealthDataInput[]> {
    const results: HealthDataInput[] = [];
    const plugins = this.registry.getDataSourcePlugins();

    for (const plugin of plugins) {
      try {
        const result = await plugin.fetchData(options);
        if (result.success) {
          results.push(...result.data);
        } else {
          console.error(
            `[PluginManager] DataSource ${plugin.manifest.name} failed:`,
            result.errors
          );
        }
      } catch (error) {
        console.error(
          `[PluginManager] DataSource ${plugin.manifest.name} error:`,
          error
        );
      }
    }

    return this.resolveConflicts(results);
  }

  /**
   * DataSourceプラグインをプラグインごとのオプションで実行
   * 各プラグインの成功/失敗を個別に追跡
   * @param defaultOptions デフォルトの取得オプション
   * @param perPluginOptions プラグインごとの取得オプション（オプション）
   * @param pluginNames 実行するプラグイン名（オプション、指定なしで全プラグイン）
   */
  async executeDataSourcePluginsWithState(
    defaultOptions: FetchOptions,
    perPluginOptions?: PerPluginFetchOptions,
    pluginNames?: string[]
  ): Promise<PluginFetchResult[]> {
    const results: PluginFetchResult[] = [];
    let plugins = this.registry.getDataSourcePlugins();

    // プラグイン名が指定されていればフィルタ
    if (pluginNames && pluginNames.length > 0) {
      plugins = plugins.filter((p) => pluginNames.includes(p.manifest.name));
    }

    for (const plugin of plugins) {
      const pluginName = plugin.manifest.name;
      const fetchedAt = new Date();

      // プラグイン固有のオプションがあれば使用、なければデフォルト
      const options = perPluginOptions?.[pluginName] || defaultOptions;

      try {
        const result = await plugin.fetchData(options);
        results.push({
          pluginName,
          success: result.success,
          data: result.data,
          timeseriesData: result.timeseriesData,
          errors: result.errors,
          fetchedAt,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(
          `[PluginManager] DataSource ${pluginName} error:`,
          error
        );
        results.push({
          pluginName,
          success: false,
          data: [],
          errors: [errorMessage],
          fetchedAt,
        });
      }
    }

    return results;
  }

  /**
   * 重複データの競合を解決
   * 同じタイムスタンプ・データタイプの場合、最初のデータを採用
   */
  private resolveConflicts(data: HealthDataInput[]): HealthDataInput[] {
    const seen = new Map<string, HealthDataInput>();

    for (const item of data) {
      const key = `${item.dataType}_${item.recordedAt.toISOString()}`;
      if (!seen.has(key)) {
        seen.set(key, item);
      }
    }

    return Array.from(seen.values());
  }

  // ========== クリーンアップ ==========

  /**
   * すべてのプラグインをdispose
   */
  async dispose(): Promise<void> {
    console.log('[PluginManager] Disposing all plugins...');

    const plugins = this.registry.all();

    for (const state of plugins) {
      try {
        await state.plugin.dispose();
      } catch (error) {
        console.error(
          `[PluginManager] Error disposing ${state.manifest.name}:`,
          error
        );
      }
    }

    this.eventBus.clear();
    this.registry.clear();
    this.pluginUnsubscribers.clear();
    this.initialized = false;

    console.log('[PluginManager] All plugins disposed');
  }

  /**
   * プラグインディレクトリのパスを取得
   */
  getPluginsDir(): string {
    return this.pluginsDir;
  }

  /**
   * ToolExecutorを取得
   */
  getToolExecutor(): ToolExecutor {
    return this.toolExecutor;
  }

  /**
   * PromptBuilderを取得
   */
  getPromptBuilder(): PromptBuilder {
    return this.promptBuilder;
  }
}
