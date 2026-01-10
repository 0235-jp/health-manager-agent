import type { HealthData, PaginatedResponse, Settings } from '../types';

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
};
