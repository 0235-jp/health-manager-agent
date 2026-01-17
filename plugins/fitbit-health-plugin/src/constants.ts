/**
 * Fitbit API Constants
 */

// OAuth 2.0 Endpoints
export const AUTH_URL = 'https://www.fitbit.com/oauth2/authorize';
export const TOKEN_URL = 'https://api.fitbit.com/oauth2/token';
export const REVOKE_URL = 'https://api.fitbit.com/oauth2/revoke';

// API Base URL
export const API_BASE_URL = 'https://api.fitbit.com';

// OAuth Scopes
export const SCOPES = [
  'activity',
  'heartrate',
  'location',
  'nutrition',
  'oxygen_saturation',
  'profile',
  'respiratory_rate',
  'settings',
  'sleep',
  'social',
  'temperature',
  'weight',
  'cardio_fitness',
] as const;

export type FitbitScope = typeof SCOPES[number];

// Intraday detail levels
export const INTRADAY_DETAIL_LEVELS = {
  ONE_SECOND: '1sec',
  ONE_MINUTE: '1min',
  FIVE_MINUTES: '5min',
  FIFTEEN_MINUTES: '15min',
} as const;

// Rate limit headers
export const RATE_LIMIT_HEADERS = {
  LIMIT: 'fitbit-rate-limit-limit',
  REMAINING: 'fitbit-rate-limit-remaining',
  RESET: 'fitbit-rate-limit-reset',
} as const;

// Default rate limit (150 requests per hour per user)
export const DEFAULT_RATE_LIMIT = 150;

// Token expiration buffer (5 minutes before expiry)
export const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000;

/**
 * Format date as local YYYY-MM-DD string.
 * Avoids UTC timezone shift that occurs with toISOString().
 */
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
