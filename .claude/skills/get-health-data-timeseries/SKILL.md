# get-health-data-timeseries

保存されている時系列ヘルスデータを照会するスキルです。

## 使用方法

このスキルは `/get-health-data-timeseries` コマンドで呼び出されます。

## サーバー情報

サーバーのベースURLはシステムプロンプトで `SERVER_BASE_URL` として提供されます。
すべてのAPIリクエストはこのURLに対して行ってください。

## パラメータ

- **data_type**: 時系列データタイプ（必須）
  - `heart_rate_timeseries`: 心拍数（1分間隔）
  - `oura:sleep_hr`: 睡眠中心拍数（5分間隔）
  - `oura:sleep_hrv`: 睡眠中HRV（5分間隔）
  - `oura:met`: MET値（1分間隔）
  - `oura:sleep_phase`: 睡眠フェーズ（5分間隔、1=deep,2=light,3=rem,4=awake）
  - `oura:activity_class`: アクティビティクラス（5分間隔、0-5）
- **start_time**: 開始日時（ISO 8601形式）
- **end_time**: 終了日時（ISO 8601形式）
- **source**: データソースでフィルタ（例: oura-ring-plugin）
- **resample_minutes**: リサンプリング間隔（分）
- **aggregate**: true の場合、集計結果（min/max/avg/count）を返す

## 実行手順

1. **利用可能な時系列データタイプを確認する**:
   ```bash
   curl "${SERVER_BASE_URL}/api/health-data/timeseries/data-types"
   ```

2. **時系列データ一覧取得**:
   ```bash
   curl "${SERVER_BASE_URL}/api/health-data/timeseries?data_type={type}&start_time={start}&end_time={end}"
   ```

   例：
   ```bash
   curl "${SERVER_BASE_URL}/api/health-data/timeseries?data_type=heart_rate_timeseries&start_time=2026-01-10T00:00:00Z&end_time=2026-01-10T23:59:59Z"
   ```

3. **集計データ取得**:
   ```bash
   curl "${SERVER_BASE_URL}/api/health-data/timeseries/aggregate?data_type={type}&start_time={start}&end_time={end}"
   ```

   例：
   ```bash
   curl "${SERVER_BASE_URL}/api/health-data/timeseries/aggregate?data_type=oura:sleep_hr&start_time=2026-01-10T00:00:00Z&end_time=2026-01-10T08:00:00Z"
   ```

4. **リサンプリング**（指定間隔での平均値）:
   ```bash
   curl "${SERVER_BASE_URL}/api/health-data/timeseries/resample?data_type={type}&start_time={start}&end_time={end}&interval_minutes={minutes}"
   ```

   例（15分間隔でリサンプリング）：
   ```bash
   curl "${SERVER_BASE_URL}/api/health-data/timeseries/resample?data_type=heart_rate_timeseries&start_time=2026-01-10T00:00:00Z&end_time=2026-01-10T23:59:59Z&interval_minutes=15"
   ```

## 出力形式

### 時系列データ一覧
```json
{
  "data": [
    {
      "id": 1,
      "data_type": "heart_rate_timeseries",
      "value": 72,
      "recorded_at": "2026-01-10T08:00:00+09:00",
      "interval_seconds": 60,
      "source": "oura-ring-plugin"
    }
  ],
  "pagination": {
    "total": 1440,
    "limit": 1000,
    "offset": 0
  }
}
```

### 集計結果
```json
{
  "data_type": "oura:sleep_hr",
  "min": 52,
  "max": 68,
  "avg": 58.5,
  "count": 96
}
```

### リサンプリング結果
```json
[
  {
    "bucket_start": "2026-01-10T00:00:00+09:00",
    "avg_value": 58.2,
    "min_value": 52,
    "max_value": 64,
    "count": 15
  }
]
```

## ユースケース例

1. **睡眠中の心拍数変動を分析**:
   - `oura:sleep_hr` データを取得
   - 集計で平均・最低・最高心拍数を確認
   - 睡眠の質の指標として活用

2. **日中の活動パターンを分析**:
   - `oura:met` データを15分間隔でリサンプリング
   - 活動強度の時間帯別分布を確認

3. **睡眠フェーズの割合を計算**:
   - `oura:sleep_phase` データを取得
   - 各フェーズ（deep/light/rem/awake）の出現回数をカウント
   - 睡眠構造を分析
