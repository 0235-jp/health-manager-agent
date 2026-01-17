/**
 * Fitbit API Type Definitions
 */

// =====================================
// OAuth Types
// =====================================

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  user_id: string;
}

export interface TokenInfo {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  userId?: string;
}

export interface FitbitApiConfig {
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: number;
}

// =====================================
// Profile Types
// =====================================

export interface ProfileResponse {
  user: {
    encodedId: string;
    displayName: string;
    fullName: string;
    age: number;
    gender: string;
    height: number;
    heightUnit: string;
    weight: number;
    weightUnit: string;
    timezone: string;
    offsetFromUTCMillis: number;
    memberSince: string;
    avatar: string;
    averageDailySteps: number;
    dateOfBirth: string;
    strideLengthRunning: number;
    strideLengthWalking: number;
  };
}

// =====================================
// Activity Types
// =====================================

export interface ActivitySummaryResponse {
  activities: Activity[];
  goals: ActivityGoals;
  summary: ActivitySummary;
}

export interface Activity {
  activityId: number;
  activityParentId: number;
  activityParentName: string;
  calories: number;
  description: string;
  distance?: number;
  duration: number;
  hasActiveZoneMinutes: boolean;
  hasStartTime: boolean;
  isFavorite: boolean;
  lastModified: string;
  logId: number;
  name: string;
  startDate: string;
  startTime: string;
  steps?: number;
}

export interface ActivityGoals {
  activeMinutes: number;
  caloriesOut: number;
  distance: number;
  floors: number;
  steps: number;
}

export interface ActivitySummary {
  activityCalories: number;
  caloriesBMR: number;
  caloriesOut: number;
  distances: Array<{ activity: string; distance: number }>;
  elevation?: number;
  fairlyActiveMinutes: number;
  floors?: number;
  lightlyActiveMinutes: number;
  marginalCalories: number;
  sedentaryMinutes: number;
  steps: number;
  veryActiveMinutes: number;
}

export interface IntradayActivityResponse {
  'activities-heart-intraday'?: {
    dataset: Array<{ time: string; value: number }>;
    datasetInterval: number;
    datasetType: string;
  };
  'activities-steps-intraday'?: {
    dataset: Array<{ time: string; value: number }>;
    datasetInterval: number;
    datasetType: string;
  };
}

// =====================================
// Heart Rate Types
// =====================================

export interface HeartRateResponse {
  'activities-heart': Array<{
    dateTime: string;
    value: {
      customHeartRateZones: HeartRateZone[];
      heartRateZones: HeartRateZone[];
      restingHeartRate?: number;
    };
  }>;
  'activities-heart-intraday'?: {
    dataset: Array<{ time: string; value: number }>;
    datasetInterval: number;
    datasetType: string;
  };
}

export interface HeartRateZone {
  caloriesOut: number;
  max: number;
  min: number;
  minutes: number;
  name: string;
}

// =====================================
// HRV Types
// =====================================

export interface HrvResponse {
  hrv: Array<{
    dateTime: string;
    value: {
      dailyRmssd: number;
      deepRmssd: number;
    };
  }>;
}

// =====================================
// Sleep Types
// =====================================

export interface SleepResponse {
  sleep: SleepLog[];
  summary: SleepSummary;
}

export interface SleepLog {
  dateOfSleep: string;
  duration: number;
  efficiency: number;
  endTime: string;
  infoCode: number;
  isMainSleep: boolean;
  levels: SleepLevels;
  logId: number;
  logType: string;
  minutesAfterWakeup: number;
  minutesAsleep: number;
  minutesAwake: number;
  minutesToFallAsleep: number;
  startTime: string;
  timeInBed: number;
  type: string;
}

export interface SleepLevels {
  summary: {
    deep?: { count: number; minutes: number; thirtyDayAvgMinutes?: number };
    light?: { count: number; minutes: number; thirtyDayAvgMinutes?: number };
    rem?: { count: number; minutes: number; thirtyDayAvgMinutes?: number };
    wake?: { count: number; minutes: number; thirtyDayAvgMinutes?: number };
    // Classic sleep stages
    asleep?: { count: number; minutes: number };
    awake?: { count: number; minutes: number };
    restless?: { count: number; minutes: number };
  };
  data: Array<{
    dateTime: string;
    level: string;
    seconds: number;
  }>;
  shortData?: Array<{
    dateTime: string;
    level: string;
    seconds: number;
  }>;
}

export interface SleepSummary {
  stages?: {
    deep: number;
    light: number;
    rem: number;
    wake: number;
  };
  totalMinutesAsleep: number;
  totalSleepRecords: number;
  totalTimeInBed: number;
}

