/**
 * Fitbit API Response → Standard Data Type Transformation
 */

import { formatLocalDate } from './constants.js';
import type {
  ActivitySummaryResponse,
  HeartRateResponse,
  HrvResponse,
  SleepResponse,
  SpO2Response,
  BreathingRateResponse,
  TemperatureResponse,
  CardioScoreResponse,
  WeightResponse,
  NutritionResponse,
  WaterResponse,
} from './types.js';

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

const SOURCE = 'fitbit';
const PLUGIN_SOURCE = 'fitbit-health-plugin';

/**
 * Convert minutes to hours
 */
function minutesToHours(minutes: number): number {
  return Math.round((minutes / 60) * 100) / 100;
}

/**
 * Convert Fitbit intraday interval to seconds.
 * Fitbit returns datasetInterval as the numeric value (e.g., 1 for "1min"),
 * and datasetType indicates the unit ("minute", "second").
 */
function intradayIntervalToSeconds(interval: number, datasetType?: string): number {
  if (datasetType === 'second' || datasetType === 'sec') {
    return interval;
  }
  // Default to minutes (most common for heart rate intraday)
  return interval * 60;
}

/**
 * Create HealthDataInput entry
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
 * Push if value is positive
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
 * Push if value is defined (including 0)
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
 * Create timeseries data entry
 */
function createTimeseries(
  dataType: string,
  timestamp: Date,
  value: number,
  intervalSeconds: number,
  metadata?: Record<string, unknown>
): TimeseriesDataInput {
  return {
    dataType,
    timestamp,
    value,
    intervalSeconds,
    source: PLUGIN_SOURCE,
    periodDate: formatLocalDate(timestamp),
    metadata,
  };
}

// =====================================
// Activity Data Mapper
// =====================================

/**
 * Map activity summary to health data
 *
 * NOTE: Fitbit API returns distance in the user's configured unit (km or miles).
 * This mapper assumes metric units (km). For users with US locale settings,
 * the distance values may be in miles but labeled as km.
 * TODO: Use profile.distanceUnit to convert if needed.
 */
export function mapActivity(
  data: ActivitySummaryResponse,
  date: string
): HealthDataInput[] {
  const results: HealthDataInput[] = [];
  const summary = data.summary;
  const recordedAt = new Date(`${date}T23:59:59Z`);
  const dayMeta = { day: date };

  // Steps
  pushIfPositive(results, 'steps', summary.steps, 'count', recordedAt, dayMeta);

  // Calories
  pushIfPositive(results, 'calories_burned', summary.caloriesOut, 'kcal', recordedAt, dayMeta);
  pushIfPositive(results, 'fitbit:active_calories', summary.activityCalories, 'kcal', recordedAt, dayMeta);
  pushIfPositive(results, 'fitbit:bmr_calories', summary.caloriesBMR, 'kcal', recordedAt, dayMeta);

  // Distance - assumes metric (km). May be miles for US locale users.
  const totalDistance = summary.distances?.find(d => d.activity === 'total')?.distance;
  pushIfPositive(results, 'fitbit:distance', totalDistance, 'km', recordedAt, {
    ...dayMeta,
    unitAssumption: 'metric',
  });

  // Floors and elevation
  pushIfPositive(results, 'fitbit:floors', summary.floors, 'count', recordedAt, dayMeta);
  pushIfPositive(results, 'fitbit:elevation', summary.elevation, 'meters', recordedAt, dayMeta);

  // Active minutes
  pushIfPositive(results, 'fitbit:very_active_minutes', summary.veryActiveMinutes, 'minutes', recordedAt, dayMeta);
  pushIfPositive(results, 'fitbit:fairly_active_minutes', summary.fairlyActiveMinutes, 'minutes', recordedAt, dayMeta);
  pushIfPositive(results, 'fitbit:lightly_active_minutes', summary.lightlyActiveMinutes, 'minutes', recordedAt, dayMeta);
  pushIfDefined(results, 'fitbit:sedentary_minutes', summary.sedentaryMinutes, 'minutes', recordedAt, dayMeta);

  return results;
}

/**
 * Map multiple activity summaries
 */
export function mapActivityRange(
  data: Array<{ response: ActivitySummaryResponse; date: string }>
): HealthDataInput[] {
  return data.flatMap(({ response, date }) => mapActivity(response, date));
}

// =====================================
// Heart Rate Data Mapper
// =====================================

/**
 * Map heart rate data (resting heart rate)
 */
