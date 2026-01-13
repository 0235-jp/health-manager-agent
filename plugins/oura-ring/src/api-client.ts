/**
 * Oura API v2 クライアント
 */

const BASE_URL = 'https://api.ouraring.com/v2/usercollection';

export interface OuraApiConfig {
  accessToken: string;
}

export interface OuraApiResponse<T> {
  data: T[];
  next_token?: string;
}

// Daily Sleep Response
export interface DailySleepData {
  id: string;
  day: string; // YYYY-MM-DD
  score: number | null;
  timestamp: string;
  contributors?: {
    deep_sleep: number;
    efficiency: number;
    latency: number;
    rem_sleep: number;
    restfulness: number;
    timing: number;
    total_sleep: number;
  };
}

// Sleep Period Response
export interface SleepPeriodData {
  id: string;
  day: string;
  bedtime_start: string;
  bedtime_end: string;
  total_sleep_duration: number; // 秒
  deep_sleep_duration: number; // 秒
  rem_sleep_duration: number; // 秒
  light_sleep_duration: number; // 秒
  awake_time: number; // 秒
  efficiency: number;
  latency: number; // 秒
  average_heart_rate: number | null;
  average_hrv: number | null;
}

// Daily Activity Response
export interface DailyActivityData {
  id: string;
  day: string;
  score: number | null;
  active_calories: number;
  steps: number;
  total_calories: number;
  target_calories: number;
  equivalent_walking_distance: number;
  high_activity_time: number; // 秒
  medium_activity_time: number; // 秒
  low_activity_time: number; // 秒
  sedentary_time: number; // 秒
  resting_time: number; // 秒
}

// Daily Readiness Response
export interface DailyReadinessData {
  id: string;
  day: string;
  score: number | null;
  temperature_deviation: number | null;
  temperature_trend_deviation: number | null;
  contributors?: {
    activity_balance: number;
    body_temperature: number;
    hrv_balance: number;
    previous_day_activity: number;
    previous_night: number;
    recovery_index: number;
    resting_heart_rate: number;
    sleep_balance: number;
  };
}

// Heart Rate Response
export interface HeartRateData {
  bpm: number;
  source: string;
  timestamp: string;
}

// Daily SpO2 Response
export interface DailySpO2Data {
  id: string;
  day: string;
  spo2_percentage?: {
    average: number;
  };
}

// Daily Stress Response
export interface DailyStressData {
  id: string;
  day: string;
  stress_high: number | null;
  recovery_high: number | null;
  day_summary: string | null;
}

// VO2 Max Response
export interface VO2MaxData {
  id: string;
  day: string;
  timestamp: string;
  vo2_max: number | null;
}

// Daily Cardiovascular Age Response
export interface DailyCardiovascularAgeData {
  id: string;
  day: string;
  vascular_age: number | null;
}

// Daily Resilience Response
export interface DailyResilienceData {
  id: string;
  day: string;
  level: string | null; // 'limited' | 'adequate' | 'solid' | 'strong' | 'exceptional'
  contributors?: {
    sleep_recovery: number;
    daytime_recovery: number;
    stress: number;
  };
}

// Workout Response
export interface WorkoutData {
  id: string;
  day: string;
  activity: string;
  calories: number | null;
  distance: number | null; // meters
  end_datetime: string;
  start_datetime: string;
  intensity: string | null; // 'easy' | 'moderate' | 'hard'
  source: string;
  label: string | null;
}

// Session Response
export interface SessionData {
  id: string;
  day: string;
  start_datetime: string;
  end_datetime: string;
  type: string; // 'breathing' | 'meditation' | 'nap' | 'relaxation' | 'rest' | 'body_status'
  mood: string | null; // 'bad' | 'worse' | 'same' | 'good' | 'great'
  heart_rate?: {
    interval: number;
    items: number[];
    timestamp: string;
  };
  heart_rate_variability?: {
    interval: number;
    items: number[];
    timestamp: string;
  };
  motion_count?: {
    interval: number;
    items: number[];
    timestamp: string;
  };
}

