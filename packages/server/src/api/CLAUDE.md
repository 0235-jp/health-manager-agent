# REST API 設計

## ディレクトリ構造

```
api/
├── routes/              # エンドポイント実装
│   ├── index.ts         # ルーター集約
│   ├── chat.ts          # /api/chat/*
│   ├── health-data.ts   # /api/health-data/*
│   ├── reports.ts       # /api/reports/*
│   ├── plugins.ts       # /api/plugins/*
│   ├── scheduler.ts     # /api/scheduler/*
│   ├── settings.ts      # /api/settings
│   ├── data-types.ts    # /api/data-types
│   ├── custom-data-types.ts    # /api/custom-data-types/*
│   └── custom-instructions.ts  # /api/custom-instructions/*
├── middlewares/
│   ├── async-handler.ts  # 非同期エラーハンドリング
│   ├── error-handler.ts  # エラーレスポンス
│   └── validation.ts     # リクエスト検証
└── validators/           # Zod スキーマ
```

## エンドポイント一覧

### チャット（SSE）
```
POST /api/chat/stream          # ストリーミングチャット
```

### ヘルスデータ
```
GET    /api/health-data        # 一覧（フィルタ、ページネーション）
GET    /api/health-data/latest # 最新データ
GET    /api/health-data/trend  # トレンド分析
GET    /api/health-data/:id    # 個別取得
POST   /api/health-data        # 新規作成
PUT    /api/health-data/:id    # 更新
DELETE /api/health-data/:id    # 削除
```

### レポート
```
GET    /api/reports            # 一覧
GET    /api/reports/latest     # 最新レポート
GET    /api/reports/:id        # 個別取得
POST   /api/reports/generate   # 生成
DELETE /api/reports/:id        # 削除
```

### プラグイン
```
GET    /api/plugins                 # 一覧（type=agent|data-source|notification）
GET    /api/plugins/:name           # 個別取得
GET    /api/plugins/agent/current   # 現在のAgent取得
PUT    /api/plugins/:name/config    # 設定更新
PUT    /api/plugins/:name/active    # 有効/無効切り替え
PUT    /api/plugins/agent/current   # Agent切り替え
POST   /api/plugins/install         # ZIPファイルアップロード
POST   /api/plugins/:name/test      # テスト実行
POST   /api/plugins/:name/fetch     # DataSource手動実行
POST   /api/plugins/:name/load      # メモリロード
DELETE /api/plugins/:name           # アンインストール
```

### スケジューラー
```
GET    /api/scheduler/status           # プラグイン収集状態
POST   /api/scheduler/run-collection   # 手動データ収集
POST   /api/scheduler/run-daily-report # 日次レポート手動生成
POST   /api/scheduler/run-backfill     # データ補完（期間指定）
```

### 設定
```
GET    /api/settings           # 全設定取得
PUT    /api/settings           # 一括更新（スケジューラー再起動）
```

### データタイプ
```
GET    /api/data-types         # 標準データタイプ一覧
```

### カスタムデータタイプ
```
GET    /api/custom-data-types          # 一覧
GET    /api/custom-data-types/active   # 有効なもののみ
GET    /api/custom-data-types/:id      # 個別取得
POST   /api/custom-data-types          # 新規作成
PUT    /api/custom-data-types/:id      # 更新
DELETE /api/custom-data-types/:id      # 削除
PATCH  /api/custom-data-types/:id/toggle # 有効/無効切り替え
```

### カスタム指示
```
GET    /api/custom-instructions        # 一覧
GET    /api/custom-instructions/:id    # 個別取得
POST   /api/custom-instructions        # 新規作成
PUT    /api/custom-instructions/:id    # 更新
DELETE /api/custom-instructions/:id    # 削除
PATCH  /api/custom-instructions/:id/toggle # 有効/無効切り替え
```

### ヘルスチェック
```
GET    /health                 # サーバー状態
```

## ルート実装パターン

```typescript
import { Router } from 'express';
import { asyncHandler } from '../middlewares/async-handler';
import { validateBody, validateQuery } from '../middlewares/validation';
import { mySchema } from '../validators/my-validator';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const data = await repository.findAll();
  res.json(data);
}));

router.post('/', validateBody(mySchema), asyncHandler(async (req, res) => {
  const result = await repository.create(req.body);
  res.status(201).json(result);
}));

export default router;
```

## バリデーション

Zod スキーマを使用:

```typescript
// validators/my-validator.ts
import { z } from 'zod';

export const createSchema = z.object({
  name: z.string().min(1),
  value: z.number().positive(),
});
```
