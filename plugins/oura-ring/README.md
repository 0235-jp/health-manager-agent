# Oura Ring Data Source Plugin

Oura Ring API v2からヘルスデータを取得するデータソースプラグインです。

## 概要

- **タイプ**: Data Source
- **バージョン**: 1.2.0
- **取得戦略**: 手動 & スケジュール両対応
- **デフォルト取得間隔**: 60分

## 対応データタイプ

### 標準データタイプ（12個）

他のデバイスでも共通で使用可能な標準データタイプです。

#### 睡眠

| データタイプ | 表示名 | 単位 |
|-------------|--------|------|
| `sleep_duration` | 睡眠時間 | hours |
| `deep_sleep` | 深い睡眠 | hours |
| `rem_sleep` | レム睡眠 | hours |

#### 活動

| データタイプ | 表示名 | 単位 |
|-------------|--------|------|
| `steps` | 歩数 | count |
| `workout_duration` | ワークアウト時間 | minutes |
| `workout_calories` | ワークアウトカロリー | kcal |

#### 心臓・バイタル

| データタイプ | 表示名 | 単位 |
|-------------|--------|------|
| `heart_rate` | 心拍数 | bpm |
| `spo2` | 血中酸素 | % |
| `cardiovascular_age` | 心血管年齢 | years |

#### フィットネス

| データタイプ | 表示名 | 単位 |
|-------------|--------|------|
| `vo2_max` | VO2 Max | ml/kg/min |

#### 体温

| データタイプ | 表示名 | 単位 |
|-------------|--------|------|
| `temperature_deviation` | 体温偏差 | °C |

#### 精神

| データタイプ | 表示名 | 単位 |
|-------------|--------|------|
| `session_duration` | セッション時間 | minutes |

### Oura特有データタイプ（11個）

Oura Ring独自の算出方法やコンセプトに基づくデータタイプです。

| データタイプ | 表示名 | 単位 | 説明 |
|-------------|--------|------|------|
| `oura:sleep_score` | 睡眠スコア | score | Oura独自の睡眠スコア |
| `oura:calories_burned` | 消費カロリー | kcal | Oura算出の総消費カロリー |
| `oura:readiness_score` | レディネススコア | score | 体の準備状態スコア |
| `oura:activity_score` | 活動スコア | score | Oura独自の活動スコア |
| `oura:active_calories` | アクティブカロリー | kcal | 活動による消費カロリー |
| `oura:stress_level` | ストレスレベル | score | Oura独自のストレススコア |
| `oura:resilience` | レジリエンス | level | ストレスからの回復力（1-5） |
| `oura:workout_distance` | ワークアウト距離 | meters | ワークアウトの距離 |
| `oura:recommended_bedtime` | 推奨就寝時刻 | hour | 最適な就寝時刻（24時間形式） |
| `oura:tag` | タグ | count | ユーザー作成のタグ |
| `oura:rest_mode_duration` | 休息モード期間 | days | 休息モードの期間 |

## 設定

### プラグイン設定

| 設定項目 | 型 | 必須 | 説明 |
|----------|-----|------|------|
| `accessToken` | string | Yes | Oura CloudのPersonal Access Token |

### アクセストークンの取得方法

