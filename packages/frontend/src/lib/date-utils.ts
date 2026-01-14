/**
 * Date utility functions for the frontend
 */

const DEFAULT_TIMEZONE = 'Asia/Tokyo';

/**
 * Format a Date object to YYYY-MM-DD string for input[type="date"]
 */
export function formatDateForInput(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Get a Date object for N days ago
 */
export function getDateDaysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

/**
 * 日時を指定タイムゾーンでフォーマット（日時表示用）
 */
export function formatDateTime(
  dateString: string | Date,
  timezone: string = DEFAULT_TIMEZONE
): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  if (isNaN(date.getTime())) return '無効な日時';

  return date.toLocaleString('ja-JP', {
    timeZone: timezone,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 日付のみを指定タイムゾーンでフォーマット
 */
export function formatDate(
  dateString: string | Date,
  timezone: string = DEFAULT_TIMEZONE
): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  if (isNaN(date.getTime())) return '無効な日付';

  return date.toLocaleDateString('ja-JP', {
    timeZone: timezone,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * 期間を指定タイムゾーンでフォーマット
 * @param includeTime - true の場合は時刻も含める
 */
export function formatPeriod(
  start: string | Date,
  end: string | Date,
  timezone: string = DEFAULT_TIMEZONE,
  includeTime: boolean = false
): string {
  const formatter = includeTime ? formatDateTime : formatDate;
  return `${formatter(start, timezone)} - ${formatter(end, timezone)}`;
}

/**
 * 短い日付フォーマット (M/D形式)
 */
export function formatShortDate(
  dateString: string | Date,
  timezone: string = DEFAULT_TIMEZONE
): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  if (isNaN(date.getTime())) return '無効';

  return date.toLocaleDateString('ja-JP', {
    timeZone: timezone,
    month: 'numeric',
    day: 'numeric',
  });
}

/**
 * 今日の日付を指定タイムゾーンで取得
 */
export function getTodayInTimezone(timezone: string = DEFAULT_TIMEZONE): string {
  return new Date().toLocaleDateString('ja-JP', {
    timeZone: timezone,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * datetime-local 入力用のフォーマット（タイムゾーン考慮）
 * ISO文字列を datetime-local の value 形式 (YYYY-MM-DDTHH:mm) に変換
 */
export function formatForDateTimeLocal(
  isoString: string,
  timezone: string = DEFAULT_TIMEZONE
): string {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';

  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  // sv-SE locale gives us YYYY-MM-DD HH:mm format
  const formatted = formatter.format(date);
  // Replace space with T for datetime-local format
  return formatted.replace(' ', 'T');
}

/**
 * datetime-local から ISO 文字列に変換（タイムゾーン考慮）
 * datetime-local の値を指定タイムゾーンの日時として解釈し、UTC ISO文字列に変換
 */
export function dateTimeLocalToISO(
  localValue: string,
  timezone: string = DEFAULT_TIMEZONE
): string {
  if (!localValue) return '';

  const localDate = new Date(localValue);
  if (isNaN(localDate.getTime())) return '';

  // 指定タイムゾーンのオフセットを計算
  const now = new Date();
  const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  const offsetMs = tzDate.getTime() - utcDate.getTime();

  // localValue をパースして、オフセットを引いて UTC に変換
  return new Date(localDate.getTime() - offsetMs).toISOString();
}

/**
 * 指定タイムゾーンでの「今日」の日付範囲をdatetime-local形式で取得（00:00から23:59）
 *
 * @param timezone タイムゾーン名（例: 'Asia/Tokyo'）
 * @returns datetime-local形式の開始・終了時刻
 */
export function getTodayDatetimeRange(timezone: string): { start: string; end: string } {
  const now = new Date();

  // 指定タイムゾーンでの「今日」を取得
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const datePrefix = formatter.format(now); // "2026-01-14" 形式

  return {
    start: `${datePrefix}T00:00`,
    end: `${datePrefix}T23:59`,
  };
}
