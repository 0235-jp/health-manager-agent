# ユーティリティ関数

## 既存モジュール

### api.ts

サーバー API との通信を一元管理。

```typescript
// 基盤: fetchJson ラッパー関数
const API_BASE = '/api';

// エンドポイントグループ
api.healthData    // list, get, create, update, delete, getLatest, getTrend
api.settings      // get, update
api.customInstructions  // list, get, create, update, delete, toggle
api.reports       // list, get, getLatest, generate, delete
api.plugins       // list, get, updateConfig, setActive, test, install, uninstall, load, fetch, getCurrentAgent, setCurrentAgent
api.dataTypes     // list
api.chat          // stream (SSE)

// Scheduler API（別エクスポート）
schedulerApi.getStatus
schedulerApi.runCollection
schedulerApi.runDailyReport
schedulerApi.runBackfill
```

### date-utils.ts

日付操作ユーティリティ。

```typescript
// 日付を YYYY-MM-DD 形式にフォーマット（input[type="date"]用）
formatDateForInput(date: Date): string

// N日前の Date オブジェクトを取得
getDateDaysAgo(days: number): Date
```

## 新規ユーティリティ追加

1. 関連するユーティリティをグループ化
2. 純粋関数として実装（副作用なし）
3. 型定義を明確に

```typescript
// lib/my-utils.ts
export function myUtility(input: InputType): OutputType {
  // 純粋な変換ロジック
  return result;
}
```

## API エンドポイント追加

1. `api.ts` に新規グループまたはメソッド追加
2. `types/index.ts` に型定義追加
3. ページ/コンポーネントで使用
