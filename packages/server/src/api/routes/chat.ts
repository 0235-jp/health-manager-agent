/**
 * チャット API ルート
 * SSE ストリーミングでチャットレスポンスを返す
 */

import { Router } from 'express';
import { PluginManager } from '../../plugins/manager.js';
import { customInstructionsRepository } from '../../db/repositories/custom-instructions.js';
import { asyncHandler } from '../middlewares/async-handler.js';
import { validateBody } from '../middlewares/validation.js';
import { chatRequestSchema, type ChatRequest } from '../validators/schemas.js';
import type { ChatParams } from '../../plugins/interfaces/index.js';
import { logChatExchange } from '../../utils/debug-logger.js';

export const chatRouter = Router();

/**
 * POST /api/chat/stream
 * ストリーミングチャット
 */
chatRouter.post(
  '/stream',
  validateBody(chatRequestSchema),
  asyncHandler(async (req, res) => {
    const { message, history, session_id } = req.body as ChatRequest;

    // エージェントプラグインを取得
    const pluginManager = PluginManager.getInstance();
    const agent = pluginManager.getCurrentAgent();

    if (!agent) {
      res.status(503).json({
        error: { message: 'エージェントプラグインがインストールされていません' },
      });
      return;
    }

    if (!agent.chat) {
      res.status(501).json({
        error: { message: 'このエージェントはチャット機能をサポートしていません' },
      });
      return;
    }

    // カスタム指示を取得
    const activeInstructions = customInstructionsRepository.findActive();
    const customInstructions = activeInstructions.map((inst) => ({
      instruction: inst.instruction,
      priority: inst.priority,
    }));

    // チャットパラメータを構築
    const chatParams: ChatParams = {
      message,
      history: history.map((h) => ({
        role: h.role,
        content: h.content,
      })),
      sessionId: session_id ?? undefined,
      customInstructions,
    };

    // SSE ヘッダーを設定
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // レスポンス全体を収集（デバッグログ用）
    let fullResponse = '';

    try {
      // ストリーミングチャットを実行し、戻り値からセッションIDを取得
      const generator = agent.chat(chatParams);
      let iteratorResult = await generator.next();

      while (!iteratorResult.done) {
        fullResponse += iteratorResult.value;
        res.write(`data: ${JSON.stringify({ type: 'text', content: iteratorResult.value })}\n\n`);
        iteratorResult = await generator.next();
      }

      // ジェネレータの return 値からセッションIDを取得
      const resultSessionId = iteratorResult.value?.sessionId || session_id || '';

      res.write(`data: ${JSON.stringify({ type: 'done', session_id: resultSessionId })}\n\n`);

      // デバッグログ出力
      logChatExchange({
        message,
        history,
        sessionId: resultSessionId,
        response: fullResponse,
      }).catch((err) => {
        console.error('[Chat] Failed to log chat exchange:', err);
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'チャット中にエラーが発生しました';
      res.write(`data: ${JSON.stringify({ type: 'error', message: errorMessage })}\n\n`);
    } finally {
      res.end();
    }
  })
);