export function mapRestingHeartRate(data: HeartRateResponse): HealthDataInput[] {
  const results: HealthDataInput[] = [];

  for (const item of data['activities-heart'] || []) {
    const restingHR = item.value?.restingHeartRate;
    if (restingHR && restingHR > 0) {
      const recordedAt = new Date(`${item.dateTime}T12:00:00Z`);
      results.push(
        createHealthData('resting_heart_rate', restingHR, 'bpm', recordedAt, {
          day: item.dateTime,
        })
      );
    }
  }

  return results;
}

/**
 * Map heart rate intraday data to timeseries
 */
export function mapHeartRateIntraday(
  data: HeartRateResponse,
  date: string
): TimeseriesDataInput[] {
  const intraday = data['activities-heart-intraday'];
  if (!intraday?.dataset) {
    return [];
  }

  // Convert interval to seconds (Fitbit returns interval in the unit specified by datasetType)
  const intervalSeconds = intradayIntervalToSeconds(
    intraday.datasetInterval || 1,
    intraday.datasetType
  );

  return intraday.dataset.map(point => {
    const timestamp = new Date(`${date}T${point.time}`);
    return createTimeseries(
      'heart_rate_timeseries',
      timestamp,
      point.value,
      intervalSeconds
    );
  });
}

// =====================================
// HRV Data Mapper
// =====================================

/**
 * Map HRV data
 */
export function mapHRV(data: HrvResponse): HealthDataInput[] {
  const results: HealthDataInput[] = [];

  for (const item of data.hrv || []) {
    const recordedAt = new Date(`${item.dateTime}T12:00:00Z`);
    const dayMeta = { day: item.dateTime };

    // Daily RMSSD as main HRV value
    if (item.value?.dailyRmssd > 0) {
      results.push(
        createHealthData('hrv', item.value.dailyRmssd, 'ms', recordedAt, {
          ...dayMeta,
          type: 'daily_rmssd',
        })
      );
    }

    // Deep sleep RMSSD as Fitbit-specific metric
    if (item.value?.deepRmssd > 0) {
      results.push(
        createHealthData('fitbit:deep_hrv', item.value.deepRmssd, 'ms', recordedAt, {
          ...dayMeta,
          type: 'deep_rmssd',
        })
      );
    }
  }

  return results;
}

// =====================================
// Sleep Data Mapper
// =====================================

/**
 * Map sleep data
 */
export function mapSleep(data: SleepResponse): HealthDataInput[] {
  const results: HealthDataInput[] = [];

  for (const sleep of data.sleep || []) {
    // Only process main sleep
    if (!sleep.isMainSleep) continue;

    const recordedAt = new Date(sleep.endTime);
    const dayMeta = { day: sleep.dateOfSleep };

    // Total sleep duration
    pushIfPositive(
      results,
      'sleep_duration',
      minutesToHours(sleep.minutesAsleep),
      'hours',
      recordedAt,
      dayMeta
    );

    // Sleep stages (if available - stages sleep type)
    const levels = sleep.levels?.summary;
    if (levels) {
      const stageTypes: Array<{ type: string; stage: { minutes?: number } | undefined; unit: 'hours' | 'minutes' }> = [
        { type: 'deep_sleep', stage: levels.deep, unit: 'hours' },
        { type: 'light_sleep', stage: levels.light, unit: 'hours' },
        { type: 'rem_sleep', stage: levels.rem, unit: 'hours' },
      ];

      for (const { type, stage, unit } of stageTypes) {
        if (stage?.minutes) {
          pushIfPositive(results, type, minutesToHours(stage.minutes), unit, recordedAt, dayMeta);
        }
      }

      pushIfDefined(results, 'fitbit:awake_time', levels.wake?.minutes, 'minutes', recordedAt, dayMeta);
    }

    // Sleep latency (time to fall asleep)
    pushIfPositive(
      results,
      'fitbit:sleep_latency',
      sleep.minutesToFallAsleep,
      'minutes',
      recordedAt,
      dayMeta
    );

    // Time in bed
    pushIfPositive(
      results,
      'fitbit:time_in_bed',
      minutesToHours(sleep.timeInBed),
      'hours',
      recordedAt,
      dayMeta
    );
  }

  return results;
}

/**
 * Map sleep phase data to timeseries
 */
