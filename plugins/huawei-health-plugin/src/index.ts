/**
 * Huawei Health Data Source Plugin
 *
 * Huawei Health Kit REST APIからヘルスデータを取得するプラグイン
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { HuaweiHealthApiClient, type TokenInfo } from './api-client.js';
import {
  mapSteps,
  mapHeartRate,
  mapSleep,
  mapActivity,
  mapBodyMetrics,
  mapBloodPressure,
  mapStress,
  mapSpO2,
  mapBloodGlucose,
  mapBodyTemperature,
  mapHydrate,
  mapHeartRateTimeseries,
  mapStressTimeseries,
  mapSpO2Timeseries,
  mapRestingHeartRate,
  mapHRV,
  mapNutrition,
  mapMenstrual,
  mapSleepRecord,
  mapUrineRoutine,
  type HealthDataInput,
  type TimeseriesDataInput,
} from './data-mapper.js';

// プラグインインターフェースの型定義
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

// PluginContext interface (from server package)
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

// manifest.jsonを読み込み
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const manifestPath = path.resolve(__dirname, '..', 'manifest.json');

/**
 * Huawei Health Data Source Plugin 実装
 */
class HuaweiHealthPlugin implements DataSourcePlugin {
  readonly manifest: DataSourceManifest;

  private client: HuaweiHealthApiClient | null = null;
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

