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
