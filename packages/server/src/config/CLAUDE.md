# 設定管理

## 概要

環境変数と定数の管理。

## 主要ファイル

```
config/
└── index.ts   # 設定エクスポート
```

## 設定項目

```typescript
export const config = {
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  serverBaseUrl: process.env.SERVER_BASE_URL || 'http://localhost:3001',
  bearerToken: process.env.HEALTH_MANAGER_BEARER_TOKEN || '',
  cfAccessClientId: process.env.CF_ACCESS_CLIENT_ID || '',
  cfAccessClientSecret: process.env.CF_ACCESS_CLIENT_SECRET || '',
};
```

## 環境変数

| 変数 | デフォルト | 説明 |
|------|-----------|------|
| `PORT` | 3001 | サーバーポート |
| `NODE_ENV` | development | 実行環境 |
| `CORS_ORIGIN` | http://localhost:5173 | CORS 許可オリジン |
| `SERVER_BASE_URL` | http://localhost:3001 | サーバーのベースURL |
| `HEALTH_MANAGER_BEARER_TOKEN` | (未設定) | Bearer トークン認証用。設定すると `/mcp` と `/api` に認証が必要になる |
| `CF_ACCESS_CLIENT_ID` | (未設定) | Cloudflare Access Service Token の Client ID |
| `CF_ACCESS_CLIENT_SECRET` | (未設定) | Cloudflare Access Service Token の Client Secret |

### 認証の動作

- `HEALTH_MANAGER_BEARER_TOKEN` と `CF_ACCESS_CLIENT_ID` のどちらも未設定 → 認証なし（ローカル開発モード）
- いずれかが設定済み → `/mcp` と `/api` へのリクエストに認証が必要（`/health` は常にアクセス可能）
- Bearer 認証: `Authorization: Bearer <token>` ヘッダーで認証
- Cloudflare 認証: `CF-Access-Client-Id` / `CF-Access-Client-Secret` ヘッダーで認証

## 使用方法

```typescript
import { config } from './config';

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});
```

## 動的設定

ユーザーが変更可能な設定は `settings` テーブルに保存:

- 収集間隔
- タイムゾーン
- データソース優先度
- レポート除外時間帯
- ユーザープロファイル
