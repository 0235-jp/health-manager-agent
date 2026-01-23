# LINE Chat Plugin

LINE Messaging API を使用した双方向コミュニケーションプラグイン。レポートのアラート通知とユーザー返信に対応。

## セットアップ

### 1. LINE Developers コンソールでの設定

1. [LINE Developers](https://developers.line.biz/) でMessaging APIチャネルを作成
2. 「Messaging API」タブから以下を取得:
   - **Channel Access Token** (長期トークンを発行)
   - **Channel Secret**

### 2. Webhook URL の設定

LINE Developers コンソールの「Messaging API」タブで Webhook URL を設定:

```
https://<your-domain>/api/webhooks/line-chat-plugin/callback
```

- 「Webhookの利用」を**オン**にする
- 「検証」ボタンで接続確認が可能

### 3. Target User ID の取得

`targetUserId` にはLINE内部のユーザーID（`U` から始まる32桁の16進数）を設定します。LINE IDや表示名とは異なります。

**取得手順:**

1. プラグイン設定で `Channel Access Token` と `Channel Secret` のみを先に設定する（`targetUserId` は空でOK）
2. LINE でボットを友だち追加し、何かメッセージを送信する
3. サーバーログに以下のように表示される:
   ```
   [LineChatPlugin] Received message from U0b4e8...: こんにちは
   ```
4. 表示された `U...` のIDを `targetUserId` に設定する

### 4. プラグイン設定

| 設定項目 | 説明 |
|---------|------|
| Channel Access Token | LINE Messaging API のチャネルアクセストークン |
| Channel Secret | Webhook 署名検証用のチャネルシークレット |
| Target User ID | 通知送信先の LINE ユーザーID |
| リマインダー間隔（分） | 返信がない場合のリマインダー送信間隔（デフォルト: 5分） |

## 動作概要

1. 日次レポート生成時にアラートがあれば、`targetUserId` に LINE メッセージを送信
2. ユーザーが返信すると、会話として処理される
3. アクティブな会話がない状態でメッセージを送ると「現在対応中の通知はありません。」と返答される

## ビルド

```bash
cd plugins/line-chat-plugin
pnpm build
```
