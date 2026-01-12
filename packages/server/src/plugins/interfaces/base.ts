/**
 * プラグインシステム - 基底インターフェース
 */

import type { ToolExecutor, PromptBuilder } from '../tools/index.js';

export type PluginType = 'data-source' | 'agent' | 'notification';

/**
 * 設定フィールドの定義
 */
export interface ConfigField {
  type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect';
  label: string;
  description?: string;
  required?: boolean;
  secret?: boolean; // trueの場合、UIでマスク表示
  default?: string | number | boolean | string[];
  options?: Array<{ value: string; label: string }>; // select/multiselectタイプ用
}

/**
 * 設定スキーマ
 */
export interface ConfigSchema {
  [key: string]: ConfigField;
}

/**
 * プラグインマニフェスト（manifest.json）
 */
export interface PluginManifest {
  name: string; // 識別子（英数字-_のみ）
  displayName: string; // 表示名
  version: string; // セマンティックバージョン
  type: PluginType; // プラグインタイプ
  description?: string;
  author?: string;
  main: string; // エントリーポイント (例: "dist/index.js")
  configSchema?: ConfigSchema; // 設定項目の定義
  requiredEnvVars?: string[]; // 必須環境変数
}

/**
 * バリデーション結果
 */
export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

/**
 * プラグイン初期化コンテキスト
 */
export interface PluginContext {
  /** ユーザー設定 */
  config: Record<string, unknown>;
  /** ツール実行器（agentプラグインのみ） */
  toolExecutor?: ToolExecutor;
  /** プロンプトビルダー（agentプラグインのみ） */
  promptBuilder?: PromptBuilder;
  /** Skills対応かどうか（agentプラグインのみ） */
  useSkills?: boolean;
}

/**
 * 基底プラグインインターフェース
 */
export interface BasePlugin {
  readonly manifest: PluginManifest;

  /**
   * プラグインの初期化
   * @param context 初期化コンテキスト（設定値とオプションの依存関係）
   */
  initialize(context: PluginContext): Promise<void>;

  /**
   * リソースの解放
   */
  dispose(): Promise<void>;

  /**
   * 設定のバリデーション（オプション）
   * @param config 検証する設定値
   */
  validateConfig?(config: Record<string, unknown>): Promise<ValidationResult>;
}

/**
 * プラグインファクトリ関数の型
 */
export type PluginFactory<T extends BasePlugin = BasePlugin> = () => T;
