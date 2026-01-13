# コンポーネント設計

## ディレクトリ構造

```
components/
├── layout/         # レイアウト関連
│   ├── Layout.tsx  # メインレイアウト（Sidebar + Header + main）
│   ├── Header.tsx  # ヘッダー
│   └── Sidebar.tsx # サイドバーナビゲーション
├── charts/         # グラフ関連
│   ├── LineChart.tsx      # 折れ線グラフ（Recharts ラッパー）
│   └── TrendIndicator.tsx # トレンド表示
├── data/           # データ表示
│   └── DataForm.tsx       # データ入力フォーム
├── ui/             # UI プリミティブ
└── Markdown.tsx    # マークダウンレンダリング
```

## コンポーネント設計原則

### 1. Controlled コンポーネント

フォーム要素は親から状態を受け取る:

```typescript
interface Props {
  value: string;
  onChange: (value: string) => void;
}
```

### 2. コンポジション

レイアウトは children を活用:

```typescript
<Layout>
  <PageContent />
</Layout>
```

### 3. 責任の分離

- `layout/`: 構造のみ、ビジネスロジックなし
- `charts/`: データ可視化に特化
- `data/`: データ操作 UI

## 新規コンポーネント追加

1. 適切なサブディレクトリに配置
2. Props のインターフェースを明確に定義
3. 単一責任の原則を守る