export function mapSleepPhases(data: SleepResponse): TimeseriesDataInput[] {
  const results: TimeseriesDataInput[] = [];

  for (const sleep of data.sleep || []) {
    if (!sleep.isMainSleep) continue;

    const phaseData = sleep.levels?.data || [];
    const shortData = sleep.levels?.shortData || [];

    // Map phase levels to numeric values for timeseries
    const phaseToValue: Record<string, number> = {
      wake: 0,
      rem: 1,
      light: 2,
      deep: 3,
      // Classic stages
      awake: 0,
      restless: 1,
      asleep: 2,
    };

    for (const phase of [...phaseData, ...shortData]) {
      const value = phaseToValue[phase.level];
      // Skip unknown sleep phases to avoid invalid data downstream
      if (value === undefined) {
        continue;
      }

      const timestamp = new Date(phase.dateTime);
      results.push(
        createTimeseries('fitbit:sleep_phase', timestamp, value, phase.seconds, {
          phase: phase.level,
          durationSeconds: phase.seconds,
          sleepLogId: sleep.logId,
        })
      );
    }
  }

  return results;
}

// =====================================
// SpO2 Data Mapper
// =====================================

/**
 * Map SpO2 data
 */
export function mapSpO2(data: SpO2Response): HealthDataInput[] {
  if (!data.value) {
    return [];
  }

  const recordedAt = new Date(`${data.dateTime}T12:00:00Z`);
  return [
    createHealthData('spo2', data.value.avg, '%', recordedAt, {
      day: data.dateTime,
      min: data.value.min,
      max: data.value.max,
    }),
  ];
}

/**
 * Map multiple SpO2 responses
 */
export function mapSpO2Range(data: SpO2Response[]): HealthDataInput[] {
  return data.flatMap(mapSpO2);
}

// =====================================
// Breathing Rate Data Mapper
// =====================================

/**
 * Map breathing rate data
 */
export function mapBreathingRate(data: BreathingRateResponse): HealthDataInput[] {
  const results: HealthDataInput[] = [];

  for (const item of data.br || []) {
    if (item.value?.breathingRate > 0) {
      const recordedAt = new Date(`${item.dateTime}T12:00:00Z`);
      results.push(
        createHealthData('respiratory_rate', item.value.breathingRate, 'breaths/min', recordedAt, {
          day: item.dateTime,
        })
      );
    }
  }

  return results;
}

// =====================================
// Temperature Data Mapper
// =====================================

/**
 * Map temperature data
 */
export function mapTemperature(data: TemperatureResponse): HealthDataInput[] {
  const results: HealthDataInput[] = [];

  for (const item of data.tempSkin || []) {
    const recordedAt = new Date(`${item.dateTime}T12:00:00Z`);
    // Fitbit provides temperature as deviation from baseline
    results.push(
      createHealthData('skin_temperature', item.value.nightlyRelative, 'degC', recordedAt, {
        day: item.dateTime,
        type: 'nightly_relative_baseline',
      })
    );
  }

  return results;
}

// =====================================
// Cardio Score (VO2 Max) Data Mapper
// =====================================

/**
 * Parse VO2 Max string which can be:
 * - Range format: "43-47"
 * - Single value: "45"
 * - Descriptive: "less than 30", "greater than 60"
 * Returns { value, low, high } or null if unparseable
 */
