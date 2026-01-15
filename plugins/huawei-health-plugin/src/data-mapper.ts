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
  HRVData,
  NutritionData,
  MenstrualData,
  SleepRecordData,
  UrineRoutineData,
} from './api-client.js';

export interface HealthDataInput {
  dataType: string;
  value: number;
  unit: string;
  recordedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface TimeseriesDataInput {
  dataType: string;
  timestamp: Date;
  value: number;
  intervalSeconds: number;
  source?: string;
  periodDate?: string;
  parentId?: string;
  metadata?: Record<string, unknown>;
}

const SOURCE = 'huawei_health';
const PLUGIN_SOURCE = 'huawei-health-plugin';

/**
 * 分を時間に変換
 */
function minutesToHours(minutes: number): number {
  return Math.round((minutes / 60) * 100) / 100;
}

/**
 * HealthDataInput エントリを作成
 */
function createHealthData(
  dataType: string,
  value: number,
  unit: string,
  recordedAt: Date,
  extraMetadata?: Record<string, unknown>
): HealthDataInput {
  return {
    dataType,
    value,
    unit,
    recordedAt,
    metadata: { source: SOURCE, ...extraMetadata },
  };
}

/**
 * 値が有効（undefined でなく、正の値）な場合のみ結果配列に追加
 */
function pushIfPositive(
  results: HealthDataInput[],
  dataType: string,
  value: number | undefined,
  unit: string,
  recordedAt: Date,
  extraMetadata?: Record<string, unknown>
): void {
  if (value !== undefined && value > 0) {
    results.push(createHealthData(dataType, value, unit, recordedAt, extraMetadata));
  }
}

/**
 * 値が定義されている場合のみ結果配列に追加（0も許可）
 */
function pushIfDefined(
  results: HealthDataInput[],
  dataType: string,
  value: number | undefined,
  unit: string,
  recordedAt: Date,
  extraMetadata?: Record<string, unknown>
): void {
  if (value !== undefined) {
    results.push(createHealthData(dataType, value, unit, recordedAt, extraMetadata));
  }
}

/**
 * 歩数データを変換
 */
export function mapSteps(data: StepsData[]): HealthDataInput[] {
  return data.map(item => createHealthData('steps', item.steps, 'count', item.timestamp));
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
      byDay.set(day, { sum: item.bpm, count: 1, lastTimestamp: item.timestamp });
    }
  }

  return Array.from(byDay.entries()).map(([, stats]) =>
    createHealthData('heart_rate', Math.round(stats.sum / stats.count), 'bpm', stats.lastTimestamp, {
      context: 'daily_average',
      sampleCount: stats.count,
    })
  );
}

/**
 * 睡眠データを変換
 */
export function mapSleep(data: SleepData[]): HealthDataInput[] {
  const results: HealthDataInput[] = [];

  for (const item of data) {
    const recordedAt = item.endTime;
    const dayMeta = { day: item.day };

    results.push(createHealthData('sleep_duration', minutesToHours(item.totalDuration), 'hours', recordedAt, dayMeta));
    pushIfPositive(results, 'deep_sleep', item.deepSleep ? minutesToHours(item.deepSleep) : undefined, 'hours', recordedAt, dayMeta);
    pushIfPositive(results, 'light_sleep', item.lightSleep ? minutesToHours(item.lightSleep) : undefined, 'hours', recordedAt, dayMeta);
    pushIfPositive(results, 'rem_sleep', item.remSleep ? minutesToHours(item.remSleep) : undefined, 'hours', recordedAt, dayMeta);
    pushIfPositive(results, 'huawei:awake_time', item.awakeTime, 'minutes', recordedAt, dayMeta);
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
    const dayMeta = { day: item.day };

    pushIfPositive(results, 'calories_burned', item.calories, 'kcal', recordedAt, dayMeta);
    pushIfPositive(results, 'huawei:active_calories', item.activeCalories, 'kcal', recordedAt, dayMeta);
    pushIfPositive(results, 'huawei:bmr_calories', item.bmrCalories, 'kcal', recordedAt, dayMeta);
    pushIfPositive(results, 'huawei:distance', item.distance, 'meters', recordedAt, dayMeta);
    pushIfPositive(results, 'huawei:floors_climbed', item.floorsClimbed, 'count', recordedAt, dayMeta);
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

    pushIfPositive(results, 'body_weight', item.weight, 'kg', recordedAt);
    pushIfPositive(results, 'huawei:body_height', item.height, 'cm', recordedAt);
    pushIfPositive(results, 'body_fat', item.bodyFat, '%', recordedAt);
    pushIfPositive(results, 'huawei:bmi', item.bmi, 'kg/m2', recordedAt);
    pushIfPositive(results, 'muscle_mass', item.muscleMass, 'kg', recordedAt);
    pushIfPositive(results, 'bone_mass', item.boneMass, 'kg', recordedAt);
    pushIfPositive(results, 'body_water', item.bodyWater, '%', recordedAt);
    pushIfPositive(results, 'visceral_fat', item.visceralFat, 'level', recordedAt);
  }

  return results;
}

/**
 * 血圧データを変換
 */
export function mapBloodPressure(data: BloodPressureData[]): HealthDataInput[] {
  const results: HealthDataInput[] = [];

  for (const item of data) {
    results.push(createHealthData('blood_pressure_systolic', item.systolic, 'mmHg', item.timestamp));
    results.push(createHealthData('blood_pressure_diastolic', item.diastolic, 'mmHg', item.timestamp));
  }

  return results;
}

/**
 * ストレスデータを変換
 */
export function mapStress(data: StressData[]): HealthDataInput[] {
  return data.map(item => createHealthData('huawei:stress_level', item.level, 'score', item.timestamp));
}

/**
 * SpO2データを変換
 */
