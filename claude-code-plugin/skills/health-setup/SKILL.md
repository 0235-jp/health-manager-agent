---
name: health-setup
description: Health Manager MCP サーバーへの接続セットアップとヘルスチェック
user_invocable: true
---

# Health Manager セットアップ

Health Manager MCP サーバーへの接続を確認し、未設定の場合はセットアップをガイドします。

## 手順

### 1. 環境変数の確認

Bash で `echo $HEALTH_MANAGER_URL` を実行し、現在の設定値を確認してください。
未設定の場合、デフォルトの `http://localhost:3001` が使用されます。

### 2. ヘルスチェック

接続先 URL（`$HEALTH_MANAGER_URL` またはデフォルト `http://localhost:3001`）に対して、Bash で以下を実行してください:

```
curl -s \
  ${CF_ACCESS_CLIENT_ID:+-H "CF-Access-Client-Id: $CF_ACCESS_CLIENT_ID"} \
  ${CF_ACCESS_CLIENT_SECRET:+-H "CF-Access-Client-Secret: $CF_ACCESS_CLIENT_SECRET"} \
  "${HEALTH_MANAGER_URL:-http://localhost:3001}/health"
```

### 3. 結果に応じた対応

#### 接続成功の場合（`{"status":"ok",...}` が返る）

MCP サーバーは正常に動作しています。次のステップとしてユーザーに案内してください:

- MCP ツール（10 個）とリソース（3 個）が利用可能
- `/health-query` スキルで健康データへの問い合わせができる
- 例: `/health-query 今週の歩数は？`

#### 接続失敗の場合

ユーザーに以下をガイドしてください:

1. **Health Manager サーバーが起動しているか確認**
   - このリポジトリで `pnpm dev` を実行するとサーバーが `http://localhost:3001` で起動する

2. **リモートサーバーの場合は URL を設定**
   - ユーザーに接続先 URL を聞く
   - シェル設定ファイルへの追記を案内:
     ```
     echo 'export HEALTH_MANAGER_URL=https://your-server-url' >> ~/.bashrc
     ```
   - zsh ユーザーの場合は `~/.zshrc` に追記

3. **Claude Code の再起動を案内**
   - 環境変数の変更を MCP 設定に反映するため、Claude Code を再起動する必要がある

## 認証設定

リモートサーバーに接続する場合、認証の設定が必要です。

### Bearer トークン認証

サーバー側で `HEALTH_MANAGER_BEARER_TOKEN` を設定している場合、クライアント側にも同じトークンを設定してください:

```
export HEALTH_MANAGER_BEARER_TOKEN=your-token-here
```

プラグインが自動的に `Authorization: Bearer <token>` ヘッダーを付与します。

認証付きでの接続確認:

```
curl -s \
  -H "Authorization: Bearer $HEALTH_MANAGER_BEARER_TOKEN" \
  ${CF_ACCESS_CLIENT_ID:+-H "CF-Access-Client-Id: $CF_ACCESS_CLIENT_ID"} \
  ${CF_ACCESS_CLIENT_SECRET:+-H "CF-Access-Client-Secret: $CF_ACCESS_CLIENT_SECRET"} \
  "${HEALTH_MANAGER_URL:-http://localhost:3001}/api/health-data/types"
```

### Cloudflare Access 認証

Cloudflare Access で保護されたサーバーに接続する場合、Service Token を設定してください:

```
export CF_ACCESS_CLIENT_ID=your-client-id
export CF_ACCESS_CLIENT_SECRET=your-client-secret
```

これにより、MCP プラグインと curl コマンドが自動的に `CF-Access-Client-Id` / `CF-Access-Client-Secret` ヘッダーを付与し、Cloudflare Access のエッジ認証を通過します。
