/**
 * Huawei Health Data Source Plugin
 *
 * Huawei Health Kit REST APIからヘルスデータを取得するプラグイン
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { HuaweiHealthApiClient, TokenInfo } from './api-client.js';
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
  type HealthDataInput,
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
  private onConfigUpdate?: (config: Record<string, unknown>) => void;

  constructor(manifest: DataSourceManifest) {
    this.manifest = manifest;
  }

  /**
   * 設定更新時のコールバックを設定
   */
  setConfigUpdateCallback(callback: (config: Record<string, unknown>) => void): void {
    this.onConfigUpdate = callback;
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

        if (this.onConfigUpdate) {
          this.onConfigUpdate(this.config);
        }
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

    // デフォルトの日付範囲（過去7日間）
    const endDate = options.endDate || new Date();
    const startDate =
      options.startDate ||
      new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    const requestedTypes = options.dataTypes
      ? new Set(options.dataTypes)
      : null;

    // 各データタイプを取得
    try {
      // 歩数
      if (!requestedTypes || requestedTypes.has('steps')) {
        const steps = await this.client.getSteps(startDate, endDate);
        allData.push(...mapSteps(steps));
      }
    } catch (error) {
      errors.push(`Steps data fetch failed: ${this.getErrorMessage(error)}`);
    }

    try {
      // 心拍数
      if (!requestedTypes || requestedTypes.has('heart_rate')) {
        const heartRate = await this.client.getHeartRate(startDate, endDate);
        allData.push(...mapHeartRate(heartRate));
      }
    } catch (error) {
      errors.push(`Heart rate data fetch failed: ${this.getErrorMessage(error)}`);
    }

    try {
      // 睡眠
      if (!requestedTypes || this.hasAnyType(requestedTypes, ['sleep_duration', 'deep_sleep', 'light_sleep', 'rem_sleep', 'huawei:awake_time'])) {
        const sleep = await this.client.getSleep(startDate, endDate);
        allData.push(...mapSleep(sleep));
      }
    } catch (error) {
      errors.push(`Sleep data fetch failed: ${this.getErrorMessage(error)}`);
    }

    try {
      // 活動（カロリー、距離など）
      if (!requestedTypes || this.hasAnyType(requestedTypes, ['huawei:calories_burned', 'huawei:active_calories', 'huawei:bmr_calories', 'huawei:distance', 'huawei:floors_climbed'])) {
        const activity = await this.client.getActivity(startDate, endDate);
        allData.push(...mapActivity(activity));
      }
    } catch (error) {
      errors.push(`Activity data fetch failed: ${this.getErrorMessage(error)}`);
    }

    try {
      // 身体測定
      if (!requestedTypes || this.hasAnyType(requestedTypes, ['body_weight', 'huawei:body_height', 'body_fat', 'huawei:bmi', 'muscle_mass', 'bone_mass', 'body_water', 'visceral_fat'])) {
        const bodyMetrics = await this.client.getBodyMetrics(startDate, endDate);
        allData.push(...mapBodyMetrics(bodyMetrics));
      }
    } catch (error) {
      errors.push(`Body metrics data fetch failed: ${this.getErrorMessage(error)}`);
    }

    try {
      // 血圧
      if (!requestedTypes || this.hasAnyType(requestedTypes, ['blood_pressure_systolic', 'blood_pressure_diastolic'])) {
        const bloodPressure = await this.client.getBloodPressure(startDate, endDate);
        allData.push(...mapBloodPressure(bloodPressure));
      }
    } catch (error) {
      errors.push(`Blood pressure data fetch failed: ${this.getErrorMessage(error)}`);
    }

    try {
      // ストレス
      if (!requestedTypes || requestedTypes.has('huawei:stress_level')) {
        const stress = await this.client.getStress(startDate, endDate);
        allData.push(...mapStress(stress));
      }
    } catch (error) {
      errors.push(`Stress data fetch failed: ${this.getErrorMessage(error)}`);
    }

    try {
      // SpO2
      if (!requestedTypes || requestedTypes.has('spo2')) {
        const spo2 = await this.client.getSpO2(startDate, endDate);
        allData.push(...mapSpO2(spo2));
      }
    } catch (error) {
      errors.push(`SpO2 data fetch failed: ${this.getErrorMessage(error)}`);
    }

    try {
      // 血糖値
      if (!requestedTypes || requestedTypes.has('blood_glucose')) {
        const bloodGlucose = await this.client.getBloodGlucose(startDate, endDate);
        allData.push(...mapBloodGlucose(bloodGlucose));
      }
    } catch (error) {
      errors.push(`Blood glucose data fetch failed: ${this.getErrorMessage(error)}`);
    }

    try {
      // 体温
      if (!requestedTypes || this.hasAnyType(requestedTypes, ['body_temperature', 'skin_temperature'])) {
        const bodyTemp = await this.client.getBodyTemperature(startDate, endDate);
        allData.push(...mapBodyTemperature(bodyTemp));
      }
    } catch (error) {
      errors.push(`Body temperature data fetch failed: ${this.getErrorMessage(error)}`);
    }

    try {
      // 水分摂取
      if (!requestedTypes || requestedTypes.has('water_intake')) {
        const hydrate = await this.client.getHydrate(startDate, endDate);
        allData.push(...mapHydrate(hydrate));
      }
    } catch (error) {
      errors.push(`Hydrate data fetch failed: ${this.getErrorMessage(error)}`);
    }

    // 重複を排除（同じdataType + recordedAt）
    const uniqueData = this.deduplicateData(allData);

    // 次回の取得時刻を計算
    const nextFetchAt = new Date(
      Date.now() + (this.manifest.defaultFetchInterval || 60) * 60 * 1000
    );

    return {
      success: errors.length === 0,
      data: uniqueData,
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
   * 指定されたデータタイプのいずれかが含まれているか
   */
  private hasAnyType(requestedTypes: Set<string> | null, types: string[]): boolean {
    if (!requestedTypes) return true;
    return types.some((type) => requestedTypes.has(type));
  }

  /**
   * エラーメッセージを取得
   */
  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  /**
   * データの重複を排除
   */
  private deduplicateData(data: HealthDataInput[]): HealthDataInput[] {
    const seen = new Map<string, HealthDataInput>();

    for (const item of data) {
      const key = `${item.dataType}_${item.recordedAt.toISOString()}`;
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
