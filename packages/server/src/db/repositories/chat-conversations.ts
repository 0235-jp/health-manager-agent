/**
 * チャット会話リポジトリ
 * 会話状態をDBに永続化
 */

import { getDatabase } from '../index.js';
import { nowUTC } from '../../utils/datetime.js';
import type {
  ConversationStatus,
  Conversation,
  MessageDirection,
} from '../../plugins/interfaces/chat.js';
import type { ReportAlert } from '../../plugins/interfaces/agent.js';
import type { NotificationEventType } from '../../plugins/interfaces/notification.js';

export interface ConversationRecord {
  id: string;
  plugin_name: string;
  external_user_id: string;
  status: string;
  event_type: string;
  original_payload: string; // JSON文字列
  verification_condition: string | null;
  snooze_until: string | null;
  reminder_count: number;
  created_at: string;
  updated_at: string;
}

export interface ConversationCreateInput {
  id: string;
  pluginName: string;
  externalUserId: string;
  eventType: NotificationEventType;
  originalPayload: ReportAlert;
  verificationCondition?: string;
}

export interface ConversationUpdateInput {
  status?: ConversationStatus;
  snoozeUntil?: Date | null;
  reminderCount?: number;
}

function recordToConversation(record: ConversationRecord): Conversation {
  return {
    id: record.id,
    pluginName: record.plugin_name,
    externalUserId: record.external_user_id,
    status: record.status as ConversationStatus,
    eventType: record.event_type as NotificationEventType,
    originalPayload: JSON.parse(record.original_payload) as ReportAlert,
    verificationCondition: record.verification_condition || undefined,
    snoozeUntil: record.snooze_until ? new Date(record.snooze_until) : undefined,
    reminderCount: record.reminder_count,
    createdAt: new Date(record.created_at),
    updatedAt: new Date(record.updated_at),
  };
}

export const chatConversationsRepository = {
  /**
   * 会話を作成
   */
  create(input: ConversationCreateInput): Conversation {
    const db = getDatabase();
    const now = nowUTC();

    db.prepare(`
      INSERT INTO chat_conversations (id, plugin_name, external_user_id, status, event_type, original_payload, verification_condition, created_at, updated_at)
      VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?)
    `).run(
      input.id,
      input.pluginName,
      input.externalUserId,
      input.eventType,
      JSON.stringify(input.originalPayload),
      input.verificationCondition || null,
      now,
      now
    );

    return this.findById(input.id)!;
  },

  /**
   * IDで会話を取得
   */
  findById(id: string): Conversation | undefined {
    const db = getDatabase();
    const record = db
      .prepare('SELECT * FROM chat_conversations WHERE id = ?')
      .get(id) as ConversationRecord | undefined;

    return record ? recordToConversation(record) : undefined;
  },

  /**
   * ステータスで会話を取得
   */
  findByStatus(status: ConversationStatus | ConversationStatus[]): Conversation[] {
    const db = getDatabase();
    const statuses = Array.isArray(status) ? status : [status];
    const placeholders = statuses.map(() => '?').join(', ');

    const records = db
      .prepare(`SELECT * FROM chat_conversations WHERE status IN (${placeholders}) ORDER BY created_at DESC`)
      .all(...statuses) as ConversationRecord[];

    return records.map(recordToConversation);
  },

  /**
   * プラグインと外部ユーザーIDでアクティブな会話を取得
   */
  findActiveByUserAndPlugin(
    pluginName: string,
    externalUserId: string
  ): Conversation | undefined {
    const db = getDatabase();
    const record = db
      .prepare(`
        SELECT * FROM chat_conversations
        WHERE plugin_name = ? AND external_user_id = ?
        AND status IN ('pending', 'snoozed', 'verifying')
        ORDER BY created_at DESC
        LIMIT 1
      `)
      .get(pluginName, externalUserId) as ConversationRecord | undefined;

    return record ? recordToConversation(record) : undefined;
  },

  /**
   * プラグインでアクティブな会話一覧を取得
   */
  findActiveByPlugin(pluginName: string): Conversation[] {
    const db = getDatabase();
    const records = db
      .prepare(`
        SELECT * FROM chat_conversations
        WHERE plugin_name = ?
        AND status IN ('pending', 'snoozed', 'verifying')
        ORDER BY created_at DESC
      `)
      .all(pluginName) as ConversationRecord[];

    return records.map(recordToConversation);
  },

  /**
   * すべての会話を取得
   */
  findAll(limit = 100, offset = 0): Conversation[] {
    const db = getDatabase();
    const records = db
      .prepare('SELECT * FROM chat_conversations ORDER BY created_at DESC LIMIT ? OFFSET ?')
      .all(limit, offset) as ConversationRecord[];

    return records.map(recordToConversation);
  },

  /**
   * 会話を更新
   */
  update(id: string, input: ConversationUpdateInput): Conversation | undefined {
    const existing = this.findById(id);
    if (!existing) {
      return undefined;
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (input.status !== undefined) {
      updates.push('status = ?');
      values.push(input.status);
    }

    if (input.snoozeUntil !== undefined) {
      updates.push('snooze_until = ?');
      values.push(input.snoozeUntil ? input.snoozeUntil.toISOString() : null);
    }

    if (input.reminderCount !== undefined) {
      updates.push('reminder_count = ?');
      values.push(input.reminderCount);
    }

    if (updates.length === 0) {
      return existing;
    }

    updates.push('updated_at = ?');
    values.push(nowUTC());
    values.push(id);

    const db = getDatabase();
    db.prepare(`UPDATE chat_conversations SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    return this.findById(id);
  },

  /**
   * 会話ステータスを更新
   */
  updateStatus(id: string, status: ConversationStatus): Conversation | undefined {
    return this.update(id, { status });
  },

  /**
   * リマインダー回数をインクリメント
   */
  incrementReminderCount(id: string): Conversation | undefined {
    const existing = this.findById(id);
    if (!existing) {
      return undefined;
    }

    return this.update(id, { reminderCount: existing.reminderCount + 1 });
  },

  /**
   * スヌーズを設定
   */
  setSnooze(id: string, snoozeUntil: Date): Conversation | undefined {
    return this.update(id, { status: 'snoozed', snoozeUntil });
  },

  /**
   * 会話を削除
   */
  delete(id: string): boolean {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM chat_conversations WHERE id = ?').run(id);
    return result.changes > 0;
  },

  /**
   * 古い完了/キャンセル会話を削除
   */
  deleteOldCompleted(olderThanDays = 30): number {
    const db = getDatabase();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = db.prepare(`
      DELETE FROM chat_conversations
      WHERE status IN ('completed', 'cancelled')
      AND updated_at < ?
    `).run(cutoffDate.toISOString());

    return result.changes;
  },

  /**
   * アラートタイプと外部ユーザーIDで重複をチェック
   * 同じアラートタイプでアクティブな会話がある場合はtrueを返す
   */
  hasDuplicateActiveAlert(
    pluginName: string,
    externalUserId: string,
    alertType: string
  ): boolean {
    const activeConversations = this.findActiveByPlugin(pluginName);

    return activeConversations.some(conv => {
      if (conv.externalUserId !== externalUserId) {
        return false;
      }
      return conv.originalPayload.type === alertType;
    });
  },
};
