/**
 * プラグインインターフェース - エクスポート
 */

// 基底インターフェース
export type {
  PluginType,
  ConfigField,
  ConfigSchema,
  PluginManifest,
  ValidationResult,
  BasePlugin,
  PluginFactory,
} from './base.js';

// DataSourcePlugin
export type {
  DataTypeDefinition,
  DataSourceManifest,
  FetchOptions,
  HealthDataInput,
  FetchResult,
  PerPluginFetchOptions,
  PluginFetchResult,
  ConnectionTestResult,
  DataSourcePlugin,
} from './data-source.js';
export { isDataSourcePlugin } from './data-source.js';

// AgentPlugin
export type {
  AgentCapabilities,
  AgentManifest,
  GenerateReportParams,
  ReportContent,
  ReportChunk,
  AgentPlugin,
} from './agent.js';
export { isAgentPlugin } from './agent.js';

// NotificationPlugin
export type {
  NotificationEventType,
  NotificationManifest,
  ReportGeneratedPayload,
  HealthAlertPayload,
  DataFetchedPayload,
  SystemErrorPayload,
  NotificationPayload,
  NotificationEvent,
  NotificationResult,
  NotificationPlugin,
} from './notification.js';
export { isNotificationPlugin } from './notification.js';
