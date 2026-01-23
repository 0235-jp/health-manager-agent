# Fitbit Health Plugin

Fitbit Web API からヘルスデータを取得するデータソースプラグイン。OAuth 2.0 + PKCE による認証に対応。

## セットアップ

### 1. Fitbit Developer Console でアプリ登録

1. [Fitbit Developer Console](https://dev.fitbit.com/apps) にアクセス
2. 「Register a New App」からアプリを作成
3. 以下を設定:
   - **OAuth 2.0 Application Type**: Personal
   - **Redirect URL**: `http://localhost:3001/api/plugins/fitbit-health-plugin/oauth/callback`
   - **Default Access Type**: Read Only（または Read & Write）

> **注意**: Redirect URL はサーバーの `SERVER_BASE_URL` 環境変数に依存します。デフォルトは `http://localhost:3001` です。

### 2. プラグイン設定

管理画面のプラグイン設定ダイアログで以下を入力:

| 項目 | 説明 |
|------|------|
| Client ID | Fitbit Developer Console の Client ID |
| Client Secret | Fitbit Developer Console の Client Secret |

### 3. OAuth 認証

1. プラグイン設定ダイアログの「Fitbit 認証」ボタンをクリック
2. Fitbit の認証ページにリダイレクトされる
3. アクセスを許可すると、トークンが自動的に保存される
4. 管理画面に戻り「認証成功」の通知が表示される

## OAuth コールバック

### エンドポイント

```
GET /api/plugins/fitbit-health-plugin/oauth/callback
```

- Fitbit 認証後にリダイレクトされるコールバック URL
- 認証コードをアクセストークンに交換し、プラグイン設定に自動保存
- 処理完了後、フロントエンド (`/plugins?oauth=success`) にリダイレクト

### トークン管理

- **Access Token**: 自動取得・自動保存（有効期限: 約8時間）
- **Refresh Token**: トークン期限切れ時に自動更新
- **Code Verifier**: PKCE 認証フロー中のみ一時保存、トークン取得後に削除

トークンの更新は `saveConfig` コールバックを通じて DB に永続化されるため、サーバー再起動後も認証状態が維持されます。

## 取得可能なデータ

### 活動

| データタイプ | 説明 | 単位 |
|-------------|------|------|
| `steps` | 歩数 | count |
| `calories_burned` | 消費カロリー | kcal |
| `fitbit:active_calories` | アクティブカロリー | kcal |
| `fitbit:distance` | 移動距離 | km |
| `fitbit:floors` | 登った階数 | count |
| `fitbit:very_active_minutes` | 非常にアクティブな時間 | minutes |
| `fitbit:fairly_active_minutes` | 適度にアクティブな時間 | minutes |
| `fitbit:lightly_active_minutes` | 軽くアクティブな時間 | minutes |
| `fitbit:sedentary_minutes` | 座っている時間 | minutes |

### 心臓

| データタイプ | 説明 | 単位 |
|-------------|------|------|
| `resting_heart_rate` | 安静時心拍数 | bpm |
| `heart_rate_timeseries` | 心拍数時系列（1分間隔） | bpm |
| `hrv` | 心拍変動（RMSSD） | ms |
| `fitbit:deep_hrv` | 深い睡眠時 HRV | ms |
| `spo2` | 血中酸素飽和度 | % |

### 睡眠

| データタイプ | 説明 | 単位 |
|-------------|------|------|
| `sleep_duration` | 睡眠時間 | hours |
| `deep_sleep` | 深い睡眠 | hours |
| `light_sleep` | 浅い睡眠 | hours |
| `rem_sleep` | レム睡眠 | hours |
| `fitbit:awake_time` | 覚醒時間 | minutes |
| `fitbit:sleep_latency` | 入眠潜時 | minutes |
| `fitbit:sleep_phase` | 睡眠フェーズ時系列（30秒間隔） | phase |

### 身体

| データタイプ | 説明 | 単位 |
|-------------|------|------|
| `body_weight` | 体重 | kg |
| `body_fat` | 体脂肪率 | % |
| `fitbit:bmi` | BMI | kg/m2 |
| `vo2_max` | VO2 Max | ml/kg/min |

### その他

| データタイプ | 説明 | 単位 |
|-------------|------|------|
| `respiratory_rate` | 呼吸レート | breaths/min |
| `skin_temperature` | 皮膚温度（ベースライン差） | degC |
| `water_intake` | 水分摂取量 | ml |
| `calories_intake` | 摂取カロリー | kcal |
| `nutrition_protein` | たんぱく質 | g |
| `nutrition_carbs` | 炭水化物 | g |
| `nutrition_fat` | 脂質 | g |

## 環境変数

| 変数 | デフォルト | 説明 |
|------|-----------|------|
| `SERVER_BASE_URL` | `http://localhost:3001` | OAuth Redirect URL のベース |

## データ取得間隔

デフォルトは 60 分間隔でスケジュール取得。手動取得も可能。

## レート制限

Fitbit API は 1 ユーザーあたり 150 リクエスト/時 の制限があります。データ取得はレート制限を考慮して順次実行されます。
