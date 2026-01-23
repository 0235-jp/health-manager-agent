/**
 * LINE Chat Plugin
 *
 * LINE Messaging APIを使用した双方向コミュニケーションプラグイン
 * - アラート通知の送信
 * - ユーザー返信の処理（AgentPluginと連携）
 * - リマインダー機能
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Router } from 'express';
import { LineApiClient, type LineWebhookBody, type LineWebhookEvent } from './line-api.js';

// Type definitions (from server package)
interface ChatManifest {
  name: string;
  displayName: string;
  version: string;
  type: 'chat';
  description?: string;
  author?: string;
  main: string;
  supportedEvents: string[];
  webhookPath: string;
  configSchema?: Record<string, unknown>;
}

interface ReportAlert {
  id: string;
  type: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  actionRequired: boolean;
  verificationPrompt?: string;
}

interface StartConversationParams {
  externalUserId: string;
  eventType: string;
  alert: ReportAlert;
}

interface StartConversationResult {
  success: boolean;
  conversationId?: string;
  messageId?: string;
  error?: string;
}

interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface HandleUserResponseResult {
  success: boolean;
  newStatus?: string;
  replyMessage?: string;
  nextReminderAt?: Date;
  error?: string;
}

interface PluginContext {
  config: Record<string, unknown>;
  toolExecutor?: unknown;
}

interface ChatPlugin {
  readonly manifest: ChatManifest;
  initialize(context: PluginContext): Promise<void>;
  dispose(): Promise<void>;
  startConversation(params: StartConversationParams): Promise<StartConversationResult>;
  sendMessage(conversationId: string, message: string): Promise<SendMessageResult>;
  handleUserResponse(conversationId: string, userMessage: string): Promise<HandleUserResponseResult>;
  getWebhookRouter(): Router;
  testNotification(): Promise<SendMessageResult>;
}

// Internal state types
interface ConversationState {
  id: string;
  externalUserId: string;
  alert: ReportAlert;
  status: 'pending' | 'snoozed' | 'verifying' | 'completed' | 'cancelled';
  createdAt: Date;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const manifestPath = path.resolve(__dirname, '..', 'manifest.json');

/**
 * LINE Chat Plugin 実装
 */
class LineChatPlugin implements ChatPlugin {
  readonly manifest: ChatManifest;

  private lineClient: LineApiClient | null = null;
  private targetUserId: string = '';
  private reminderIntervalMinutes: number = 5;

  // In-memory conversation state (production would use repository)
  private conversations: Map<string, ConversationState> = new Map();

  // Callback to server-side repositories and agent
  private serverCallbacks: {
    createConversation?: (data: {
      id: string;
      pluginName: string;
      externalUserId: string;
      eventType: string;
      originalPayload: ReportAlert;
      verificationCondition?: string;
    }) => unknown;
    findConversation?: (id: string) => ConversationState | undefined;
    findActiveConversation?: (pluginName: string, userId: string) => ConversationState | undefined;
    updateConversationStatus?: (id: string, status: string) => void;
    createMessage?: (data: { conversationId: string; direction: string; content: string; externalMessageId?: string }) => void;
    hasDuplicateAlert?: (pluginName: string, userId: string, alertType: string) => boolean;
    scheduleReminder?: (conversationId: string, delayMs?: number) => void;
    scheduleSnooze?: (conversationId: string, durationMs: number) => void;
    getAgent?: () => {
      processUserResponse?: (alert: ReportAlert, message: string) => Promise<{ action: string; durationMs?: number; replyMessage?: string }>;
      verifyAlert?: (alert: ReportAlert) => Promise<{ resolved: boolean; message: string }>;
    } | null;
  } = {};

  constructor(manifest: ChatManifest) {
    this.manifest = manifest;
  }

  async initialize(context: PluginContext): Promise<void> {
    const { config } = context;

    const channelAccessToken = config.channelAccessToken as string;
    const channelSecret = config.channelSecret as string;
    this.targetUserId = (config.targetUserId as string) || '';
    this.reminderIntervalMinutes = (config.reminderIntervalMinutes as number) || 5;

    if (channelAccessToken && channelSecret) {
      this.lineClient = new LineApiClient(channelAccessToken, channelSecret);
      console.log('[LineChatPlugin] Initialized with LINE API client');
    } else {
      console.log('[LineChatPlugin] Initialized without LINE credentials');
    }

    // Server-side callbacks will be injected via config or a special mechanism
    // For now, we'll use a global registry pattern
    this.setupServerCallbacks();
  }

