# Health Manager Agent

ヘルスデータを収集・管理し、AIエージェントによる分析とレポート生成を行うアプリケーション。

## 概要

Health Manager Agent は、様々なヘルスデバイス（Oura Ring、Huawei Health など）からデータを収集し、AI を活用してヘルスデータの分析・レポート生成を行うモノレポプロジェクトです。

### 主な機能

- 複数のヘルスデータソースからのデータ収集（プラグイン方式）
- AI エージェントによるヘルスデータ分析
- 日次レポート・取得時レポートの自動生成
- リアルタイムチャットによる健康相談
- Webhook 通知によるレポート配信

## 技術スタック

| 層 | 技術 |
|---|---|
| **フロントエンド** | React 18, Vite, TailwindCSS, React Query |
| **バックエンド** | Express, TypeScript, SQLite (better-sqlite3) |
| **AI統合** | Claude Agent SDK, OpenAI互換API |
| **スケジューリング** | node-cron |

## セットアップ

### 必要条件

- Node.js 20+
- pnpm

### インストール

```bash
# 依存関係のインストール
pnpm install

# 全パッケージのビルド
pnpm build
```

### 環境変数

プラグインごとに必要な環境変数が異なります。各プラグインの設定画面から API キーなどを設定してください。

### 起動

```bash
# 開発サーバー起動（フロントエンド + バックエンド）
pnpm dev

# バックグラウンドで起動
pnpm dev:bg

# バックグラウンドプロセス停止
pnpm dev:stop

# ログ確認
pnpm dev:logs
```

## スクリプト一覧

### 開発

| コマンド | 説明 |
|---------|------|
| `pnpm dev` | 開発サーバー起動（サーバー:3001, フロント:5173） |
| `pnpm dev:bg` | バックグラウンドで起動 |
| `pnpm dev:stop` | バックグラウンドプロセス停止 |
| `pnpm dev:logs` | ログをtailで表示 |

### プロダクション

| コマンド | 説明 |
|---------|------|
| `pnpm prod` | プロダクションサーバー起動（サーバー:3001, フロント:4173） |
| `pnpm prod:server` | サーバーのみ起動 |
| `pnpm prod:frontend` | フロントエンドのみ起動 |

### ビルド

| コマンド | 説明 |
|---------|------|
| `pnpm build` | 全パッケージをビルド |
| `pnpm plugins:install` | 全プラグインの依存関係をインストール |
| `pnpm plugins:build` | 全プラグインをビルド |
| `pnpm plugins:build:zip` | 全プラグインをzipでビルド |
| `pnpm lint` | 全パッケージをリント |
| `pnpm test` | 全パッケージのテスト実行 |

## ディレクトリ構造

```
health-manager-agent/
├── packages/
│   ├── frontend/          # React フロントエンド
│   └── server/            # Express バックエンド
├── plugins/                       # プラグイン（別途インストール可能）
│   ├── claude-agent-sdk-plugin/   # Claude Agent SDK プラグイン
│   ├── openai-chat-plugin/        # OpenAI互換 プラグイン
│   ├── huawei-health-plugin/      # Huawei Health プラグイン
│   ├── oura-ring-plugin/          # Oura Ring プラグイン
│   └── webhook-notification-plugin/ # Webhook通知プラグイン
├── docs/                  # 設計ドキュメント
├── data/                  # データファイル（SQLite DB等）
└── logs/                  # ログファイル
```

## プラグイン

公式プラグインは [GitHub Releases](https://github.com/KoheiYamashita/health-manager-agent/releases) からダウンロードできます。

| プラグイン | 説明 |
|-----------|------|
| claude-agent-sdk-plugin | Claude Agent SDK を使用した AI 分析 |
| openai-chat-plugin | OpenAI 互換 API を使用した AI 分析 |
| huawei-health-plugin | Huawei Health からデータ取得 |
| oura-ring-plugin | Oura Ring からデータ取得 |
| webhook-notification-plugin | Webhook 通知 |

ダウンロードした ZIP ファイルは管理画面からアップロードするか、`plugins/` ディレクトリに展開してください。

## ドキュメント

- [概要設計書](docs/概要設計書.md)
- [詳細設計書](docs/詳細設計書.md)
