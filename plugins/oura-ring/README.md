# Oura Ring Data Source Plugin

Oura Ring API v2からヘルスデータを取得するデータソースプラグインです。

## 概要

- **タイプ**: Data Source
- **バージョン**: 1.0.0
- **取得戦略**: 手動 & スケジュール両対応
- **デフォルト取得間隔**: 60分

## 対応データタイプ

### 睡眠

| データタイプ | 表示名 | 単位 |
|-------------|--------|------|
| `sleep_duration` | 睡眠時間 | hours |
| `deep_sleep` | 深い睡眠 | hours |
| `rem_sleep` | レム睡眠 | hours |
| `sleep_quality` | 睡眠スコア | score |

### 活動

| データタイプ | 表示名 | 単位 |
|-------------|--------|------|
| `steps` | 歩数 | count |
| `calories_burned` | 消費カロリー | kcal |
| `oura:activity_score` | 活動スコア | score |
| `oura:readiness_score` | レディネススコア | score |

### 心臓・バイタル

| データタイプ | 表示名 | 単位 |
|-------------|--------|------|
| `heart_rate` | 心拍数 | bpm |
| `oura:spo2` | 血中酸素 | % |

### その他

| データタイプ | 表示名 | 単位 |
|-------------|--------|------|
| `oura:stress_level` | ストレスレベル | score |
| `oura:temperature_deviation` | 体温偏差 | °C |

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

- `GET /v2/usercollection/daily_sleep` - 日次睡眠サマリー
- `GET /v2/usercollection/sleep` - 睡眠期間詳細
- `GET /v2/usercollection/daily_activity` - 日次活動サマリー
- `GET /v2/usercollection/daily_readiness` - 日次レディネス
- `GET /v2/usercollection/heartrate` - 心拍数
- `GET /v2/usercollection/daily_spo2` - 日次血中酸素
- `GET /v2/usercollection/daily_stress` - 日次ストレス

## データ取得の制限

- **心拍数データ**: 過去24時間分のみ取得（データ量の制限のため）
- **その他のデータ**: デフォルトで過去7日間分を取得
- **レート制限**: Oura APIのレート制限に従います

## 開発

### ビルド

```bash
npm run build
```

### 型チェック

```bash
npm run typecheck
```

## トラブルシューティング

### 接続テストに失敗する

- アクセストークンが正しいか確認してください
- トークンの権限が適切か確認してください
- Oura APIのサービス状態を確認してください

### データが取得できない

- Oura Ringが正しく同期されているか確認してください
- 対象期間にデータが存在するか確認してください

## ライセンス

MIT
