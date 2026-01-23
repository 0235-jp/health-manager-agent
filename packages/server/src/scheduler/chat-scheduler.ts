/**
 * ChatScheduler - チャット再通知スケジューラー
 *
 * - リマインダーの処理（定期実行）
 * - スヌーズ終了後の再通知
 * - タイムアウト後の再通知
 */

import cron from 'node-cron';
import { PluginManager } from '../plugins/manager.js';
import { chatConversationsRepository } from '../db/repositories/chat-conversations.js';
import { chatRemindersRepository } from '../db/repositories/chat-reminders.js';
import { chatMessagesRepository } from '../db/repositories/chat-messages.js';
import type { ChatPlugin, Conversation } from '../plugins/interfaces/index.js';

/** デフォルトのリマインダー間隔（ミリ秒） */
const DEFAULT_REMINDER_INTERVAL_MS = 5 * 60 * 1000; // 5分

/** タイムアウトまでの時間（ミリ秒） - 返信がない場合 */
const RESPONSE_TIMEOUT_MS = 5 * 60 * 1000; // 5分

export class ChatScheduler {
  private reminderJob: cron.ScheduledTask | null = null;
  private timeoutCheckJob: cron.ScheduledTask | null = null;

  /**
   * スケジューラーを開始
   */
  start(): void {
    // 毎分リマインダーをチェック
    this.reminderJob = cron.schedule('* * * * *', () => {
      this.processReminders().catch((error) => {
        console.error('[ChatScheduler] Failed to process reminders:', error);
      });
    });

    // 毎分タイムアウトをチェック
    this.timeoutCheckJob = cron.schedule('* * * * *', () => {
      this.checkTimeouts().catch((error) => {
        console.error('[ChatScheduler] Failed to check timeouts:', error);
      });
    });

    console.log('[ChatScheduler] Started');
  }

  /**
   * スケジューラーを停止
   */
  stop(): void {
    if (this.reminderJob) {
      this.reminderJob.stop();
      this.reminderJob = null;
    }

    if (this.timeoutCheckJob) {
      this.timeoutCheckJob.stop();
      this.timeoutCheckJob = null;
    }

    console.log('[ChatScheduler] Stopped');
  }

  /**
   * 実行予定のリマインダーを処理
   */
  async processReminders(): Promise<void> {
    const dueReminders = chatRemindersRepository.findDue();

    if (dueReminders.length === 0) {
      return;
    }

    console.log(`[ChatScheduler] Processing ${dueReminders.length} due reminders`);

    for (const reminder of dueReminders) {
      try {
        await this.processReminder(reminder.conversationId);
        chatRemindersRepository.markProcessed(reminder.id);
      } catch (error) {
        console.error(
          `[ChatScheduler] Failed to process reminder for conversation ${reminder.conversationId}:`,
          error
        );
      }
    }
  }

  /**
   * 個別のリマインダーを処理
   */
  private async processReminder(conversationId: string): Promise<void> {
    const conversation = chatConversationsRepository.findById(conversationId);

    if (!conversation) {
      console.warn(`[ChatScheduler] Conversation ${conversationId} not found`);
      return;
    }

    // 既に完了・キャンセル済みの場合はスキップ
    if (conversation.status === 'completed' || conversation.status === 'cancelled') {
      return;
    }

    // スヌーズ中で、まだスヌーズ時間内の場合はスキップ
    if (conversation.status === 'snoozed' && conversation.snoozeUntil) {
      if (new Date() < conversation.snoozeUntil) {
        return;
      }
      // スヌーズ時間経過、pendingに戻す
      chatConversationsRepository.updateStatus(conversationId, 'pending');
    }

    // ChatPluginを取得
    const chatPlugin = this.getChatPlugin(conversation.pluginName);
    if (!chatPlugin) {
      console.warn(`[ChatScheduler] ChatPlugin ${conversation.pluginName} not found or not active`);
      return;
    }

    // リマインダーメッセージを送信
    const reminderMessage = this.buildReminderMessage(conversation);
    const result = await chatPlugin.sendMessage(conversationId, reminderMessage);

    if (result.success) {
      // リマインダー回数をインクリメント
      chatConversationsRepository.incrementReminderCount(conversationId);

      // メッセージを記録
      chatMessagesRepository.create({
        conversationId,
        direction: 'outbound',
        content: reminderMessage,
        externalMessageId: result.messageId,
      });

      // 次のリマインダーをスケジュール
      this.scheduleNextReminder(conversationId);

      console.log(`[ChatScheduler] Sent reminder for conversation ${conversationId}`);
    } else {
      console.error(
        `[ChatScheduler] Failed to send reminder for conversation ${conversationId}:`,
        result.error
      );
    }
  }