  /**
   * サーバーサイドのコールバックを設定
   * 実際の運用では PluginManager 経由で設定される
   */
  private setupServerCallbacks(): void {
    // These will be dynamically set by the server
    // Using a require-like pattern for server integration
    try {
      // Dynamic import of server-side modules (only works when running in server context)
      const serverModules = (globalThis as Record<string, unknown>).__lineChatPluginCallbacks as typeof this.serverCallbacks | undefined;
      if (serverModules) {
        this.serverCallbacks = serverModules;
      }
    } catch {
      // Not in server context, callbacks will be empty
    }
  }

  async dispose(): Promise<void> {
    this.lineClient = null;
    this.conversations.clear();
  }

  /**
   * 会話を開始してアラートを送信
   */
  async startConversation(params: StartConversationParams): Promise<StartConversationResult> {
    if (!this.lineClient) {
      return { success: false, error: 'LINE client not initialized' };
    }

    const { externalUserId, eventType, alert } = params;

    // 重複チェック（サーバーサイドのリポジトリを使用）
    if (this.serverCallbacks.hasDuplicateAlert?.(this.manifest.name, externalUserId, alert.type)) {
      console.log(`[LineChatPlugin] Duplicate alert detected: ${alert.type}`);
      return { success: false, error: 'Duplicate alert already active' };
    }

    // 会話IDを生成
    const conversationId = `line-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    // メッセージを構築
    const message = this.buildAlertMessage(alert);

    // LINE にメッセージ送信
    const result = await this.lineClient.pushMessage(externalUserId, message);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // 会話をサーバーサイドに保存
    if (this.serverCallbacks.createConversation) {
      this.serverCallbacks.createConversation({
        id: conversationId,
        pluginName: this.manifest.name,
        externalUserId,
        eventType,
        originalPayload: alert,
        verificationCondition: alert.verificationPrompt,
      });
    }

    // ローカルステートにも保存
    this.conversations.set(conversationId, {
      id: conversationId,
      externalUserId,
      alert,
      status: 'pending',
      createdAt: new Date(),
    });

    // メッセージを記録
    if (this.serverCallbacks.createMessage) {
      this.serverCallbacks.createMessage({
        conversationId,
        direction: 'outbound',
        content: message,
        externalMessageId: result.messageId,
      });
    }

    // リマインダーをスケジュール
    if (this.serverCallbacks.scheduleReminder) {
      this.serverCallbacks.scheduleReminder(
        conversationId,
        this.reminderIntervalMinutes * 60 * 1000
      );
    }

    console.log(`[LineChatPlugin] Started conversation ${conversationId} for alert: ${alert.type}`);

    return {
      success: true,
      conversationId,
      messageId: result.messageId,
    };
  }

  /**
   * メッセージを送信
   */
  async sendMessage(conversationId: string, message: string): Promise<SendMessageResult> {
    if (!this.lineClient) {
      return { success: false, error: 'LINE client not initialized' };
    }

    // 会話を取得
    const conversation = this.conversations.get(conversationId) ||
      this.serverCallbacks.findConversation?.(conversationId);

    if (!conversation) {
      return { success: false, error: `Conversation ${conversationId} not found` };
    }

    const result = await this.lineClient.pushMessage(conversation.externalUserId, message);

    if (result.success && this.serverCallbacks.createMessage) {
      this.serverCallbacks.createMessage({
        conversationId,
        direction: 'outbound',
        content: message,
        externalMessageId: result.messageId,
      });
    }

    return result;
  }

  /**
   * ユーザーからの返信を処理
   */
  async handleUserResponse(
    conversationId: string,
    userMessage: string
  ): Promise<HandleUserResponseResult> {
    // 会話を取得
    const conversation = this.conversations.get(conversationId) ||
      this.serverCallbacks.findConversation?.(conversationId);

    if (!conversation) {
      return { success: false, error: `Conversation ${conversationId} not found` };
    }

    // AgentPluginを取得して返信を解析
    const agent = this.serverCallbacks.getAgent?.();
    if (!agent?.processUserResponse) {
      // AgentPluginが processUserResponse をサポートしていない場合、シンプルなルールベース処理
      return this.handleSimpleResponse(conversationId, conversation, userMessage);
    }

    // AgentPluginに返信処理を委譲
    const response = await agent.processUserResponse(conversation.alert, userMessage);

    switch (response.action) {
      case 'done':
        return this.handleDoneAction(conversationId, conversation, agent);

      case 'snooze':
        return this.handleSnoozeAction(conversationId, response.durationMs || 3600000);

      case 'cancel':
        return this.handleCancelAction(conversationId);

      case 'unclear':
        return {
          success: true,
          replyMessage: response.replyMessage || '返信内容が理解できませんでした。「対応した」または「1時間後」と返信してください。',
        };

      default:
        return { success: false, error: `Unknown action: ${response.action}` };
    }
  }

  /**
   * シンプルなルールベースの返信処理
   */
  private async handleSimpleResponse(
    conversationId: string,
    conversation: ConversationState,
    userMessage: string
  ): Promise<HandleUserResponseResult> {
    const normalizedMessage = userMessage.toLowerCase().trim();

    // 「対応した」系の返信
    if (normalizedMessage.includes('対応') || normalizedMessage.includes('done') || normalizedMessage.includes('ok')) {
      const agent = this.serverCallbacks.getAgent?.();
      return this.handleDoneAction(conversationId, conversation, agent || null);
    }

    // 「1時間後」系の返信
    if (normalizedMessage.includes('1時間') || normalizedMessage.includes('後で')) {
      return this.handleSnoozeAction(conversationId, 60 * 60 * 1000); // 1時間
    }

    // 「30分後」
    if (normalizedMessage.includes('30分')) {
      return this.handleSnoozeAction(conversationId, 30 * 60 * 1000);
    }

    // 「キャンセル」系
    if (normalizedMessage.includes('キャンセル') || normalizedMessage.includes('cancel')) {
      return this.handleCancelAction(conversationId);
    }

    // 不明な返信
    return {
      success: true,
      replyMessage: '返信内容が理解できませんでした。「対応した」「1時間後」「キャンセル」のいずれかで返信してください。',
    };
  }

  /**
   * 「対応した」アクションを処理
   */
  private async handleDoneAction(
    conversationId: string,
    conversation: ConversationState,
    agent: { verifyAlert?: (alert: ReportAlert) => Promise<{ resolved: boolean; message: string }> } | null
  ): Promise<HandleUserResponseResult> {
    // 会話を「検証中」に更新
    if (this.serverCallbacks.updateConversationStatus) {
      this.serverCallbacks.updateConversationStatus(conversationId, 'verifying');
    }
    conversation.status = 'verifying';

    // AgentPluginでデータを検証
    if (agent?.verifyAlert) {
      const verification = await agent.verifyAlert(conversation.alert);

      if (verification.resolved) {
        // 問題解決 → 完了
        if (this.serverCallbacks.updateConversationStatus) {
          this.serverCallbacks.updateConversationStatus(conversationId, 'completed');
        }
        conversation.status = 'completed';

        return {
          success: true,
          newStatus: 'completed',
          replyMessage: verification.message || '確認完了しました。ありがとうございます！',
        };
      } else {
        // 問題未解決 → 5分後に再通知
        if (this.serverCallbacks.updateConversationStatus) {
          this.serverCallbacks.updateConversationStatus(conversationId, 'pending');
        }
        conversation.status = 'pending';

        if (this.serverCallbacks.scheduleReminder) {
          this.serverCallbacks.scheduleReminder(conversationId, 5 * 60 * 1000);
        }

        return {
          success: true,
          newStatus: 'pending',
          replyMessage: verification.message || 'データを確認しましたが、まだ問題が解決していないようです。5分後に再確認します。',
          nextReminderAt: new Date(Date.now() + 5 * 60 * 1000),
        };
      }
    }

    // AgentPluginがverifyAlertをサポートしていない場合、完了として扱う
    if (this.serverCallbacks.updateConversationStatus) {
      this.serverCallbacks.updateConversationStatus(conversationId, 'completed');
    }
    conversation.status = 'completed';

    return {
      success: true,
      newStatus: 'completed',
      replyMessage: '了解しました。ありがとうございます！',
    };
  }

  /**
   * スヌーズアクションを処理
   */
  private handleSnoozeAction(conversationId: string, durationMs: number): HandleUserResponseResult {
    if (this.serverCallbacks.scheduleSnooze) {
      this.serverCallbacks.scheduleSnooze(conversationId, durationMs);
    }

    const minutes = Math.round(durationMs / 60000);
    const timeStr = minutes >= 60 ? `${Math.round(minutes / 60)}時間` : `${minutes}分`;

    return {
      success: true,
      newStatus: 'snoozed',
      replyMessage: `了解しました。${timeStr}後に再度お知らせします。`,
      nextReminderAt: new Date(Date.now() + durationMs),
    };
  }

  /**
   * キャンセルアクションを処理
   */
  private handleCancelAction(conversationId: string): HandleUserResponseResult {
    if (this.serverCallbacks.updateConversationStatus) {
      this.serverCallbacks.updateConversationStatus(conversationId, 'cancelled');
    }

    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      conversation.status = 'cancelled';
    }

    return {
      success: true,
      newStatus: 'cancelled',
      replyMessage: 'この通知をキャンセルしました。',
    };
  }

  /**
   * Webhookルーターを取得
   */
  getWebhookRouter(): Router {
    const router = Router();

    // LINE Webhook エンドポイント
    router.post('/callback', async (req, res) => {
      try {
        // 署名検証
        const signature = req.headers['x-line-signature'] as string;
        const body = req.body as Buffer;

        if (!this.lineClient) {
          res.status(500).json({ error: 'LINE client not initialized' });
          return;
        }

        if (!this.lineClient.verifySignature(body, signature)) {
          console.warn('[LineChatPlugin] Invalid webhook signature');
          res.status(401).json({ error: 'Invalid signature' });
          return;
        }

        // ボディをパース
        const webhookBody = JSON.parse(body.toString()) as LineWebhookBody;

        // イベントを処理
        for (const event of webhookBody.events) {
          await this.handleWebhookEvent(event);
        }

        res.status(200).json({ success: true });
      } catch (error) {
        console.error('[LineChatPlugin] Webhook error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    return router;
  }

  /**
   * Webhookイベントを処理
   */
  private async handleWebhookEvent(event: LineWebhookEvent): Promise<void> {
    // メッセージイベントのみ処理
    if (event.type !== 'message' || event.message?.type !== 'text') {
      return;
    }

    const userId = event.source.userId;
    const messageText = event.message.text || '';
    const replyToken = event.replyToken;

    if (!userId) {
      console.warn('[LineChatPlugin] No userId in webhook event');
      return;
    }

    console.log(`[LineChatPlugin] Received message from ${userId}: ${messageText}`);

    // このユーザーのアクティブな会話を検索
    const conversation = this.findActiveConversationForUser(userId);

    if (!conversation) {
      // アクティブな会話がない場合
      if (replyToken && this.lineClient) {
        await this.lineClient.replyMessage(replyToken, '現在対応中の通知はありません。');
      }
      return;
    }

    // メッセージを記録
    if (this.serverCallbacks.createMessage) {
      this.serverCallbacks.createMessage({
        conversationId: conversation.id,
        direction: 'inbound',
        content: messageText,
        externalMessageId: event.message.id,
      });
    }

    // 返信を処理
    const result = await this.handleUserResponse(conversation.id, messageText);

    // 返信メッセージを送信
    if (result.replyMessage && replyToken && this.lineClient) {
      await this.lineClient.replyMessage(replyToken, result.replyMessage);

      if (this.serverCallbacks.createMessage) {
        this.serverCallbacks.createMessage({
          conversationId: conversation.id,
          direction: 'outbound',
          content: result.replyMessage,
        });
      }
    }
  }

  /**
   * ユーザーのアクティブな会話を検索
   */
  private findActiveConversationForUser(userId: string): ConversationState | undefined {
    // サーバーサイドのリポジトリを優先
    if (this.serverCallbacks.findActiveConversation) {
      return this.serverCallbacks.findActiveConversation(this.manifest.name, userId);
    }

    // ローカルステートから検索
    for (const conv of this.conversations.values()) {
      if (
        conv.externalUserId === userId &&
        ['pending', 'snoozed', 'verifying'].includes(conv.status)
      ) {
        return conv;
      }
    }

    return undefined;
  }

  /**
   * テスト通知を送信
   */
  async testNotification(): Promise<SendMessageResult> {
    if (!this.lineClient) {
      return { success: false, error: 'LINE client not initialized' };
    }

    if (!this.targetUserId) {
      return { success: false, error: 'Target user ID not configured' };
    }

    const testMessage = '🔔 Health Manager Agent からのテスト通知です。\n\nこのメッセージが表示されていれば、LINE連携は正常に動作しています。';

    return this.lineClient.pushMessage(this.targetUserId, testMessage);
  }

  /**
   * アラートメッセージを構築
   */
  private buildAlertMessage(alert: ReportAlert): string {
    const priorityEmoji = {
      high: '🚨',
      medium: '⚠️',
      low: 'ℹ️',
    }[alert.priority];

    let message = `${priorityEmoji} ${alert.message}`;

    if (alert.actionRequired) {
      message += '\n\n返信してください：\n• 「対応した」→ 確認完了\n• 「1時間後」→ 後でリマインド\n• 「キャンセル」→ この通知を停止';
    }

    return message;
  }
}

// manifest.jsonを読み込んでキャッシュ
let cachedManifest: ChatManifest | null = null;

function loadManifest(): ChatManifest {
  if (!cachedManifest) {
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    cachedManifest = JSON.parse(manifestContent) as ChatManifest;
  }
  return cachedManifest;
}

/**
 * プラグインファクトリ関数
 */
export function createPlugin(): ChatPlugin {
  return new LineChatPlugin(loadManifest());
}

export default createPlugin;
