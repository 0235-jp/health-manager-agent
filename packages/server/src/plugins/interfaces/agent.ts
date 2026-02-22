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
  /** Claude Agent SDK の Skill ツールをサポートするか */
  skills?: boolean;
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
  reportType: 'on_fetch' | 'daily' | 'manual';
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
 * レポートアラート - 通知すべき重要な健康情報
 */
export interface ReportAlert {
  /** アラートID（検証時の参照用） */
  id: string;
  /** アラートタイプ（'low_steps', 'poor_sleep' など） */
  type: string;
  /** ユーザーへのメッセージ */
  message: string;
  /** 優先度 */
  priority: 'high' | 'medium' | 'low';
  /** アクションが必要か */
  actionRequired: boolean;
  /** 検証時にAgentに渡すプロンプト */
  verificationPrompt?: string;
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
  /** 通知すべきアラート */
  alerts: ReportAlert[];
}

/**
 * ユーザー返信の解析結果
 */
export interface ResponseAction {
  /** アクションタイプ */
  action: 'done' | 'snooze' | 'cancel' | 'unclear';
  /** スヌーズ時間（ミリ秒）- action: 'snooze' 時のみ */
  durationMs?: number;
  /** 追加質問メッセージ - action: 'unclear' 時のみ */
  replyMessage?: string;
}

/**
 * アラート検証結果
 */
export interface VerificationResult {
  /** 問題が解決したか */
  resolved: boolean;
  /** ユーザーへのメッセージ */
  message: string;
}

/**
 * チャットメッセージ
 */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * チャットパラメータ
 */
export interface ChatParams {
  /** ユーザーメッセージ */
  message: string;
  /** 会話履歴（プラグインによっては無視） */
  history: ChatMessage[];
  /** セッションID（プラグインによっては無視） */
  sessionId?: string;
  /** カスタム指示 */
  customInstructions?: Array<{
    instruction: string;
    priority: number;
  }>;
}

/**
 * チャット結果
 */
export interface ChatResult {
  /** セッションID（継続用） */
  sessionId: string;
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
   * ストリーミングチャット（オプション）
   * テキストチャンクを yield し、最後に ChatResult を返す
   */
  chat?(params: ChatParams): AsyncGenerator<string, ChatResult, unknown>;

  /**
   * ユーザー返信を解析して次のアクションを決定（オプション）
   * ChatPlugin連携時に使用
   * @param alert 対象のアラート
   * @param userMessage ユーザーからの返信メッセージ
   */
  processUserResponse?(
    alert: ReportAlert,
    userMessage: string
  ): Promise<ResponseAction>;

  /**
   * アラートの状態を検証（オプション）
   * 「対応した」後にデータを再確認
   * @param alert 検証対象のアラート
   */
  verifyAlert?(alert: ReportAlert): Promise<VerificationResult>;
}

/**
 * AgentPluginかどうかを判定
 */
export function isAgentPlugin(plugin: BasePlugin): plugin is AgentPlugin {
  return plugin.manifest.type === 'agent';
}
