/**
 * Webhook API ルート
 * ChatPluginへのWebhookリクエストをルーティング
 */

import { Router, raw } from 'express';
import { PluginManager } from '../../plugins/manager.js';
import type { ChatPlugin } from '../../plugins/interfaces/index.js';

export const webhooksRouter = Router();

/**
 * Webhook用のraw body middlewareを設定
 * LINE等の署名検証には生のリクエストボディが必要
 */
webhooksRouter.use(raw({ type: 'application/json' }));

/**
 * POST /api/webhooks/:pluginName/*
 * プラグイン名でルーティングし、ChatPluginのWebhookルーターに委譲
 */
webhooksRouter.all('/:pluginName/*', (req, res, next) => {
  const { pluginName } = req.params;

  const pluginManager = PluginManager.getInstance();
  const state = pluginManager.getPlugin(pluginName);

  if (!state) {
    res.status(404).json({
      error: { message: `Plugin "${pluginName}" not found` },
    });
    return;
  }

  if (state.manifest.type !== 'chat') {
    res.status(400).json({
      error: { message: `Plugin "${pluginName}" is not a chat plugin` },
    });
    return;
  }

  if (!state.isActive) {
    res.status(503).json({
      error: { message: `Plugin "${pluginName}" is not active` },
    });
    return;
  }

  try {
    const chatPlugin = state.plugin as ChatPlugin;
    const webhookRouter = chatPlugin.getWebhookRouter();

    // パスを調整して内部ルーターに委譲
    // /api/webhooks/line-chat-plugin/line/callback -> /line/callback
    const basePath = `/api/webhooks/${pluginName}`;
    req.url = req.originalUrl.replace(basePath, '');

    webhookRouter(req, res, next);
  } catch (error) {
    console.error(`[Webhooks] Error processing webhook for ${pluginName}:`, error);
    res.status(500).json({
      error: { message: 'Internal server error processing webhook' },
    });
  }
});

/**
 * POST /api/webhooks/:pluginName
 * プラグイン名でルーティング（パスなし）
 */
webhooksRouter.all('/:pluginName', (req, res, next) => {
  const { pluginName } = req.params;

  const pluginManager = PluginManager.getInstance();
  const state = pluginManager.getPlugin(pluginName);

  if (!state) {
    res.status(404).json({
      error: { message: `Plugin "${pluginName}" not found` },
    });
    return;
  }

  if (state.manifest.type !== 'chat') {
    res.status(400).json({
      error: { message: `Plugin "${pluginName}" is not a chat plugin` },
    });
    return;
  }

  if (!state.isActive) {
    res.status(503).json({
      error: { message: `Plugin "${pluginName}" is not active` },
    });
    return;
  }

  try {
    const chatPlugin = state.plugin as ChatPlugin;
    const webhookRouter = chatPlugin.getWebhookRouter();

    // パスを調整（ルートパス）
    req.url = '/';

    webhookRouter(req, res, next);
  } catch (error) {
    console.error(`[Webhooks] Error processing webhook for ${pluginName}:`, error);
    res.status(500).json({
      error: { message: 'Internal server error processing webhook' },
    });
  }
});
