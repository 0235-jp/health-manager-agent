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
  VO2MaxData,
  DailyCardiovascularAgeData,
  DailyResilienceData,
  WorkoutData,
  SessionData,
  SleepTimeData,
  EnhancedTagData,
  RestModePeriodData,
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
        dataType: 'oura:sleep_score',
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
        dataType: 'temperature_deviation',
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
        dataType: 'spo2',
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

/**
 * VO2 Maxデータを変換
 */
export function mapVO2Max(data: VO2MaxData[]): HealthDataInput[] {
  const results: HealthDataInput[] = [];

  for (const item of data) {
    const recordedAt = parseDate(item.day);

    if (item.vo2_max !== null) {
      results.push({
        dataType: 'vo2_max',
        value: item.vo2_max,
        unit: 'ml/kg/min',
        recordedAt,
        metadata: { source: 'vo2_max', id: item.id },
      });
    }
  }

  return results;
}

/**
 * Daily Cardiovascular Ageデータを変換
 */
export function mapDailyCardiovascularAge(data: DailyCardiovascularAgeData[]): HealthDataInput[] {
  const results: HealthDataInput[] = [];

  for (const item of data) {
    const recordedAt = parseDate(item.day);

    if (item.vascular_age !== null) {
      results.push({
        dataType: 'cardiovascular_age',
        value: item.vascular_age,
        unit: 'years',
        recordedAt,
        metadata: { source: 'daily_cardiovascular_age', id: item.id },
      });
    }
  }

  return results;
}

/**
 * レジリエンスレベルを数値に変換
 */
function resilienceLevelToScore(level: string | null): number | null {
  const levels: Record<string, number> = {
    'limited': 1,
    'adequate': 2,
    'solid': 3,
    'strong': 4,
    'exceptional': 5,
  };
  return level ? levels[level] ?? null : null;
}

/**
 * Daily Resilienceデータを変換
 */
export function mapDailyResilience(data: DailyResilienceData[]): HealthDataInput[] {
  const results: HealthDataInput[] = [];

  for (const item of data) {
    const recordedAt = parseDate(item.day);
    const score = resilienceLevelToScore(item.level);

    if (score !== null) {
      results.push({
        dataType: 'oura:resilience',
        value: score,
        unit: 'level',
        recordedAt,
        metadata: {
          source: 'daily_resilience',
          id: item.id,
          level: item.level,
          contributors: item.contributors,
        },
      });
    }
  }

  return results;
}

/**
 * Workoutデータを変換
 */
export function mapWorkouts(data: WorkoutData[]): HealthDataInput[] {
  const results: HealthDataInput[] = [];

  for (const item of data) {
    const recordedAt = new Date(item.end_datetime);
    const startTime = new Date(item.start_datetime);
    const durationMinutes = Math.round((recordedAt.getTime() - startTime.getTime()) / 60000);

    // ワークアウト時間
    results.push({
      dataType: 'workout_duration',
      value: durationMinutes,
      unit: 'minutes',
      recordedAt,
      metadata: {
        source: 'workout',
        id: item.id,
        activity: item.activity,
        intensity: item.intensity,
        label: item.label,
      },
    });

    // ワークアウトカロリー
    if (item.calories !== null) {
      results.push({
        dataType: 'workout_calories',
        value: item.calories,
        unit: 'kcal',
        recordedAt,
        metadata: {
          source: 'workout',
          id: item.id,
          activity: item.activity,
        },
      });
    }

    // ワークアウト距離
    if (item.distance !== null && item.distance > 0) {
      results.push({
        dataType: 'oura:workout_distance',
        value: item.distance,
        unit: 'meters',
        recordedAt,
        metadata: {
          source: 'workout',
          id: item.id,
          activity: item.activity,
        },
      });
    }
  }

  return results;
}

/**
 * Sessionデータを変換
 */
export function mapSessions(data: SessionData[]): HealthDataInput[] {
  const results: HealthDataInput[] = [];

  for (const item of data) {
    const recordedAt = new Date(item.end_datetime);
    const startTime = new Date(item.start_datetime);
    const durationMinutes = Math.round((recordedAt.getTime() - startTime.getTime()) / 60000);

    results.push({
      dataType: 'session_duration',
      value: durationMinutes,
      unit: 'minutes',
      recordedAt,
      metadata: {
        source: 'session',
        id: item.id,
        type: item.type,
        mood: item.mood,
      },
    });
  }

  return results;
}

/**
 * Sleep Timeデータを変換
 * optimal_bedtimeのstart_offsetは0時からの秒数オフセット
 */
export function mapSleepTime(data: SleepTimeData[]): HealthDataInput[] {
  const results: HealthDataInput[] = [];

  for (const item of data) {
    const recordedAt = parseDate(item.day);

    if (item.optimal_bedtime?.start_offset !== undefined) {
      // start_offsetは0時からの秒数（負の値は前日の時刻）
      const offsetSeconds = item.optimal_bedtime.start_offset;
      // 時刻を24時間形式の小数で表現（例: 22.5 = 22:30）
      const hours = offsetSeconds / 3600;
      const normalizedHours = hours < 0 ? 24 + hours : hours;

      results.push({
        dataType: 'oura:recommended_bedtime',
        value: Math.round(normalizedHours * 100) / 100,
        unit: 'hour',
        recordedAt,
        metadata: {
          source: 'sleep_time',
          id: item.id,
          recommendation: item.recommendation,
          status: item.status,
          end_offset: item.optimal_bedtime.end_offset,
        },
      });
    }
  }

  return results;
}

/**
 * Enhanced Tagデータを変換
 * タグは値を持たないため、存在確認用に1を返す
 */
export function mapEnhancedTags(data: EnhancedTagData[]): HealthDataInput[] {
  const results: HealthDataInput[] = [];

  for (const item of data) {
    const recordedAt = new Date(item.timestamp);

    results.push({
      dataType: 'oura:tag',
      value: 1,
      unit: 'count',
      recordedAt,
      metadata: {
        source: 'enhanced_tag',
        id: item.id,
        tag_type_code: item.tag_type_code,
        text: item.text,
        comment: item.comment,
      },
    });
  }

  return results;
}

/**
 * Rest Mode Periodデータを変換
 * 休息モードの期間を日数で返す
 */
export function mapRestModePeriods(data: RestModePeriodData[]): HealthDataInput[] {
  const results: HealthDataInput[] = [];

  for (const item of data) {
    const startDate = parseDate(item.start_day);
    const endDate = item.end_day ? parseDate(item.end_day) : new Date();
    const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));

    results.push({
      dataType: 'oura:rest_mode_duration',
      value: durationDays,
      unit: 'days',
      recordedAt: startDate,
      metadata: {
        source: 'rest_mode_period',
        id: item.id,
        end_day: item.end_day,
        episodes: item.episodes,
      },
    });
  }

  return results;
}
