# スケジューラー

## 概要

node-cron を使用した定期実行管理。データ収集と日次レポート生成を自動化。

## 主要ファイル

```
scheduler/
└── index.ts   # Scheduler クラス（シングルトン）
```

## 機能

### 1. 定期データ収集

- 設定された間隔で DataSourcePlugin の `fetchData()` を実行
- プラグインごとの収集状態を追跡
- 重複データを除外して保存

### 2. 日次レポート生成

- 毎日指定時刻にレポート生成
- 除外時間帯を考慮

### 3. 取得時レポート

- データ収集後にリアルタイムレポート生成
- 除外時間帯は生成をスキップ

## 使用方法

```typescript
import { scheduler } from './scheduler';

// 開始
scheduler.start();

// 手動実行
await scheduler.runCollection();
await scheduler.runDailyReport();
await scheduler.runBackfill(startDate, endDate);

// 停止
scheduler.stop();
```

## 設定

`settings` テーブルから読み込み:

- `collection_interval`: 収集間隔（cron 式）
- `daily_report_time`: 日次レポート時刻
- `report_excluded_periods`: 除外時間帯

## 状態管理

`plugin_collection_state` テーブルで追跡:

- `last_collection_time`: 最終収集時刻
- `last_success_time`: 最終成功時刻
- `consecutive_failures`: 連続失敗回数

## データ優先度

同じ dataType + recordedAt で複数ソースがある場合:

1. `data_source_priority` 設定を参照
2. 優先度の高いソースのデータを使用