function parseVo2Max(vo2MaxStr: string): { value: number; low?: number; high?: number } | null {
  // Try range format first (e.g., "43-47")
  if (vo2MaxStr.includes('-')) {
    const parts = vo2MaxStr.split('-').map(s => parseFloat(s.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return {
        value: (parts[0] + parts[1]) / 2,
        low: parts[0],
        high: parts[1],
      };
    }
  }

  // Try single numeric value
  const singleValue = parseFloat(vo2MaxStr.trim());
  if (!isNaN(singleValue)) {
    return { value: singleValue };
  }

  // Try "less than X" or "greater than X" patterns
  const lessThanMatch = vo2MaxStr.match(/less\s*than\s*(\d+)/i);
  if (lessThanMatch) {
    const threshold = parseFloat(lessThanMatch[1]);
    return { value: threshold - 2, high: threshold }; // Approximate
  }

  const greaterThanMatch = vo2MaxStr.match(/greater\s*than\s*(\d+)/i);
  if (greaterThanMatch) {
    const threshold = parseFloat(greaterThanMatch[1]);
    return { value: threshold + 2, low: threshold }; // Approximate
  }

  // Unable to parse
  return null;
}

/**
 * Map cardio score data
 */
export function mapCardioScore(data: CardioScoreResponse): HealthDataInput[] {
  const results: HealthDataInput[] = [];

  for (const item of data.cardioScore || []) {
    if (item.value?.vo2Max) {
      const vo2MaxStr = item.value.vo2Max;
      const parsed = parseVo2Max(vo2MaxStr);

      if (parsed) {
        const recordedAt = new Date(`${item.dateTime}T12:00:00Z`);
        results.push(
          createHealthData('vo2_max', parsed.value, 'ml/kg/min', recordedAt, {
            day: item.dateTime,
            rangeLow: parsed.low,
            rangeHigh: parsed.high,
            rawValue: vo2MaxStr,
          })
        );
      }
    }
  }

  return results;
}

// =====================================
// Weight/Body Data Mapper
// =====================================

/**
 * Map weight data
 *
 * NOTE: Fitbit API returns weight in the user's configured unit (kg, st, or lb).
 * This mapper assumes metric units (kg). For users with imperial settings,
 * the weight values may be in pounds but labeled as kg.
 * TODO: Use profile.weightUnit to convert if needed.
 */
export function mapWeight(data: WeightResponse): HealthDataInput[] {
  const results: HealthDataInput[] = [];

  for (const item of data.weight || []) {
    const recordedAt = new Date(`${item.date}T${item.time}`);

    // Body weight - assumes metric (kg). May be lb for US locale users.
    pushIfPositive(results, 'body_weight', item.weight, 'kg', recordedAt, {
      source: item.source,
      unitAssumption: 'metric',
    });

    // BMI
    pushIfPositive(results, 'fitbit:bmi', item.bmi, 'kg/m2', recordedAt);

    // Body fat
    pushIfPositive(results, 'body_fat', item.fat, '%', recordedAt);

    // Calculate lean mass if we have weight and fat
    if (item.weight > 0 && item.fat !== undefined && item.fat > 0) {
      const leanMass = item.weight * (1 - item.fat / 100);
      results.push(
        createHealthData('fitbit:lean_mass', Math.round(leanMass * 10) / 10, 'kg', recordedAt)
      );
    }
  }

  return results;
}

// =====================================
// Nutrition Data Mapper
// =====================================

/**
 * Map nutrition data
 */
export function mapNutrition(data: NutritionResponse, date: string): HealthDataInput[] {
  const results: HealthDataInput[] = [];
  const summary = data.summary;
  const recordedAt = new Date(`${date}T23:59:59Z`);
  const dayMeta = { day: date };

  pushIfPositive(results, 'calories_intake', summary.calories, 'kcal', recordedAt, dayMeta);
  pushIfPositive(results, 'nutrition_protein', summary.protein, 'g', recordedAt, dayMeta);
  pushIfPositive(results, 'nutrition_carbs', summary.carbs, 'g', recordedAt, dayMeta);
  pushIfPositive(results, 'nutrition_fat', summary.fat, 'g', recordedAt, dayMeta);
  pushIfPositive(results, 'fitbit:fiber', summary.fiber, 'g', recordedAt, dayMeta);
  pushIfPositive(results, 'fitbit:sodium', summary.sodium, 'mg', recordedAt, dayMeta);

  return results;
}

/**
 * Map water data
 *
 * NOTE: Fitbit API returns water in the user's configured unit (ml or fl oz).
 * This mapper assumes metric units (ml). For users with US locale settings,
 * the water values may be in fl oz but labeled as ml.
 * TODO: Use profile.waterUnit to convert if needed.
 */
export function mapWater(data: WaterResponse, date: string): HealthDataInput[] {
  const waterAmount = data.summary?.water;
  if (!waterAmount || waterAmount <= 0) {
    return [];
  }

  const recordedAt = new Date(`${date}T23:59:59Z`);
  return [createHealthData('water_intake', waterAmount, 'ml', recordedAt, {
    day: date,
    unitAssumption: 'metric',
  })];
}

// =====================================
// Batch Mapping Utilities
// =====================================

/**
 * Map all heart rate responses
 */
export function mapHeartRateRange(
  responses: HeartRateResponse[]
): HealthDataInput[] {
  return responses.flatMap(mapRestingHeartRate);
}

/**
 * Map all heart rate intraday data
 */
export function mapHeartRateIntradayRange(
  data: Array<{ response: HeartRateResponse; date: string }>
): TimeseriesDataInput[] {
  return data.flatMap(({ response, date }) => mapHeartRateIntraday(response, date));
}
