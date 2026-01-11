import { getDatabase } from './index.js';

export function seedInitialData(): void {
  const db = getDatabase();

  // Insert standard data types
  const standardDataTypes = [
    // 身体
    { name: 'weight', display_name: '体重', category: '身体', unit: 'kg' },
    { name: 'height', display_name: '身長', category: '身体', unit: 'cm' },
    { name: 'body_fat', display_name: '体脂肪率', category: '身体', unit: '%' },
    // 心臓
    { name: 'heart_rate', display_name: '心拍数', category: '心臓', unit: 'bpm' },
    { name: 'heart_rate_variability', display_name: '心拍変動', category: '心臓', unit: 'ms' },
    { name: 'blood_pressure_systolic', display_name: '収縮期血圧', category: '心臓', unit: 'mmHg' },
    { name: 'blood_pressure_diastolic', display_name: '拡張期血圧', category: '心臓', unit: 'mmHg' },
    { name: 'spo2', display_name: '血中酸素飽和度', category: '心臓', unit: '%' },
    { name: 'cardiovascular_age', display_name: '心血管年齢', category: '心臓', unit: 'years' },
    // 睡眠
    { name: 'sleep_duration', display_name: '睡眠時間', category: '睡眠', unit: 'hours' },
    { name: 'deep_sleep', display_name: '深い睡眠時間', category: '睡眠', unit: 'hours' },
    { name: 'rem_sleep', display_name: 'レム睡眠時間', category: '睡眠', unit: 'hours' },
    // 活動
    { name: 'steps', display_name: '歩数', category: '活動', unit: 'count' },
    { name: 'workout_duration', display_name: 'ワークアウト時間', category: '活動', unit: 'minutes' },
    { name: 'workout_calories', display_name: 'ワークアウトカロリー', category: '活動', unit: 'kcal' },
    // 体温
    { name: 'body_temperature', display_name: '体温', category: '体温', unit: '°C' },
    { name: 'skin_temperature', display_name: '皮膚温度', category: '体温', unit: '°C' },
    { name: 'temperature_deviation', display_name: '体温偏差', category: '体温', unit: '°C' },
    // フィットネス
    { name: 'vo2_max', display_name: 'VO2 Max', category: 'フィットネス', unit: 'ml/kg/min' },
    // 精神
    { name: 'session_duration', display_name: 'セッション時間', category: '精神', unit: 'minutes' },
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
