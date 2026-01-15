/**
 * Huawei Health Kit REST API クライアント
 */

// OAuth エンドポイント
const AUTH_URL = 'https://oauth-login.cloud.huawei.com/oauth2/v3/authorize';
const TOKEN_URL = 'https://oauth-login.cloud.huawei.com/oauth2/v3/token';

// Health Kit API エンドポイント
const API_BASE_URL = 'https://health-api.cloud.huawei.com/healthkit/v1';

export interface HuaweiApiConfig {
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: number;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

export interface TokenInfo {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

// データタイプ名（Huawei Health Kit）
export const DATA_TYPES = {
  // 活動・運動
  STEPS: 'com.huawei.continuous.steps.delta',
  DISTANCE: 'com.huawei.continuous.distance.delta',
  CALORIES_BURNT: 'com.huawei.continuous.calories.burnt',
  CALORIES_BMR: 'com.huawei.continuous.calories.bmr',
  SPEED: 'com.huawei.continuous.speed',
  ALTITUDE: 'com.huawei.continuous.altitude',
  PEDALING_RATE: 'com.huawei.instantaneous.pedaling_rate',

  // 心臓・循環器
  HEART_RATE: 'com.huawei.instantaneous.heart_rate',
  RESTING_HEART_RATE: 'com.huawei.instantaneous.heart_rate.resting',
  HRV: 'com.huawei.instantaneous.heart_rate_variability',
  SPO2: 'com.huawei.instantaneous.spo2',
  BLOOD_PRESSURE: 'com.huawei.instantaneous.blood_pressure',
  BRADYCARDIA: 'DT_HEALTH_RECORD_BRADYCARDIA',
  TACHYCARDIA: 'DT_HEALTH_RECORD_TACHYCARDIA',
  ECG: 'com.huawei.instantaneous.ecg',

  // 睡眠
  SLEEP: 'com.huawei.continuous.sleep',
  SLEEP_RECORD: 'DT_HEALTH_RECORD_SLEEP',
  SLEEP_RESPIRATORY: 'DT_SLEEP_RESPIRATORY_DETAIL',

  // 身体測定
  BODY_WEIGHT: 'com.huawei.instantaneous.body.weight',
  BODY_HEIGHT: 'com.huawei.instantaneous.body.height',
  BODY_FAT: 'com.huawei.instantaneous.body.fat.rate',
  BMI: 'com.huawei.instantaneous.body.bmi',
  MUSCLE_MASS: 'com.huawei.instantaneous.body.muscle.mass',
  BONE_MASS: 'com.huawei.instantaneous.body.bone.mass',
  BODY_WATER: 'com.huawei.instantaneous.body.water',
  VISCERAL_FAT: 'com.huawei.instantaneous.body.visceral.fat',

  // 体温
  BODY_TEMPERATURE: 'com.huawei.instantaneous.body_temperature',
  SKIN_TEMPERATURE: 'com.huawei.instantaneous.skin_temperature',
  BODY_TEMPERATURE_REST: 'com.huawei.instantaneous.body_temperature_rest',

  // ストレス
  STRESS: 'com.huawei.instantaneous.stress',

  // 血糖値
  BLOOD_GLUCOSE: 'com.huawei.instantaneous.blood_glucose',
  CGM_BLOOD_GLUCOSE: 'com.huawei.cgm.blood_glucose',

  // 尿検査
  URIC_ACID: 'com.huawei.instantaneous.uric_acid',
  URINE_BILIRUBIN: 'DT_INSTANTANEOUS_URINE_ROUTINE_BILIRUBIN',
  URINE_GLUCOSE: 'DT_INSTANTANEOUS_URINE_ROUTINE_GLUCOSE',

  // 水分
  HYDRATE: 'com.huawei.continuous.hydrate',

  // 栄養
  NUTRITION: 'com.huawei.continuous.nutrition',

  // 位置情報
  LOCATION: 'com.huawei.continuous.location',

  // 女性の健康
  MENSTRUAL_FLOW: 'DT_CONTINUOUS_MENSTRUAL_FLOW',
  MENSTRUAL_CYCLE: 'DT_HEALTH_RECORD_MENSTRUAL_CYCLE',
  OVULATION: 'DT_INSTANTANEOUS_OVULATION_DETECTION',
  CERVICAL_MUCUS: 'DT_INSTANTANEOUS_CERVICAL_MUCUS',

  // 呼吸器
  VENTILATOR: 'DT_HEALTH_RECORD_VENTILATOR',
} as const;

// スコープ定義
export const SCOPES = [
  'https://www.huawei.com/healthkit/step.read',
  'https://www.huawei.com/healthkit/distance.read',
  'https://www.huawei.com/healthkit/calories.read',
  'https://www.huawei.com/healthkit/heartrate.read',
  'https://www.huawei.com/healthkit/oxygenSaturation.read',
  'https://www.huawei.com/healthkit/bloodpressure.read',
  'https://www.huawei.com/healthkit/sleep.read',
  'https://www.huawei.com/healthkit/heightweight.read',
  'https://www.huawei.com/healthkit/bodyfat.read',
  'https://www.huawei.com/healthkit/bodyTemperature.read',
  'https://www.huawei.com/healthkit/stress.read',
  'https://www.huawei.com/healthkit/bloodglucose.read',
  'https://www.huawei.com/healthkit/hydrate.read',
  'https://www.huawei.com/healthkit/nutrition.read',
  'https://www.huawei.com/healthkit/activity.read',
  'https://www.huawei.com/healthkit/speed.read',
  'https://www.huawei.com/healthkit/pulmonary.read',
  'https://www.huawei.com/healthkit/reproductiveHealth.read',
  'https://www.huawei.com/healthkit/location.read',
  'https://www.huawei.com/healthkit/historydata.open.week',
  'https://www.huawei.com/healthkit/historydata.open.month',
  'https://www.huawei.com/healthkit/historydata.open.year',
];

// API レスポンス型定義
export interface SamplePoint {
  startTime: number;
  endTime: number;
  dataTypeName: string;
  fieldValues: Record<string, number | string>;
  originDataStreamId?: string;
}

export interface SampleSetResponse {
  samplePoints?: SamplePoint[];
  nextPageToken?: string;
}

export interface PolymerizeResponse {
  sampleSets?: Array<{
    dataTypeName: string;
    samplePoints: SamplePoint[];
  }>;
}

export interface StepsData {
  timestamp: Date;
  steps: number;
}

export interface HeartRateData {
  timestamp: Date;
  bpm: number;
}

export interface SleepData {
  day: string;
  startTime: Date;
  endTime: Date;
  totalDuration: number;
  deepSleep?: number;
  lightSleep?: number;
  remSleep?: number;
  awakeTime?: number;
}

export interface ActivityData {
  day: string;
  calories: number;
  activeCalories?: number;
  bmrCalories?: number;
  distance?: number;
  floorsClimbed?: number;
}

export interface BodyMetricsData {
  timestamp: Date;
  weight?: number;
  height?: number;
  bodyFat?: number;
  bmi?: number;
  muscleMass?: number;
  boneMass?: number;
  bodyWater?: number;
  visceralFat?: number;
}

export interface BloodPressureData {
  timestamp: Date;
  systolic: number;
  diastolic: number;
}

export interface StressData {
  timestamp: Date;
  level: number;
}

export interface SpO2Data {
  timestamp: Date;
  percentage: number;
}

export interface BloodGlucoseData {
  timestamp: Date;
  value: number;
}

export interface BodyTemperatureData {
  timestamp: Date;
  temperature: number;
  isSkinTemperature?: boolean;
}

export interface HydrateData {
  timestamp: Date;
  amount: number;
}

export interface HRVData {
  timestamp: Date;
  sdnn?: number;
  rmssd?: number;
}

export interface NutritionData {
  timestamp: Date;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export interface MenstrualData {
  day: string;
  flow?: number;
  cycleLength?: number;
  ovulation?: boolean;
  cervicalMucus?: number;
  dysmenorrhoea?: number;
}

export interface SleepRecordData extends SleepData {
  sleepScore?: number;
  respiratoryRate?: number;
}

export interface UrineRoutineData {
  timestamp: Date;
  uricAcid?: number;
  bilirubin?: number;
  glucose?: number;
}


/**
 * Huawei Health API クライアント
 */
export class HuaweiHealthApiClient {
  private clientId: string;
  private clientSecret: string;
  private accessToken: string | undefined;
  private refreshToken: string | undefined;
  private tokenExpiresAt: number | undefined;
  private onTokenRefresh?: (tokenInfo: TokenInfo) => void;

