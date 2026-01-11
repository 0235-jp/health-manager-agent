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

export interface Settings {
  collection_interval: number;
  active_plugins: string[];
  data_source_priority: Record<string, string>;
  webhook_url: string;
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