// Sleep Time Response
export interface SleepTimeData {
  id: string;
  day: string;
  optimal_bedtime?: {
    day_tz: number;
    end_offset: number;
    start_offset: number;
  };
  recommendation: string | null; // 'improve_efficiency' | 'earlier_bedtime' | 'later_bedtime' | 'earlier_wake_up_time' | 'later_wake_up_time' | 'follow_optimal_bedtime'
  status: string | null; // 'not_enough_nights' | 'not_enough_recent_nights' | 'bad_sleep_quality' | 'only_recommended_found' | 'optimal_found'
}

// Enhanced Tag Response
export interface EnhancedTagData {
  id: string;
  day: string;
  timestamp: string;
  tag_type_code: string | null;
  text: string | null;
  comment: string | null;
}

// Rest Mode Period Response
export interface RestModePeriodData {
  id: string;
  end_day: string | null;
  end_time: string | null;
  start_day: string;
  start_time: string | null;
  episodes?: Array<{
    tags: string[];
    timestamp: string;
  }>;
}

/**
 * Oura API v2 クライアント
 */
export class OuraApiClient {
  private accessToken: string;

  constructor(config: OuraApiConfig) {
    this.accessToken = config.accessToken;
  }

  /**
   * 共通のfetchメソッド
   */
  private async fetch<T>(
    endpoint: string,
    params: Record<string, string> = {}
  ): Promise<T[]> {
    const url = new URL(`${BASE_URL}/${endpoint}`);

    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        url.searchParams.append(key, value);
      }
    });

    const allData: T[] = [];
    let nextToken: string | undefined;

    do {
      if (nextToken) {
        url.searchParams.set('next_token', nextToken);
      }

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid access token');
        }
        if (response.status === 429) {
          throw new Error('Rate limit exceeded');
        }
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const json = (await response.json()) as OuraApiResponse<T>;
      allData.push(...json.data);
      nextToken = json.next_token;
    } while (nextToken);

    return allData;
  }

  /**
   * 日付範囲のパラメータを作成
   */
  private getDateParams(
    startDate?: Date,
    endDate?: Date
  ): Record<string, string> {
    const params: Record<string, string> = {};

    if (startDate) {
      params.start_date = this.formatDate(startDate);
    }
    if (endDate) {
      params.end_date = this.formatDate(endDate);
    }

    return params;
  }

  /**
   * 日時範囲のパラメータを作成（心拍数用）
   */
  private getDateTimeParams(
    startDate?: Date,
    endDate?: Date
  ): Record<string, string> {
    const params: Record<string, string> = {};

    if (startDate) {
      params.start_datetime = startDate.toISOString();
    }
    if (endDate) {
      params.end_datetime = endDate.toISOString();
    }

    return params;
  }

  /**
   * 日付をYYYY-MM-DD形式にフォーマット
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Daily Sleepを取得
   */
  async getDailySleep(
    startDate?: Date,
    endDate?: Date
  ): Promise<DailySleepData[]> {
    return this.fetch<DailySleepData>(
      'daily_sleep',
      this.getDateParams(startDate, endDate)
    );
  }

  /**
   * Sleep Periodsを取得
   */
  async getSleepPeriods(
    startDate?: Date,
    endDate?: Date
  ): Promise<SleepPeriodData[]> {
    return this.fetch<SleepPeriodData>(
      'sleep',
      this.getDateParams(startDate, endDate)
    );
  }

  /**
   * Daily Activityを取得
   */
  async getDailyActivity(
    startDate?: Date,
    endDate?: Date
  ): Promise<DailyActivityData[]> {
    return this.fetch<DailyActivityData>(
      'daily_activity',
      this.getDateParams(startDate, endDate)
    );
  }

  /**
   * Daily Readinessを取得
   */
  async getDailyReadiness(
    startDate?: Date,
    endDate?: Date
  ): Promise<DailyReadinessData[]> {
    return this.fetch<DailyReadinessData>(
      'daily_readiness',
      this.getDateParams(startDate, endDate)
    );
  }

  /**
   * Heart Rateを取得
   */
  async getHeartRate(
    startDate?: Date,
    endDate?: Date
  ): Promise<HeartRateData[]> {
    return this.fetch<HeartRateData>(
      'heartrate',
      this.getDateTimeParams(startDate, endDate)
    );
  }

  /**
   * Daily SpO2を取得
   */
  async getDailySpO2(
    startDate?: Date,
    endDate?: Date
  ): Promise<DailySpO2Data[]> {
    return this.fetch<DailySpO2Data>(
      'daily_spo2',
      this.getDateParams(startDate, endDate)
    );
  }

  /**
   * Daily Stressを取得
   */
  async getDailyStress(
    startDate?: Date,
    endDate?: Date
  ): Promise<DailyStressData[]> {
    return this.fetch<DailyStressData>(
      'daily_stress',
      this.getDateParams(startDate, endDate)
    );
  }

  /**
   * VO2 Maxを取得
   */
  async getVO2Max(
    startDate?: Date,
    endDate?: Date
  ): Promise<VO2MaxData[]> {
    return this.fetch<VO2MaxData>(
      'vo2_max',
      this.getDateParams(startDate, endDate)
    );
  }

  /**
   * Daily Cardiovascular Ageを取得
   */
  async getDailyCardiovascularAge(
    startDate?: Date,
    endDate?: Date
  ): Promise<DailyCardiovascularAgeData[]> {
    return this.fetch<DailyCardiovascularAgeData>(
      'daily_cardiovascular_age',
      this.getDateParams(startDate, endDate)
    );
  }

  /**
   * Daily Resilienceを取得
   */
  async getDailyResilience(
    startDate?: Date,
    endDate?: Date
  ): Promise<DailyResilienceData[]> {
    return this.fetch<DailyResilienceData>(
      'daily_resilience',
      this.getDateParams(startDate, endDate)
    );
  }

  /**
   * Workoutを取得
   */
  async getWorkouts(
    startDate?: Date,
    endDate?: Date
  ): Promise<WorkoutData[]> {
    return this.fetch<WorkoutData>(
      'workout',
      this.getDateParams(startDate, endDate)
    );
  }

  /**
   * Sessionを取得
   */
  async getSessions(
    startDate?: Date,
    endDate?: Date
  ): Promise<SessionData[]> {
    return this.fetch<SessionData>(
      'session',
      this.getDateParams(startDate, endDate)
    );
  }

  /**
   * Sleep Timeを取得
   */
  async getSleepTime(
    startDate?: Date,
    endDate?: Date
  ): Promise<SleepTimeData[]> {
    return this.fetch<SleepTimeData>(
      'sleep_time',
      this.getDateParams(startDate, endDate)
    );
  }

  /**
   * Enhanced Tagを取得
   */
  async getEnhancedTags(
    startDate?: Date,
    endDate?: Date
  ): Promise<EnhancedTagData[]> {
    return this.fetch<EnhancedTagData>(
      'enhanced_tag',
      this.getDateParams(startDate, endDate)
    );
  }

  /**
   * Rest Mode Periodを取得
   */
  async getRestModePeriods(
    startDate?: Date,
    endDate?: Date
  ): Promise<RestModePeriodData[]> {
    return this.fetch<RestModePeriodData>(
      'rest_mode_period',
      this.getDateParams(startDate, endDate)
    );
  }

  /**
   * 接続テスト（Personal Infoを取得）
   */
  async testConnection(): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await fetch(`${BASE_URL}/personal_info`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          return { success: false, message: 'Invalid access token' };
        }
        return {
          success: false,
          message: `API error: ${response.status}`,
        };
      }

      return { success: true, message: 'Connected successfully' };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }
}
