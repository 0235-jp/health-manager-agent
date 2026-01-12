/**
 * Webhook Notification Plugin
 *
 * Webhookを使用してレポートやアラートを外部サービスに通知するプラグイン
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// プラグインインターフェースの型定義
interface NotificationManifest {
  name: string;
  displayName: string;
  version: string;
  type: 'notification';
  description?: string;
  author?: string;
  main: string;
  supportedEvents: NotificationEventType[];
  deliveryMethod: 'push' | 'pull' | 'both';
  configSchema?: Record<string, unknown>;
}

type NotificationEventType =
  | 'report:generated'
  | 'report:daily'
  | 'health:alert'
  | 'data:fetched'
  | 'system:error';

interface ReportContent {
  summary: string;
  metrics: Record<string, {
    value: number;
    unit: string;
    trend: 'up' | 'down' | 'stable';
  }>;
  risks: string[];
  recommendations: string[];
}

interface ReportGeneratedPayload {
  reportId: number;
  reportType: 'on_fetch' | 'daily';
  content: ReportContent;
  periodStart: Date;
  periodEnd: Date;
}

interface HealthAlertPayload {
  alertType: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  relatedData?: Record<string, unknown>;
}

interface DataFetchedPayload {
  sourceName: string;
  recordCount: number;
  dataTypes: string[];
}

interface SystemErrorPayload {
  error: string;
  stack?: string;
  context?: Record<string, unknown>;
}

type NotificationPayload =
  | ReportGeneratedPayload
  | HealthAlertPayload
  | DataFetchedPayload
  | SystemErrorPayload;

interface NotificationEvent {
  type: NotificationEventType;
  timestamp: Date;
  payload: NotificationPayload;
}

interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface NotificationPlugin {
  readonly manifest: NotificationManifest;
  initialize(config: Record<string, unknown>): Promise<void>;
  dispose(): Promise<void>;
  notify(event: NotificationEvent): Promise<NotificationResult>;
  testNotification(): Promise<NotificationResult>;
  formatMessage?(event: NotificationEvent): Promise<string>;
}

// manifest.jsonを読み込み
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const manifestPath = path.resolve(__dirname, '..', 'manifest.json');

/**
 * Webhook通知プラグイン実装
 */
class WebhookNotificationPlugin implements NotificationPlugin {
  readonly manifest: NotificationManifest;

  private webhookUrl: string = '';
  private enabledEvents: Set<NotificationEventType> = new Set();
  private includeFullReport: boolean = true;

  constructor(manifest: NotificationManifest) {
    this.manifest = manifest;
  }

  async initialize(config: Record<string, unknown>): Promise<void> {
    // Webhook URLを取得
    if (config.webhookUrl && typeof config.webhookUrl === 'string') {
      this.webhookUrl = config.webhookUrl;
    }

    // 有効なイベントを取得（配列形式）
    if (config.enabledEvents && Array.isArray(config.enabledEvents)) {
      this.enabledEvents = new Set(config.enabledEvents as NotificationEventType[]);
    } else {
      // デフォルト: 日次レポートとアラート
      this.enabledEvents = new Set(['report:daily', 'health:alert']);
    }

    // フルレポートを含めるか
    if (typeof config.includeFullReport === 'boolean') {
      this.includeFullReport = config.includeFullReport;
    }

    console.log(`[WebhookNotificationPlugin] Initialized with URL: ${this.webhookUrl ? '(configured)' : '(not set)'}`);
    console.log(`[WebhookNotificationPlugin] Enabled events: ${Array.from(this.enabledEvents).join(', ')}`);
  }

  async dispose(): Promise<void> {
    // クリーンアップ不要
  }

  /**
   * 通知を送信
   */
  async notify(event: NotificationEvent): Promise<NotificationResult> {
    // Webhook URLが設定されていない場合はスキップ
    if (!this.webhookUrl) {
      return {
        success: false,
        error: 'Webhook URL is not configured',
      };
    }

    // 有効なイベントでない場合はスキップ
    if (!this.enabledEvents.has(event.type)) {
      return {
        success: true, // スキップは成功として扱う
      };
    }

    try {
      const message = await this.formatMessage(event);

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event: event.type,
          timestamp: event.timestamp.toISOString(),
          message,
          payload: this.includeFullReport ? event.payload : undefined,
        }),
      });

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      return {
        success: true,
        messageId: `webhook-${Date.now()}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * テスト通知を送信
   */
  async testNotification(): Promise<NotificationResult> {
    if (!this.webhookUrl) {
      return {
        success: false,
        error: 'Webhook URL is not configured',
      };
    }

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event: 'test',
          timestamp: new Date().toISOString(),
          message: 'Health Manager Agent からのテスト通知です',
          test: true,
        }),
      });

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      return {
        success: true,
        messageId: `test-${Date.now()}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * イベントをメッセージにフォーマット
   */
  async formatMessage(event: NotificationEvent): Promise<string> {
    switch (event.type) {
      case 'report:daily':
      case 'report:generated': {
        const payload = event.payload as ReportGeneratedPayload;
        const typeLabel = payload.reportType === 'daily' ? '日次レポート' : '定期レポート';
        return `📊 ${typeLabel}が生成されました\n\n${payload.content.summary}`;
      }

      case 'health:alert': {
        const payload = event.payload as HealthAlertPayload;
        const severityEmoji = {
          info: 'ℹ️',
          warning: '⚠️',
          critical: '🚨',
        }[payload.severity];
        return `${severityEmoji} ヘルスアラート: ${payload.message}`;
      }

      case 'data:fetched': {
        const payload = event.payload as DataFetchedPayload;
        return `📥 ${payload.sourceName}から${payload.recordCount}件のデータを取得しました`;
      }

      case 'system:error': {
        const payload = event.payload as SystemErrorPayload;
        return `❌ システムエラー: ${payload.error}`;
      }

      default:
        return `通知: ${event.type}`;
    }
  }
}

// manifest.jsonを読み込んでキャッシュ
let cachedManifest: NotificationManifest | null = null;

function loadManifest(): NotificationManifest {
  if (!cachedManifest) {
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    cachedManifest = JSON.parse(manifestContent) as NotificationManifest;
  }
  return cachedManifest;
}

/**
 * プラグインファクトリ関数
 */
export function createPlugin(): NotificationPlugin {
  return new WebhookNotificationPlugin(loadManifest());
}

/**
 * デフォルトエクスポート（ファクトリ関数）
 */
export default function(): NotificationPlugin {
  return new WebhookNotificationPlugin(loadManifest());
}
