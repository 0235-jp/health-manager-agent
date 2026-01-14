# フロントエンド開発ガイド

## 技術スタック

| 技術 | 用途 |
|------|------|
| React 18 | UI フレームワーク |
| Vite 5 | ビルドツール |
| TypeScript 5 | 型安全な開発 |
| TailwindCSS 3 | スタイリング |
| React Query 5 | サーバー状態管理 |
| React Router 6 | ルーティング |
| Recharts | グラフ描画 |
| React Markdown | マークダウンレンダリング |

## ディレクトリ構造

```
src/
├── components/     # 再利用可能なコンポーネント
│   ├── layout/     # レイアウトコンポーネント
│   ├── charts/     # グラフコンポーネント
│   ├── data/       # データ表示コンポーネント
│   └── ui/         # UIプリミティブ
├── pages/          # ページコンポーネント
├── contexts/       # React Context
├── hooks/          # カスタムフック
├── lib/            # ユーティリティ関数
└── types/          # TypeScript 型定義
```

## 開発コマンド

```bash
pnpm dev        # 開発サーバー起動（:5173）
pnpm build      # プロダクションビルド
pnpm preview    # ビルド結果プレビュー
pnpm lint       # ESLint 実行
```

## 状態管理

### サーバー状態（React Query）

```typescript
// データ取得
const { data, isLoading, error } = useQuery({
  queryKey: ['health-data'],
  queryFn: () => api.healthData.getAll(),
});

// データ更新
const mutation = useMutation({
  mutationFn: api.healthData.create,
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['health-data'] }),
});
```

### UI 状態

- モーダル開閉: `useState`
- グローバル UI 状態: Context API（例: `ChatContext`）

## API 通信

`lib/api.ts` に集約。エンドポイントグループ:

- `api.healthData` - ヘルスデータ CRUD
- `api.settings` - 設定
- `api.reports` - レポート
- `api.plugins` - プラグイン管理
- `api.chat` - チャットストリーミング

## 新規ページ追加

1. `pages/` にページコンポーネント作成
2. `App.tsx` に Route 追加
3. `components/layout/Sidebar.tsx` の `NAV_ITEMS` に追加

## スタイリング

- TailwindCSS ユーティリティクラスを使用
- レスポンシブ: `md:`, `lg:` プレフィックス
- カラーパレット: blue-600（primary）, gray-*（neutral）

## タイムゾーン処理

**重要**: 日時を扱う際は、ブラウザのローカルタイムゾーンではなく、ユーザー設定のタイムゾーンを使用する。

```typescript
// ✓ 正しい: useTimezone() で設定タイムゾーンを取得して使用
const timezone = useTimezone();
const range = getTodayDatetimeRange(timezone);
const formattedDate = formatDateTime(dateString, timezone);

// ✗ 誤り: ブラウザのローカルタイムゾーンを暗黙的に使用
const now = new Date();
const today = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
```

**理由**: サーバーはユーザー設定のタイムゾーン（`settings.timezone`）で日時を解釈するため、フロントエンドでも同じタイムゾーンを使用しないと不整合が発生する。
