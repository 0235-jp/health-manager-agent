/**
 * PluginLoader - プラグインの読み込み・検証
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import AdmZip from 'adm-zip';
import type {
  BasePlugin,
  PluginFactory,
  PluginManifest,
  PluginType,
} from './interfaces/index.js';
import { checkHostVersionCompatibility, isValidSemver } from './version.js';

/**
 * 読み込まれたプラグイン
 */
export interface LoadedPlugin {
  manifest: PluginManifest;
  instance: BasePlugin;
  path: string;
}

/**
 * 読み込みエラー
 */
export interface LoadError {
  pluginPath: string;
  error: string;
}

/**
 * プラグインローダー
 * プラグインの読み込み、検証、インストールを担当
 */
export class PluginLoader {
  private pluginsDir: string;

  constructor(pluginsDir: string) {
    this.pluginsDir = pluginsDir;
  }

  /**
   * pluginsディレクトリからすべてのプラグインを読み込み
   */
  async loadAll(): Promise<{
    loaded: LoadedPlugin[];
    errors: LoadError[];
  }> {
    const loaded: LoadedPlugin[] = [];
    const errors: LoadError[] = [];

    // pluginsディレクトリが存在しない場合は作成
    if (!fs.existsSync(this.pluginsDir)) {
      fs.mkdirSync(this.pluginsDir, { recursive: true });
      return { loaded, errors };
    }

    const entries = fs.readdirSync(this.pluginsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const pluginPath = path.join(this.pluginsDir, entry.name);

      try {
        const plugin = await this.loadPlugin(pluginPath);
        loaded.push(plugin);
      } catch (error) {
        errors.push({
          pluginPath,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return { loaded, errors };
  }

  /**
   * 単一プラグインを読み込み
   * @param pluginPath プラグインディレクトリのパス
   */
  async loadPlugin(pluginPath: string): Promise<LoadedPlugin> {
    // 1. manifest.jsonを読み込み
    const manifestPath = path.join(pluginPath, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`manifest.json not found in ${pluginPath}`);
    }

    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestContent) as PluginManifest;

    // 2. マニフェストを検証
    this.validateManifest(manifest);

    // 3. エントリーポイントを動的import
    const entryPath = path.join(pluginPath, manifest.main);
    if (!fs.existsSync(entryPath)) {
      throw new Error(`Entry point not found: ${entryPath}`);
    }

    // 動的importでプラグインモジュールを読み込み
    const module = await import(entryPath);

    // default exportまたはcreatePlugin関数を探す
    let factory: PluginFactory;
    if (typeof module.default === 'function') {
      factory = module.default;
    } else if (typeof module.createPlugin === 'function') {
      factory = module.createPlugin;
    } else {
      throw new Error(
        `Plugin must export a factory function as default or createPlugin: ${pluginPath}`
      );
    }

    // 4. プラグインインスタンスを作成
    const instance = factory();

    return {
      manifest,
      instance,
      path: pluginPath,
    };
  }

  /**
   * ZIPファイルからプラグインをインストール
   * @param zipPath ZIPファイルのパス
   * @returns インストールされたプラグイン
   */
  async installFromZip(zipPath: string): Promise<LoadedPlugin> {
    // 1. 一時ディレクトリに展開
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'plugin-'));

    try {
      const zip = new AdmZip(zipPath);
      zip.extractAllTo(tempDir, true);

      // 展開されたディレクトリを探す
      const entries = fs.readdirSync(tempDir, { withFileTypes: true });
      let extractedDir = tempDir;

      // ZIPにルートディレクトリが含まれている場合
      if (entries.length === 1 && entries[0].isDirectory()) {
        extractedDir = path.join(tempDir, entries[0].name);
      }

      // 2. manifest.jsonを読み込んで検証
      const manifestPath = path.join(extractedDir, 'manifest.json');
      if (!fs.existsSync(manifestPath)) {
        throw new Error('manifest.json not found in ZIP');
      }

      const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
      const manifest = JSON.parse(manifestContent) as PluginManifest;
      this.validateManifest(manifest);

      // 3. pluginsディレクトリに配置
      const targetDir = path.join(this.pluginsDir, manifest.name);

      // 既存プラグインがある場合は上書き
      if (fs.existsSync(targetDir)) {
        fs.rmSync(targetDir, { recursive: true });
      }

      // ディレクトリをコピー
      this.copyDir(extractedDir, targetDir);

      // 4. プラグインを読み込み
      return await this.loadPlugin(targetDir);
    } finally {
      // 一時ディレクトリを削除
      fs.rmSync(tempDir, { recursive: true });
    }
  }

  /**
   * プラグインをアンインストール
   * @param pluginName プラグイン名
   */
  async uninstall(pluginName: string): Promise<void> {
    const pluginPath = path.join(this.pluginsDir, pluginName);

    if (!fs.existsSync(pluginPath)) {
      throw new Error(`Plugin "${pluginName}" not found`);
    }

    fs.rmSync(pluginPath, { recursive: true });
  }

  /**
   * マニフェストを検証
   */
  private validateManifest(manifest: PluginManifest): void {
    const errors: string[] = [];

    // 必須フィールドのチェック
    if (!manifest.name || typeof manifest.name !== 'string') {
      errors.push('name is required and must be a string');
    } else if (!/^[a-z0-9-_]+$/i.test(manifest.name)) {
      errors.push('name must contain only alphanumeric characters, - and _');
    }

    if (!manifest.displayName || typeof manifest.displayName !== 'string') {
      errors.push('displayName is required and must be a string');
    }

    if (!manifest.version || typeof manifest.version !== 'string') {
      errors.push('version is required and must be a string');
    } else if (!isValidSemver(manifest.version)) {
      // セマンティックバージョン形式のチェック
      errors.push(
        `version must be a valid semantic version (e.g., "1.0.0"), got "${manifest.version}"`
      );
    }

    if (!manifest.type) {
      errors.push('type is required');
    } else {
      const validTypes: PluginType[] = [
        'data-source',
        'agent',
        'notification',
      ];
      if (!validTypes.includes(manifest.type)) {
        errors.push(`type must be one of: ${validTypes.join(', ')}`);
      }
    }

    if (!manifest.main || typeof manifest.main !== 'string') {
      errors.push('main is required and must be a string');
    }

    // ホストAPIバージョン互換性チェック
    const compatResult = checkHostVersionCompatibility(manifest.minHostVersion);
    if (!compatResult.compatible && compatResult.message) {
      errors.push(compatResult.message);
    }

    if (errors.length > 0) {
      throw new Error(`Invalid manifest: ${errors.join('; ')}`);
    }
  }

  /**
   * ディレクトリを再帰的にコピー
   */
  private copyDir(src: string, dest: string): void {
    fs.mkdirSync(dest, { recursive: true });

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        this.copyDir(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  /**
   * pluginsディレクトリのパスを取得
   */
  getPluginsDir(): string {
    return this.pluginsDir;
  }
}
