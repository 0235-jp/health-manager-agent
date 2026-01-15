import type {
  HealthData,
  PaginatedResponse,
  Settings,
  CustomInstruction,
  CreateCustomInstructionInput,
  UpdateCustomInstructionInput,
  TrendResult,
  Report,
  GenerateReportInput,
  Plugin,
  PluginType,
  CurrentAgent,
  PluginTestResult,
  PluginInstallResult,
  FetchResult,
  DataType,
  ChatMessage,
  ChatStreamEvent,
  TimeseriesData,
  TimeseriesAggregateResult,
  ResampledPoint,
} from '../types';

const API_BASE = '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'API request failed');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

function buildQueryString(params: object): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      searchParams.set(key, String(value));
    }
  }
  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

interface HealthDataListParams {
  data_type?: string;
  source?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

interface HealthDataCreateParams {
  data_type: string;
  value: number;
  unit?: string;
  recorded_at: string;
}

interface HealthDataUpdateParams {
  data_type?: string;
  value?: number;
  unit?: string;
  recorded_at?: string;
}

interface TimeseriesListParams {
  data_type?: string;
  source?: string;
  start_time?: string;
  end_time?: string;
  limit?: number;
  offset?: number;
}

interface TimeseriesAggregateParams {
  data_type: string;
  start_time?: string;
  end_time?: string;
  source?: string;
}

interface TimeseriesResampleParams {
  data_type: string;
  start_time: string;
  end_time: string;
  interval_minutes: number;
  source?: string;
}

export const api = {
  healthData: {
    list(params: HealthDataListParams = {}): Promise<PaginatedResponse<HealthData>> {
      return fetchJson(`/health-data${buildQueryString(params)}`);
    },

    get(id: number): Promise<HealthData> {
      return fetchJson(`/health-data/${id}`);
    },

    create(data: HealthDataCreateParams): Promise<HealthData> {
      return fetchJson('/health-data', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    update(id: number, data: HealthDataUpdateParams): Promise<HealthData> {
      return fetchJson(`/health-data/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    delete(id: number): Promise<void> {
      return fetchJson(`/health-data/${id}`, { method: 'DELETE' });
    },

    getLatest(dataTypes: string[]): Promise<Record<string, HealthData>> {
      const params = dataTypes.map((t) => `data_types=${encodeURIComponent(t)}`).join('&');
      return fetchJson(`/health-data/latest?${params}`);
    },

    getTrend(dataTypes: string[], days: number = 7): Promise<TrendResult[]> {
      const dataTypesParam = dataTypes.map((t) => `data_types=${encodeURIComponent(t)}`).join('&');
      return fetchJson(`/health-data/trend?${dataTypesParam}&days=${days}`);
    },
  },

  settings: {
    get(): Promise<Settings> {
      return fetchJson('/settings');
    },

    update(settings: Partial<Settings>): Promise<Settings> {
      return fetchJson('/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
    },
  },

  customInstructions: {
    list(): Promise<{ data: CustomInstruction[] }> {
      return fetchJson('/custom-instructions');
    },

    get(id: number): Promise<CustomInstruction> {
      return fetchJson(`/custom-instructions/${id}`);
    },

    create(data: CreateCustomInstructionInput): Promise<CustomInstruction> {
      return fetchJson('/custom-instructions', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    update(id: number, data: UpdateCustomInstructionInput): Promise<CustomInstruction> {
      return fetchJson(`/custom-instructions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    delete(id: number): Promise<void> {
      return fetchJson(`/custom-instructions/${id}`, { method: 'DELETE' });
    },

    toggle(id: number): Promise<CustomInstruction> {
      return fetchJson(`/custom-instructions/${id}/toggle`, { method: 'PATCH' });
    },
  },

  reports: {
    list(params: ReportListParams = {}): Promise<PaginatedResponse<Report>> {
      return fetchJson(`/reports${buildQueryString(params)}`);
    },

    get(id: number): Promise<Report> {
      return fetchJson(`/reports/${id}`);
    },

    getLatest(reportType?: 'on_fetch' | 'daily' | 'manual'): Promise<Report> {
      const query = reportType ? `?report_type=${reportType}` : '';
      return fetchJson(`/reports/latest${query}`);
    },

    generate(data: GenerateReportInput): Promise<Report> {
      return fetchJson('/reports/generate', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    delete(id: number): Promise<void> {
      return fetchJson(`/reports/${id}`, { method: 'DELETE' });
    },
  },

  plugins: {
    list(type?: PluginType): Promise<Plugin[]> {
      const query = type ? `?type=${type}` : '';
      return fetchJson(`/plugins${query}`);
    },

    get(name: string): Promise<Plugin> {
      return fetchJson(`/plugins/${encodeURIComponent(name)}`);
    },

    updateConfig(name: string, config: Record<string, unknown>): Promise<{ success: boolean }> {
      return fetchJson(`/plugins/${encodeURIComponent(name)}/config`, {
        method: 'PUT',
        body: JSON.stringify(config),
      });
    },

    setActive(name: string, isActive: boolean): Promise<{ success: boolean; isActive: boolean }> {
      return fetchJson(`/plugins/${encodeURIComponent(name)}/active`, {
        method: 'PUT',
        body: JSON.stringify({ isActive }),
      });
    },

    test(name: string): Promise<PluginTestResult> {
      return fetchJson(`/plugins/${encodeURIComponent(name)}/test`, {
        method: 'POST',
      });
    },

    async install(file: File): Promise<PluginInstallResult> {
      const formData = new FormData();
      formData.append('plugin', file);

      const response = await fetch(`${API_BASE}/plugins/install`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Plugin install failed');
      }

      return response.json();
    },

    uninstall(name: string): Promise<{ success: boolean }> {
      return fetchJson(`/plugins/${encodeURIComponent(name)}`, {
        method: 'DELETE',
      });
    },

    load(name: string): Promise<{ success: boolean; plugin: Plugin }> {
      return fetchJson(`/plugins/${encodeURIComponent(name)}/load`, {
        method: 'POST',
      });
    },

    fetch(name: string, params: { startDate?: string; endDate?: string; dataTypes?: string[] }): Promise<FetchResult> {
      return fetchJson(`/plugins/${encodeURIComponent(name)}/fetch`, {
        method: 'POST',
        body: JSON.stringify(params),
      });
    },

    getCurrentAgent(): Promise<CurrentAgent | null> {
      return fetchJson('/plugins/agent/current');
    },

    setCurrentAgent(name: string): Promise<{ success: boolean; currentAgent: string }> {
      return fetchJson('/plugins/agent/current', {
        method: 'PUT',
        body: JSON.stringify({ name }),
      });
    },
  },

  dataTypes: {
    list(): Promise<{ data: DataType[] }> {
      return fetchJson('/data-types');
    },
  },

  timeseries: {
    list(params: TimeseriesListParams = {}): Promise<PaginatedResponse<TimeseriesData>> {
      return fetchJson(`/health-data/timeseries${buildQueryString(params)}`);
    },

    aggregate(params: TimeseriesAggregateParams): Promise<TimeseriesAggregateResult> {
      return fetchJson(`/health-data/timeseries/aggregate${buildQueryString(params)}`);
    },

    resample(params: TimeseriesResampleParams): Promise<ResampledPoint[]> {
      return fetchJson(`/health-data/timeseries/resample${buildQueryString(params)}`);
    },

    getDataTypes(): Promise<string[]> {
      return fetchJson('/health-data/timeseries/data-types');
    },
  },

  chat: {
    /**
     * ストリーミングチャットを実行
     */
    async stream(
      message: string,
      history: ChatMessage[],
      sessionId: string | null,
      onChunk: (text: string) => void,
      onDone: (sessionId: string) => void,
      onError: (error: string) => void
    ): Promise<void> {
      const response = await fetch(`${API_BASE}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          history: history.map((m) => ({ role: m.role, content: m.content })),
          session_id: sessionId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Chat request failed');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;

            const event = parseSSEData(line.slice(6));
            if (!event) continue;

            switch (event.type) {
              case 'text':
                if (event.content) onChunk(event.content);
                break;
              case 'done':
                onDone(event.session_id || '');
                break;
              case 'error':
                onError(event.message || 'Unknown error');
                break;
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    },
  },
};

function parseSSEData(jsonStr: string): ChatStreamEvent | null {
  try {
    return JSON.parse(jsonStr) as ChatStreamEvent;
  } catch {
    return null;
  }
}

// Scheduler API types

interface ReportListParams {
  report_type?: 'on_fetch' | 'daily' | 'manual';
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

interface PluginStatusEntry {
  pluginName: string;
  lastCollectionTime: string | null;
  lastSuccessTime: string | null;
  consecutiveFailures: number;
  updatedAt: string;
}

interface PluginCollectionEntry {
  pluginName: string;
  success: boolean;
  recordCount: number;
  errors?: string[];
}

export interface SchedulerStatus {
  plugins: PluginStatusEntry[];
}

export interface DataCollectionResult {
  success: boolean;
  totalFetched: number;
  inserted: number;
  skipped: number;
  plugins: PluginCollectionEntry[];
}

export interface BackfillResult {
  success: boolean;
  totalFetched: number;
  inserted: number;
  skipped: number;
  errors: Array<{ pluginName: string; error: string }>;
}

export const schedulerApi = {
  getStatus(): Promise<SchedulerStatus> {
    return fetchJson('/scheduler/status');
  },

  runCollection(): Promise<DataCollectionResult> {
    return fetchJson('/scheduler/run-collection', { method: 'POST' });
  },

  runDailyReport(): Promise<{ success: boolean; message: string }> {
    return fetchJson('/scheduler/run-daily-report', { method: 'POST' });
  },

  runBackfill(params: {
    startDate: string;
    endDate: string;
    pluginNames?: string[];
  }): Promise<BackfillResult> {
    return fetchJson('/scheduler/run-backfill', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },
};
