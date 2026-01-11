/**
 * Oura Ring Data Source Plugin
 *
 * Oura Ring API v2からヘルスデータを取得するプラグイン
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { OuraApiClient } from './api-client.js';
import {
  mapDailySleep,
  mapSleepPeriods,
  mapDailyActivity,
  mapDailyReadiness,
  mapHeartRate,
  mapDailySpO2,
  mapDailyStress,
  mapVO2Max,
  mapDailyCardiovascularAge,
  mapDailyResilience,
  mapWorkouts,
  mapSessions,
  mapSleepTime,
  mapEnhancedTags,
  mapRestModePeriods,
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

interface DataSourcePlugin {
  readonly manifest: DataSourceManifest;
  initialize(config: Record<string, unknown>): Promise<void>;
  dispose(): Promise<void>;
  fetchData(options: FetchOptions): Promise<FetchResult>;
  testConnection(): Promise<ConnectionTestResult>;
}

// manifest.jsonを読み込み
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const manifestPath = path.resolve(__dirname, '..', 'manifest.json');

/**
 * Oura Ring Data Source Plugin 実装
 */
class OuraRingPlugin implements DataSourcePlugin {
  readonly manifest: DataSourceManifest;

  private client: OuraApiClient | null = null;
  private accessToken: string = '';

  constructor(manifest: DataSourceManifest) {
    this.manifest = manifest;
  }

  async initialize(config: Record<string, unknown>): Promise<void> {
    if (config.accessToken && typeof config.accessToken === 'string') {
      this.accessToken = config.accessToken;
      this.client = new OuraApiClient({ accessToken: this.accessToken });
      console.log('[OuraRingPlugin] Initialized with access token');
    } else {
      console.log('[OuraRingPlugin] Initialized without access token');
    }
  }

  async dispose(): Promise<void> {
    this.client = null;
  }

