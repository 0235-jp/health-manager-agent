/**
 * Oura APIレスポンス → 標準データタイプ変換
 */

import type {
  DailySleepData,
  SleepPeriodData,
  DailyActivityData,
  DailyReadinessData,
  HeartRateData,
  DailySpO2Data,
  DailyStressData,
} from './api-client.js';

export interface HealthDataInput {
  dataType: string;
  value: number;
  unit: string;
  recordedAt: Date;
  metadata?: Record<string, unknown>;
}

/**
 * 秒を時間に変換
 */
function secondsToHours(seconds: number): number {
  return Math.round((seconds / 3600) * 100) / 100;
}

/**
 * 日付文字列をDate型に変換（日本時間として扱う）
 */
function parseDate(dateStr: string): Date {
  // YYYY-MM-DD形式の場合、UTCの0時として解釈
  if (dateStr.includes('T')) {
    return new Date(dateStr);
  }
  return new Date(`${dateStr}T00:00:00Z`);
}

/**
 * Daily Sleepデータを変換
 */
export function mapDailySleep(data: DailySleepData[]): HealthDataInput[] {
  const results: HealthDataInput[] = [];

  for (const item of data) {
    const recordedAt = parseDate(item.day);

    if (item.score !== null) {
      results.push({
        dataType: 'sleep_quality',
        value: item.score,
        unit: 'score',
        recordedAt,
        metadata: { source: 'daily_sleep', id: item.id },
      });
    }
  }

  return results;
}

/**
 * Sleep Periodデータを変換
 */
export function mapSleepPeriods(data: SleepPeriodData[]): HealthDataInput[] {
  const results: HealthDataInput[] = [];

  for (const item of data) {
    const recordedAt = new Date(item.bedtime_end);

    // 睡眠時間
    results.push({
      dataType: 'sleep_duration',
      value: secondsToHours(item.total_sleep_duration),
      unit: 'hours',
      recordedAt,
      metadata: { source: 'sleep', id: item.id },
    });

    // 深い睡眠
    results.push({
      dataType: 'deep_sleep',
      value: secondsToHours(item.deep_sleep_duration),
      unit: 'hours',
      recordedAt,
      metadata: { source: 'sleep', id: item.id },
    });

    // レム睡眠
    results.push({
      dataType: 'rem_sleep',
      value: secondsToHours(item.rem_sleep_duration),
      unit: 'hours',
      recordedAt,
      metadata: { source: 'sleep', id: item.id },
    });

    // 平均心拍数（睡眠中）
    if (item.average_heart_rate !== null) {
      results.push({
        dataType: 'heart_rate',
        value: item.average_heart_rate,
        unit: 'bpm',
        recordedAt,
        metadata: { source: 'sleep', id: item.id, context: 'sleeping' },
      });
    }
  }

  return results;
}

/**
 * Daily Activityデータを変換
 */
export function mapDailyActivity(data: DailyActivityData[]): HealthDataInput[] {
  const results: HealthDataInput[] = [];

  for (const item of data) {
    const recordedAt = parseDate(item.day);

    // 歩数
    results.push({
      dataType: 'steps',
      value: item.steps,
      unit: 'count',
      recordedAt,
      metadata: { source: 'daily_activity', id: item.id },
    });

    // 消費カロリー
    results.push({
      dataType: 'calories_burned',
      value: item.total_calories,
      unit: 'kcal',
      recordedAt,
      metadata: { source: 'daily_activity', id: item.id },
    });

    // アクティブカロリー（Oura独自）
    results.push({
      dataType: 'oura:active_calories',
      value: item.active_calories,
      unit: 'kcal',
      recordedAt,
      metadata: { source: 'daily_activity', id: item.id },
    });

    // 活動スコア
    if (item.score !== null) {
      results.push({
        dataType: 'oura:activity_score',
        value: item.score,
        unit: 'score',
        recordedAt,
        metadata: { source: 'daily_activity', id: item.id },
      });
    }
  }

  return results;
}

/**
 * Daily Readinessデータを変換
 */
export function mapDailyReadiness(data: DailyReadinessData[]): HealthDataInput[] {
  const results: HealthDataInput[] = [];

  for (const item of data) {
    const recordedAt = parseDate(item.day);

    // レディネススコア
    if (item.score !== null) {
      results.push({
        dataType: 'oura:readiness_score',
        value: item.score,
        unit: 'score',
        recordedAt,
        metadata: { source: 'daily_readiness', id: item.id },
      });
    }

    // 体温偏差
    if (item.temperature_deviation !== null) {
      results.push({
        dataType: 'oura:temperature_deviation',
        value: item.temperature_deviation,
        unit: '°C',
        recordedAt,
        metadata: { source: 'daily_readiness', id: item.id },
      });
    }
  }

  return results;
}

/**
 * Heart Rateデータを変換
 * 注: 大量のデータポイントがあるため、日ごとに集約することを推奨
 */
export function mapHeartRate(data: HeartRateData[]): HealthDataInput[] {
  const results: HealthDataInput[] = [];

  // 日ごとにグループ化して平均を計算
  const byDay = new Map<string, { sum: number; count: number; lastTimestamp: string }>();

  for (const item of data) {
    const day = item.timestamp.split('T')[0];
    const existing = byDay.get(day);

    if (existing) {
      existing.sum += item.bpm;
      existing.count += 1;
      existing.lastTimestamp = item.timestamp;
    } else {
      byDay.set(day, {
        sum: item.bpm,
        count: 1,
        lastTimestamp: item.timestamp,
      });
    }
  }

  for (const [day, stats] of byDay) {
    results.push({
      dataType: 'heart_rate',
      value: Math.round(stats.sum / stats.count),
      unit: 'bpm',
      recordedAt: new Date(stats.lastTimestamp),
      metadata: { source: 'heartrate', context: 'daily_average', sampleCount: stats.count },
    });
  }

  return results;
}

/**
 * Daily SpO2データを変換
 */
export function mapDailySpO2(data: DailySpO2Data[]): HealthDataInput[] {
  const results: HealthDataInput[] = [];

  for (const item of data) {
    const recordedAt = parseDate(item.day);

    if (item.spo2_percentage?.average !== undefined) {
      results.push({
        dataType: 'oura:spo2',
        value: item.spo2_percentage.average,
        unit: '%',
        recordedAt,
        metadata: { source: 'daily_spo2', id: item.id },
      });
    }
  }

  return results;
}

/**
 * Daily Stressデータを変換
 */
export function mapDailyStress(data: DailyStressData[]): HealthDataInput[] {
  const results: HealthDataInput[] = [];

  for (const item of data) {
    const recordedAt = parseDate(item.day);

    if (item.stress_high !== null) {
      results.push({
        dataType: 'oura:stress_level',
        value: item.stress_high,
        unit: 'score',
        recordedAt,
        metadata: {
          source: 'daily_stress',
          id: item.id,
          recovery_high: item.recovery_high,
          day_summary: item.day_summary,
        },
      });
    }
  }

  return results;
}
