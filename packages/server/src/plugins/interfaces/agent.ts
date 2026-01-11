/**
 * AgentPlugin - AI分析プラグイン
 */

import type { BasePlugin, PluginManifest } from './base.js';

/**
 * エージェントの能力
 */
export interface AgentCapabilities {
  streaming?: boolean;
  functionCalling?: boolean;
  structuredOutput?: boolean;
  vision?: boolean;
}

/**
 * Agentプラグインのマニフェスト
 */
export interface AgentManifest extends PluginManifest {
  type: 'agent';
  provider: string; // "anthropic", "openai"等
  supportedModels?: string[];
  capabilities: AgentCapabilities;
}

/**
 * レポート生成パラメータ
 * 既存のAgentAdapterと互換性を保つ
 */
export interface GenerateReportParams {
  /** レポートタイプ */
  reportType: 'on_fetch' | 'daily';
  /** 評価対象期間の開始 */
  periodStart: Date;
  /** 評価対象期間の終了 */
  periodEnd: Date;
  /** カスタム指示 */
  customInstructions?: Array<{
    instruction: string;
    priority: number;
  }>;
}

/**
 * レポート内容
 */
export interface ReportContent {
  summary: string;
  metrics: Record<
    string,
    {
      value: number;
      unit: string;
      trend: 'up' | 'down' | 'stable';
    }
  >;
  risks: string[];
  recommendations: string[];
}

/**
 * ストリーミング用のチャンク
 */
export interface ReportChunk {
  type: 'text' | 'metrics' | 'complete';
  content: string | Partial<ReportContent>;
}

/**
 * AgentPluginインターフェース
 * 既存のAgentAdapterと互換性を持たせる
 */
export interface AgentPlugin extends BasePlugin {
  readonly manifest: AgentManifest;

  /**
   * アダプタ名（AgentAdapter互換）
   */
  readonly name: string;

  /**
   * レポート生成
   */
  generateReport(params: GenerateReportParams): Promise<ReportContent>;

  /**
   * ストリーミングレポート生成（オプション）
   */
  generateReportStream?(
    params: GenerateReportParams
  ): AsyncGenerator<ReportChunk, void, unknown>;
}

/**
 * AgentPluginかどうかを判定
 */
export function isAgentPlugin(plugin: BasePlugin): plugin is AgentPlugin {
  return plugin.manifest.type === 'agent';
}
