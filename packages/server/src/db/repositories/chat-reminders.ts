/**
 * チャットリマインダーリポジトリ
 * 再通知スケジュールをDBに永続化
 */

import { getDatabase } from '../index.js';
import { nowUTC } from '../../utils/datetime.js';
import type { ChatReminder } from '../../plugins/interfaces/chat.js';

export interface ReminderRecord {
  id: number;
  conversation_id: string;
  scheduled_at: string;
  processed: number;
  created_at: string;
}

export interface ReminderCreateInput {
  conversationId: string;
  scheduledAt: Date;
}

function recordToReminder(record: ReminderRecord): ChatReminder {
  return {
    id: record.id,
    conversationId: record.conversation_id,
    scheduledAt: new Date(record.scheduled_at),
    processed: record.processed === 1,
    createdAt: new Date(record.created_at),
  };
}

export const chatRemindersRepository = {
  /**
   * リマインダーを作成または更新（UPSERT）
   */
  upsert(input: ReminderCreateInput): ChatReminder {
    const db = getDatabase();
    const now = nowUTC();

    // 既存のリマインダーを削除してから挿入（SQLite 3.24未満対応）
    db.prepare('DELETE FROM chat_reminders WHERE conversation_id = ?').run(input.conversationId);

    const result = db.prepare(`
      INSERT INTO chat_reminders (conversation_id, scheduled_at, processed, created_at)
      VALUES (?, ?, 0, ?)
    `).run(
      input.conversationId,
      input.scheduledAt.toISOString(),
      now
    );

    return this.findById(result.lastInsertRowid as number)!;
  },

  /**
   * IDでリマインダーを取得
   */
  findById(id: number): ChatReminder | undefined {
    const db = getDatabase();
    const record = db
      .prepare('SELECT * FROM chat_reminders WHERE id = ?')
      .get(id) as ReminderRecord | undefined;

    return record ? recordToReminder(record) : undefined;
  },

  /**
   * 会話IDでリマインダーを取得
   */
  findByConversationId(conversationId: string): ChatReminder | undefined {
    const db = getDatabase();
    const record = db
      .prepare('SELECT * FROM chat_reminders WHERE conversation_id = ?')
      .get(conversationId) as ReminderRecord | undefined;

    return record ? recordToReminder(record) : undefined;
  },

  /**
   * 実行予定の（dueな）リマインダーを取得
   */
  findDue(): ChatReminder[] {
    const db = getDatabase();
    const now = new Date().toISOString();

    const records = db
      .prepare(`
        SELECT * FROM chat_reminders
        WHERE processed = 0 AND scheduled_at <= ?
        ORDER BY scheduled_at ASC
      `)
      .all(now) as ReminderRecord[];

    return records.map(recordToReminder);
  },

  /**
   * 未処理のリマインダーを取得
   */
  findUnprocessed(): ChatReminder[] {
    const db = getDatabase();
    const records = db
      .prepare('SELECT * FROM chat_reminders WHERE processed = 0 ORDER BY scheduled_at ASC')
      .all() as ReminderRecord[];

    return records.map(recordToReminder);
  },

  /**
   * リマインダーを処理済みにマーク
   */
  markProcessed(id: number): boolean {
    const db = getDatabase();
    const result = db.prepare('UPDATE chat_reminders SET processed = 1 WHERE id = ?').run(id);
    return result.changes > 0;
  },

  /**
   * リマインダーを削除
   */
  delete(id: number): boolean {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM chat_reminders WHERE id = ?').run(id);
    return result.changes > 0;
  },

  /**
   * 会話IDでリマインダーを削除
   */
  deleteByConversationId(conversationId: string): boolean {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM chat_reminders WHERE conversation_id = ?').run(conversationId);
    return result.changes > 0;
  },

  /**
   * 処理済みの古いリマインダーを削除
   */
  deleteOldProcessed(olderThanDays = 7): number {
    const db = getDatabase();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = db.prepare(`
      DELETE FROM chat_reminders
      WHERE processed = 1 AND created_at < ?
    `).run(cutoffDate.toISOString());

    return result.changes;
  },

  /**
   * スケジュール時刻を更新
   */
  reschedule(conversationId: string, scheduledAt: Date): ChatReminder | undefined {
    const existing = this.findByConversationId(conversationId);
    if (!existing) {
      return this.upsert({ conversationId, scheduledAt });
    }

    const db = getDatabase();
    db.prepare(`
      UPDATE chat_reminders
      SET scheduled_at = ?, processed = 0
      WHERE conversation_id = ?
    `).run(scheduledAt.toISOString(), conversationId);

    return this.findByConversationId(conversationId);
  },
};
