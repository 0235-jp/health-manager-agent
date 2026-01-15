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
  PluginContext,
  BasePlugin,
  PluginFactory,
} from './base.js';

// Tool system
export type {
  ToolDefinition,
  ToolResult,
  ToolExecutor,
  PromptBuilder,
  ReportPromptParams,
  ChatPromptParams,
  CustomInstruction,
} from '../tools/index.js';

// DataSourcePlugin
export type {
  DataTypeDefinition,
  DataSourceManifest,
  FetchOptions,
  HealthDataInput,
  TimeseriesDataInput,
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
  ChatMessage,
  ChatParams,
  ChatResult,
  AgentPlugin,
} from './agent.js';
export { isAgentPlugin } from './agent.js';

// NotificationPlugin
export type {
  NotificationEventType,
  NotificationManifest,
  ReportGeneratedPayload,
  DataFetchedPayload,
  NotificationPayload,
  NotificationEvent,
  NotificationResult,
  NotificationPlugin,
} from './notification.js';
export { isNotificationPlugin } from './notification.js';
