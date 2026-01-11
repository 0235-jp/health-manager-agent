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

    getLatest(reportType?: 'on_fetch' | 'daily'): Promise<Report> {
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
};

interface ReportListParams {
  report_type?: 'on_fetch' | 'daily';
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}
