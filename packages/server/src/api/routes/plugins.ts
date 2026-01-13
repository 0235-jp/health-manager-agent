/**
 * プラグインAPI
 *
 * プラグインの管理・設定・テスト用エンドポイント
 */

import fs from 'fs';
import path from 'path';
import { Router } from 'express';
import multer from 'multer';
import { PluginManager } from '../../plugins/manager.js';
import { pluginsRepository } from '../../db/repositories/plugins.js';
import type { PluginManifest, PluginType } from '../../plugins/interfaces/base.js';
import type { PluginState } from '../../plugins/registry.js';
import type { DataSourcePlugin } from '../../plugins/interfaces/data-source.js';
import type { NotificationPlugin } from '../../plugins/interfaces/notification.js';
import type { AgentManifest } from '../../plugins/interfaces/agent.js';

interface ExtendedManifest extends PluginManifest {
  supportedDataTypes?: unknown[];
  supportedModels?: string[];
  capabilities?: Record<string, unknown>;
}

interface PluginResponse {
  name: string;
  displayName: string;
  version: string;
  type: PluginType;
  description?: string;
  isActive: boolean;
  isLoaded: boolean;
  config: Record<string, unknown>;
  configSchema?: Record<string, unknown>;
  supportedDataTypes?: unknown[];
  supportedModels?: string[];
  capabilities?: Record<string, unknown>;
}

/**
 * PluginStateからレスポンス形式に変換
 */
function toPluginResponse(state: PluginState): PluginResponse {
  const manifest = state.plugin.manifest as ExtendedManifest;

  return {
    name: manifest.name,
    displayName: manifest.displayName,
    version: manifest.version,
    type: manifest.type,
    description: manifest.description,
    isActive: state.isActive,
    isLoaded: true,
    config: state.config,
    configSchema: manifest.configSchema,
    supportedDataTypes: manifest.supportedDataTypes,
    supportedModels: manifest.supportedModels,
    capabilities: manifest.capabilities,
  };
}

export const pluginsRouter = Router();

// ファイルアップロード設定（ZIPファイル用）
const upload = multer({
  dest: '/tmp/plugin-uploads/',
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/zip' || file.originalname.endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('Only ZIP files are allowed'));
    }
  },
});

/**
 * プラグイン一覧取得
 * GET /api/plugins?type=agent|data-source|notification
 */
