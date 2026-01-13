# ページ構成

## 既存ページ一覧

| ファイル | パス | 機能 |
|---------|------|------|
| `Dashboard.tsx` | `/` | ダッシュボード（最新データ、7日間推移、最新レポート） |
| `Chat.tsx` | `/chat` | AI チャット（SSE ストリーミング） |
| `HealthData.tsx` | `/health-data` | ヘルスデータ管理（CRUD、フィルタ、ページネーション） |
| `Reports.tsx` | `/reports` | レポート一覧・生成 |
| `Plugins.tsx` | `/plugins` | プラグイン管理（設定、テスト、インストール） |
| `Settings.tsx` | `/settings` | 設定（プロファイル、収集設定、カスタム指示） |

## ページ構造パターン

```typescript
export function MyPage() {
  // 1. React Query でデータ取得
  const { data, isLoading } = useQuery({...});

  // 2. ローカル状態（モーダル等）
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 3. ミューテーション
  const mutation = useMutation({...});

  // 4. ローディング/エラー処理
  if (isLoading) return <LoadingSpinner />;

  // 5. UI レンダリング
  return (
    <div className="p-6">
      {/* ページタイトル */}
      {/* コンテンツ */}
      {/* モーダル */}
    </div>
  );
}
```

## 新規ページ追加手順

1. `pages/` にコンポーネント作成
2. `App.tsx` に Route 追加:
   ```tsx
   <Route path="/my-page" element={<MyPage />} />
   ```
3. `Sidebar.tsx` の `NAV_ITEMS` に追加
