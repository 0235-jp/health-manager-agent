/**
 * チャットメッセージリポジトリ
 * メッセージ履歴をDBに永続化
 */

import { getDatabase } from '../index.js';
import { nowUTC } from '../../utils/datetime.js';
import type { MessageDirection, ChatMessageRecord } from '../../plugins/interfaces/chat.js';

export interface MessageRecord {
  id: number;
  conversation_id: string;
  direction: string;
  content: string;
  external_message_id: string | null;
  created_at: string;
}

export interface MessageCreateInput {
  conversationId: string;
  direction: MessageDirection;
  content: string;
  externalMessageId?: string;
}

function recordToChatMessage(record: MessageRecord): ChatMessageRecord {
  return {
    id: record.id,
    conversationId: record.conversation_id,
    direction: record.direction as MessageDirection,
    content: record.content,
    externalMessageId: record.external_message_id || undefined,
    createdAt: new Date(record.created_at),
  };
}

export const chatMessagesRepository = {
  /**
   * メッセージを作成
   */
  create(input: MessageCreateInput): ChatMessageRecord {
    const db = getDatabase();
    const now = nowUTC();

    const result = db.prepare(`
      INSERT INTO chat_messages (conversation_id, direction, content, external_message_id, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      input.conversationId,
      input.direction,
      input.content,
      input.externalMessageId || null,
      now
    );

    return this.findById(result.lastInsertRowid as number)!;
  },

  /**
   * IDでメッセージを取得
   */
  findById(id: number): ChatMessageRecord | undefined {
    const db = getDatabase();
    const record = db
      .prepare('SELECT * FROM chat_messages WHERE id = ?')
      .get(id) as MessageRecord | undefined;

    return record ? recordToChatMessage(record) : undefined;
  },

  /**
   * 会話IDでメッセージ一覧を取得
   */
  findByConversationId(conversationId: string): ChatMessageRecord[] {
    const db = getDatabase();
    const records = db
      .prepare('SELECT * FROM chat_messages WHERE conversation_id = ? ORDER BY created_at ASC')
      .all(conversationId) as MessageRecord[];

    return records.map(recordToChatMessage);
  },

  /**
   * 会話の最新メッセージを取得
   */
  findLatestByConversationId(
    conversationId: string,
    direction?: MessageDirection
  ): ChatMessageRecord | undefined {
    const db = getDatabase();

    let query = 'SELECT * FROM chat_messages WHERE conversation_id = ?';
    const params: unknown[] = [conversationId];

    if (direction) {
      query += ' AND direction = ?';
      params.push(direction);
    }

    query += ' ORDER BY created_at DESC LIMIT 1';

    const record = db.prepare(query).get(...params) as MessageRecord | undefined;

    return record ? recordToChatMessage(record) : undefined;
  },

  /**
   * メッセージを削除
   */
  delete(id: number): boolean {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM chat_messages WHERE id = ?').run(id);
    return result.changes > 0;
  },

  /**
   * 会話IDでメッセージを一括削除
   */
  deleteByConversationId(conversationId: string): number {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM chat_messages WHERE conversation_id = ?').run(conversationId);
    return result.changes;
  },

  /**
   * 会話のメッセージ数を取得
   */
  countByConversationId(conversationId: string): number {
    const db = getDatabase();
    const result = db
      .prepare('SELECT COUNT(*) as count FROM chat_messages WHERE conversation_id = ?')
      .get(conversationId) as { count: number };

    return result.count;
  },
};