  /**
   * データを取得
   */
  async fetchData(options: FetchOptions): Promise<FetchResult> {
    if (!this.client) {
      return {
        success: false,
        data: [],
        errors: ['Access token is not configured'],
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

    // 各エンドポイントからデータを取得
    try {
      // Daily Sleep & Sleep Periods
      if (!requestedTypes || this.hasAnyType(requestedTypes, ['sleep_duration', 'deep_sleep', 'rem_sleep', 'oura:sleep_score'])) {
        const [dailySleep, sleepPeriods] = await Promise.all([
          this.client.getDailySleep(startDate, endDate),
          this.client.getSleepPeriods(startDate, endDate),
        ]);
        allData.push(...mapDailySleep(dailySleep));
        allData.push(...mapSleepPeriods(sleepPeriods));
      }
    } catch (error) {
      errors.push(`Sleep data fetch failed: ${this.getErrorMessage(error)}`);
    }

    try {
      // Daily Activity
      if (!requestedTypes || this.hasAnyType(requestedTypes, ['steps', 'oura:calories_burned', 'oura:activity_score', 'oura:active_calories'])) {
        const activity = await this.client.getDailyActivity(startDate, endDate);
        allData.push(...mapDailyActivity(activity));
      }
    } catch (error) {
      errors.push(`Activity data fetch failed: ${this.getErrorMessage(error)}`);
    }

    try {
      // Daily Readiness
      if (!requestedTypes || this.hasAnyType(requestedTypes, ['oura:readiness_score', 'temperature_deviation'])) {
        const readiness = await this.client.getDailyReadiness(startDate, endDate);
        allData.push(...mapDailyReadiness(readiness));
      }
    } catch (error) {
      errors.push(`Readiness data fetch failed: ${this.getErrorMessage(error)}`);
    }

    try {
      // Heart Rate（過去24時間のみ、大量のデータになるため）
      if (!requestedTypes || requestedTypes.has('heart_rate')) {
        const hrStartDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
        const heartRate = await this.client.getHeartRate(hrStartDate, endDate);
        allData.push(...mapHeartRate(heartRate));
      }
    } catch (error) {
      errors.push(`Heart rate data fetch failed: ${this.getErrorMessage(error)}`);
    }

    try {
      // Daily SpO2
      if (!requestedTypes || requestedTypes.has('spo2')) {
        const spo2 = await this.client.getDailySpO2(startDate, endDate);
        allData.push(...mapDailySpO2(spo2));
      }
    } catch (error) {
      errors.push(`SpO2 data fetch failed: ${this.getErrorMessage(error)}`);
    }

    try {
      // Daily Stress
      if (!requestedTypes || requestedTypes.has('oura:stress_level')) {
        const stress = await this.client.getDailyStress(startDate, endDate);
        allData.push(...mapDailyStress(stress));
      }
    } catch (error) {
      errors.push(`Stress data fetch failed: ${this.getErrorMessage(error)}`);
    }

    try {
      // VO2 Max
      if (!requestedTypes || requestedTypes.has('vo2_max')) {
        const vo2max = await this.client.getVO2Max(startDate, endDate);
        allData.push(...mapVO2Max(vo2max));
      }
    } catch (error) {
      errors.push(`VO2 Max data fetch failed: ${this.getErrorMessage(error)}`);
    }

    try {
      // Daily Cardiovascular Age
      if (!requestedTypes || requestedTypes.has('cardiovascular_age')) {
        const cardiovascular = await this.client.getDailyCardiovascularAge(startDate, endDate);
        allData.push(...mapDailyCardiovascularAge(cardiovascular));
      }
    } catch (error) {
      errors.push(`Cardiovascular age data fetch failed: ${this.getErrorMessage(error)}`);
    }

    try {
      // Daily Resilience
      if (!requestedTypes || requestedTypes.has('oura:resilience')) {
        const resilience = await this.client.getDailyResilience(startDate, endDate);
        allData.push(...mapDailyResilience(resilience));
      }
    } catch (error) {
      errors.push(`Resilience data fetch failed: ${this.getErrorMessage(error)}`);
    }

    try {
      // Workouts
      if (!requestedTypes || this.hasAnyType(requestedTypes, ['workout_duration', 'workout_calories', 'oura:workout_distance'])) {
        const workouts = await this.client.getWorkouts(startDate, endDate);
        allData.push(...mapWorkouts(workouts));
      }
    } catch (error) {
      errors.push(`Workout data fetch failed: ${this.getErrorMessage(error)}`);
    }

    try {
      // Sessions
      if (!requestedTypes || requestedTypes.has('session_duration')) {
        const sessions = await this.client.getSessions(startDate, endDate);
        allData.push(...mapSessions(sessions));
      }
    } catch (error) {
      errors.push(`Session data fetch failed: ${this.getErrorMessage(error)}`);
    }

    try {
      // Sleep Time
      if (!requestedTypes || requestedTypes.has('oura:recommended_bedtime')) {
        const sleepTime = await this.client.getSleepTime(startDate, endDate);
        allData.push(...mapSleepTime(sleepTime));
      }
    } catch (error) {
      errors.push(`Sleep time data fetch failed: ${this.getErrorMessage(error)}`);
    }

    try {
      // Enhanced Tags
      if (!requestedTypes || requestedTypes.has('oura:tag')) {
        const tags = await this.client.getEnhancedTags(startDate, endDate);
        allData.push(...mapEnhancedTags(tags));
      }
    } catch (error) {
      errors.push(`Enhanced tag data fetch failed: ${this.getErrorMessage(error)}`);
    }

    try {
      // Rest Mode Periods
      if (!requestedTypes || requestedTypes.has('oura:rest_mode_duration')) {
        const restModes = await this.client.getRestModePeriods(startDate, endDate);
        allData.push(...mapRestModePeriods(restModes));
      }
    } catch (error) {
      errors.push(`Rest mode data fetch failed: ${this.getErrorMessage(error)}`);
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
        message: 'Access token is not configured',
      };
    }

    return this.client.testConnection();
  }

  /**
   * 指定されたデータタイプのいずれかが含まれているか
   */
  private hasAnyType(requestedTypes: Set<string>, types: string[]): boolean {
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
  return new OuraRingPlugin(loadManifest());
}

/**
 * デフォルトエクスポート（ファクトリ関数）
 */
export default function(): DataSourcePlugin {
  return new OuraRingPlugin(loadManifest());
}