export function mapSpO2(data: SpO2Data[]): HealthDataInput[] {
  return data.map(item => createHealthData('spo2', item.percentage, '%', item.timestamp));
}

/**
 * 血糖値データを変換
 */
export function mapBloodGlucose(data: BloodGlucoseData[]): HealthDataInput[] {
  return data.map(item => createHealthData('blood_glucose', item.value, 'mmol/L', item.timestamp));
}

/**
 * 体温データを変換
 */
export function mapBodyTemperature(data: BodyTemperatureData[]): HealthDataInput[] {
  return data.map(item => {
    const dataType = item.isSkinTemperature ? 'skin_temperature' : 'body_temperature';
    return createHealthData(dataType, item.temperature, 'degC', item.timestamp, { isSkinTemperature: item.isSkinTemperature });
  });
}

/**
 * 水分摂取データを変換
 */
export function mapHydrate(data: HydrateData[]): HealthDataInput[] {
  return data.map(item => createHealthData('water_intake', item.amount, 'ml', item.timestamp));
}

// =====================================
// 時系列データマッパー
// =====================================

/**
 * 時系列データエントリを作成
 */
function createTimeseries(
  dataType: string,
  timestamp: Date,
  value: number,
  intervalSeconds: number
): TimeseriesDataInput {
  return {
    dataType,
    timestamp,
    value,
    intervalSeconds,
    source: PLUGIN_SOURCE,
    periodDate: timestamp.toISOString().split('T')[0],
  };
}

/**
 * 心拍数を時系列データに変換
 */
export function mapHeartRateTimeseries(data: HeartRateData[]): TimeseriesDataInput[] {
  return data.map(item => createTimeseries('heart_rate_timeseries', item.timestamp, item.bpm, 60));
}

/**
 * ストレスを時系列データに変換
 */
export function mapStressTimeseries(data: StressData[]): TimeseriesDataInput[] {
  return data.map(item => createTimeseries('huawei:stress_timeseries', item.timestamp, item.level, 300));
}

/**
 * SpO2を時系列データに変換
 */
export function mapSpO2Timeseries(data: SpO2Data[]): TimeseriesDataInput[] {
  return data.map(item => createTimeseries('huawei:spo2_timeseries', item.timestamp, item.percentage, 300));
}

// =====================================
// 新規日次データマッパー
// =====================================

/**
 * 安静時心拍数データを変換
 */
export function mapRestingHeartRate(data: HeartRateData[]): HealthDataInput[] {
  return data.map(item => createHealthData('resting_heart_rate', item.bpm, 'bpm', item.timestamp));
}

/**
 * HRVデータを変換
 */
export function mapHRV(data: HRVData[]): HealthDataInput[] {
  const results: HealthDataInput[] = [];

  for (const item of data) {
    const value = item.sdnn ?? item.rmssd ?? 0;
    if (value > 0) {
      results.push(createHealthData('huawei:hrv', value, 'ms', item.timestamp, { sdnn: item.sdnn, rmssd: item.rmssd }));
    }
  }

  return results;
}

/**
 * 栄養データを変換
 */
export function mapNutrition(data: NutritionData[]): HealthDataInput[] {
  const results: HealthDataInput[] = [];

  for (const item of data) {
    const recordedAt = item.timestamp;

    pushIfPositive(results, 'calories_intake', item.calories, 'kcal', recordedAt);
    pushIfPositive(results, 'nutrition_protein', item.protein, 'g', recordedAt);
    pushIfPositive(results, 'nutrition_carbs', item.carbs, 'g', recordedAt);
    pushIfPositive(results, 'nutrition_fat', item.fat, 'g', recordedAt);
  }

  return results;
}

/**
 * 月経関連データを変換
 */
export function mapMenstrual(data: MenstrualData[]): HealthDataInput[] {
  const results: HealthDataInput[] = [];

  for (const item of data) {
    const recordedAt = new Date(`${item.day}T12:00:00Z`);
    const dayMeta = { day: item.day };

    pushIfDefined(results, 'menstrual_flow', item.flow, 'level', recordedAt, dayMeta);
    pushIfPositive(results, 'menstrual_cycle', item.cycleLength, 'days', recordedAt, dayMeta);
    if (item.ovulation) {
      results.push(createHealthData('ovulation_detection', 1, 'event', recordedAt, dayMeta));
    }
    pushIfDefined(results, 'cervical_mucus', item.cervicalMucus, 'level', recordedAt, dayMeta);
    pushIfDefined(results, 'dysmenorrhoea', item.dysmenorrhoea, 'level', recordedAt, dayMeta);
  }

  return results;
}

/**
 * 睡眠記録データを変換（睡眠スコア含む）
 */
export function mapSleepRecord(data: SleepRecordData[]): HealthDataInput[] {
  const results: HealthDataInput[] = [];

  for (const item of data) {
    const recordedAt = item.endTime;
    const dayMeta = { day: item.day };

    pushIfPositive(results, 'huawei:sleep_score', item.sleepScore, 'score', recordedAt, dayMeta);
    pushIfPositive(results, 'huawei:sleep_respiratory_rate', item.respiratoryRate, 'breaths/min', recordedAt, dayMeta);
  }

  return results;
}

/**
 * 尿検査データを変換
 */
export function mapUrineRoutine(data: UrineRoutineData[]): HealthDataInput[] {
  const results: HealthDataInput[] = [];

  for (const item of data) {
    const recordedAt = item.timestamp;

    pushIfPositive(results, 'uric_acid', item.uricAcid, 'umol/L', recordedAt);
    pushIfDefined(results, 'urine_bilirubin', item.bilirubin, 'level', recordedAt);
    pushIfDefined(results, 'urine_glucose', item.glucose, 'level', recordedAt);
  }

  return results;
}
