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
