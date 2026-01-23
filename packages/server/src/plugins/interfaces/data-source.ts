/**
 * DataSourcePlugin - データ収集プラグイン
 */

import type { BasePlugin, PluginManifest } from './base.js';

/**
 * データタイプ定義
 */
export interface DataTypeDefinition {
  name: string; // 識別子（標準タイプまたは plugin_name:custom_type）
  displayName: string;
  category: string; // 身体, 心臓, 睡眠, 活動, 体温, 精神
  unit: string;
  description?: string;
  timeseries?: boolean; // 時系列データかどうか
  interval?: number; // 時系列の場合の間隔（秒）
}

/**
 * DataSourceプラグインのマニフェスト
 */
export interface DataSourceManifest extends PluginManifest {
  type: 'data-source';
  supportedDataTypes: DataTypeDefinition[];
  fetchStrategy: 'manual' | 'scheduled' | 'both';
  defaultFetchInterval?: number; // 分単位
}

/**
 * データ取得オプション
 */
export interface FetchOptions {
  startDate?: Date;
  endDate?: Date;
  dataTypes?: string[];
}

/**
 * ヘルスデータ入力
 */
export interface HealthDataInput {
  dataType: string;
  value: number;
  unit: string;
  recordedAt: Date;
  metadata?: Record<string, unknown>;
}

/**
 * 時系列データ入力
 */
export interface TimeseriesDataInput {
  dataType: string;
  timestamp: Date;
  value: number;
  intervalSeconds: number;
  source?: string;
  periodDate?: string; // YYYY-MM-DD 形式
  parentId?: string; // 親レコードのID（例: sleep session ID）
  metadata?: Record<string, unknown>;
}

/**
 * データ取得結果
 */
export interface FetchResult {
  success: boolean;
  data: HealthDataInput[];
  timeseriesData?: TimeseriesDataInput[];
  errors?: string[];
  nextFetchAt?: Date;
}

/**
 * プラグインごとのデータ取得オプション
 */
export interface PerPluginFetchOptions {
  [pluginName: string]: FetchOptions;
}

/**
 * プラグインごとのデータ取得結果
 */
export interface PluginFetchResult {
  pluginName: string;
  success: boolean;
  data: HealthDataInput[];
  timeseriesData?: TimeseriesDataInput[];
  errors?: string[];
  fetchedAt: Date;
}

/**
 * 接続テスト結果
 */
export interface ConnectionTestResult {
  success: boolean;
  message?: string;
}

/**
 * DataSourceプラグインインターフェース
 */
export interface DataSourcePlugin extends BasePlugin {
  readonly manifest: DataSourceManifest;

  /**
   * データを取得
   * @param options 取得オプション
   */
  fetchData(options: FetchOptions): Promise<FetchResult>;

  /**
   * 接続テスト
   */
  testConnection(): Promise<ConnectionTestResult>;

  /**
   * OAuth認証URL取得（OAuth対応プラグイン用）
   * @param redirectUri リダイレクトURI
   * @param state CSRF防止用のstate値
   */
  getAuthorizationUrl?(redirectUri: string, state: string): string;

  /**
   * OAuthコールバック処理
   * @param code 認証コード
   * @param redirectUri リダイレクトURI
   */
  handleOAuthCallback?(code: string, redirectUri: string): Promise<unknown>;
}

/**
 * DataSourceプラグインかどうかを判定
 */
export function isDataSourcePlugin(plugin: BasePlugin): plugin is DataSourcePlugin {
  return plugin.manifest.type === 'data-source';
}
