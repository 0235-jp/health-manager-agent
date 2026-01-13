/**
 * プラグインシステム - エクスポート
 */

// インターフェース
export * from './interfaces/index.js';

// バージョン管理
export {
  PLUGIN_API_VERSION,
  isValidSemver,
  checkHostVersionCompatibility,
  type VersionCompatibilityResult,
} from './version.js';

// コアシステム
export { EventBus } from './event-bus.js';
export { PluginRegistry, type PluginState } from './registry.js';
export { PluginLoader, type LoadedPlugin, type LoadError } from './loader.js';
export { PluginManager } from './manager.js';
