import { getDatabase } from './index.js';

export function seedInitialData(): void {
  const db = getDatabase();

  // Insert standard data types
  const standardDataTypes = [
    { name: 'weight', display_name: '体重', category: '身体', unit: 'kg' },
    { name: 'height', display_name: '身長', category: '身体', unit: 'cm' },
    { name: 'body_fat', display_name: '体脂肪率', category: '身体', unit: '%' },
    { name: 'heart_rate', display_name: '心拍数', category: '心臓', unit: 'bpm' },
    { name: 'heart_rate_variability', display_name: '心拍変動', category: '心臓', unit: 'ms' },
    { name: 'blood_pressure_systolic', display_name: '収縮期血圧', category: '心臓', unit: 'mmHg' },
    { name: 'blood_pressure_diastolic', display_name: '拡張期血圧', category: '心臓', unit: 'mmHg' },
    { name: 'sleep_duration', display_name: '睡眠時間', category: '睡眠', unit: 'hours' },
    { name: 'sleep_quality', display_name: '睡眠品質スコア', category: '睡眠', unit: 'score' },
    { name: 'deep_sleep', display_name: '深い睡眠時間', category: '睡眠', unit: 'hours' },
    { name: 'rem_sleep', display_name: 'レム睡眠時間', category: '睡眠', unit: 'hours' },
    { name: 'steps', display_name: '歩数', category: '活動', unit: 'count' },
    { name: 'calories_burned', display_name: '消費カロリー', category: '活動', unit: 'kcal' },
    { name: 'active_minutes', display_name: 'アクティブ時間', category: '活動', unit: 'minutes' },
    { name: 'body_temperature', display_name: '体温', category: '体温', unit: '°C' },
    { name: 'skin_temperature', display_name: '皮膚温度', category: '体温', unit: '°C' },
    { name: 'stress_level', display_name: 'ストレスレベル', category: '精神', unit: 'score' },
    { name: 'mood', display_name: '気分', category: '精神', unit: 'score' },
  ];

  const insertDataType = db.prepare(`
    INSERT OR IGNORE INTO data_types (name, display_name, category, unit, is_standard)
    VALUES (?, ?, ?, ?, 1)
  `);

  for (const dt of standardDataTypes) {
    insertDataType.run(dt.name, dt.display_name, dt.category, dt.unit);
  }

  // Insert default settings
  const defaultSettings = [
    { key: 'collection_interval', value: JSON.stringify(3600) },
    { key: 'active_plugins', value: JSON.stringify([]) },
    { key: 'data_source_priority', value: JSON.stringify({}) },
    { key: 'webhook_url', value: JSON.stringify('') },
  ];

  const insertSetting = db.prepare(`
    INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)
  `);

  for (const setting of defaultSettings) {
    insertSetting.run(setting.key, setting.value);
  }
}
