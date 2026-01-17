/**
 * Fitbit Web API Client
 *
 * Implements OAuth 2.0 with PKCE and provides methods for all Fitbit data endpoints.
 */

import {
  AUTH_URL,
  TOKEN_URL,
  API_BASE_URL,
  SCOPES,
  RATE_LIMIT_HEADERS,
  TOKEN_EXPIRY_BUFFER_MS,
  INTRADAY_DETAIL_LEVELS,
  formatLocalDate,
} from './constants.js';
import { generateCodeChallenge, generateCodeVerifier, generateState } from './pkce.js';
import type {
  TokenResponse,
  TokenInfo,
  FitbitApiConfig,
  ProfileResponse,
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

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetSeconds: number;
}

/**
 * Fitbit API Client
 */
export class FitbitApiClient {
  private clientId: string;
  private clientSecret: string;
  private accessToken: string | undefined;
  private refreshToken: string | undefined;
  private tokenExpiresAt: number | undefined;
  private codeVerifier: string | undefined;
  private onTokenRefresh?: (tokenInfo: TokenInfo) => void;
  private rateLimitInfo: RateLimitInfo | null = null;

  constructor(config: FitbitApiConfig) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.accessToken = config.accessToken;
    this.refreshToken = config.refreshToken;
    this.tokenExpiresAt = config.tokenExpiresAt;
  }

  /**
   * Set callback for token refresh events
   */
  setTokenRefreshCallback(callback: (tokenInfo: TokenInfo) => void): void {
    this.onTokenRefresh = callback;
  }

  /**
   * Set the code verifier for PKCE flow (stored temporarily during auth)
   */
  setCodeVerifier(codeVerifier: string): void {
    this.codeVerifier = codeVerifier;
  }

  /**
   * Get the current code verifier
   */
  getCodeVerifier(): string | undefined {
    return this.codeVerifier;
  }

  /**
   * Clear the code verifier after token exchange
   */
  clearCodeVerifier(): void {
    this.codeVerifier = undefined;
  }

  /**
   * Get current rate limit info
   */
  getRateLimitInfo(): RateLimitInfo | null {
    return this.rateLimitInfo;
  }

  // =====================================
  // OAuth Methods
  // =====================================

  /**
   * Generate OAuth authorization URL with PKCE
   *
   * @param redirectUri - The redirect URI for OAuth callback
   * @param state - Optional state parameter (generated if not provided)
   * @returns Object containing authorization URL and PKCE credentials to store
   */
  getAuthorizationUrl(
    redirectUri: string,
    state?: string
  ): { url: string; codeVerifier: string; state: string } {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const authState = state || generateState();

    // Store code verifier for later token exchange
    this.codeVerifier = codeVerifier;

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: redirectUri,
      scope: SCOPES.join(' '),
      state: authState,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    return {
      url: `${AUTH_URL}?${params.toString()}`,
      codeVerifier,
      state: authState,
    };
  }

  /**
   * Exchange authorization code for tokens
   *
   * @param code - The authorization code from OAuth callback
   * @param redirectUri - The same redirect URI used in authorization
   * @param codeVerifier - The code verifier from PKCE (optional if already set)
   */
  async exchangeCodeForToken(
    code: string,
    redirectUri: string,
    codeVerifier?: string
  ): Promise<TokenInfo> {
    const verifier = codeVerifier || this.codeVerifier;
    if (!verifier) {
      throw new Error('No code verifier available. Ensure PKCE flow was initiated correctly.');
    }

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: verifier,
    });

    const tokenInfo = await this.requestToken(params, 'Token exchange');
    this.clearCodeVerifier();
    return tokenInfo;
  }

  /**
   * Refresh the access token
   */
  async refreshAccessToken(): Promise<TokenInfo> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: this.refreshToken,
    });

    return this.requestToken(params, 'Token refresh');
  }

  /**
   * Request tokens from the OAuth endpoint
   */
  private async requestToken(params: URLSearchParams, operation: string): Promise<TokenInfo> {
    const authHeader = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`${operation} failed: ${response.status} ${errorText}`);
    }

    const data = (await response.json()) as TokenResponse;
    return this.updateTokens(data);
  }

  /**
   * Update stored tokens and notify callback
   */
  private updateTokens(data: TokenResponse): TokenInfo {
    this.accessToken = data.access_token;
    this.refreshToken = data.refresh_token;
    this.tokenExpiresAt = Date.now() + data.expires_in * 1000;

    const tokenInfo: TokenInfo = {
      accessToken: this.accessToken,
      refreshToken: this.refreshToken,
      expiresAt: this.tokenExpiresAt,
      userId: data.user_id,
    };

    this.onTokenRefresh?.(tokenInfo);
    return tokenInfo;
  }

  /**
   * Ensure access token is valid, refresh if needed
   */
  private async ensureValidToken(): Promise<void> {
    if (!this.accessToken) {
      throw new Error('No access token configured');
    }

    // Refresh if token expires within buffer time
    if (this.tokenExpiresAt && Date.now() > this.tokenExpiresAt - TOKEN_EXPIRY_BUFFER_MS) {
      await this.refreshAccessToken();
    }
  }

  // =====================================
  // API Request Methods
  // =====================================

  /**
   * Make an API request with automatic token refresh and rate limit handling
   */
  private async apiRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'DELETE' = 'GET',
    body?: Record<string, unknown>,
    retryCount = 0
  ): Promise<T> {
    await this.ensureValidToken();

    const url = `${API_BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Accept': 'application/json',
      'Accept-Language': 'ja_JP',
    };

    if (body) {
      headers['Content-Type'] = 'application/json';
    }

    const options: RequestInit = {
      method,
      headers,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    // Update rate limit info from headers
    this.updateRateLimitInfo(response.headers);

    if (!response.ok) {
      // Handle 401 - try token refresh
      if (response.status === 401 && retryCount === 0) {
        await this.refreshAccessToken();
        return this.apiRequest(endpoint, method, body, retryCount + 1);
      }

      // Handle 429 - rate limited
      if (response.status === 429) {
        const resetSeconds = this.rateLimitInfo?.resetSeconds || 3600;
        throw new Error(
          `Rate limit exceeded. Resets in ${resetSeconds} seconds. ` +
            `Please wait before making more requests.`
        );
      }

      // Handle 403 - forbidden (may be intraday access denied)
      if (response.status === 403) {
        throw new Error(
          'Access forbidden. This may be due to insufficient app permissions ' +
            'or intraday data access not being approved for your app type.'
        );
      }

      // Handle 5xx with retry
      if (response.status >= 500 && retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.apiRequest(endpoint, method, body, retryCount + 1);
      }

      const errorText = await response.text();
      throw new Error(`Fitbit API error: ${response.status} ${errorText}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Update rate limit info from response headers
   */
  private updateRateLimitInfo(headers: Headers): void {
    const limit = headers.get(RATE_LIMIT_HEADERS.LIMIT);
    const remaining = headers.get(RATE_LIMIT_HEADERS.REMAINING);
    const reset = headers.get(RATE_LIMIT_HEADERS.RESET);

    if (limit && remaining && reset) {
      this.rateLimitInfo = {
        limit: parseInt(limit, 10),
        remaining: parseInt(remaining, 10),
        resetSeconds: parseInt(reset, 10),
      };
    }
  }

  // =====================================
  // Profile API
  // =====================================

  /**
   * Get user profile
   */
  async getProfile(): Promise<ProfileResponse> {
    return this.apiRequest<ProfileResponse>('/1/user/-/profile.json');
  }

  // =====================================
  // Activity API
  // =====================================

  /**
   * Get activity summary for a date
   */
  async getActivitySummary(date: Date): Promise<ActivitySummaryResponse> {
    const dateStr = formatLocalDate(date);
    return this.apiRequest<ActivitySummaryResponse>(
      `/1/user/-/activities/date/${dateStr}.json`
    );
  }

  /**
   * Get activity summary for a date range
   */
  async getActivitySummaryRange(
    startDate: Date,
    endDate: Date
  ): Promise<ActivitySummaryResponse[]> {
    const results: ActivitySummaryResponse[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      try {
        const summary = await this.getActivitySummary(current);
        results.push(summary);
      } catch (error) {
        console.warn(`Failed to get activity for ${formatLocalDate(current)}:`, error);
      }
      current.setDate(current.getDate() + 1);
    }

    return results;
  }

  // =====================================
  // Heart Rate API
  // =====================================

  /**
   * Get heart rate data for a date
   */
  async getHeartRate(date: Date): Promise<HeartRateResponse> {
    const dateStr = formatLocalDate(date);
    return this.apiRequest<HeartRateResponse>(
      `/1/user/-/activities/heart/date/${dateStr}/1d.json`
    );
  }

  /**
   * Get heart rate intraday data (requires Personal or approved app)
   */
  async getHeartRateIntraday(
    date: Date,
    detailLevel: string = INTRADAY_DETAIL_LEVELS.ONE_MINUTE
  ): Promise<HeartRateResponse> {
    const dateStr = formatLocalDate(date);
    return this.apiRequest<HeartRateResponse>(
      `/1/user/-/activities/heart/date/${dateStr}/1d/${detailLevel}.json`
    );
  }

  /**
   * Get heart rate data for a date range
   */
  async getHeartRateRange(startDate: Date, endDate: Date): Promise<HeartRateResponse[]> {
    const results: HeartRateResponse[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      try {
        const heartRate = await this.getHeartRate(current);
        results.push(heartRate);
      } catch (error) {
        console.warn(`Failed to get heart rate for ${formatLocalDate(current)}:`, error);
      }
      current.setDate(current.getDate() + 1);
    }

    return results;
  }

  // =====================================
  // HRV API
  // =====================================

  /**
   * Get HRV data for a date
   */
  async getHRV(date: Date): Promise<HrvResponse> {
    const dateStr = formatLocalDate(date);
    return this.apiRequest<HrvResponse>(`/1/user/-/hrv/date/${dateStr}.json`);
  }

  /**
   * Get HRV data for a date range
   */
  async getHRVRange(startDate: Date, endDate: Date): Promise<HrvResponse> {
    const startStr = formatLocalDate(startDate);
    const endStr = formatLocalDate(endDate);
    return this.apiRequest<HrvResponse>(`/1/user/-/hrv/date/${startStr}/${endStr}.json`);
  }

  // =====================================
  // Sleep API
  // =====================================

  /**
   * Get sleep data for a date
   */
  async getSleep(date: Date): Promise<SleepResponse> {
    const dateStr = formatLocalDate(date);
    return this.apiRequest<SleepResponse>(`/1.2/user/-/sleep/date/${dateStr}.json`);
  }

  /**
   * Get sleep data for a date range
   */
  async getSleepRange(startDate: Date, endDate: Date): Promise<SleepResponse> {
    const startStr = formatLocalDate(startDate);
    const endStr = formatLocalDate(endDate);
    return this.apiRequest<SleepResponse>(`/1.2/user/-/sleep/date/${startStr}/${endStr}.json`);
  }

  // =====================================
  // SpO2 API
  // =====================================

  /**
   * Get SpO2 data for a date
   */
  async getSpO2(date: Date): Promise<SpO2Response> {
    const dateStr = formatLocalDate(date);
    return this.apiRequest<SpO2Response>(`/1/user/-/spo2/date/${dateStr}.json`);
  }

  /**
   * Get SpO2 data for a date range
   */
  async getSpO2Range(startDate: Date, endDate: Date): Promise<SpO2Response[]> {
    const results: SpO2Response[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      try {
        const spo2 = await this.getSpO2(current);
        if (spo2 && spo2.value) {
          results.push(spo2);
        }
      } catch (error) {
        // SpO2 data may not be available for all dates
        console.warn(`Failed to get SpO2 for ${formatLocalDate(current)}:`, error);
      }
      current.setDate(current.getDate() + 1);
    }

    return results;
  }

  // =====================================
  // Breathing Rate API
  // =====================================

  /**
   * Get breathing rate data for a date
   */
  async getBreathingRate(date: Date): Promise<BreathingRateResponse> {
    const dateStr = formatLocalDate(date);
    return this.apiRequest<BreathingRateResponse>(`/1/user/-/br/date/${dateStr}.json`);
  }

  /**
   * Get breathing rate data for a date range
   */
  async getBreathingRateRange(startDate: Date, endDate: Date): Promise<BreathingRateResponse> {
    const startStr = formatLocalDate(startDate);
    const endStr = formatLocalDate(endDate);
    return this.apiRequest<BreathingRateResponse>(`/1/user/-/br/date/${startStr}/${endStr}.json`);
  }

  // =====================================
  // Temperature API
  // =====================================

  /**
   * Get skin temperature data for a date
   */
  async getTemperature(date: Date): Promise<TemperatureResponse> {
    const dateStr = formatLocalDate(date);
    return this.apiRequest<TemperatureResponse>(`/1/user/-/temp/skin/date/${dateStr}.json`);
  }

  /**
   * Get skin temperature data for a date range
   */
  async getTemperatureRange(startDate: Date, endDate: Date): Promise<TemperatureResponse> {
    const startStr = formatLocalDate(startDate);
    const endStr = formatLocalDate(endDate);
    return this.apiRequest<TemperatureResponse>(
      `/1/user/-/temp/skin/date/${startStr}/${endStr}.json`
    );
  }

  // =====================================
  // Cardio Fitness (VO2 Max) API
  // =====================================

  /**
   * Get cardio fitness score (VO2 Max) for a date
   */
  async getCardioScore(date: Date): Promise<CardioScoreResponse> {
    const dateStr = formatLocalDate(date);
    return this.apiRequest<CardioScoreResponse>(`/1/user/-/cardioscore/date/${dateStr}.json`);
  }

  /**
   * Get cardio fitness score for a date range
   */
  async getCardioScoreRange(startDate: Date, endDate: Date): Promise<CardioScoreResponse> {
    const startStr = formatLocalDate(startDate);
    const endStr = formatLocalDate(endDate);
    return this.apiRequest<CardioScoreResponse>(
      `/1/user/-/cardioscore/date/${startStr}/${endStr}.json`
    );
  }

  // =====================================
  // Weight/Body API
  // =====================================

  /**
   * Get weight data for a date
   */
  async getWeight(date: Date): Promise<WeightResponse> {
    const dateStr = formatLocalDate(date);
    return this.apiRequest<WeightResponse>(`/1/user/-/body/log/weight/date/${dateStr}.json`);
  }

  /**
   * Get weight data for a date range
   */
  async getWeightRange(startDate: Date, endDate: Date): Promise<WeightResponse> {
    const startStr = formatLocalDate(startDate);
    const endStr = formatLocalDate(endDate);
    return this.apiRequest<WeightResponse>(
      `/1/user/-/body/log/weight/date/${startStr}/${endStr}.json`
    );
  }

  // =====================================
  // Nutrition API
  // =====================================

  /**
   * Get nutrition/food log for a date
   */
  async getNutrition(date: Date): Promise<NutritionResponse> {
    const dateStr = formatLocalDate(date);
    return this.apiRequest<NutritionResponse>(`/1/user/-/foods/log/date/${dateStr}.json`);
  }

  /**
   * Get water log for a date
   */
  async getWater(date: Date): Promise<WaterResponse> {
    const dateStr = formatLocalDate(date);
    return this.apiRequest<WaterResponse>(`/1/user/-/foods/log/water/date/${dateStr}.json`);
  }

  // =====================================
  // Connection Test
  // =====================================

  /**
   * Test API connection
   */
  async testConnection(): Promise<{ success: boolean; message?: string }> {
    try {
      await this.ensureValidToken();

      // Try to get profile as a simple connection test
      await this.getProfile();

      return { success: true, message: 'Connected successfully to Fitbit API' };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }
}

export type { TokenInfo, FitbitApiConfig };