pluginsRouter.get('/', (_req, res) => {
  try {
    const type = _req.query.type as PluginType | undefined;
    const pluginManager = PluginManager.getInstance();

    // メモリ上のプラグイン状態を取得
    const plugins = pluginManager.getPlugins(type);
    const loadedNames = new Set(plugins.map((p) => p.plugin.manifest.name));

    // DB上の未ロードプラグインを取得
    const unloadedRecords = pluginsRepository
      .findAll(type)
      .filter((r) => !loadedNames.has(r.name))
      .map((r) => ({
        name: r.name,
        displayName: r.display_name,
        version: r.version,
        type: r.type as PluginType,
        description: r.description,
        isActive: r.is_active === 1,
        isLoaded: false,
        config: JSON.parse(r.config),
        supportedDataTypes: r.supported_data_types ? JSON.parse(r.supported_data_types) : undefined,
        installedAt: r.installed_at,
        updatedAt: r.updated_at,
      }));

    const result = [...plugins.map(toPluginResponse), ...unloadedRecords];
    res.json(result);
  } catch (error) {
    console.error('[PluginsAPI] Failed to get plugins:', error);
    res.status(500).json({
      error: 'Failed to get plugins',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * プラグイン個別取得
 * GET /api/plugins/:name
 */
pluginsRouter.get('/:name', (req, res) => {
  try {
    const { name } = req.params;
    const pluginManager = PluginManager.getInstance();

    const state = pluginManager.getPlugin(name);
    if (state) {
      res.json(toPluginResponse(state));
      return;
    }

    // DBから取得
    const dbRecord = pluginsRepository.findByName(name);
    if (dbRecord) {
      res.json({
        name: dbRecord.name,
        displayName: dbRecord.display_name,
        version: dbRecord.version,
        type: dbRecord.type,
        description: dbRecord.description,
        isActive: dbRecord.is_active === 1,
        isLoaded: false,
        config: JSON.parse(dbRecord.config),
        installedAt: dbRecord.installed_at,
        updatedAt: dbRecord.updated_at,
      });
      return;
    }

    res.status(404).json({ error: 'Plugin not found' });
  } catch (error) {
    console.error('[PluginsAPI] Failed to get plugin:', error);
    res.status(500).json({
      error: 'Failed to get plugin',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * プラグイン設定更新
 * PUT /api/plugins/:name/config
 */
pluginsRouter.put('/:name/config', async (req, res) => {
  try {
    const { name } = req.params;
    const config = req.body;

    if (!config || typeof config !== 'object') {
      res.status(400).json({ error: 'Invalid config format' });
      return;
    }

    const pluginManager = PluginManager.getInstance();

    // メモリ上のプラグインを更新
    const state = pluginManager.getPlugin(name);
    if (state) {
      await pluginManager.updatePluginConfig(name, config);
    }

    // DBも更新
    pluginsRepository.updateConfig(name, config);

    res.json({ success: true, message: 'Config updated' });
  } catch (error) {
    console.error('[PluginsAPI] Failed to update config:', error);
    res.status(500).json({
      error: 'Failed to update config',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * プラグイン有効/無効切替
 * PUT /api/plugins/:name/active
 */
pluginsRouter.put('/:name/active', async (req, res) => {
  try {
    const { name } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      res.status(400).json({ error: 'isActive must be a boolean' });
      return;
    }

    const pluginManager = PluginManager.getInstance();

    // メモリ上のプラグインを更新
    const state = pluginManager.getPlugin(name);
    if (state) {
      await pluginManager.setPluginActive(name, isActive);
    }

    // DBも更新
    pluginsRepository.setActive(name, isActive);

    res.json({ success: true, isActive });
  } catch (error) {
    console.error('[PluginsAPI] Failed to update active status:', error);
    res.status(500).json({
      error: 'Failed to update active status',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * 現在のAgentプラグイン取得
 * GET /api/plugins/agent/current
 */
pluginsRouter.get('/agent/current', (_req, res) => {
  try {
    const pluginManager = PluginManager.getInstance();
    const currentAgent = pluginManager.getCurrentAgent();

    if (currentAgent) {
      res.json({
        name: currentAgent.manifest.name,
        displayName: currentAgent.manifest.displayName,
        version: currentAgent.manifest.version,
        supportedModels: currentAgent.manifest.supportedModels,
        capabilities: currentAgent.manifest.capabilities,
      });
    } else {
      res.json(null);
    }
  } catch (error) {
    console.error('[PluginsAPI] Failed to get current agent:', error);
    res.status(500).json({
      error: 'Failed to get current agent',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * Agentプラグイン切替
 * PUT /api/plugins/agent/current
 */
pluginsRouter.put('/agent/current', async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || typeof name !== 'string') {
      res.status(400).json({ error: 'name is required' });
      return;
    }

    const pluginManager = PluginManager.getInstance();
    await pluginManager.setCurrentAgent(name);

    res.json({ success: true, currentAgent: name });
  } catch (error) {
    console.error('[PluginsAPI] Failed to set current agent:', error);
    res.status(500).json({
      error: 'Failed to set current agent',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * プラグインテスト実行
 * POST /api/plugins/:name/test
 */
pluginsRouter.post('/:name/test', async (req, res) => {
  try {
    const { name } = req.params;
    const pluginManager = PluginManager.getInstance();

    const state = pluginManager.getPlugin(name);
    if (!state) {
      res.status(404).json({ error: 'Plugin not found or not loaded' });
      return;
    }

    const { plugin } = state;

    switch (plugin.manifest.type) {
      case 'data-source': {
        const dsPlugin = plugin as DataSourcePlugin;
        const result = await dsPlugin.testConnection();
        res.json(result);
        return;
      }
      case 'notification': {
        const notifPlugin = plugin as NotificationPlugin;
        const result = await notifPlugin.testNotification();
        res.json(result);
        return;
      }
      case 'agent': {
        const agentManifest = plugin.manifest as AgentManifest;
        res.json({
          success: true,
          message: 'Agent plugin is ready',
          supportedModels: agentManifest.supportedModels,
        });
        return;
      }
      default:
        res.json({ success: true, message: 'No specific test available' });
    }
  } catch (error) {
    console.error('[PluginsAPI] Plugin test failed:', error);
    res.status(500).json({
      success: false,
      error: 'Plugin test failed',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * プラグインインストール（ZIPファイルアップロード）
 * POST /api/plugins/install
 */
pluginsRouter.post('/install', upload.single('plugin'), async (req, res) => {
  const uploadedFile = req.file;

  try {
    if (!uploadedFile) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const pluginManager = PluginManager.getInstance();
    const plugin = await pluginManager.installPlugin(uploadedFile.path);

    // DBに登録
    const manifest = plugin.manifest as ExtendedManifest;
    const existing = pluginsRepository.findByName(manifest.name);
    if (existing) {
      pluginsRepository.update(manifest.name, {
        version: manifest.version,
        description: manifest.description,
        supportedDataTypes: manifest.supportedDataTypes,
      });
    } else {
      pluginsRepository.create({
        name: manifest.name,
        displayName: manifest.displayName,
        version: manifest.version,
        type: manifest.type,
        description: manifest.description,
        supportedDataTypes: manifest.supportedDataTypes,
        isActive: true,
      });
    }

    res.json({
      success: true,
      plugin: {
        name: manifest.name,
        displayName: manifest.displayName,
        version: manifest.version,
        type: manifest.type,
      },
    });
  } catch (error) {
    console.error('[PluginsAPI] Plugin install failed:', error);
    res.status(500).json({
      error: 'Plugin install failed',
      message: error instanceof Error ? error.message : String(error),
    });
  } finally {
    // アップロードファイルをクリーンアップ
    if (uploadedFile) {
      try {
        fs.unlinkSync(uploadedFile.path);
      } catch (error) {
        console.error('[PluginsAPI] Failed to cleanup temp file:', error);
      }
    }
  }
});

/**
 * プラグインアンインストール
 * DELETE /api/plugins/:name
 */
pluginsRouter.delete('/:name', async (req, res) => {
  try {
    const { name } = req.params;

    const pluginManager = PluginManager.getInstance();
    const state = pluginManager.getPlugin(name);

    // メモリにロードされている場合はアンインストール
    if (state) {
      await pluginManager.uninstallPlugin(name);
    }

    // DBからも削除
    pluginsRepository.delete(name);

    res.json({ success: true, message: `Plugin ${name} uninstalled` });
  } catch (error) {
    console.error('[PluginsAPI] Plugin uninstall failed:', error);
    res.status(500).json({
      error: 'Plugin uninstall failed',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * DataSourceプラグインの手動データ取得
 * POST /api/plugins/:name/fetch
 */
pluginsRouter.post('/:name/fetch', async (req, res) => {
  try {
    const { name } = req.params;
    const { startDate, endDate, dataTypes } = req.body;

    const pluginManager = PluginManager.getInstance();
    const state = pluginManager.getPlugin(name);

    if (!state) {
      res.status(404).json({ error: 'Plugin not found or not loaded' });
      return;
    }

    if (state.plugin.manifest.type !== 'data-source') {
      res.status(400).json({ error: 'Plugin is not a data-source plugin' });
      return;
    }

    const dsPlugin = state.plugin as DataSourcePlugin;
    const result = await dsPlugin.fetchData({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      dataTypes,
    });

    res.json(result);
  } catch (error) {
    console.error('[PluginsAPI] Data fetch failed:', error);
    res.status(500).json({
      success: false,
      error: 'Data fetch failed',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * プラグインのロード（DBに登録済みのプラグインをメモリにロード）
 * POST /api/plugins/:name/load
 */
pluginsRouter.post('/:name/load', async (req, res) => {
  try {
    const { name } = req.params;

    const dbRecord = pluginsRepository.findByName(name);
    if (!dbRecord) {
      res.status(404).json({ error: 'Plugin not found in database' });
      return;
    }

    const pluginManager = PluginManager.getInstance();

    // プラグインディレクトリからロード
    const pluginsDir = pluginManager.getPluginsDir();
    const pluginDir = path.join(pluginsDir, name);
    if (!fs.existsSync(pluginDir)) {
      res.status(404).json({ error: 'Plugin directory not found' });
      return;
    }

    const plugin = await pluginManager.loadPluginFromPath(pluginDir);

    // 設定を適用
    const config = JSON.parse(dbRecord.config);
    if (Object.keys(config).length > 0) {
      await pluginManager.updatePluginConfig(name, config);
    }

    // 有効状態を適用
    await pluginManager.setPluginActive(name, dbRecord.is_active === 1);

    res.json({
      success: true,
      plugin: {
        name: plugin.manifest.name,
        displayName: plugin.manifest.displayName,
        version: plugin.manifest.version,
        type: plugin.manifest.type,
      },
    });
  } catch (error) {
    console.error('[PluginsAPI] Plugin load failed:', error);
    res.status(500).json({
      error: 'Plugin load failed',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});
