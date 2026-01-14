/**
 * 単位表示のための日本語変換ユーティリティ
 */

// 基本の単位変換マップ
const UNIT_DISPLAY_MAP: Record<string, string> = {
  hours: '時間',
  minutes: '分',
  days: '日',
  years: '歳',
  bpm: '拍/分',
  meters: 'm',
  event: '回',
  waveform: '波形',
  level: 'レベル',
  score: '点',
  hour: '時',
  'breaths/min': '回/分',
  degrees: '°',
  degC: '°C',
  rpm: '回転/分',
  'm/s': 'm/秒',
  'min/km': '分/km',
};

// count の文脈依存変換（データタイプごとに異なる単位を使用）
const COUNT_UNIT_MAP: Record<string, string> = {
  steps: '歩',
  'huawei:floors_climbed': '階',
  'oura:tag': '件',
};

/**
 * 単位を日本語表示用にフォーマットする
 * @param unit 元の単位
 * @param dataType データタイプ名（countの場合に文脈判断に使用）
 * @returns フォーマットされた単位
 */
export function formatUnit(unit: string | null | undefined, dataType?: string): string {
  if (!unit) return '';

  // count は文脈依存
  if (unit === 'count' && dataType) {
    return COUNT_UNIT_MAP[dataType] || '回';
  }

  return UNIT_DISPLAY_MAP[unit] || unit;
}
