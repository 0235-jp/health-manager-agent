import { getDatabase } from './index.js';

export function seedInitialData(): void {
  const db = getDatabase();

  // Insert standard data types
  // NOTE: height（身長）は設定画面のユーザープロファイルで設定するため、標準タイプから除外
  const standardDataTypes = [
    // 身体測定
    { name: 'body_weight', display_name: '体重', category: '身体', unit: 'kg' },
    { name: 'body_fat', display_name: '体脂肪率', category: '身体', unit: '%' },
    { name: 'muscle_mass', display_name: '筋肉量', category: '身体', unit: 'kg' },
    { name: 'bone_mass', display_name: '骨量', category: '身体', unit: 'kg' },
    { name: 'body_water', display_name: '体水分率', category: '身体', unit: '%' },
    { name: 'visceral_fat', display_name: '内臓脂肪レベル', category: '身体', unit: 'level' },

    // 心臓・循環器
    { name: 'heart_rate', display_name: '心拍数', category: '心臓', unit: 'bpm' },
    { name: 'resting_heart_rate', display_name: '安静時心拍数', category: '心臓', unit: 'bpm' },
    { name: 'heart_rate_variability', display_name: '心拍変動', category: '心臓', unit: 'ms' },
    { name: 'blood_pressure_systolic', display_name: '収縮期血圧', category: '心臓', unit: 'mmHg' },
    { name: 'blood_pressure_diastolic', display_name: '拡張期血圧', category: '心臓', unit: 'mmHg' },
    { name: 'spo2', display_name: '血中酸素飽和度', category: '心臓', unit: '%' },
    { name: 'cardiovascular_age', display_name: '心血管年齢', category: '心臓', unit: 'years' },
    { name: 'ecg', display_name: '心電図', category: '心臓', unit: 'waveform' },
    { name: 'ecg_afib', display_name: '心房細動検出', category: '心臓', unit: 'event' },

    // 睡眠
    { name: 'sleep_duration', display_name: '睡眠時間', category: '睡眠', unit: 'hours' },
    { name: 'deep_sleep', display_name: '深い睡眠', category: '睡眠', unit: 'hours' },
    { name: 'light_sleep', display_name: '浅い睡眠', category: '睡眠', unit: 'hours' },
    { name: 'rem_sleep', display_name: 'レム睡眠', category: '睡眠', unit: 'hours' },

    // 活動
    { name: 'steps', display_name: '歩数', category: '活動', unit: 'count' },
    { name: 'workout_duration', display_name: 'ワークアウト時間', category: '活動', unit: 'minutes' },
    { name: 'workout_calories', display_name: 'ワークアウトカロリー', category: '活動', unit: 'kcal' },
    { name: 'calories_burned', display_name: '消費カロリー', category: '活動', unit: 'kcal' },

    // 体温
    { name: 'body_temperature', display_name: '体温', category: '体温', unit: '°C' },
    { name: 'skin_temperature', display_name: '皮膚温度', category: '体温', unit: '°C' },
    { name: 'body_temperature_rest', display_name: '安静時体温', category: '体温', unit: '°C' },
    { name: 'temperature_deviation', display_name: '体温偏差', category: '体温', unit: '°C' },

    // フィットネス
    { name: 'vo2_max', display_name: 'VO2 Max', category: 'フィットネス', unit: 'ml/kg/min' },

    // 精神
    { name: 'session_duration', display_name: 'セッション時間', category: '精神', unit: 'minutes' },

    // 栄養・水分
    { name: 'water_intake', display_name: '水分摂取量', category: '栄養', unit: 'ml' },
    { name: 'calories_intake', display_name: '摂取カロリー', category: '栄養', unit: 'kcal' },
    { name: 'nutrition_protein', display_name: 'たんぱく質摂取', category: '栄養', unit: 'g' },
    { name: 'nutrition_carbs', display_name: '炭水化物摂取', category: '栄養', unit: 'g' },
    { name: 'nutrition_fat', display_name: '脂質摂取', category: '栄養', unit: 'g' },

    // 血糖・健康指標
    { name: 'blood_glucose', display_name: '血糖値', category: '健康', unit: 'mmol/L' },
    { name: 'cgm_blood_glucose', display_name: 'CGM血糖値', category: '健康', unit: 'mmol/L' },
    { name: 'uric_acid', display_name: '尿酸値', category: '健康', unit: 'umol/L' },
    { name: 'urine_bilirubin', display_name: '尿ビリルビン', category: '健康', unit: 'level' },
    { name: 'urine_glucose', display_name: '尿糖', category: '健康', unit: 'level' },

    // 女性の健康
    { name: 'menstrual_flow', display_name: '月経量', category: '女性の健康', unit: 'level' },
    { name: 'menstrual_cycle', display_name: '月経周期', category: '女性の健康', unit: 'days' },
    { name: 'ovulation_detection', display_name: '排卵検出', category: '女性の健康', unit: 'event' },
    { name: 'cervical_mucus', display_name: '頸管粘液', category: '女性の健康', unit: 'level' },
    { name: 'dysmenorrhoea', display_name: '月経痛', category: '女性の健康', unit: 'level' },
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
    { key: 'report_excluded_periods', value: JSON.stringify([]) },
    { key: 'on_fetch_report_enabled', value: JSON.stringify(true) },
  ];

  const insertSetting = db.prepare(`
    INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)
  `);

  for (const setting of defaultSettings) {
    insertSetting.run(setting.key, setting.value);
  }
}
