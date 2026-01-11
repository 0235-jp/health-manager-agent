# get-health-data

保存されているヘルスデータを照会するスキルです。

## 使用方法

このスキルは `/get-health-data` コマンドで呼び出されます。

## サーバー情報

サーバーのベースURLはシステムプロンプトで `SERVER_BASE_URL` として提供されます。
すべてのAPIリクエストはこのURLに対して行ってください。

## パラメータ

- **query_type**: クエリタイプ
  - `latest`: 最新のデータを取得
  - `range`: 期間を指定してデータを取得
  - `aggregate`: 集計データを取得
  - `trend`: トレンド分析データを取得
- **data_types**: 取得するデータタイプの配列（例: weight, sleep_duration, steps）
- **start_date**: 開始日（YYYY-MM-DD形式）
- **end_date**: 終了日（YYYY-MM-DD形式）

## 実行手順

1. **まず利用可能なデータタイプを確認する**:
   ```bash
   curl ${SERVER_BASE_URL}/api/data-types
   ```
   これにより、標準タイプとプラグイン定義タイプの一覧が取得できます。

2. パラメータを解析する

3. 対応するAPIエンドポイントを呼び出す:
   - 最新データ: `curl "${SERVER_BASE_URL}/api/health-data/latest"`
   - 期間指定: `curl "${SERVER_BASE_URL}/api/health-data?data_type={type}&start_date={start}&end_date={end}"`
   - トレンド: `curl "${SERVER_BASE_URL}/api/health-data/trend?data_type={type}&days=7"`

4. 結果をJSON形式で返す

## 出力形式

```json
{
  "data": [
    {
      "data_type": "weight",
      "value": 70.5,
      "unit": "kg",
      "recorded_at": "2026-01-10T08:00:00Z"
    }
  ],
  "summary": {
    "count": 1,
    "trend": "stable"
  }
}
```