  constructor(config: HuaweiApiConfig) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.accessToken = config.accessToken;
    this.refreshToken = config.refreshToken;
    this.tokenExpiresAt = config.tokenExpiresAt;
  }

  /**
   * トークン更新時のコールバックを設定
   */
  setTokenRefreshCallback(callback: (tokenInfo: TokenInfo) => void): void {
    this.onTokenRefresh = callback;
  }

  /**
   * OAuth認証URLを生成
   */
  getAuthorizationUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: redirectUri,
      scope: SCOPES.join(' '),
      state: state,
      access_type: 'offline',
    });

    return `${AUTH_URL}?${params.toString()}`;
  }

  /**
   * 認証コードをアクセストークンに交換
   */
  async exchangeCodeForToken(code: string, redirectUri: string): Promise<TokenInfo> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: redirectUri,
    });

    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
    }

    const data = await response.json() as TokenResponse;

    this.accessToken = data.access_token;
    this.refreshToken = data.refresh_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in * 1000);

    const tokenInfo: TokenInfo = {
      accessToken: this.accessToken,
      refreshToken: this.refreshToken,
      expiresAt: this.tokenExpiresAt,
    };

    if (this.onTokenRefresh) {
      this.onTokenRefresh(tokenInfo);
    }

    return tokenInfo;
  }

  /**
   * アクセストークンをリフレッシュ
   */
  async refreshAccessToken(): Promise<TokenInfo> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: this.refreshToken,
    });

    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token refresh failed: ${response.status} ${errorText}`);
    }

    const data = await response.json() as TokenResponse;

    this.accessToken = data.access_token;
    if (data.refresh_token) {
      this.refreshToken = data.refresh_token;
    }
    this.tokenExpiresAt = Date.now() + (data.expires_in * 1000);

    const tokenInfo: TokenInfo = {
      accessToken: this.accessToken,
      refreshToken: this.refreshToken!,
      expiresAt: this.tokenExpiresAt,
    };

    if (this.onTokenRefresh) {
      this.onTokenRefresh(tokenInfo);
    }

    return tokenInfo;
  }

  /**
   * トークンが有効か確認し、必要に応じてリフレッシュ
   */
  private async ensureValidToken(): Promise<void> {
    if (!this.accessToken) {
      throw new Error('No access token configured');
    }

    // トークンの有効期限を確認（5分前にリフレッシュ）
    if (this.tokenExpiresAt && Date.now() > this.tokenExpiresAt - 5 * 60 * 1000) {
      await this.refreshAccessToken();
    }
  }

  /**
   * API リクエストを実行
   */
  private async apiRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    body?: Record<string, unknown>
  ): Promise<T> {
    await this.ensureValidToken();

    const url = `${API_BASE_URL}/${endpoint}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      if (response.status === 401) {
        // トークンが無効、リフレッシュを試行
        await this.refreshAccessToken();
        return this.apiRequest(endpoint, method, body);
      }
      if (response.status === 403) {
        throw new Error('Insufficient permissions. Check your Health Kit scopes.');
      }
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} ${errorText}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * サンプリングデータを集計して取得（polymerize）
   */
  async getSampleData(
    dataTypeName: string,
    startDate: Date,
    endDate: Date
  ): Promise<SamplePoint[]> {
    const body = {
      polymerizeWith: [{
        dataTypeName: dataTypeName,
      }],
      startTime: startDate.getTime(),
      endTime: endDate.getTime(),
    };

    const response = await this.apiRequest<PolymerizeResponse>(
      'sampleSet:polymerize',
      'POST',
      body
    );

    if (!response.sampleSets || response.sampleSets.length === 0) {
      return [];
    }

    const sampleSet = response.sampleSets.find(s => s.dataTypeName === dataTypeName);
    return sampleSet?.samplePoints || [];
  }

  /**
   * 歩数データを取得
   */
  async getSteps(startDate: Date, endDate: Date): Promise<StepsData[]> {
    const samplePoints = await this.getSampleData(DATA_TYPES.STEPS, startDate, endDate);

    return samplePoints.map(point => ({
      timestamp: new Date(point.endTime),
      steps: Number(point.fieldValues['steps'] || point.fieldValues['value'] || 0),
    }));
  }

  /**
   * 心拍数データを取得
   */
  async getHeartRate(startDate: Date, endDate: Date): Promise<HeartRateData[]> {
    const samplePoints = await this.getSampleData(DATA_TYPES.HEART_RATE, startDate, endDate);

    return samplePoints.map(point => ({
      timestamp: new Date(point.startTime),
      bpm: Number(point.fieldValues['bpm'] || point.fieldValues['value'] || 0),
    }));
  }

  /**
   * 睡眠データを取得
   */
  async getSleep(startDate: Date, endDate: Date): Promise<SleepData[]> {
    const samplePoints = await this.getSampleData(DATA_TYPES.SLEEP, startDate, endDate);

    // 日付ごとにグループ化
    const sleepByDay = new Map<string, SleepData>();

    for (const point of samplePoints) {
      const startTime = new Date(point.startTime);
      const endTime = new Date(point.endTime);
      const day = startTime.toISOString().split('T')[0];

      const existing = sleepByDay.get(day);
      const duration = (point.endTime - point.startTime) / 1000 / 60; // 分
      const sleepStage = point.fieldValues['sleep_stage'] || point.fieldValues['status'];

      if (!existing) {
        sleepByDay.set(day, {
          day,
          startTime,
          endTime,
          totalDuration: duration,
          deepSleep: sleepStage === 4 ? duration : 0,
          lightSleep: sleepStage === 2 ? duration : 0,
          remSleep: sleepStage === 5 ? duration : 0,
          awakeTime: sleepStage === 1 ? duration : 0,
        });
      } else {
        existing.totalDuration += duration;
        if (sleepStage === 4) existing.deepSleep = (existing.deepSleep || 0) + duration;
        if (sleepStage === 2) existing.lightSleep = (existing.lightSleep || 0) + duration;
        if (sleepStage === 5) existing.remSleep = (existing.remSleep || 0) + duration;
        if (sleepStage === 1) existing.awakeTime = (existing.awakeTime || 0) + duration;
        if (endTime > existing.endTime) existing.endTime = endTime;
        if (startTime < existing.startTime) existing.startTime = startTime;
      }
    }

    return Array.from(sleepByDay.values());
  }

  /**
   * 活動データを取得（カロリー、距離など）
   */
  async getActivity(startDate: Date, endDate: Date): Promise<ActivityData[]> {
    const [caloriesPoints, distancePoints, altitudePoints] = await Promise.all([
      this.getSampleData(DATA_TYPES.CALORIES_BURNT, startDate, endDate),
      this.getSampleData(DATA_TYPES.DISTANCE, startDate, endDate),
      this.getSampleData(DATA_TYPES.ALTITUDE, startDate, endDate).catch(() => []),
    ]);

    const activityByDay = new Map<string, ActivityData>();

    const getEntry = (day: string): ActivityData => {
      let entry = activityByDay.get(day);
      if (!entry) {
        entry = { day, calories: 0 };
        activityByDay.set(day, entry);
      }
      return entry;
    };

    for (const point of caloriesPoints) {
      const day = new Date(point.endTime).toISOString().split('T')[0];
      getEntry(day).calories += Number(point.fieldValues['calories'] || point.fieldValues['value'] || 0);
    }

    for (const point of distancePoints) {
      const day = new Date(point.endTime).toISOString().split('T')[0];
      const entry = getEntry(day);
      entry.distance = (entry.distance || 0) + Number(point.fieldValues['distance'] || point.fieldValues['value'] || 0);
    }

    for (const point of altitudePoints) {
      const day = new Date(point.endTime).toISOString().split('T')[0];
      const entry = getEntry(day);
      entry.floorsClimbed = (entry.floorsClimbed || 0) + Number(point.fieldValues['floors'] || 0);
    }

    return Array.from(activityByDay.values());
  }

  /**
   * 身体測定データを取得
   */
  async getBodyMetrics(startDate: Date, endDate: Date): Promise<BodyMetricsData[]> {
    const [weightPoints, heightPoints, fatPoints] = await Promise.all([
      this.getSampleData(DATA_TYPES.BODY_WEIGHT, startDate, endDate).catch(() => []),
      this.getSampleData(DATA_TYPES.BODY_HEIGHT, startDate, endDate).catch(() => []),
      this.getSampleData(DATA_TYPES.BODY_FAT, startDate, endDate).catch(() => []),
    ]);

    const metricsMap = new Map<number, BodyMetricsData>();

    const getEntry = (ts: number): BodyMetricsData => {
      let entry = metricsMap.get(ts);
      if (!entry) {
        entry = { timestamp: new Date(ts) };
        metricsMap.set(ts, entry);
      }
      return entry;
    };

    for (const point of weightPoints) {
      getEntry(point.startTime).weight = Number(point.fieldValues['weight'] || point.fieldValues['value'] || 0);
    }

    for (const point of heightPoints) {
      getEntry(point.startTime).height = Number(point.fieldValues['height'] || point.fieldValues['value'] || 0) * 100;
    }

    for (const point of fatPoints) {
      getEntry(point.startTime).bodyFat = Number(point.fieldValues['body_fat_rate'] || point.fieldValues['value'] || 0);
    }

    return Array.from(metricsMap.values());
  }

  /**
   * 血圧データを取得
   */
  async getBloodPressure(startDate: Date, endDate: Date): Promise<BloodPressureData[]> {
    const samplePoints = await this.getSampleData(DATA_TYPES.BLOOD_PRESSURE, startDate, endDate);

    return samplePoints.map(point => ({
      timestamp: new Date(point.startTime),
      systolic: Number(point.fieldValues['systolic_pressure'] || point.fieldValues['systolic'] || 0),
      diastolic: Number(point.fieldValues['diastolic_pressure'] || point.fieldValues['diastolic'] || 0),
    }));
  }

  /**
   * ストレスデータを取得
   */
  async getStress(startDate: Date, endDate: Date): Promise<StressData[]> {
    const samplePoints = await this.getSampleData(DATA_TYPES.STRESS, startDate, endDate);

    return samplePoints.map(point => ({
      timestamp: new Date(point.startTime),
      level: Number(point.fieldValues['stress'] || point.fieldValues['value'] || 0),
    }));
  }

  /**
   * SpO2データを取得
   */
  async getSpO2(startDate: Date, endDate: Date): Promise<SpO2Data[]> {
    const samplePoints = await this.getSampleData(DATA_TYPES.SPO2, startDate, endDate);

    return samplePoints.map(point => ({
      timestamp: new Date(point.startTime),
      percentage: Number(point.fieldValues['spo2'] || point.fieldValues['value'] || 0),
    }));
  }

  /**
   * 血糖値データを取得
   */
  async getBloodGlucose(startDate: Date, endDate: Date): Promise<BloodGlucoseData[]> {
    const samplePoints = await this.getSampleData(DATA_TYPES.BLOOD_GLUCOSE, startDate, endDate);

    return samplePoints.map(point => ({
      timestamp: new Date(point.startTime),
      value: Number(point.fieldValues['blood_glucose'] || point.fieldValues['value'] || 0),
    }));
  }

  /**
   * 体温データを取得
   */
  async getBodyTemperature(startDate: Date, endDate: Date): Promise<BodyTemperatureData[]> {
    const [bodyTempPoints, skinTempPoints] = await Promise.all([
      this.getSampleData(DATA_TYPES.BODY_TEMPERATURE, startDate, endDate).catch(() => []),
      this.getSampleData(DATA_TYPES.SKIN_TEMPERATURE, startDate, endDate).catch(() => []),
    ]);

    const results: BodyTemperatureData[] = [];

    for (const point of bodyTempPoints) {
      results.push({
        timestamp: new Date(point.startTime),
        temperature: Number(point.fieldValues['body_temperature'] || point.fieldValues['value'] || 0),
        isSkinTemperature: false,
      });
    }

    for (const point of skinTempPoints) {
      results.push({
        timestamp: new Date(point.startTime),
        temperature: Number(point.fieldValues['skin_temperature'] || point.fieldValues['value'] || 0),
        isSkinTemperature: true,
      });
    }

    return results.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * 水分摂取データを取得
   */
  async getHydrate(startDate: Date, endDate: Date): Promise<HydrateData[]> {
    const samplePoints = await this.getSampleData(DATA_TYPES.HYDRATE, startDate, endDate);

    return samplePoints.map(point => ({
      timestamp: new Date(point.startTime),
      amount: Number(point.fieldValues['volume'] || point.fieldValues['value'] || 0) * 1000, // L to ml
    }));
  }

  /**
   * 安静時心拍数データを取得
   */
  async getRestingHeartRate(startDate: Date, endDate: Date): Promise<HeartRateData[]> {
    const samplePoints = await this.getSampleData(DATA_TYPES.RESTING_HEART_RATE, startDate, endDate);

    return samplePoints.map(point => ({
      timestamp: new Date(point.startTime),
      bpm: Number(point.fieldValues['bpm'] || point.fieldValues['value'] || 0),
    }));
  }

  /**
   * HRV（心拍変動）データを取得
   */
  async getHRV(startDate: Date, endDate: Date): Promise<HRVData[]> {
    const samplePoints = await this.getSampleData(DATA_TYPES.HRV, startDate, endDate);

    return samplePoints.map(point => ({
      timestamp: new Date(point.startTime),
      sdnn: point.fieldValues['sdnn'] !== undefined ? Number(point.fieldValues['sdnn']) : undefined,
      rmssd: point.fieldValues['rmssd'] !== undefined ? Number(point.fieldValues['rmssd']) : undefined,
    }));
  }

  /**
   * 栄養データを取得
   */
  async getNutrition(startDate: Date, endDate: Date): Promise<NutritionData[]> {
    const samplePoints = await this.getSampleData(DATA_TYPES.NUTRITION, startDate, endDate);

    return samplePoints.map(point => ({
      timestamp: new Date(point.startTime),
      calories: point.fieldValues['calories'] !== undefined ? Number(point.fieldValues['calories']) : undefined,
      protein: point.fieldValues['protein'] !== undefined ? Number(point.fieldValues['protein']) : undefined,
      carbs: point.fieldValues['carbs'] !== undefined ? Number(point.fieldValues['carbs']) : undefined,
      fat: point.fieldValues['fat'] !== undefined ? Number(point.fieldValues['fat']) : undefined,
    }));
  }

  /**
   * 月経関連データを取得
   */
  async getMenstrualData(startDate: Date, endDate: Date): Promise<MenstrualData[]> {
    const [flowPoints, cyclePoints, ovulationPoints, mucusPoints] = await Promise.all([
      this.getSampleData(DATA_TYPES.MENSTRUAL_FLOW, startDate, endDate).catch(() => []),
      this.getSampleData(DATA_TYPES.MENSTRUAL_CYCLE, startDate, endDate).catch(() => []),
      this.getSampleData(DATA_TYPES.OVULATION, startDate, endDate).catch(() => []),
      this.getSampleData(DATA_TYPES.CERVICAL_MUCUS, startDate, endDate).catch(() => []),
    ]);

    const dataByDay = new Map<string, MenstrualData>();

    const getEntry = (day: string): MenstrualData => {
      let entry = dataByDay.get(day);
      if (!entry) {
        entry = { day };
        dataByDay.set(day, entry);
      }
      return entry;
    };

    for (const point of flowPoints) {
      const day = new Date(point.startTime).toISOString().split('T')[0];
      getEntry(day).flow = Number(point.fieldValues['flow'] || point.fieldValues['value'] || 0);
    }

    for (const point of cyclePoints) {
      const day = new Date(point.startTime).toISOString().split('T')[0];
      getEntry(day).cycleLength = Number(point.fieldValues['cycle_length'] || point.fieldValues['value'] || 0);
    }

    for (const point of ovulationPoints) {
      const day = new Date(point.startTime).toISOString().split('T')[0];
      getEntry(day).ovulation = Boolean(point.fieldValues['ovulation'] || point.fieldValues['value']);
    }

    for (const point of mucusPoints) {
      const day = new Date(point.startTime).toISOString().split('T')[0];
      getEntry(day).cervicalMucus = Number(point.fieldValues['cervical_mucus'] || point.fieldValues['value'] || 0);
    }

    return Array.from(dataByDay.values());
  }

  /**
   * 睡眠記録（スコア含む）を取得
   */
  async getSleepRecord(startDate: Date, endDate: Date): Promise<SleepRecordData[]> {
    // 基本の睡眠データを取得
    const sleepData = await this.getSleep(startDate, endDate);

    // Sleep Record APIから追加情報を取得（利用可能な場合）
    let scorePoints: SamplePoint[] = [];
    try {
      scorePoints = await this.getSampleData(DATA_TYPES.SLEEP_RECORD, startDate, endDate);
    } catch {
      // Sleep Record APIが利用できない場合は基本データのみ返す
    }

    const scoreByDay = new Map<string, { score?: number; respiratoryRate?: number }>();
    for (const point of scorePoints) {
      const day = new Date(point.startTime).toISOString().split('T')[0];
      scoreByDay.set(day, {
        score: point.fieldValues['sleep_score'] !== undefined ? Number(point.fieldValues['sleep_score']) : undefined,
        respiratoryRate: point.fieldValues['respiratory_rate'] !== undefined ? Number(point.fieldValues['respiratory_rate']) : undefined,
      });
    }

    return sleepData.map(sleep => {
      const scores = scoreByDay.get(sleep.day);
      return {
        ...sleep,
        sleepScore: scores?.score,
        respiratoryRate: scores?.respiratoryRate,
      };
    });
  }

  /**
   * 尿検査データを取得
   */
  async getUrineRoutine(startDate: Date, endDate: Date): Promise<UrineRoutineData[]> {
    const [uricAcidPoints, bilirubinPoints, glucosePoints] = await Promise.all([
      this.getSampleData(DATA_TYPES.URIC_ACID, startDate, endDate).catch(() => []),
      this.getSampleData(DATA_TYPES.URINE_BILIRUBIN, startDate, endDate).catch(() => []),
      this.getSampleData(DATA_TYPES.URINE_GLUCOSE, startDate, endDate).catch(() => []),
    ]);

    const dataByTimestamp = new Map<number, UrineRoutineData>();

    const getEntry = (ts: number): UrineRoutineData => {
      let entry = dataByTimestamp.get(ts);
      if (!entry) {
        entry = { timestamp: new Date(ts) };
        dataByTimestamp.set(ts, entry);
      }
      return entry;
    };

    for (const point of uricAcidPoints) {
      getEntry(point.startTime).uricAcid = Number(point.fieldValues['uric_acid'] || point.fieldValues['value'] || 0);
    }

    for (const point of bilirubinPoints) {
      getEntry(point.startTime).bilirubin = Number(point.fieldValues['bilirubin'] || point.fieldValues['value'] || 0);
    }

    for (const point of glucosePoints) {
      getEntry(point.startTime).glucose = Number(point.fieldValues['glucose'] || point.fieldValues['value'] || 0);
    }

    return Array.from(dataByTimestamp.values()).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * 接続テスト
   */
  async testConnection(): Promise<{ success: boolean; message?: string }> {
    try {
      await this.ensureValidToken();

      // 簡単なAPIリクエストで接続確認
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);

      await this.getSampleData(DATA_TYPES.STEPS, startDate, endDate);

      return { success: true, message: 'Connected successfully' };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }
}
