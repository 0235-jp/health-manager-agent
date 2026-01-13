# Health Manager Agent - 開発ガイドライン

## プロジェクト概要

ヘルスデータ管理・AI分析アプリケーション。モノレポ構成（npm workspaces）。

## 構成

```
packages/
├── frontend/    # React + Vite + TailwindCSS
└── server/      # Express + SQLite + プラグインシステム
plugins/         # データソース/エージェント/通知プラグイン
```

## 開発環境

### 起動コマンド

```bash
pnpm dev          # 開発サーバー起動（サーバー:3001, フロント:5173）
pnpm dev:bg       # バックグラウンド起動
pnpm dev:stop     # 停止
pnpm dev:logs     # ログ確認
```

### ビルド・テスト

```bash
pnpm build        # 全パッケージビルド
pnpm lint         # リント
pnpm test         # テスト
```

## アーキテクチャ

### データフロー

1. **データ収集**: DataSourcePlugin がヘルスデータを取得
2. **データ保存**: SQLite に正規化して保存
3. **分析・レポート**: AgentPlugin が AI でデータを分析
4. **通知**: NotificationPlugin がレポートを配信

### プラグインタイプ

| タイプ | 役割 |
|-------|------|
| `data-source` | 外部 API からヘルスデータ取得 |
| `agent` | AI によるデータ分析・レポート生成 |
| `notification` | レポート・イベントの通知 |

## コーディング規約

### TypeScript

- 厳格な型定義を使用
- `any` 型の使用を避ける
- インターフェースを積極的に活用

### 命名規則

- ファイル名: kebab-case (`health-data.ts`)
- クラス/インターフェース: PascalCase (`HealthDataRepository`)
- 関数/変数: camelCase (`fetchHealthData`)
- 定数: UPPER_SNAKE_CASE (`DEFAULT_LIMIT`)

### エラーハンドリング

- API エンドポイントは `asyncHandler` でラップ
- カスタムエラークラスを使用
- エラーログは適切なレベルで出力

## 関連ドキュメント

- [フロントエンド開発ガイド](packages/frontend/CLAUDE.md)
- [サーバー開発ガイド](packages/server/CLAUDE.md)
- [プラグイン開発ガイド](plugins/CLAUDE.md)
