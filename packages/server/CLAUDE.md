# サーバー開発ガイド

## 技術スタック

| 技術 | 用途 |
|------|------|
| Express 4 | HTTP サーバー / REST API |
| TypeScript 5 | 型安全な開発 |
| SQLite (better-sqlite3) | ローカルデータベース |
| Zod | リクエストバリデーション |
| node-cron | スケジュール実行 |
| Claude Agent SDK | AI 統合 |

## ディレクトリ構造

```
src/
├── agent/          # エージェント統合層
├── api/            # REST API
│   ├── routes/     # エンドポイント
│   ├── middlewares/# ミドルウェア
│   └── validators/ # Zod スキーマ
├── db/             # データベース層
│   └── repositories/ # リポジトリ
├── plugins/        # プラグインシステム
│   ├── interfaces/ # プラグインインターフェース
│   └── tools/      # 組み込みツール
├── scheduler/      # 定期実行
├── config/         # 設定
├── utils/          # ユーティリティ関数
├── webhook/        # Webhook 処理
├── app.ts          # Express アプリ
└── index.ts        # エントリーポイント
```

## 開発コマンド

```bash
pnpm dev        # 開発サーバー起動（:3001）
pnpm build      # TypeScript コンパイル
pnpm start      # プロダクション起動
pnpm test       # テスト実行
```

## アーキテクチャパターン

### Repository パターン

データアクセスは `db/repositories/` に集約:

```typescript
import { healthDataRepository } from '../db/repositories/health-data';

const data = healthDataRepository.findAll({ dataType: 'steps' });
```

### Singleton パターン

- `PluginManager`: プラグイン管理
- `Scheduler`: 定期実行管理
- `AgentService`: エージェント統合

### Event-Driven

`EventBus` による Pub/Sub:

```typescript
eventBus.emit('report:generated', { report, type: 'daily' });
eventBus.on('report:generated', (payload) => { /* 通知処理 */ });
```

## データベース

8 テーブル: health_data, data_types, reports, settings, plugins, custom_data_types, custom_instructions, plugin_collection_state

詳細は [db/CLAUDE.md](src/db/CLAUDE.md) 参照。

## プラグインシステム

3 タイプ: DataSource, Agent, Notification

詳細は [plugins/CLAUDE.md](src/plugins/CLAUDE.md) 参照。
