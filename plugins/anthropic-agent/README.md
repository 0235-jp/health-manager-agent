# Anthropic Claude Agent Plugin

Anthropic Claude Agent SDKを使用してヘルスデータを分析し、レポートを生成するAIエージェントプラグインです。

## 概要

- **タイプ**: Agent
- **プロバイダー**: Anthropic
- **バージョン**: 1.0.0

## 対応モデル

| モデル | モデルID |
|--------|----------|
| Claude Opus 4.5 | `claude-opus-4-5-20251101` |
| Claude Sonnet 4 | `claude-sonnet-4-20250514` |

## 機能

- ヘルスデータの分析と評価レポート生成
- カスタム指示に基づいた柔軟な分析
- 構造化されたJSON形式でのレポート出力

### レポート形式

生成されるレポートには以下の情報が含まれます：

```json
{
  "summary": "全体的な健康状態のサマリー",
  "metrics": {
    "metric_name": {
      "value": 数値,
      "unit": "単位",
      "trend": "up|down|stable"
    }
  },
  "risks": ["リスク1", "リスク2"],
  "recommendations": ["推奨事項1", "推奨事項2"]
}
```

## 設定

### 環境変数

| 変数名 | 必須 | 説明 |
|--------|------|------|
| `ANTHROPIC_API_KEY` | Yes | Anthropic APIキー |
| `SERVER_BASE_URL` | No | サーバーのベースURL（デフォルト: `http://localhost:3001`） |

### プラグイン設定

| 設定項目 | 型 | デフォルト | 説明 |
|----------|-----|----------|------|
| `model` | select | `claude-opus-4-5-20251101` | 使用するClaudeモデル |

## インストール

1. `plugins/anthropic-agent` ディレクトリに配置
2. 依存関係をインストール:
   ```bash
   cd plugins/anthropic-agent
   npm install
   ```
3. ビルド:
   ```bash
   npm run build
   ```
4. 環境変数 `ANTHROPIC_API_KEY` を設定
5. プラグイン管理画面からインストール

## 使用方法

1. プラグイン管理画面で「Anthropic Claude」を有効化
2. モデルを選択（設定で変更可能）
3. エージェントプラグインとして選択されると、スケジューラーによる定期レポート生成や手動分析で使用されます

## セキュリティ

このプラグインは以下のセキュリティ制限を実装しています：

- **許可されるツール**: `Bash`（ローカルサーバーへのcurlのみ）、`Skill`
- **外部リクエスト**: ブロック（ローカルサーバーへのリクエストのみ許可）
- **ファイルアクセス**: 制限あり

## 開発

### ビルド

```bash
npm run build
```

### 型チェック

```bash
npm run typecheck
```

## ライセンス

MIT