  /**
   * タイムアウトをチェック
   * pending状態で一定時間返信がない会話にリマインダーをスケジュール
   */
  async checkTimeouts(): Promise<void> {
    const pendingConversations = chatConversationsRepository.findByStatus('pending');

    const now = new Date();

    for (const conversation of pendingConversations) {
      // 既にリマインダーがスケジュールされている場合はスキップ
      const existingReminder = chatRemindersRepository.findByConversationId(conversation.id);
      if (existingReminder && !existingReminder.processed) {
        continue;
      }

      // 最後のアウトバウンドメッセージを取得
      const lastOutbound = chatMessagesRepository.findLatestByConversationId(
        conversation.id,
        'outbound'
      );

      if (!lastOutbound) {
        continue;
      }

      // タイムアウトチェック
      const messageAge = now.getTime() - lastOutbound.createdAt.getTime();
      if (messageAge >= RESPONSE_TIMEOUT_MS) {
        // リマインダーをスケジュール
        this.scheduleNextReminder(conversation.id);
        console.log(`[ChatScheduler] Scheduled timeout reminder for conversation ${conversation.id}`);
      }
    }
  }

  /**
   * 次のリマインダーをスケジュール
   */
  scheduleNextReminder(conversationId: string, delayMs = DEFAULT_REMINDER_INTERVAL_MS): void {
    const scheduledAt = new Date(Date.now() + delayMs);
    chatRemindersRepository.upsert({
      conversationId,
      scheduledAt,
    });
  }

  /**
   * リマインダーメッセージを構築
   */
  private buildReminderMessage(conversation: Conversation): string {
    const alert = conversation.originalPayload;
    const count = conversation.reminderCount + 1;

    if (count === 1) {
      return `⏰ リマインダー: ${alert.message}\n\n対応されましたか？「対応した」または「1時間後」と返信してください。`;
    }

    return `⏰ リマインダー (${count}回目): ${alert.message}\n\n対応をお願いします。「対応した」または「1時間後」と返信してください。`;
  }

  /**
   * ChatPluginを取得
   */
  private getChatPlugin(pluginName: string): ChatPlugin | undefined {
    const pluginManager = PluginManager.getInstance();
    const state = pluginManager.getPlugin(pluginName);

    if (!state || state.manifest.type !== 'chat' || !state.isActive) {
      return undefined;
    }

    return state.plugin as ChatPlugin;
  }

  /**
   * スヌーズをスケジュール
   */
  scheduleSnooze(conversationId: string, durationMs: number): void {
    const snoozeUntil = new Date(Date.now() + durationMs);

    // 会話をスヌーズ状態に更新
    chatConversationsRepository.setSnooze(conversationId, snoozeUntil);

    // リマインダーをスケジュール
    chatRemindersRepository.upsert({
      conversationId,
      scheduledAt: snoozeUntil,
    });

    console.log(
      `[ChatScheduler] Scheduled snooze for conversation ${conversationId} until ${snoozeUntil.toISOString()}`
    );
  }
}

let chatScheduler: ChatScheduler | null = null;

export function getChatScheduler(): ChatScheduler {
  if (!chatScheduler) {
    chatScheduler = new ChatScheduler();
  }
  return chatScheduler;
}
