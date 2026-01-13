export interface HealthData {
  id: number;
  data_type: string;
  value: number;
  unit: string | null;
  source: string;
  recorded_at: string;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

/** レポート生成除外時間帯 */
export interface ExcludedPeriod {
  id: string;
  /** 開始時刻 (HH:MM 形式) */
  startTime: string;
  /** 終了時刻 (HH:MM 形式) */
  endTime: string;
  enabled: boolean;
}

export interface Settings {
  collection_interval: number;
  timezone: string;
  active_plugins: string[];
  data_source_priority: Record<string, string>;
  report_excluded_periods: ExcludedPeriod[];
}

export interface ApiError {
  error: {
    message: string;
    details?: unknown;
  };
}

export interface CustomInstruction {
  id: number;
  instruction: string;
  priority: number;
  is_active: number; // SQLite boolean (0 or 1)
  created_at: string;
  updated_at: string;
}

export interface CreateCustomInstructionInput {
  instruction: string;
  priority?: number;
  is_active?: boolean;
}

export interface UpdateCustomInstructionInput {
  instruction?: string;
  priority?: number;
  is_active?: boolean;
}

export interface TrendResult {
  data_type: string;
  trend: 'up' | 'down' | 'stable';
  change_percent: number;
  latest_value: number;
  first_value: number;
}

export interface MetricValue {
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
}

export interface ReportContent {
  summary: string;
  metrics: Record<string, MetricValue>;
  risks: string[];
  recommendations: string[];
}

export interface Report {
  id: number;
  report_type: 'on_fetch' | 'daily';
  period_start: string;
  period_end: string;
  content: ReportContent;
  created_at: string;
}

export interface GenerateReportInput {
  report_type: 'on_fetch' | 'daily';
  target_date?: string;
}

// Plugin types
export type PluginType = 'data-source' | 'agent' | 'notification';

export interface ConfigField {
  type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect';
  label: string;
  description?: string;
  required?: boolean;
  secret?: boolean;
  options?: { value: string; label: string }[];
  default?: unknown;
}

export interface DataTypeDefinition {
  name: string;
  displayName: string;
  category: string;
  unit: string;
  description?: string;
}

export interface Plugin {
  name: string;
  displayName: string;
  version: string;
  type: PluginType;
  description?: string;
  isActive: boolean;
  isLoaded: boolean;
  config: Record<string, unknown>;
  configSchema?: Record<string, ConfigField>;
  supportedDataTypes?: DataTypeDefinition[];
  supportedModels?: string[];
  capabilities?: string[];
  installedAt?: string;
  updatedAt?: string;
}

export interface CurrentAgent {
  name: string;
  displayName: string;
  version: string;
  supportedModels: string[];
  capabilities: string[];
}

export interface PluginTestResult {
  success: boolean;
  message?: string;
}

export interface PluginInstallResult {
  success: boolean;
  plugin: {
    name: string;
    displayName: string;
    version: string;
    type: PluginType;
  };
}

export interface FetchResult {
  success: boolean;
  data: Array<{
    dataType: string;
    value: number;
    unit: string;
    recordedAt: string;
  }>;
  errors?: string[];
}

export interface DataType {
  name: string;
  display_name: string;
  category: string | null;
  unit: string | null;
  is_standard: boolean;
  plugin_name: string | null;
}

// Chat types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatStreamEvent {
  type: 'text' | 'done' | 'error';
  content?: string;
  session_id?: string;
  message?: string;
}
