---
name: health-query
description: Health Manager の MCP ツールを使って健康データを問い合わせる
user_invocable: true
arg_description: 自然言語の質問（例: 今週の歩数、最近の心拍数の傾向）
---

# Health Manager 健康データ問い合わせ

ユーザーの質問: $ARGUMENTS

## 実行フロー

### Step 1: データタイプの確認

まず MCP リソース `health://data-types/catalog` を読み取り、利用可能なデータタイプを確認してください。

### Step 2: 最適なツールの選択と実行

質問の内容に応じて、以下の MCP ツールから最適なものを選んで実行してください。

#### データ取得ツール

| ツール名 | 用途 | 主なパラメータ |
|---------|------|--------------|
| `query_health_data` | 条件付きでヘルスデータを検索 | `data_type`, `source`, `start_date`, `end_date`, `limit`, `offset` |
| `get_latest_health_data` | 指定データタイプの最新値を取得 | `data_types` (配列) |
| `get_health_data_range` | 日付範囲のデータを取得 | `data_types` (配列), `start_date`, `end_date` |
| `aggregate_health_data` | 統計値（min/max/avg/count）を算出 | `data_types` (配列), `start_date`, `end_date` |
| `analyze_health_trend` | トレンド分析（上昇/下降/安定） | `data_types` (配列), `start_date`, `end_date` |

#### タイムシリーズツール

| ツール名 | 用途 | 主なパラメータ |
|---------|------|--------------|
| `query_timeseries` | 高精度時系列データの検索 | `data_type`, `source`, `start_time`, `end_time`, `period_date`, `limit`, `offset` |
| `aggregate_timeseries` | 時系列データの統計算出 | `data_type`, `start_time`, `end_time`, `source` |

#### レポートツール

| ツール名 | 用途 | 主なパラメータ |
|---------|------|--------------|
| `query_reports` | レポートを検索 | `report_type` (on_fetch/daily/manual), `start_date`, `end_date`, `limit`, `offset` |
| `get_report` | ID 指定でレポート取得 | `id` |
| `get_latest_report` | 最新レポートを取得 | `report_type` (任意) |

#### MCP リソース

| リソース URI | 内容 |
|-------------|------|
| `health://data-types/catalog` | 全データタイプ一覧 |
| `health://custom-data-types/active` | アクティブなカスタムデータタイプ |
| `health://timeseries/data-types` | タイムシリーズで利用可能なデータタイプ |

### Step 3: 結果の要約

取得したデータを日本語で分かりやすく要約してください。数値データにはグラフや表形式を活用してください。

## ツール選択ガイド

- 「最近の〇〇」「今の〇〇」→ `get_latest_health_data`
- 「今週の〇〇」「先月の〇〇」→ `get_health_data_range` または `aggregate_health_data`
- 「〇〇の傾向」「〇〇は増えている？」→ `analyze_health_trend`
- 「心拍数の詳細」「分単位のデータ」→ `query_timeseries`
- 「レポート」「分析結果」→ `query_reports` または `get_latest_report`
- どのデータがあるか不明 → まず `health://data-types/catalog` リソースを確認
