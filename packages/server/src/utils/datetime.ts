/**
 * 日時ユーティリティ
 * タイムゾーン処理の統一化
 */

export const DEFAULT_TIMEZONE = 'Asia/Tokyo';

/**
 * 任意のタイムゾーン付き日時文字列を UTC ISO8601 に正規化
 */
export function normalizeToUTC(dateString: string): string {
  const date = new Date(dateString);

  if (isNaN(date.getTime())) {
    throw new Error(
      `無効な日時形式: "${dateString}"。ISO 8601形式を使用してください（例: "2025-01-14T09:00:00+09:00"）`
    );
  }

  return date.toISOString();
}

/**
 * UTC 日時を指定タイムゾーンの ISO8601 形式に変換
 * AI に返すデータ用
 */
export function utcToTimezone(utcString: string, timezone: string): string {
  const date = new Date(utcString);

  if (isNaN(date.getTime())) {
    return utcString;
  }

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    fractionalSecondDigits: 3,
  });

  const parts = formatter.formatToParts(date);
  const get = (type: string): string => parts.find((p) => p.type === type)?.value || '00';

  const offset = getTimezoneOffset(date, timezone);

  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}.${get('fractionalSecond')}${formatOffset(offset)}`;
}

/**
 * 指定タイムゾーンのオフセット（分）を取得
 */
function getTimezoneOffset(date: Date, timezone: string): number {
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  return (tzDate.getTime() - utcDate.getTime()) / 60000;
}

/**
 * オフセット（分）を +HH:MM 形式に変換
 */
function formatOffset(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absMinutes = Math.abs(offsetMinutes);
  const hours = Math.floor(absMinutes / 60);
  const minutes = absMinutes % 60;
  return `${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * 現在時刻を UTC ISO8601 形式で取得
 */
export function nowUTC(): string {
  return new Date().toISOString();
}
