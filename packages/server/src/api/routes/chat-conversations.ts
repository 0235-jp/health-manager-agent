/**
 * チャット会話管理 API ルート
 */

import { Router } from 'express';
import { asyncHandler } from '../middlewares/async-handler.js';
import { chatConversationsRepository } from '../../db/repositories/chat-conversations.js';
import { chatMessagesRepository } from '../../db/repositories/chat-messages.js';
import { chatRemindersRepository } from '../../db/repositories/chat-reminders.js';

export const chatConversationsRouter = Router();

/**
 * GET /api/chat/conversations
 * 会話一覧を取得
 */
chatConversationsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    const status = req.query.status as string | undefined;

    let conversations;
    if (status) {
      const statuses = status.split(',') as import('../../plugins/interfaces/chat.js').ConversationStatus[];
      conversations = chatConversationsRepository.findByStatus(statuses);
    } else {
      conversations = chatConversationsRepository.findAll(limit, offset);
    }

    res.json({
      data: conversations,
      total: conversations.length,
    });
  })
);

/**
 * GET /api/chat/conversations/:id
 * 会話詳細を取得
 */
chatConversationsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const conversation = chatConversationsRepository.findById(id);
    if (!conversation) {
      res.status(404).json({
        error: { message: `Conversation "${id}" not found` },
      });
      return;
    }

    const messages = chatMessagesRepository.findByConversationId(id);
    const reminder = chatRemindersRepository.findByConversationId(id);

    res.json({
      ...conversation,
      messages,
      reminder,
    });
  })
);

/**
 * POST /api/chat/conversations/:id/cancel
 * 会話をキャンセル
 */
chatConversationsRouter.post(
  '/:id/cancel',
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const conversation = chatConversationsRepository.findById(id);
    if (!conversation) {
      res.status(404).json({
        error: { message: `Conversation "${id}" not found` },
      });
      return;
    }

    if (conversation.status === 'completed' || conversation.status === 'cancelled') {
      res.status(400).json({
        error: { message: `Conversation is already ${conversation.status}` },
      });
      return;
    }

    // リマインダーを削除
    chatRemindersRepository.deleteByConversationId(id);

    // ステータスを更新
    const updated = chatConversationsRepository.updateStatus(id, 'cancelled');

    res.json(updated);
  })
);

/**
 * GET /api/chat/conversations/:id/messages
 * 会話のメッセージ履歴を取得
 */
chatConversationsRouter.get(
  '/:id/messages',
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const conversation = chatConversationsRepository.findById(id);
    if (!conversation) {
      res.status(404).json({
        error: { message: `Conversation "${id}" not found` },
      });
      return;
    }

    const messages = chatMessagesRepository.findByConversationId(id);

    res.json({
      data: messages,
      total: messages.length,
    });
  })
);

/**
 * DELETE /api/chat/conversations/:id
 * 会話を削除
 */
chatConversationsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const conversation = chatConversationsRepository.findById(id);
    if (!conversation) {
      res.status(404).json({
        error: { message: `Conversation "${id}" not found` },
      });
      return;
    }

    // 関連するリマインダーを削除
    chatRemindersRepository.deleteByConversationId(id);

    // メッセージは外部キー制約で自動削除される
    const deleted = chatConversationsRepository.delete(id);

    res.json({ success: deleted });
  })
);
