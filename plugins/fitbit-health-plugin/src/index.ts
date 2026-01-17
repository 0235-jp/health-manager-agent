/**
 * Fitbit Health Data Source Plugin
 *
 * Fetches health data from Fitbit Web API using OAuth 2.0 with PKCE.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { formatLocalDate } from './constants.js';
import { FitbitApiClient, type TokenInfo } from './api-client.js';
import {
  mapActivity,
  mapRestingHeartRate,
  mapHeartRateIntraday,
  mapHRV,
  mapSleep,
  mapSleepPhases,
  mapSpO2,
  mapBreathingRate,
  mapTemperature,
  mapCardioScore,
  mapWeight,
  mapNutrition,
  mapWater,
  type HealthDataInput,
  type TimeseriesDataInput,
} from './data-mapper.js';

// Plugin interface type definitions
interface DataTypeDefinition {
  name: string;
  displayName: string;
  category: string;
  unit: string;
  description?: string;
}

interface DataSourceManifest {
  name: string;
  displayName: string;
  version: string;
  type: 'data-source';
  description?: string;
  author?: string;
  main: string;
  supportedDataTypes: DataTypeDefinition[];
  fetchStrategy: 'manual' | 'scheduled' | 'both';
  defaultFetchInterval?: number;
  configSchema?: Record<string, unknown>;
}

interface FetchOptions {
  startDate?: Date;
  endDate?: Date;
  dataTypes?: string[];
}

interface FetchResult {
  success: boolean;
  data: HealthDataInput[];
  timeseriesData?: TimeseriesDataInput[];
  errors?: string[];
  nextFetchAt?: Date;
}

interface ConnectionTestResult {
  success: boolean;
  message?: string;
}

interface PluginContext {
  config: Record<string, unknown>;
  toolExecutor?: unknown;
  promptBuilder?: unknown;
  useSkills?: boolean;
}

interface DataSourcePlugin {
  readonly manifest: DataSourceManifest;
  initialize(context: PluginContext): Promise<void>;
  dispose(): Promise<void>;
  fetchData(options: FetchOptions): Promise<FetchResult>;
  testConnection(): Promise<ConnectionTestResult>;
  getAuthorizationUrl?(redirectUri: string, state: string): string;
  handleOAuthCallback?(code: string, redirectUri: string): Promise<TokenInfo>;
}

// Load manifest.json path
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const manifestPath = path.resolve(__dirname, '..', 'manifest.json');

/**
 * Fitbit Health Plugin Implementation
 */
class FitbitHealthPlugin implements DataSourcePlugin {
  readonly manifest: DataSourceManifest;

  private client: FitbitApiClient | null = null;
  private config: Record<string, unknown> = {};

  constructor(manifest: DataSourceManifest) {
    this.manifest = manifest;
  }

  async initialize(context: PluginContext): Promise<void> {
    const { config } = context;
    this.config = config;

    const clientId = config.clientId as string | undefined;
    const clientSecret = config.clientSecret as string | undefined;
    const accessToken = config.accessToken as string | undefined;
    const refreshToken = config.refreshToken as string | undefined;
    const tokenExpiresAt = config.tokenExpiresAt as number | undefined;
    const codeVerifier = config.codeVerifier as string | undefined;

    if (clientId && clientSecret) {
      this.client = new FitbitApiClient({
        clientId,
        clientSecret,
        accessToken,
        refreshToken,
        tokenExpiresAt,
      });

      // Restore code verifier if present (mid-auth flow)
      if (codeVerifier) {
        this.client.setCodeVerifier(codeVerifier);
      }

      // Set token refresh callback to update config
      this.client.setTokenRefreshCallback((tokenInfo: TokenInfo) => {
        this.config.accessToken = tokenInfo.accessToken;
        this.config.refreshToken = tokenInfo.refreshToken;
        this.config.tokenExpiresAt = tokenInfo.expiresAt;
        // Clear code verifier after successful token exchange
        delete this.config.codeVerifier;
      });

      console.log('[FitbitHealthPlugin] Initialized with client credentials');
    } else {
      console.log('[FitbitHealthPlugin] Initialized without client credentials');
    }
  }

  async dispose(): Promise<void> {
    this.client = null;
  }

  /**
   * Generate OAuth authorization URL with PKCE
   */
  getAuthorizationUrl(redirectUri: string, state: string): string {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    const { url, codeVerifier } = this.client.getAuthorizationUrl(redirectUri, state);

    // Store code verifier in config for later retrieval
    this.config.codeVerifier = codeVerifier;

    return url;
  }

  /**
   * Handle OAuth callback
   */
  async handleOAuthCallback(code: string, redirectUri: string): Promise<TokenInfo> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    // Get code verifier from config
    const codeVerifier = this.config.codeVerifier as string | undefined;

    const tokenInfo = await this.client.exchangeCodeForToken(code, redirectUri, codeVerifier);

    // Clear code verifier from config after successful exchange
    delete this.config.codeVerifier;

