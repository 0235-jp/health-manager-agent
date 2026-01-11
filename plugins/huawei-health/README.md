# Huawei Health Plugin

Huawei Health Kit REST APIからヘルスデータを取得するプラグインです。

## 事前準備（必須）

このプラグインを使用するには、Huawei Developer Consoleでアプリケーションを登録し、Health Kitサービスの承認を受ける必要があります。

### 1. Huawei Developer アカウント登録

1. [Huawei Developer Console](https://developer.huawei.com/consumer/en/) にアクセス
2. 「Sign up」をクリックしてアカウントを作成
3. **本人確認（必須）**: パスポート、運転免許証、またはIDカードの写真をアップロード
4. 審査完了を待つ（通常1〜3営業日）

### 2. アプリケーション登録

1. [AppGallery Connect](https://developer.huawei.com/consumer/en/service/josp/agc/index.html) にログイン
2. 「My projects」→「Add project」でプロジェクトを作成
3. 「Add app」でアプリケーションを追加
   - Platform: Web
   - Category: 適切なカテゴリを選択
4. **OAuth 2.0 credentials** を取得
   - 「Project settings」→「OAuth 2.0 client ID」
   - Client ID と Client Secret をメモ

### 3. Health Kit サービス申請

1. AppGallery Connect で「Manage APIs」を開く
2. 「Health Kit」を検索して有効化
3. 必要なスコープを申請（下記参照）
4. 申請理由を記入して送信
5. **審査承認を待つ**（通常7営業日程度）

### 4. Redirect URI の設定

AppGallery Connectで以下のRedirect URIを登録：

```
http://localhost:3000/api/plugins/huawei-health/oauth/callback
```

（本番環境では適切なURLに変更してください）

---

## 必要なスコープ一覧

### 基本スコープ
| スコープ | 説明 |
|---------|------|
| `healthkit/step.read` | 歩数 |
| `healthkit/distance.read` | 距離 |
| `healthkit/speed.read` | 速度 |
| `healthkit/calories.read` | カロリー |
| `healthkit/activity.read` | 活動 |

### 心臓・循環器スコープ
| スコープ | 説明 |
|---------|------|
| `healthkit/heartrate.read` | 心拍数・HRV |
| `healthkit/oxygenSaturation.read` | 血中酸素(SpO2) |
| `healthkit/bloodpressure.read` | 血圧 |
| `healthkit/ecg.read` | 心電図（地域限定） |

### 身体測定スコープ
| スコープ | 説明 |
|---------|------|
| `healthkit/heightweight.read` | 身長・体重 |
| `healthkit/bodyfat.read` | 体脂肪・BMI・筋肉量など |

### 健康指標スコープ
| スコープ | 説明 |
|---------|------|
| `healthkit/sleep.read` | 睡眠 |
| `healthkit/stress.read` | ストレス |
| `healthkit/bodyTemperature.read` | 体温 |
| `healthkit/bloodglucose.read` | 血糖値 |
| `healthkit/pulmonary.read` | 肺活量/VO2Max |

### 栄養・水分スコープ
| スコープ | 説明 |
|---------|------|
| `healthkit/nutrition.read` | 栄養摂取 |
| `healthkit/hydrate.read` | 水分摂取 |

### その他スコープ
| スコープ | 説明 |
|---------|------|
| `healthkit/reproductiveHealth.read` | 女性の健康（生理周期など） |
| `healthkit/location.read` | GPS位置情報 |

### 履歴データスコープ（オプション）
| スコープ | 説明 |
|---------|------|
| `healthkit/historydata.open.week` | 過去1週間のデータ |
| `healthkit/historydata.open.month` | 過去1ヶ月のデータ |
| `healthkit/historydata.open.year` | 過去1年のデータ |

---

## プラグイン設定

### 必須設定

| 項目 | 説明 |
|------|------|
| Client ID | Huawei Developer ConsoleのClient ID |
| Client Secret | Huawei Developer ConsoleのClient Secret |

### 自動設定（OAuth認証後）

| 項目 | 説明 |
|------|------|
| Access Token | OAuth認証後に自動設定 |
| Refresh Token | トークン更新用（自動設定） |
| Token Expiry | トークン有効期限（自動設定） |

---

## 取得可能なデータタイプ（65種類）

### 活動・運動（13種類）

| データタイプ | 表示名 | 単位 | Huawei APIマッピング |
|-------------|--------|------|---------------------|
| `steps` | 歩数 | count | `com.huawei.continuous.steps.delta` |
| `huawei:distance` | 移動距離 | meters | `com.huawei.continuous.distance.delta` |
| `huawei:calories_burned` | 消費カロリー | kcal | `com.huawei.continuous.calories.burnt` |
| `huawei:active_calories` | アクティブカロリー | kcal | 活動カロリーから基礎代謝を除いた値 |
| `huawei:bmr_calories` | 基礎代謝カロリー | kcal | `com.huawei.continuous.calories.bmr` |
| `workout_duration` | ワークアウト時間 | minutes | アクティビティレコードから算出 |
| `workout_calories` | ワークアウトカロリー | kcal | アクティビティレコードのカロリー |
| `huawei:speed` | 速度 | m/s | `com.huawei.continuous.speed` |
| `huawei:pace` | ペース | min/km | 速度から算出 |
| `huawei:cycling_wheel_rotation` | ホイール回転数 | rpm | サイクリングデータ |
| `huawei:pedaling_rate` | ペダリング回転数 | rpm | `com.huawei.instantaneous.pedaling_rate` |
| `huawei:floors_climbed` | 登った階数 | count | 高度データから算出 |
| `huawei:climbing_height` | 登り高さ | meters | `com.huawei.continuous.altitude` |

### 心臓・循環器（10種類）

| データタイプ | 表示名 | 単位 | Huawei APIマッピング |
|-------------|--------|------|---------------------|
| `heart_rate` | 心拍数 | bpm | `com.huawei.instantaneous.heart_rate` |
| `resting_heart_rate` | 安静時心拍数 | bpm | `com.huawei.instantaneous.heart_rate.resting` |
| `huawei:hrv` | 心拍変動(HRV) | ms | `com.huawei.instantaneous.heart_rate_variability` (SDNN/rMSSD) |
| `spo2` | 血中酸素飽和度 | % | `com.huawei.instantaneous.spo2` |
| `blood_pressure_systolic` | 収縮期血圧 | mmHg | `com.huawei.instantaneous.blood_pressure` (systolic) |
| `blood_pressure_diastolic` | 拡張期血圧 | mmHg | `com.huawei.instantaneous.blood_pressure` (diastolic) |
| `huawei:bradycardia` | 徐脈記録 | event | `DT_HEALTH_RECORD_BRADYCARDIA` |
| `huawei:tachycardia` | 頻脈記録 | event | `DT_HEALTH_RECORD_TACHYCARDIA` |
| `ecg` | 心電図(ECG) | waveform | `com.huawei.instantaneous.ecg` (地域限定) |
| `ecg_afib` | 心房細動検出 | event | ECGデータから検出されたA-fib |

### 睡眠（8種類）

| データタイプ | 表示名 | 単位 | Huawei APIマッピング |
|-------------|--------|------|---------------------|
| `sleep_duration` | 睡眠時間 | hours | `com.huawei.continuous.sleep` の合計時間 |
| `deep_sleep` | 深い睡眠 | hours | sleep_stage=4 の合計時間 |
| `light_sleep` | 浅い睡眠 | hours | sleep_stage=2 の合計時間 |
| `rem_sleep` | レム睡眠 | hours | sleep_stage=5 の合計時間 |
| `huawei:awake_time` | 覚醒時間 | minutes | sleep_stage=1 の合計時間 |
| `huawei:sleep_score` | 睡眠スコア | score | `DT_HEALTH_RECORD_SLEEP` のスコア |
| `huawei:sleep_respiratory_rate` | 睡眠時呼吸数 | breaths/min | `DT_SLEEP_RESPIRATORY_DETAIL` |
| `huawei:sleep_respiratory_event` | 睡眠時呼吸イベント | event | 呼吸異常イベントの回数 |

### 身体測定（8種類）

| データタイプ | 表示名 | 単位 | Huawei APIマッピング |
|-------------|--------|------|---------------------|
| `body_weight` | 体重 | kg | `com.huawei.instantaneous.body.weight` |
| `huawei:body_height` | 身長 | cm | `com.huawei.instantaneous.body.height` × 100 |
| `body_fat` | 体脂肪率 | % | `com.huawei.instantaneous.body.fat.rate` |
| `huawei:bmi` | BMI | kg/m² | `com.huawei.instantaneous.body.bmi` |
| `muscle_mass` | 筋肉量 | kg | `com.huawei.instantaneous.body.muscle.mass` |
| `bone_mass` | 骨量 | kg | `com.huawei.instantaneous.body.bone.mass` |
| `body_water` | 体水分率 | % | `com.huawei.instantaneous.body.water` |
| `visceral_fat` | 内臓脂肪レベル | level | `com.huawei.instantaneous.body.visceral.fat` |

### 体温（3種類）

| データタイプ | 表示名 | 単位 | Huawei APIマッピング |
|-------------|--------|------|---------------------|
| `body_temperature` | 体温 | °C | `com.huawei.instantaneous.body_temperature` |
| `skin_temperature` | 皮膚温度 | °C | `com.huawei.instantaneous.skin_temperature` |
| `body_temperature_rest` | 安静時体温 | °C | `com.huawei.instantaneous.body_temperature_rest` |

### 位置情報（3種類）

| データタイプ | 表示名 | 単位 | Huawei APIマッピング |
|-------------|--------|------|---------------------|
| `huawei:gps_latitude` | 緯度 | degrees | `com.huawei.continuous.location` (latitude) |
| `huawei:gps_longitude` | 経度 | degrees | `com.huawei.continuous.location` (longitude) |
| `huawei:altitude` | 高度 | meters | `com.huawei.continuous.altitude` |

### 栄養・水分（5種類）

| データタイプ | 表示名 | 単位 | Huawei APIマッピング |
|-------------|--------|------|---------------------|
| `water_intake` | 水分摂取量 | ml | `com.huawei.continuous.hydrate` × 1000 |
| `calories_intake` | 摂取カロリー | kcal | `com.huawei.continuous.nutrition` (calories) |
| `nutrition_protein` | たんぱく質摂取 | g | `com.huawei.continuous.nutrition` (protein) |
| `nutrition_carbs` | 炭水化物摂取 | g | `com.huawei.continuous.nutrition` (carbs) |
| `nutrition_fat` | 脂質摂取 | g | `com.huawei.continuous.nutrition` (fat) |

### 血糖・尿検査（5種類）

| データタイプ | 表示名 | 単位 | Huawei APIマッピング |
|-------------|--------|------|---------------------|
| `blood_glucose` | 血糖値 | mmol/L | `com.huawei.instantaneous.blood_glucose` |
| `cgm_blood_glucose` | CGM血糖値 | mmol/L | `com.huawei.cgm.blood_glucose` (持続モニタリング) |
| `uric_acid` | 尿酸値 | μmol/L | `com.huawei.instantaneous.uric_acid` |
| `urine_bilirubin` | 尿ビリルビン | level | `DT_INSTANTANEOUS_URINE_ROUTINE_BILIRUBIN` |
| `urine_glucose` | 尿糖 | level | `DT_INSTANTANEOUS_URINE_ROUTINE_GLUCOSE` |

### 呼吸器（2種類）

| データタイプ | 表示名 | 単位 | Huawei APIマッピング |
|-------------|--------|------|---------------------|
| `huawei:breathing_rate` | 呼吸数 | breaths/min | 呼吸データから算出 |
| `huawei:ventilator` | 人工呼吸器データ | event | `DT_HEALTH_RECORD_VENTILATOR` |

### 精神・ストレス（1種類）

| データタイプ | 表示名 | 単位 | Huawei APIマッピング |
|-------------|--------|------|---------------------|
| `huawei:stress_level` | ストレスレベル | score | `com.huawei.instantaneous.stress` |

### フィットネス（1種類）

| データタイプ | 表示名 | 単位 | Huawei APIマッピング |
|-------------|--------|------|---------------------|
| `vo2_max` | VO2 Max | ml/kg/min | 肺活量データから算出 |

### 女性の健康（5種類）

| データタイプ | 表示名 | 単位 | Huawei APIマッピング |
|-------------|--------|------|---------------------|
| `menstrual_flow` | 月経量 | level | `DT_CONTINUOUS_MENSTRUAL_FLOW` |
| `menstrual_cycle` | 月経周期 | days | `DT_HEALTH_RECORD_MENSTRUAL_CYCLE` |
| `ovulation_detection` | 排卵検出 | event | `DT_INSTANTANEOUS_OVULATION_DETECTION` |
| `cervical_mucus` | 頸管粘液 | level | `DT_INSTANTANEOUS_CERVICAL_MUCUS` |
| `dysmenorrhoea` | 月経痛 | level | 月経記録のdysmenorrheaフィールド |

---

## データ変換ロジック

### 時間の変換
- 睡眠時間: 分 → 時間 (`minutes / 60`)
- ワークアウト時間: ミリ秒 → 分 (`ms / 60000`)

### 単位の変換
- 身長: メートル → センチメートル (`m × 100`)
- 水分摂取: リットル → ミリリットル (`L × 1000`)

### 日次集計
- 心拍数: 1日の全測定値の平均を計算
- 歩数/カロリー/距離: 1日の合計値を計算
- 睡眠: 睡眠ステージごとに時間を集計

### 睡眠ステージのマッピング
| Huawei sleep_stage | 意味 |
|-------------------|------|
| 1 | 覚醒 (Awake) |
| 2 | 浅い睡眠 (Light Sleep) |
| 4 | 深い睡眠 (Deep Sleep) |
| 5 | レム睡眠 (REM Sleep) |

---

## 使用方法

1. プラグイン設定画面で Client ID と Client Secret を入力
2. 「認証」ボタンをクリックしてHuawei IDでログイン
3. アプリへのアクセスを許可
4. データ取得が可能になります

---

## 注意事項

1. **審査が必要**: Health Kit APIを使用するには、Huaweiの審査承認が必要です（約7営業日）
2. **本人確認必須**: 開発者アカウント登録には身分証明書の提出が必要です
3. **トークン有効期限**: アクセストークンは約1時間で期限切れになりますが、自動的にリフレッシュされます
4. **履歴データ**: 認証前のデータを取得するには履歴データスコープの申請が必要です
5. **レート制限**: APIには呼び出し制限があります。頻繁なリクエストは避けてください
6. **地域制限**: ECGなど一部の機能は特定の地域でのみ利用可能です
7. **デバイス依存**: 一部のデータ（気圧計による階数計測など）は対応デバイスが必要です

---

## トラブルシューティング

### エラー: 403 Forbidden
- スコープが不足しています
- AppGallery Connectで必要なスコープが有効になっているか確認してください

### エラー: 401 Unauthorized
- トークンが無効または期限切れです
- 再認証を試してください

### エラー: Rate limit exceeded
- API呼び出し制限に達しました
- しばらく待ってから再試行してください

### データが取得できない
- デバイスがデータタイプをサポートしているか確認
- Huawei Healthアプリでデータが記録されているか確認
- 必要なスコープが承認されているか確認

---

## 参考リンク

- [Huawei Developer Console](https://developer.huawei.com/consumer/en/)
- [Health Kit Documentation](https://developer.huawei.com/consumer/en/hms/huaweihealth/)
- [REST API Reference](https://developer.huawei.com/consumer/en/doc/HMSCore-References/rest-overview-0000001254420693)
- [Health Kit申請ガイド](https://developer.huawei.com/consumer/en/doc/development/HMSCore-Guides/apply-kitservice-0000001050071707)
- [データタイプ一覧](https://developer.huawei.com/consumer/en/doc/development/HMSCore-References/data-model-0000001054556973)
