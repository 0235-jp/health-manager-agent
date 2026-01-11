/**
 * NotificationPlugin - 通知プラグイン
 */

import type { BasePlugin, PluginManifest } from './base.js';
import type { ReportContent } from './agent.js';

/**
 * 通知イベントタイプ
 */
export type NotificationEventType =
  | 'report:generated'
  | 'report:daily'
  | 'health:alert'
  | 'data:fetched'
  | 'system:error';

/**
 * Notificationプラグインのマニフェスト
 */
export interface NotificationManifest extends PluginManifest {
  type: 'notification';
  supportedEvents: NotificationEventType[];
  deliveryMethod: 'push' | 'pull' | 'both';
}

/**
 * レポート生成完了ペイロード
 */
export interface ReportGeneratedPayload {
  reportId: number;
  reportType: 'on_fetch' | 'daily';
  content: ReportContent;
  periodStart: Date;
  periodEnd: Date;
}

/**
 * 健康アラートペイロード
 */
export interface HealthAlertPayload {
  alertType: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  relatedData?: Record<string, unknown>;
}

/**
 * データ取得完了ペイロード
 */
export interface DataFetchedPayload {
  sourceName: string;
  recordCount: number;
  dataTypes: string[];
}

/**
 * システムエラーペイロード
 */
export interface SystemErrorPayload {
  error: string;
  stack?: string;
  context?: Record<string, unknown>;
}

/**
 * 通知ペイロード
 */
export type NotificationPayload =
  | ReportGeneratedPayload
  | HealthAlertPayload
  | DataFetchedPayload
  | SystemErrorPayload;

/**
 * 通知イベント
 */
export interface NotificationEvent {
  type: NotificationEventType;
  timestamp: Date;
  payload: NotificationPayload;
}

/**
 * 通知結果
 */
export interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * NotificationPluginインターフェース
 */
export interface NotificationPlugin extends BasePlugin {
  readonly manifest: NotificationManifest;

  /**
   * 通知を送信
   * @param event 通知イベント
   */
  notify(event: NotificationEvent): Promise<NotificationResult>;

  /**
   * テスト通知を送信
   */
  testNotification(): Promise<NotificationResult>;

  /**
   * メッセージのフォーマット（オプション）
   * @param event 通知イベント
   */
  formatMessage?(event: NotificationEvent): Promise<string>;
}

/**
 * NotificationPluginかどうかを判定
 */
export function isNotificationPlugin(
  plugin: BasePlugin
): plugin is NotificationPlugin {
  return plugin.manifest.type === 'notification';
}
