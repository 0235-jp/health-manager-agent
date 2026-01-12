# Claude Agent SDK Plugin

Claude Agent SDKを使用してヘルスデータを分析し、レポートを生成するAIエージェントプラグインです。

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

### プラグイン設定（UI）

| 設定項目 | 型 | 必須 | デフォルト | 説明 |
|----------|-----|------|----------|------|
| `model` | select | No | `claude-opus-4-5-20251101` | 使用するClaudeモデル |
| `apiKey` | string | No | - | Anthropic API Key |
| `baseUrl` | string | No | - | カスタムエンドポイント（通常は空欄でOK） |

### 環境変数（オプション）

| 変数名 | 必須 | 説明 |
|--------|------|------|
| `SERVER_BASE_URL` | No | サーバーのベースURL（デフォルト: `http://localhost:3001`） |

## インストール

1. `plugins/claude-agent-sdk` ディレクトリに配置
2. 依存関係をインストール:
   ```bash
   cd plugins/claude-agent-sdk
   npm install
   ```
3. ビルド:
   ```bash
   npm run build
   ```
4. プラグイン管理画面からインストール
5. 設定画面でAPI Keyを入力

## 使用方法

1. プラグイン管理画面で「Claude Agent SDK」を有効化
2. 設定画面でAPI Keyを入力
3. モデルを選択（設定で変更可能）
4. エージェントプラグインとして選択されると、スケジューラーによる定期レポート生成や手動分析で使用されます

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

## ライセンス

MIT