// =====================================
// SpO2 Types
// =====================================

export interface SpO2Response {
  dateTime: string;
  value: {
    avg: number;
    min: number;
    max: number;
  };
}

export interface SpO2IntradayResponse {
  dateTime: string;
  minutes: Array<{
    minute: string;
    value: number;
  }>;
}

// =====================================
// Breathing Rate Types
// =====================================

export interface BreathingRateResponse {
  br: Array<{
    dateTime: string;
    value: {
      breathingRate: number;
    };
  }>;
}

// =====================================
// Temperature Types
// =====================================

export interface TemperatureResponse {
  tempSkin: Array<{
    dateTime: string;
    value: {
      nightlyRelative: number;
    };
  }>;
}

export interface TemperatureCoreResponse {
  tempCore: Array<{
    dateTime: string;
    value: number;
  }>;
}

// =====================================
// Cardio Fitness (VO2 Max) Types
// =====================================

export interface CardioScoreResponse {
  cardioScore: Array<{
    dateTime: string;
    value: {
      vo2Max: string; // Range like "43-47"
    };
  }>;
}

// =====================================
// Body/Weight Types
// =====================================

export interface WeightResponse {
  weight: Array<{
    bmi: number;
    date: string;
    fat?: number;
    logId: number;
    source: string;
    time: string;
    weight: number;
  }>;
}

export interface BodyFatResponse {
  fat: Array<{
    date: string;
    fat: number;
    logId: number;
    source: string;
    time: string;
  }>;
}

// =====================================
// Nutrition Types
// =====================================

export interface NutritionResponse {
  foods: FoodLog[];
  summary: NutritionSummary;
  goals: NutritionGoals;
}

export interface FoodLog {
  isFavorite: boolean;
  logDate: string;
  logId: number;
  loggedFood: {
    accessLevel: string;
    amount: number;
    brand: string;
    calories: number;
    foodId: number;
    locale: string;
    mealTypeId: number;
    name: string;
    unit: { id: number; name: string; plural: string };
    units: number[];
  };
  nutritionalValues: {
    calories: number;
    carbs: number;
    fat: number;
    fiber: number;
    protein: number;
    sodium: number;
  };
}

export interface NutritionSummary {
  calories: number;
  carbs: number;
  fat: number;
  fiber: number;
  protein: number;
  sodium: number;
  water: number;
}

export interface NutritionGoals {
  calories: number;
}

// =====================================
// Water Types
// =====================================

export interface WaterResponse {
  summary: {
    water: number;
  };
  water: Array<{
    amount: number;
    logId: number;
  }>;
}

// =====================================
// Mapped Data Types (for internal use)
// =====================================

export interface MappedActivityData {
  day: string;
  steps: number;
  caloriesOut: number;
  activeCalories: number;
  bmrCalories: number;
  distance: number;
  floors?: number;
  elevation?: number;
  veryActiveMinutes: number;
  fairlyActiveMinutes: number;
  lightlyActiveMinutes: number;
  sedentaryMinutes: number;
}

export interface MappedHeartRateData {
  timestamp: Date;
  bpm: number;
}

export interface MappedRestingHeartRateData {
  day: string;
  bpm: number;
}

export interface MappedHrvData {
  day: string;
  dailyRmssd: number;
  deepRmssd?: number;
}

export interface MappedSleepData {
  day: string;
  startTime: Date;
  endTime: Date;
  totalDuration: number; // minutes
  deepSleep?: number; // minutes
  lightSleep?: number; // minutes
  remSleep?: number; // minutes
  awakeTime?: number; // minutes
  sleepLatency?: number; // minutes to fall asleep
  timeInBed?: number; // minutes
  efficiency?: number;
}

export interface MappedSpO2Data {
  day: string;
  avgValue: number;
  minValue: number;
  maxValue: number;
}

export interface MappedBreathingRateData {
  day: string;
  breathingRate: number;
}

export interface MappedTemperatureData {
  day: string;
  nightlyRelative: number;
}

export interface MappedCardioScoreData {
  day: string;
  vo2MaxLow: number;
  vo2MaxHigh: number;
}

export interface MappedWeightData {
  timestamp: Date;
  weight: number;
  bmi?: number;
  fat?: number;
}

export interface MappedNutritionData {
  day: string;
  calories: number;
  carbs: number;
  fat: number;
  fiber: number;
  protein: number;
  sodium: number;
  water: number;
}

export interface MappedSleepPhaseData {
  timestamp: Date;
  phase: string;
  durationSeconds: number;
}