    if (clientId && clientSecret) {
      this.client = new HuaweiHealthApiClient({
        clientId,
        clientSecret,
        accessToken,
        refreshToken,
        tokenExpiresAt,
      });

      // トークン更新時にコンフィグを更新
      this.client.setTokenRefreshCallback((tokenInfo: TokenInfo) => {
        this.config.accessToken = tokenInfo.accessToken;
        this.config.refreshToken = tokenInfo.refreshToken;
        this.config.tokenExpiresAt = tokenInfo.expiresAt;
      });

      console.log('[HuaweiHealthPlugin] Initialized with client credentials');
    } else {
      console.log('[HuaweiHealthPlugin] Initialized without client credentials');
    }
  }

  async dispose(): Promise<void> {
    this.client = null;
  }

  /**
   * OAuth認証URLを取得
   */
  getAuthorizationUrl(redirectUri: string, state: string): string {
    if (!this.client) {
      throw new Error('Client not initialized');
    }
    return this.client.getAuthorizationUrl(redirectUri, state);
  }

  /**
   * OAuthコールバック処理
   */
  async handleOAuthCallback(code: string, redirectUri: string): Promise<TokenInfo> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }
    return this.client.exchangeCodeForToken(code, redirectUri);
  }

  /**
   * データを取得
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

    // データ取得定義: 各エントリは [取得条件の型配列, 取得関数, エラー名]
    type FetchTask = {
      types: string[];
      name: string;
      fetch: () => Promise<void>;
    };

    const tasks: FetchTask[] = [
      {
        types: ['steps'],
        name: 'Steps',
        fetch: async () => {
          const data = await this.client!.getSteps(startDate, endDate);
          allData.push(...mapSteps(data));
        },
      },
      {
        types: ['heart_rate', 'heart_rate_timeseries'],
        name: 'Heart rate',
        fetch: async () => {
          const data = await this.client!.getHeartRate(startDate, endDate);
          if (shouldFetch(['heart_rate'])) allData.push(...mapHeartRate(data));
          if (shouldFetch(['heart_rate_timeseries'])) allTimeseriesData.push(...mapHeartRateTimeseries(data));
        },
      },
      {
        types: ['resting_heart_rate'],
        name: 'Resting heart rate',
        fetch: async () => {
          const data = await this.client!.getRestingHeartRate(startDate, endDate);
          allData.push(...mapRestingHeartRate(data));
        },
      },
      {
        types: ['huawei:hrv'],
        name: 'HRV',
        fetch: async () => {
          const data = await this.client!.getHRV(startDate, endDate);
          allData.push(...mapHRV(data));
        },
      },
      {
        types: ['sleep_duration', 'deep_sleep', 'light_sleep', 'rem_sleep', 'huawei:awake_time'],
        name: 'Sleep',
        fetch: async () => {
          const data = await this.client!.getSleep(startDate, endDate);
          allData.push(...mapSleep(data));
        },
      },
      {
        types: ['huawei:sleep_score', 'huawei:sleep_respiratory_rate'],
        name: 'Sleep record',
        fetch: async () => {
          const data = await this.client!.getSleepRecord(startDate, endDate);
          allData.push(...mapSleepRecord(data));
        },
      },
      {
        types: ['calories_burned', 'huawei:active_calories', 'huawei:bmr_calories', 'huawei:distance', 'huawei:floors_climbed'],
        name: 'Activity',
        fetch: async () => {
          const data = await this.client!.getActivity(startDate, endDate);
          allData.push(...mapActivity(data));
        },
      },
      {
        types: ['body_weight', 'huawei:body_height', 'body_fat', 'huawei:bmi', 'muscle_mass', 'bone_mass', 'body_water', 'visceral_fat'],
        name: 'Body metrics',
        fetch: async () => {
          const data = await this.client!.getBodyMetrics(startDate, endDate);
          allData.push(...mapBodyMetrics(data));
        },
      },
      {
        types: ['blood_pressure_systolic', 'blood_pressure_diastolic'],
        name: 'Blood pressure',
        fetch: async () => {
          const data = await this.client!.getBloodPressure(startDate, endDate);
          allData.push(...mapBloodPressure(data));
        },
      },
      {
        types: ['huawei:stress_level', 'huawei:stress_timeseries'],
        name: 'Stress',
        fetch: async () => {
          const data = await this.client!.getStress(startDate, endDate);
          if (shouldFetch(['huawei:stress_level'])) allData.push(...mapStress(data));
          if (shouldFetch(['huawei:stress_timeseries'])) allTimeseriesData.push(...mapStressTimeseries(data));
        },
      },
      {
        types: ['spo2', 'huawei:spo2_timeseries'],
        name: 'SpO2',
        fetch: async () => {
          const data = await this.client!.getSpO2(startDate, endDate);
          if (shouldFetch(['spo2'])) allData.push(...mapSpO2(data));
          if (shouldFetch(['huawei:spo2_timeseries'])) allTimeseriesData.push(...mapSpO2Timeseries(data));
        },
      },
      {
        types: ['blood_glucose'],
        name: 'Blood glucose',
        fetch: async () => {
          const data = await this.client!.getBloodGlucose(startDate, endDate);
          allData.push(...mapBloodGlucose(data));
        },
      },
      {
        types: ['body_temperature', 'skin_temperature'],
        name: 'Body temperature',
        fetch: async () => {
          const data = await this.client!.getBodyTemperature(startDate, endDate);
          allData.push(...mapBodyTemperature(data));
        },
      },
      {
        types: ['water_intake'],
        name: 'Hydrate',
        fetch: async () => {
          const data = await this.client!.getHydrate(startDate, endDate);
          allData.push(...mapHydrate(data));
        },
      },
      {
        types: ['calories_intake', 'nutrition_protein', 'nutrition_carbs', 'nutrition_fat'],
        name: 'Nutrition',
        fetch: async () => {
          const data = await this.client!.getNutrition(startDate, endDate);
          allData.push(...mapNutrition(data));
        },
      },
      {
        types: ['menstrual_flow', 'menstrual_cycle', 'ovulation_detection', 'cervical_mucus', 'dysmenorrhoea'],
        name: 'Menstrual',
        fetch: async () => {
          const data = await this.client!.getMenstrualData(startDate, endDate);
          allData.push(...mapMenstrual(data));
        },
      },
      {
        types: ['uric_acid', 'urine_bilirubin', 'urine_glucose'],
        name: 'Urine routine',
        fetch: async () => {
          const data = await this.client!.getUrineRoutine(startDate, endDate);
          allData.push(...mapUrineRoutine(data));
        },
      },
    ];

    // 各タスクを順次実行
    for (const task of tasks) {
      if (shouldFetch(task.types)) {
        try {
          await task.fetch();
        } catch (error) {
          errors.push(`${task.name} data fetch failed: ${this.getErrorMessage(error)}`);
        }
      }
    }

    // 重複を排除
    const uniqueData = this.deduplicateByKey(allData, item => `${item.dataType}_${item.recordedAt.toISOString()}`);
    const uniqueTimeseriesData = this.deduplicateByKey(allTimeseriesData, item => `${item.dataType}_${item.timestamp.toISOString()}`);

    const nextFetchAt = new Date(Date.now() + (this.manifest.defaultFetchInterval || 60) * 60 * 1000);

    return {
      success: errors.length === 0,
      data: uniqueData,
      timeseriesData: uniqueTimeseriesData.length > 0 ? uniqueTimeseriesData : undefined,
      errors: errors.length > 0 ? errors : undefined,
      nextFetchAt,
    };
  }

  /**
   * 接続テスト
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
   * エラーメッセージを取得
   */
  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  /**
   * キー関数を使用して重複を排除
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

// manifest.jsonを読み込んでキャッシュ
let cachedManifest: DataSourceManifest | null = null;

function loadManifest(): DataSourceManifest {
  if (!cachedManifest) {
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    cachedManifest = JSON.parse(manifestContent) as DataSourceManifest;
  }
  return cachedManifest;
}

/**
 * プラグインファクトリ関数
 */
export function createPlugin(): DataSourcePlugin {
  return new HuaweiHealthPlugin(loadManifest());
}

/**
 * デフォルトエクスポート（ファクトリ関数）
 */
export default function(): DataSourcePlugin {
  return new HuaweiHealthPlugin(loadManifest());
}