1. [Oura Cloud](https://cloud.ouraring.com/) にログイン
2. [Personal Access Tokens](https://cloud.ouraring.com/personal-access-tokens) にアクセス
3. 「Create New Personal Access Token」をクリック
4. トークン名を入力し、必要な権限を選択
5. 生成されたトークンをコピー

> **注意**: Personal Access Tokensは2025年末に廃止予定です。今後はOAuth2への移行が推奨されます。

## インストール

1. `plugins/oura-ring` ディレクトリに配置
2. 依存関係をインストール:
   ```bash
   cd plugins/oura-ring
   npm install
   ```
3. ビルド:
   ```bash
   npm run build
   ```
4. プラグイン管理画面からインストール
5. アクセストークンを設定

## 使用方法

1. プラグイン管理画面で「Oura Ring」をインストール
2. 設定画面でアクセストークンを入力
3. 「接続テスト」で接続を確認
4. 有効化すると、スケジューラーにより定期的にデータが取得されます

### 手動取得

プラグイン管理画面から「データ取得」ボタンをクリックすると、即座にデータを取得できます。

## API エンドポイント

このプラグインは以下のOura API v2エンドポイントを使用します：

### 睡眠関連
- `GET /v2/usercollection/daily_sleep` - 日次睡眠サマリー
- `GET /v2/usercollection/sleep` - 睡眠期間詳細
- `GET /v2/usercollection/sleep_time` - 推奨睡眠時間

### 活動関連
- `GET /v2/usercollection/daily_activity` - 日次活動サマリー
- `GET /v2/usercollection/daily_readiness` - 日次レディネス
- `GET /v2/usercollection/workout` - ワークアウト

### バイタル関連
- `GET /v2/usercollection/heartrate` - 心拍数
- `GET /v2/usercollection/daily_spo2` - 日次血中酸素
- `GET /v2/usercollection/vo2_max` - VO2 Max
- `GET /v2/usercollection/daily_cardiovascular_age` - 心血管年齢

### ストレス・メンタル関連
- `GET /v2/usercollection/daily_stress` - 日次ストレス
- `GET /v2/usercollection/daily_resilience` - 日次レジリエンス
- `GET /v2/usercollection/session` - セッション（瞑想等）

### その他
- `GET /v2/usercollection/enhanced_tag` - 強化タグ
- `GET /v2/usercollection/rest_mode_period` - 休息モード期間
- `GET /v2/usercollection/ring_configuration` - リング設定
- `GET /v2/usercollection/personal_info` - 個人情報（接続テスト用）

## データ取得の制限

- **心拍数データ**: 過去24時間分のみ取得（データ量の制限のため）
- **その他のデータ**: デフォルトで過去7日間分を取得
- **レート制限**: Oura APIのレート制限に従います

## 開発

### ビルド

```bash
npm run build
```

### Zipファイル作成

```bash
npm run build:zip
```

## 変更履歴

### v1.2.0
- データタイプの標準化
  - 標準タイプ（12個）: 他デバイスと共通で使用可能
  - Oura特有タイプ（11個）: `oura:` プレフィックス付き
- 標準化されたタイプ: `spo2`, `temperature_deviation`, `vo2_max`, `cardiovascular_age`, `workout_duration`, `workout_calories`, `session_duration`
- Oura特有に変更: `sleep_quality` → `oura:sleep_score`, `calories_burned` → `oura:calories_burned`

### v1.1.0
- 新規エンドポイント追加:
  - VO2 Max（最大酸素摂取量）
  - Daily Cardiovascular Age（心血管年齢）
  - Daily Resilience（レジリエンス）
  - Workout（ワークアウト）
  - Session（セッション）
  - Sleep Time（推奨睡眠時間）
  - Enhanced Tag（強化タグ）
  - Rest Mode Period（休息モード期間）
  - Ring Configuration（リング設定）
- 対応データタイプを12個から23個に拡張

### v1.0.0
- 初期リリース
- 基本的な睡眠、活動、心拍数、SpO2、ストレスデータに対応

## トラブルシューティング

### 接続テストに失敗する

- アクセストークンが正しいか確認してください
- トークンの権限が適切か確認してください
- Oura APIのサービス状態を確認してください

### データが取得できない

- Oura Ringが正しく同期されているか確認してください
- 対象期間にデータが存在するか確認してください
- 一部のデータ（VO2 Max、心血管年齢など）は十分なデータが蓄積されてから利用可能になります

### 特定のデータタイプが空

- VO2 Max: 定期的な運動データが必要
- 心血管年齢: 一定期間のデータ蓄積が必要
- セッション: 瞑想やリラクゼーションセッションを記録する必要があります

## ライセンス

MIT
