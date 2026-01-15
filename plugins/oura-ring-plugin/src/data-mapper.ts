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
 * 時系列データ入力
 */
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

    // 浅い睡眠
    results.push({
      dataType: 'light_sleep',
      value: secondsToHours(item.light_sleep_duration),
      unit: 'hours',
      recordedAt,
      metadata: { source: 'sleep', id: item.id },
    });

    // 睡眠効率
    if (item.efficiency !== null) {
      results.push({
        dataType: 'sleep_efficiency',
        value: item.efficiency,
        unit: '%',
        recordedAt,
        metadata: { source: 'sleep', id: item.id },
      });
    }

    // 入眠潜時
    results.push({
      dataType: 'sleep_latency',
      value: Math.round(item.latency / 60),
      unit: 'minutes',
      recordedAt,
      metadata: { source: 'sleep', id: item.id },
    });

    // 在床時間
    results.push({
      dataType: 'time_in_bed',
      value: secondsToHours(item.time_in_bed),
      unit: 'hours',
      recordedAt,
      metadata: { source: 'sleep', id: item.id },
    });

    // 中途覚醒時間
    results.push({
      dataType: 'awake_time',
      value: Math.round(item.awake_time / 60),
      unit: 'minutes',
      recordedAt,
      metadata: { source: 'sleep', id: item.id },
    });

    // 呼吸数
    if (item.average_breath !== null) {
      results.push({
        dataType: 'respiratory_rate',
        value: item.average_breath,
        unit: 'brpm',
        recordedAt,
        metadata: { source: 'sleep', id: item.id },
      });
    }

    // 平均心拍数（睡眠中）
    if (item.average_heart_rate !== null) {
      results.push({
        dataType: 'heart_rate',
        value: item.average_heart_rate,
        unit: 'bpm',
        recordedAt,
        metadata: { source: 'sleep', id: item.id, context: 'sleeping' },
      });

      // Oura固有: 睡眠中平均心拍
      results.push({
        dataType: 'oura:sleep_hr_avg',
        value: item.average_heart_rate,
        unit: 'bpm',
        recordedAt,
        metadata: { source: 'sleep', id: item.id },
      });
    }

    // 最低心拍数
    if (item.lowest_heart_rate !== null) {
      results.push({
        dataType: 'oura:lowest_hr',
        value: item.lowest_heart_rate,
        unit: 'bpm',
        recordedAt,
        metadata: { source: 'sleep', id: item.id },
      });
    }

    // 平均HRV
    if (item.average_hrv !== null) {
      results.push({
        dataType: 'oura:sleep_hrv_avg',
        value: item.average_hrv,
        unit: 'ms',
        recordedAt,
        metadata: { source: 'sleep', id: item.id },
      });
    }

    // 不穏睡眠回数
    results.push({
      dataType: 'oura:restless_periods',
      value: item.restless_periods,
      unit: 'count',
      recordedAt,
      metadata: { source: 'sleep', id: item.id },
    });

    // 就寝時刻（Unixタイムスタンプとして保存）
    results.push({
      dataType: 'oura:bedtime_start',
      value: new Date(item.bedtime_start).getTime() / 1000,
      unit: 'datetime',
      recordedAt,
      metadata: { source: 'sleep', id: item.id, bedtime_start: item.bedtime_start },
    });

    // 起床時刻（Unixタイムスタンプとして保存）
    results.push({
      dataType: 'oura:bedtime_end',
      value: new Date(item.bedtime_end).getTime() / 1000,
      unit: 'datetime',
      recordedAt,
      metadata: { source: 'sleep', id: item.id, bedtime_end: item.bedtime_end },
    });
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

    // 歩行相当距離
    if (item.equivalent_walking_distance !== undefined) {
      results.push({
        dataType: 'oura:walking_distance',
        value: item.equivalent_walking_distance,
        unit: 'meters',
        recordedAt,
        metadata: { source: 'daily_activity', id: item.id },
      });
    }

    // 高強度活動時間
    if (item.high_activity_time !== undefined) {
      results.push({
        dataType: 'oura:high_activity_time',
        value: Math.round(item.high_activity_time / 60),
        unit: 'minutes',
        recordedAt,
        metadata: { source: 'daily_activity', id: item.id },
      });
    }

    // 中強度活動時間
    if (item.medium_activity_time !== undefined) {
      results.push({
        dataType: 'oura:medium_activity_time',
        value: Math.round(item.medium_activity_time / 60),
        unit: 'minutes',
        recordedAt,
        metadata: { source: 'daily_activity', id: item.id },
      });
    }

    // 低強度活動時間
    if (item.low_activity_time !== undefined) {
      results.push({
        dataType: 'oura:low_activity_time',
        value: Math.round(item.low_activity_time / 60),
        unit: 'minutes',
        recordedAt,
        metadata: { source: 'daily_activity', id: item.id },
      });
    }

    // 座位時間
    if (item.sedentary_time !== undefined) {
      results.push({
        dataType: 'sedentary_time',
        value: secondsToHours(item.sedentary_time),
        unit: 'hours',
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

    // 回復時間
    if (item.recovery_high !== null) {
      results.push({
        dataType: 'oura:recovery_time',
        value: item.recovery_high,
        unit: 'seconds',
        recordedAt,
        metadata: { source: 'daily_stress', id: item.id },
      });
    }

    // ストレス要約（day_summaryを数値化）
    if (item.day_summary !== null) {
      const summaryValues: Record<string, number> = {
        'restored': 1,
        'normal': 2,
        'stressful': 3,
      };
      const summaryValue = summaryValues[item.day_summary] ?? 0;
      results.push({
        dataType: 'oura:stress_summary',
        value: summaryValue,
        unit: 'text',
        recordedAt,
        metadata: { source: 'daily_stress', id: item.id, day_summary: item.day_summary },
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

// ==================== 時系列データマッピング ====================

/**
 * Heart Rateデータを時系列として変換
 */
export function mapHeartRateTimeseries(data: HeartRateData[]): TimeseriesDataInput[] {
  const results: TimeseriesDataInput[] = [];

  for (const item of data) {
    const timestamp = new Date(item.timestamp);
    const periodDate = item.timestamp.split('T')[0];

    results.push({
      dataType: 'heart_rate_timeseries',
      timestamp,
      value: item.bpm,
      intervalSeconds: 60,
      source: 'oura-ring-plugin',
      periodDate,
    });
  }

  return results;
}

/**
 * Sleep Period内の心拍数時系列データを変換
 */
export function mapSleepHeartRateTimeseries(data: SleepPeriodData[]): TimeseriesDataInput[] {
  const results: TimeseriesDataInput[] = [];

  for (const item of data) {
    if (!item.heart_rate?.items) continue;

    const bedtimeStart = new Date(item.bedtime_start);
    const periodDate = item.day;
    const intervalSeconds = item.heart_rate.interval || 300;

    for (let i = 0; i < item.heart_rate.items.length; i++) {
      const value = item.heart_rate.items[i];
      if (value === null) continue;

      const timestamp = new Date(bedtimeStart.getTime() + i * intervalSeconds * 1000);

      results.push({
        dataType: 'oura:sleep_hr',
        timestamp,
        value,
        intervalSeconds,
        source: 'oura-ring-plugin',
        periodDate,
        parentId: item.id,
      });
    }
  }

  return results;
}

/**
 * Sleep Period内のHRV時系列データを変換
 */
export function mapSleepHrvTimeseries(data: SleepPeriodData[]): TimeseriesDataInput[] {
  const results: TimeseriesDataInput[] = [];

  for (const item of data) {
    if (!item.hrv?.items) continue;

    const bedtimeStart = new Date(item.bedtime_start);
    const periodDate = item.day;
    const intervalSeconds = item.hrv.interval || 300;

    for (let i = 0; i < item.hrv.items.length; i++) {
      const value = item.hrv.items[i];
      if (value === null) continue;

      const timestamp = new Date(bedtimeStart.getTime() + i * intervalSeconds * 1000);

      results.push({
        dataType: 'oura:sleep_hrv',
        timestamp,
        value,
        intervalSeconds,
        source: 'oura-ring-plugin',
        periodDate,
        parentId: item.id,
      });
    }
  }

  return results;
}

/**
 * 睡眠フェーズの数値変換
 */
function sleepPhaseToNumber(phase: string): number {
  const phases: Record<string, number> = {
    'deep': 1,
    'light': 2,
    'rem': 3,
    'awake': 4,
  };
  return phases[phase] ?? 0;
}

/**
 * Sleep Period内の睡眠フェーズ時系列データを変換
 */
export function mapSleepPhaseTimeseries(data: SleepPeriodData[]): TimeseriesDataInput[] {
  const results: TimeseriesDataInput[] = [];

  for (const item of data) {
    if (!item.sleep_phase_5_min) continue;

    const bedtimeStart = new Date(item.bedtime_start);
    const periodDate = item.day;
    const intervalSeconds = 300; // 5分間隔

    // sleep_phase_5_minは文字列の配列（例: "4443322211..."）
    const phases = item.sleep_phase_5_min.split('');

    for (let i = 0; i < phases.length; i++) {
      const phaseNum = parseInt(phases[i], 10);
      if (isNaN(phaseNum)) continue;

      const timestamp = new Date(bedtimeStart.getTime() + i * intervalSeconds * 1000);

      results.push({
        dataType: 'oura:sleep_phase',
        timestamp,
        value: phaseNum,
        intervalSeconds,
        source: 'oura-ring-plugin',
        periodDate,
        parentId: item.id,
      });
    }
  }

  return results;
}

/**
 * Daily ActivityのMET時系列データを変換
 */
export function mapMetTimeseries(data: DailyActivityData[]): TimeseriesDataInput[] {
  const results: TimeseriesDataInput[] = [];

  for (const item of data) {
    if (!item.met?.items) continue;

    const dayStart = parseDate(item.day);
    const periodDate = item.day;
    const intervalSeconds = item.met.interval || 60;

    for (let i = 0; i < item.met.items.length; i++) {
      const value = item.met.items[i];
      if (value === null) continue;

      const timestamp = new Date(dayStart.getTime() + i * intervalSeconds * 1000);

      results.push({
        dataType: 'oura:met',
        timestamp,
        value,
        intervalSeconds,
        source: 'oura-ring-plugin',
        periodDate,
        parentId: item.id,
      });
    }
  }

  return results;
}

/**
 * Daily Activityのアクティビティクラス時系列データを変換
 */
export function mapActivityClassTimeseries(data: DailyActivityData[]): TimeseriesDataInput[] {
  const results: TimeseriesDataInput[] = [];

  for (const item of data) {
    if (!item.class_5_min) continue;

    const dayStart = parseDate(item.day);
    const periodDate = item.day;
    const intervalSeconds = 300; // 5分間隔

    // class_5_minは文字列（例: "0011122233..."）
    const classes = item.class_5_min.split('');

    for (let i = 0; i < classes.length; i++) {
      const classNum = parseInt(classes[i], 10);
      if (isNaN(classNum)) continue;

      const timestamp = new Date(dayStart.getTime() + i * intervalSeconds * 1000);

      results.push({
        dataType: 'oura:activity_class',
        timestamp,
        value: classNum,
        intervalSeconds,
        source: 'oura-ring-plugin',
        periodDate,
        parentId: item.id,
      });
    }
  }

  return results;
}