    return tokenInfo;
  }

  /**
   * Fetch health data from Fitbit
   */
  async fetchData(options: FetchOptions): Promise<FetchResult> {
    if (!this.client) {
      return {
        success: false,
        data: [],
        errors: ['Client credentials are not configured'],
      };
    }

    if (!this.config.accessToken) {
      return {
        success: false,
        data: [],
        errors: ['OAuth authentication is required. Please authorize the app first.'],
      };
    }

    const errors: string[] = [];
    const allData: HealthDataInput[] = [];
    const allTimeseriesData: TimeseriesDataInput[] = [];

    const endDate = options.endDate || new Date();
    const startDate = options.startDate || new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    const requestedTypes = options.dataTypes ? new Set(options.dataTypes) : null;

    const shouldFetch = (types: string[]): boolean => {
      return !requestedTypes || types.some(t => requestedTypes.has(t));
    };

    type FetchTask = {
      types: string[];
      name: string;
      fetch: () => Promise<void>;
    };

    const tasks: FetchTask[] = [
      // Activity data (includes steps, calories, distance, etc.)
      {
        types: [
          'steps',
          'calories_burned',
          'fitbit:active_calories',
          'fitbit:bmr_calories',
          'fitbit:distance',
          'fitbit:floors',
          'fitbit:elevation',
          'fitbit:very_active_minutes',
          'fitbit:fairly_active_minutes',
          'fitbit:lightly_active_minutes',
          'fitbit:sedentary_minutes',
        ],
        name: 'Activity',
        fetch: async () => {
          await this.forEachDate(startDate, endDate, async (date, dateStr) => {
            try {
              const response = await this.client!.getActivitySummary(date);
              allData.push(...mapActivity(response, dateStr));
            } catch (error) {
              errors.push(`Activity data fetch failed for ${dateStr}: ${this.getErrorMessage(error)}`);
            }
          });
        },
      },

      // Heart rate data
      {
        types: ['resting_heart_rate', 'heart_rate_timeseries'],
        name: 'Heart rate',
        fetch: async () => {
          await this.forEachDate(startDate, endDate, async (date, dateStr) => {
            try {
              // Try to get intraday data first (includes resting HR)
              let response;
              try {
                response = await this.client!.getHeartRateIntraday(date);
                if (shouldFetch(['heart_rate_timeseries'])) {
                  allTimeseriesData.push(...mapHeartRateIntraday(response, dateStr));
                }
              } catch {
                // Intraday might not be available, get regular data
                response = await this.client!.getHeartRate(date);
              }

              if (shouldFetch(['resting_heart_rate'])) {
                allData.push(...mapRestingHeartRate(response));
              }
            } catch (error) {
              errors.push(`Heart rate data fetch failed for ${dateStr}: ${this.getErrorMessage(error)}`);
            }
          });
        },
      },

      // HRV data
      {
        types: ['hrv', 'fitbit:deep_hrv'],
        name: 'HRV',
        fetch: async () => {
          try {
            const response = await this.client!.getHRVRange(startDate, endDate);
            allData.push(...mapHRV(response));
          } catch (error) {
            errors.push(`HRV data fetch failed: ${this.getErrorMessage(error)}`);
          }
        },
      },

      // Sleep data
      {
        types: [
          'sleep_duration',
          'deep_sleep',
          'light_sleep',
          'rem_sleep',
          'fitbit:awake_time',
          'fitbit:sleep_latency',
          'fitbit:time_in_bed',
          'fitbit:sleep_phase',
        ],
        name: 'Sleep',
        fetch: async () => {
          try {
            const response = await this.client!.getSleepRange(startDate, endDate);
            allData.push(...mapSleep(response));

            if (shouldFetch(['fitbit:sleep_phase'])) {
              allTimeseriesData.push(...mapSleepPhases(response));
            }
          } catch (error) {
            errors.push(`Sleep data fetch failed: ${this.getErrorMessage(error)}`);
          }
        },
      },

      // SpO2 data
      {
        types: ['spo2'],
        name: 'SpO2',
        fetch: async () => {
          try {
            const responses = await this.client!.getSpO2Range(startDate, endDate);
            for (const response of responses) {
              allData.push(...mapSpO2(response));
            }
          } catch (error) {
            errors.push(`SpO2 data fetch failed: ${this.getErrorMessage(error)}`);
          }
        },
      },

      // Breathing rate data
      {
        types: ['respiratory_rate'],
        name: 'Breathing rate',
        fetch: async () => {
          try {
            const response = await this.client!.getBreathingRateRange(startDate, endDate);
            allData.push(...mapBreathingRate(response));
          } catch (error) {
            errors.push(`Breathing rate data fetch failed: ${this.getErrorMessage(error)}`);
          }
        },
      },

      // Temperature data
      {
        types: ['skin_temperature'],
        name: 'Temperature',
        fetch: async () => {
          try {
            const response = await this.client!.getTemperatureRange(startDate, endDate);
            allData.push(...mapTemperature(response));
          } catch (error) {
            errors.push(`Temperature data fetch failed: ${this.getErrorMessage(error)}`);
          }
        },
      },

      // VO2 Max data
      {
        types: ['vo2_max'],
        name: 'Cardio score',
        fetch: async () => {
          try {
            const response = await this.client!.getCardioScoreRange(startDate, endDate);
            allData.push(...mapCardioScore(response));
          } catch (error) {
            errors.push(`Cardio score data fetch failed: ${this.getErrorMessage(error)}`);
          }
        },
      },

      // Weight/body data
      {
        types: ['body_weight', 'body_fat', 'fitbit:bmi', 'fitbit:lean_mass'],
        name: 'Weight',
        fetch: async () => {
          try {
            const response = await this.client!.getWeightRange(startDate, endDate);
            allData.push(...mapWeight(response));
          } catch (error) {
            errors.push(`Weight data fetch failed: ${this.getErrorMessage(error)}`);
          }
        },
      },

      // Nutrition data
      {
        types: [
          'calories_intake',
          'nutrition_protein',
          'nutrition_carbs',
          'nutrition_fat',
          'fitbit:fiber',
          'fitbit:sodium',
        ],
        name: 'Nutrition',
        fetch: async () => {
          await this.forEachDate(startDate, endDate, async (date, dateStr) => {
            try {
              const response = await this.client!.getNutrition(date);
              allData.push(...mapNutrition(response, dateStr));
            } catch (error) {
              errors.push(`Nutrition data fetch failed for ${dateStr}: ${this.getErrorMessage(error)}`);
            }
          });
        },
      },

      // Water data
      {
        types: ['water_intake'],
        name: 'Water',
        fetch: async () => {
          await this.forEachDate(startDate, endDate, async (date, dateStr) => {
            try {
              const response = await this.client!.getWater(date);
              allData.push(...mapWater(response, dateStr));
            } catch (error) {
              errors.push(`Water data fetch failed for ${dateStr}: ${this.getErrorMessage(error)}`);
            }
          });
        },
      },
    ];

    // Execute tasks sequentially to respect rate limits
    for (const task of tasks) {
      if (shouldFetch(task.types)) {
        try {
          await task.fetch();
        } catch (error) {
          errors.push(`${task.name} data fetch failed: ${this.getErrorMessage(error)}`);
        }
      }
    }

    // Deduplicate data
    const uniqueData = this.deduplicateByKey(
      allData,
      item => `${item.dataType}_${item.recordedAt.toISOString()}`
    );
    const uniqueTimeseriesData = this.deduplicateByKey(
      allTimeseriesData,
      item => `${item.dataType}_${item.timestamp.toISOString()}`
    );

    const nextFetchAt = new Date(
      Date.now() + (this.manifest.defaultFetchInterval || 60) * 60 * 1000
    );

    return {
      success: errors.length === 0,
      data: uniqueData,
      timeseriesData: uniqueTimeseriesData.length > 0 ? uniqueTimeseriesData : undefined,
      errors: errors.length > 0 ? errors : undefined,
      nextFetchAt,
    };
  }

  /**
   * Test connection to Fitbit API
   */
  async testConnection(): Promise<ConnectionTestResult> {
    if (!this.client) {
      return {
        success: false,
        message: 'Client credentials are not configured',
      };
    }

    if (!this.config.accessToken) {
      return {
        success: false,
        message: 'OAuth authentication is required. Please authorize the app first.',
      };
    }

    return this.client.testConnection();
  }

  /**
   * Get error message from unknown error
   */
  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  /**
   * Iterate over each date in a range and execute a callback
   */
  private async forEachDate(
    startDate: Date,
    endDate: Date,
    callback: (date: Date, dateStr: string) => Promise<void>
  ): Promise<void> {
    const current = new Date(startDate);
    while (current <= endDate) {
      const dateStr = formatLocalDate(current);
      await callback(current, dateStr);
      current.setDate(current.getDate() + 1);
    }
  }

  /**
   * Deduplicate array by key function
   */
  private deduplicateByKey<T>(data: T[], keyFn: (item: T) => string): T[] {
    const seen = new Map<string, T>();
    for (const item of data) {
      const key = keyFn(item);
      if (!seen.has(key)) {
        seen.set(key, item);
      }
    }
    return Array.from(seen.values());
  }
}

// Cached manifest
let cachedManifest: DataSourceManifest | null = null;

function loadManifest(): DataSourceManifest {
  if (!cachedManifest) {
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    cachedManifest = JSON.parse(manifestContent) as DataSourceManifest;
  }
  return cachedManifest;
}

/**
 * Plugin factory function
 */
export function createPlugin(): DataSourcePlugin {
  return new FitbitHealthPlugin(loadManifest());
}

/**
 * Default export (factory function)
 */
export default function (): DataSourcePlugin {
  return new FitbitHealthPlugin(loadManifest());
}
