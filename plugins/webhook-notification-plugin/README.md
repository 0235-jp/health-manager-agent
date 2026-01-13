# webhook-notification-plugin

Webhookを使用してレポートやアラートを外部サービスに通知するプラグインです。

## 概要

- **タイプ**: Notification
- **バージョン**: 1.0.0
- **配信方式**: Push

## 対応イベント

| イベントタイプ | 説明 |
|---------------|------|
| `report:generated` | レポートが生成された時 |
| `report:daily` | 日次レポートが生成された時 |
| `health:alert` | ヘルスアラートが発生した時 |
| `data:fetched` | データが取得された時 |

## 設定

### プラグイン設定

| 設定項目 | 型 | 必須 | デフォルト | 説明 |
|----------|-----|------|----------|------|
| `webhookUrl` | string | Yes | - | 通知を送信するWebhook URL |
| `enabledEvents` | string | No | `report:daily,health:alert` | 通知するイベント（カンマ区切り） |
| `includeFullReport` | boolean | No | `true` | レポート全文を通知に含める |

## インストール

1. `plugins/webhook-notification` ディレクトリに配置
2. 依存関係をインストール:
   ```bash
   cd plugins/webhook-notification
   npm install
   ```
3. ビルド:
   ```bash
   npm run build
   ```
4. プラグイン管理画面からインストール
5. Webhook URLを設定

## 使用方法

1. プラグイン管理画面で「Webhook通知」をインストール
2. 設定画面でWebhook URLを入力
3. 通知したいイベントを選択
4. 「テスト通知」で接続を確認
5. 有効化すると、選択したイベント発生時に通知が送信されます

## Webhookペイロード

### リクエスト形式

```http
POST <webhook_url>
Content-Type: application/json
```

### ペイロード構造

```json
{
  "event": "report:daily",
  "timestamp": "2024-01-15T09:00:00.000Z",
  "message": "📊 日次レポートが生成されました\n\n...",
  "payload": {
    // イベント固有のデータ（includeFullReport: true の場合）
  }
}
```

### イベント別ペイロード

#### report:daily / report:generated

```json
{
  "reportId": 123,
  "reportType": "daily",
  "content": {
    "summary": "全体サマリー",
    "metrics": { ... },
    "risks": [ ... ],
    "recommendations": [ ... ]
  },
  "periodStart": "2024-01-14T00:00:00.000Z",
  "periodEnd": "2024-01-15T00:00:00.000Z"
}
```

#### health:alert

```json
{
  "alertType": "high_heart_rate",
  "severity": "warning",
  "message": "心拍数が通常より高い状態が続いています",
  "relatedData": { ... }
}
```

#### data:fetched

```json
{
  "sourceName": "oura-ring",
  "recordCount": 42,
  "dataTypes": ["sleep_duration", "steps", "heart_rate"]
}
```

## 連携サービス例

### Slack

1. Slack Appを作成し、Incoming Webhookを有効化
2. Webhook URLをプラグイン設定に入力

### Discord

1. サーバー設定 > 連携サービス > ウェブフック
2. 新しいウェブフックを作成
3. Webhook URLをプラグイン設定に入力

### IFTTT

1. Webhooksサービスを使用したAppletを作成
2. 生成されたWebhook URLをプラグイン設定に入力

### n8n / Make (Integromat)

1. Webhookトリガーノードを作成
2. 生成されたWebhook URLをプラグイン設定に入力

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

### 通知が送信されない

- Webhook URLが正しく設定されているか確認
- 対象イベントが `enabledEvents` に含まれているか確認
- プラグインが有効化されているか確認

### テスト通知に失敗する

- Webhook URLにアクセスできるか確認
- ファイアウォールやネットワーク設定を確認
- 連携サービス側のWebhook設定を確認

### ペイロードが届かない

- `includeFullReport` が `true` になっているか確認
- 連携サービス側のペイロードサイズ制限を確認

## ライセンス

MIT
