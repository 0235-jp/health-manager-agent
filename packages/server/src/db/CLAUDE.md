# データベース層

## 技術

- **SQLite** (better-sqlite3): 同期 API、高速
- **スキーマ管理**: `schema.ts` で定義
- **初期データ**: `seed.ts` で投入

## ディレクトリ構造

```
db/
├── index.ts          # DB 初期化
├── schema.ts         # テーブル定義
├── seed.ts           # 初期データ
└── repositories/     # データアクセス
    ├── health-data.ts
    ├── reports.ts
    ├── settings.ts
    ├── plugins.ts
    ├── data-types.ts
    ├── custom-data-types.ts
    ├── custom-instructions.ts
    └── plugin-collection-state.ts
```

## テーブル一覧

| テーブル | 説明 |
|---------|------|
| `health_data` | ヘルスデータ |
| `data_types` | データタイプカタログ |
| `reports` | 生成レポート |
| `settings` | アプリケーション設定 |
| `plugins` | インストールプラグイン |
| `custom_data_types` | ユーザー定義データタイプ |
| `custom_instructions` | ユーザー定義指示 |
| `plugin_collection_state` | データ収集状態 |

## Repository パターン

```typescript
// repositories/my-repository.ts
import db from '../index';

export const myRepository = {
  findAll(): MyType[] {
    return db.prepare('SELECT * FROM my_table').all() as MyType[];
  },

  findById(id: number): MyType | undefined {
    return db.prepare('SELECT * FROM my_table WHERE id = ?').get(id) as MyType | undefined;
  },

  create(data: CreateInput): MyType {
    const result = db.prepare(
      'INSERT INTO my_table (name) VALUES (?)'
    ).run(data.name);
    return this.findById(result.lastInsertRowid as number)!;
  },

  update(id: number, data: UpdateInput): MyType | undefined {
    db.prepare('UPDATE my_table SET name = ? WHERE id = ?').run(data.name, id);
    return this.findById(id);
  },

  delete(id: number): boolean {
    const result = db.prepare('DELETE FROM my_table WHERE id = ?').run(id);
    return result.changes > 0;
  },
};
```

## トランザクション

```typescript
const transaction = db.transaction(() => {
  // 複数の操作
});
transaction();
```

## インデックス

パフォーマンス重要なカラムにインデックス:
- `health_data`: data_type, recorded_at, source
- `reports`: report_type, period_start, period_end
