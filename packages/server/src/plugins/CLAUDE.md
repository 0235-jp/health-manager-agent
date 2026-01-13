# プラグインシステム

## 概要

拡張可能なプラグインアーキテクチャ。3 タイプのプラグインをサポート。

## ディレクトリ構造

```
plugins/
├── manager.ts        # PluginManager（シングルトン）
├── loader.ts         # プラグインロード
├── registry.ts       # インスタンス管理
├── event-bus.ts      # Pub/Sub
├── version.ts        # API バージョン互換性
├── interfaces/       # プラグインインターフェース
│   ├── base.ts       # BasePlugin
│   ├── data-source.ts# DataSourcePlugin
│   ├── agent.ts      # AgentPlugin
│   └── notification.ts# NotificationPlugin
└── tools/            # 組み込みツール
    ├── registry.ts
    ├── tool-executor.ts
    ├── prompt-builder.ts
    └── builtin/
        ├── get-health-data.ts
        ├── get-health-data-latest.ts
        ├── get-health-data-trend.ts
        └── get-data-types.ts
```

## プラグインタイプ

| タイプ | インターフェース | 役割 |
|--------|-----------------|------|
| `data-source` | `DataSourcePlugin` | ヘルスデータ取得 |
| `agent` | `AgentPlugin` | AI 分析・レポート |
| `notification` | `NotificationPlugin` | 通知配信 |

## PluginManager

```typescript
// プラグイン取得
const plugins = pluginManager.getAllPlugins();
const dataSources = pluginManager.getPluginsByType('data-source');
const currentAgent = pluginManager.getCurrentAgent();

// プラグイン操作
await pluginManager.installPlugin(zipBuffer);
await pluginManager.uninstallPlugin(name);
await pluginManager.updateConfig(name, config);
```

## プラグインライフサイクル

1. **インストール**: ZIP 展開 → manifest.json 検証 → DB 登録
2. **ロード**: `dist/index.js` からファクトリ関数取得 → インスタンス化
3. **初期化**: `initialize(context)` 呼び出し
4. **実行**: 各タイプのメソッド呼び出し
5. **破棄**: `dispose()` 呼び出し

## EventBus

```typescript
// イベント発火
eventBus.emit('report:generated', { report, type: 'daily' });
eventBus.emit('data:fetched', { pluginName, dataCount });

// イベント購読（NotificationPlugin）
eventBus.on('report:generated', (payload) => {
  notificationPlugin.notify({ type: 'report:generated', payload });
});
```

## 組み込みツール

AgentPlugin が使用可能なツール:
- `getHealthData`: 期間指定でデータ取得
- `getHealthDataLatest`: 最新データ取得
- `getHealthDataTrend`: トレンド分析
- `getDataTypes`: データタイプ一覧
