/**
 * Huawei Health APIレスポンス → 標準データタイプ変換
 */

import type {
  StepsData,
  HeartRateData,
  SleepData,
  ActivityData,
  BodyMetricsData,
  BloodPressureData,
  StressData,
  SpO2Data,
  BloodGlucoseData,
  BodyTemperatureData,
  HydrateData,
} from './api-client.js';

export interface HealthDataInput {
  dataType: string;
  value: number;
  unit: string;
  recordedAt: Date;
  metadata?: Record<string, unknown>;
}

/**
 * 分を時間に変換
 */
function minutesToHours(minutes: number): number {
  return Math.round((minutes / 60) * 100) / 100;
}

/**
 * 歩数データを変換
 */
export function mapSteps(data: StepsData[]): HealthDataInput[] {
  return data.map(item => ({
    dataType: 'steps',
    value: item.steps,
    unit: 'count',
    recordedAt: item.timestamp,
    metadata: { source: 'huawei_health' },
  }));
}

/**
 * 心拍数データを変換
 * 日ごとにグループ化して平均を計算
 */
export function mapHeartRate(data: HeartRateData[]): HealthDataInput[] {
  const byDay = new Map<string, { sum: number; count: number; lastTimestamp: Date }>();

  for (const item of data) {
    const day = item.timestamp.toISOString().split('T')[0];
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

  return Array.from(byDay.entries()).map(([day, stats]) => ({
    dataType: 'heart_rate',
    value: Math.round(stats.sum / stats.count),
    unit: 'bpm',
    recordedAt: stats.lastTimestamp,
    metadata: { source: 'huawei_health', context: 'daily_average', sampleCount: stats.count },
  }));
}

/**
 * 睡眠データを変換
 */
export function mapSleep(data: SleepData[]): HealthDataInput[] {
  const results: HealthDataInput[] = [];

  for (const item of data) {
    const recordedAt = item.endTime;

    // 総睡眠時間
    results.push({
      dataType: 'sleep_duration',
      value: minutesToHours(item.totalDuration),
      unit: 'hours',
      recordedAt,
      metadata: { source: 'huawei_health', day: item.day },
    });

    // 深い睡眠
    if (item.deepSleep !== undefined && item.deepSleep > 0) {
      results.push({
        dataType: 'deep_sleep',
        value: minutesToHours(item.deepSleep),
        unit: 'hours',
        recordedAt,
        metadata: { source: 'huawei_health', day: item.day },
      });
    }

    // 浅い睡眠
    if (item.lightSleep !== undefined && item.lightSleep > 0) {
      results.push({
        dataType: 'light_sleep',
        value: minutesToHours(item.lightSleep),
        unit: 'hours',
        recordedAt,
        metadata: { source: 'huawei_health', day: item.day },
      });
    }

    // レム睡眠
    if (item.remSleep !== undefined && item.remSleep > 0) {
      results.push({
        dataType: 'rem_sleep',
        value: minutesToHours(item.remSleep),
        unit: 'hours',
        recordedAt,
        metadata: { source: 'huawei_health', day: item.day },
      });
    }

    // 覚醒時間
    if (item.awakeTime !== undefined && item.awakeTime > 0) {
      results.push({
        dataType: 'huawei:awake_time',
        value: item.awakeTime,
        unit: 'minutes',
        recordedAt,
        metadata: { source: 'huawei_health', day: item.day },
      });
    }
  }

  return results;
}

/**
 * 活動データを変換
 */
export function mapActivity(data: ActivityData[]): HealthDataInput[] {
  const results: HealthDataInput[] = [];

  for (const item of data) {
    const recordedAt = new Date(`${item.day}T23:59:59Z`);

    // 消費カロリー
    if (item.calories > 0) {
      results.push({
        dataType: 'calories_burned',
        value: item.calories,
        unit: 'kcal',
        recordedAt,
        metadata: { source: 'huawei_health', day: item.day },
      });
    }

    // アクティブカロリー
    if (item.activeCalories !== undefined && item.activeCalories > 0) {
      results.push({
        dataType: 'huawei:active_calories',
        value: item.activeCalories,
        unit: 'kcal',
        recordedAt,
        metadata: { source: 'huawei_health', day: item.day },
      });
    }

    // 基礎代謝カロリー
    if (item.bmrCalories !== undefined && item.bmrCalories > 0) {
      results.push({
        dataType: 'huawei:bmr_calories',
        value: item.bmrCalories,
        unit: 'kcal',
        recordedAt,
        metadata: { source: 'huawei_health', day: item.day },
      });
    }

    // 移動距離
    if (item.distance !== undefined && item.distance > 0) {
      results.push({
        dataType: 'huawei:distance',
        value: item.distance,
        unit: 'meters',
        recordedAt,
        metadata: { source: 'huawei_health', day: item.day },
      });
    }

    // 登った階数
    if (item.floorsClimbed !== undefined && item.floorsClimbed > 0) {
      results.push({
        dataType: 'huawei:floors_climbed',
        value: item.floorsClimbed,
        unit: 'count',
        recordedAt,
        metadata: { source: 'huawei_health', day: item.day },
      });
    }
  }

  return results;
}

/**
 * 身体測定データを変換
 */
export function mapBodyMetrics(data: BodyMetricsData[]): HealthDataInput[] {
  const results: HealthDataInput[] = [];

  for (const item of data) {
    const recordedAt = item.timestamp;

    // 体重
    if (item.weight !== undefined && item.weight > 0) {
      results.push({
        dataType: 'body_weight',
        value: item.weight,
        unit: 'kg',
        recordedAt,
        metadata: { source: 'huawei_health' },
      });
    }

    // 身長
    if (item.height !== undefined && item.height > 0) {
      results.push({
        dataType: 'huawei:body_height',
        value: item.height,
        unit: 'cm',
        recordedAt,
        metadata: { source: 'huawei_health' },
      });
    }

    // 体脂肪率
    if (item.bodyFat !== undefined && item.bodyFat > 0) {
      results.push({
        dataType: 'body_fat',
        value: item.bodyFat,
        unit: '%',
        recordedAt,
        metadata: { source: 'huawei_health' },
      });
    }

    // BMI
    if (item.bmi !== undefined && item.bmi > 0) {
      results.push({
        dataType: 'huawei:bmi',
        value: item.bmi,
        unit: 'kg/m2',
        recordedAt,
        metadata: { source: 'huawei_health' },
      });
    }

    // 筋肉量
    if (item.muscleMass !== undefined && item.muscleMass > 0) {
      results.push({
        dataType: 'muscle_mass',
        value: item.muscleMass,
        unit: 'kg',
        recordedAt,
        metadata: { source: 'huawei_health' },
      });
    }

    // 骨量
    if (item.boneMass !== undefined && item.boneMass > 0) {
      results.push({
        dataType: 'bone_mass',
        value: item.boneMass,
        unit: 'kg',
        recordedAt,
        metadata: { source: 'huawei_health' },
      });
    }

    // 体水分率
    if (item.bodyWater !== undefined && item.bodyWater > 0) {
      results.push({
        dataType: 'body_water',
        value: item.bodyWater,
        unit: '%',
        recordedAt,
        metadata: { source: 'huawei_health' },
      });
    }

    // 内臓脂肪レベル
    if (item.visceralFat !== undefined && item.visceralFat > 0) {
      results.push({
        dataType: 'visceral_fat',
        value: item.visceralFat,
        unit: 'level',
        recordedAt,
        metadata: { source: 'huawei_health' },
      });
    }
  }

  return results;
}

/**
 * 血圧データを変換
 */
export function mapBloodPressure(data: BloodPressureData[]): HealthDataInput[] {
  const results: HealthDataInput[] = [];

  for (const item of data) {
    const recordedAt = item.timestamp;

    // 収縮期血圧
    results.push({
      dataType: 'blood_pressure_systolic',
      value: item.systolic,
      unit: 'mmHg',
      recordedAt,
      metadata: { source: 'huawei_health' },
    });

    // 拡張期血圧
    results.push({
      dataType: 'blood_pressure_diastolic',
      value: item.diastolic,
      unit: 'mmHg',
      recordedAt,
      metadata: { source: 'huawei_health' },
    });
  }

  return results;
}

/**
 * ストレスデータを変換
 */
export function mapStress(data: StressData[]): HealthDataInput[] {
  return data.map(item => ({
    dataType: 'huawei:stress_level',
    value: item.level,
    unit: 'score',
    recordedAt: item.timestamp,
    metadata: { source: 'huawei_health' },
  }));
}

/**
 * SpO2データを変換
 */
export function mapSpO2(data: SpO2Data[]): HealthDataInput[] {
  return data.map(item => ({
    dataType: 'spo2',
    value: item.percentage,
    unit: '%',
    recordedAt: item.timestamp,
    metadata: { source: 'huawei_health' },
  }));
}

/**
 * 血糖値データを変換
 */
export function mapBloodGlucose(data: BloodGlucoseData[]): HealthDataInput[] {
  return data.map(item => ({
    dataType: 'blood_glucose',
    value: item.value,
    unit: 'mmol/L',
    recordedAt: item.timestamp,
    metadata: { source: 'huawei_health' },
  }));
}

/**
 * 体温データを変換
 */
export function mapBodyTemperature(data: BodyTemperatureData[]): HealthDataInput[] {
  return data.map(item => ({
    dataType: item.isSkinTemperature ? 'skin_temperature' : 'body_temperature',
    value: item.temperature,
    unit: 'degC',
    recordedAt: item.timestamp,
    metadata: { source: 'huawei_health', isSkinTemperature: item.isSkinTemperature },
  }));
}

/**
 * 水分摂取データを変換
 */
export function mapHydrate(data: HydrateData[]): HealthDataInput[] {
  return data.map(item => ({
    dataType: 'water_intake',
    value: item.amount,
    unit: 'ml',
    recordedAt: item.timestamp,
    metadata: { source: 'huawei_health' },
  }));
}
