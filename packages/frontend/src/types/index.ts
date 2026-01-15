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

/** ユーザープロファイル */
export interface UserProfile {
  /** 生年月日 (YYYY-MM-DD 形式) */
  birthDate?: string;
  /** 身長 (cm) */
  height?: number;
  /** 性別 */
  sex?: 'male' | 'female' | 'other';
  /** 持病 */
  medicalConditions?: string[];
  /** アレルギー */
  allergies?: string[];
}

export interface Settings {
  collection_interval: number;
  timezone: string;
  active_plugins: string[];
  data_source_priority: Record<string, string>;
  report_excluded_periods: ExcludedPeriod[];
  user_profile?: UserProfile;
  /** API取得データをファイルに保存 */
  debug_api_responses?: boolean;
  /** チャットデータをファイルに保存 */
  debug_chat?: boolean;
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

export type ReportType = 'on_fetch' | 'daily' | 'manual';

export interface Report {
  id: number;
  report_type: ReportType;
  period_start: string;
  period_end: string;
  content: ReportContent;
  created_at: string;
}

export interface GenerateReportInput {
  report_type: ReportType;
  target_date?: string;
  /** datetime-local形式 (YYYY-MM-DDTHH:mm) - manual タイプ用 */
  start_datetime?: string;
  /** datetime-local形式 (YYYY-MM-DDTHH:mm) - manual タイプ用 */
  end_datetime?: string;
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
  timeseries?: boolean;
  interval?: number;
}

// Timeseries types
export interface TimeseriesData {
  id: number;
  data_type: string;
  value: number | null;
  string_value: string | null;
  source: string;
  interval_seconds: number | null;
  recorded_at: string;
  period_date: string;
  parent_id: string | null;
  created_at: string;
}

export interface TimeseriesAggregateResult {
  data_type: string;
  min: number | null;
  max: number | null;
  avg: number | null;
  count: number;
}

export interface ResampledPoint {
  bucket_start: string;
  avg_value: number | null;
  min_value: number | null;
  max_value: number | null;
  count: number;
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
