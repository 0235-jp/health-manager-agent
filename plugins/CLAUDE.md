# プラグイン開発ガイド

## 概要

Health Manager Agent のプラグインシステムは 3 タイプのプラグインをサポート。

| タイプ | インターフェース | 役割 |
|--------|-----------------|------|
| `data-source` | `DataSourcePlugin` | ヘルスデータ取得 |
| `agent` | `AgentPlugin` | AI 分析・レポート生成 |
| `notification` | `NotificationPlugin` | 通知配信 |

## ディレクトリ構造

```
plugins/
├── my-awesome-plugin/
│   ├── src/
│   │   ├── index.ts       # エントリーポイント
│   │   └── ...
│   ├── dist/              # ビルド出力
│   ├── manifest.json      # プラグイン定義
│   ├── package.json
│   └── tsconfig.json
```

**命名規則**: フォルダ名・プラグイン名は末尾に `-plugin` を付ける（例: `oura-ring-plugin`）

## manifest.json

### 共通フィールド

```json
{
  "name": "my-plugin",
  "displayName": "My Plugin",
  "version": "1.0.0",
  "type": "data-source",
  "description": "説明",
  "author": "作者",
  "main": "dist/index.js",
  "minHostVersion": "1.0.0",
  "configSchema": { ... }
}
```

### DataSourcePlugin 拡張フィールド

```json
{
  "type": "data-source",
  "supportedDataTypes": [
    { "name": "steps", "displayName": "歩数", "category": "活動", "unit": "count" },
    { "name": "heart_rate", "displayName": "心拍数", "category": "心臓", "unit": "bpm" }
  ],
  "fetchStrategy": "both",
  "defaultFetchInterval": 60
}
```

| フィールド | 必須 | 説明 |
|-----------|------|------|
| `supportedDataTypes` | ○ | サポートするデータタイプの配列 |
| `fetchStrategy` | ○ | `"manual"` / `"scheduled"` / `"both"` |
| `defaultFetchInterval` | × | デフォルト取得間隔（分） |

### AgentPlugin 拡張フィールド

```json
{
  "type": "agent",
  "provider": "anthropic",
  "supportedModels": ["claude-opus-4-5-20251101", "claude-sonnet-4-20250514"],
  "capabilities": {
    "streaming": false,
    "functionCalling": true,
    "structuredOutput": true,
    "vision": false,
    "skills": true
  }
}
```

| フィールド | 必須 | 説明 |
|-----------|------|------|
| `provider` | ○ | AIプロバイダー（`"anthropic"`, `"openai"` など） |
| `supportedModels` | × | サポートするモデル一覧 |
| `capabilities` | ○ | エージェントの能力 |

### NotificationPlugin 拡張フィールド

```json
{
  "type": "notification",
  "supportedEvents": ["report:generated", "report:daily", "data:fetched"],
  "deliveryMethod": "push"
}
```

| フィールド | 必須 | 説明 |
|-----------|------|------|
| `supportedEvents` | ○ | サポートするイベントタイプ |
| `deliveryMethod` | ○ | `"push"` / `"pull"` / `"both"` |

### configSchema フィールドタイプ

| type | UI |
|------|-----|
| `string` | テキスト入力 |
| `number` | 数値入力 |
| `boolean` | チェックボックス |
| `select` | ドロップダウン |
| `multiselect` | 複数選択 |

## DataSourcePlugin

ヘルスデータを外部サービスから取得。

```typescript
import { DataSourcePlugin, PluginContext, FetchOptions, FetchResult } from './interfaces';

class MyDataSourcePlugin implements DataSourcePlugin {
  readonly manifest: DataSourceManifest;

  async initialize(context: PluginContext): Promise<void> {
    const { config } = context;
    // API クライアント初期化
  }

  async dispose(): Promise<void> {
    // クリーンアップ
  }

  async fetchData(options: FetchOptions): Promise<FetchResult> {
    return {
      success: true,
      data: [
        { dataType: 'steps', value: 10000, unit: 'count', recordedAt: new Date() }
      ]
    };
  }

  async testConnection(): Promise<{ success: boolean; message?: string }> {
    // 接続テスト
  }

  // OAuth 対応（オプション）
  getAuthorizationUrl?(redirectUri: string, state: string): string
  async handleOAuthCallback?(code: string, redirectUri: string): Promise<TokenInfo>
}

export default function createPlugin(): DataSourcePlugin {
  return new MyDataSourcePlugin();
}
```

## AgentPlugin

AI によるデータ分析・レポート生成。

```typescript
import { AgentPlugin, GenerateReportParams, ReportContent, ChatParams, ChatResult } from './interfaces';

class MyAgentPlugin implements AgentPlugin {
  readonly manifest: AgentManifest;
  readonly name: string;

  private toolExecutor?: ToolExecutor;
  private promptBuilder?: PromptBuilder;

  async initialize(context: PluginContext): Promise<void> {
    this.toolExecutor = context.toolExecutor;
    this.promptBuilder = context.promptBuilder;
    // context.useSkills で Skills 対応かどうか判定可能
  }

  async generateReport(params: GenerateReportParams): Promise<ReportContent> {
    // ヘルスデータ取得
    const data = await this.toolExecutor?.execute('getHealthData', {
      startDate: params.periodStart,
      endDate: params.periodEnd
    });

    // AI でレポート生成
    return {
      summary: '...',
      metrics: {},
      risks: [],
      recommendations: []
    };
  }

  async *chat(params: ChatParams): AsyncGenerator<string, ChatResult> {
    // ストリーミングチャット
    yield 'こんにちは';
    yield '健康データを分析中...';
    return { sessionId: params.sessionId };
  }
}
```

## NotificationPlugin

レポート・イベントの通知。

```typescript
import { NotificationPlugin, NotificationEvent, NotificationResult } from './interfaces';

class MyNotificationPlugin implements NotificationPlugin {
  readonly manifest: NotificationManifest;

  async notify(event: NotificationEvent): Promise<NotificationResult> {
    // 通知送信
    return { success: true, messageId: '...' };
  }

  async testNotification(): Promise<NotificationResult> {
    // テスト通知
  }

  async formatMessage?(event: NotificationEvent): Promise<string> {
    // メッセージフォーマット（オプション）
  }
}
```

## ビルド・インストール

```bash
# ビルド
cd plugins/my-awesome-plugin
pnpm install
pnpm build

# ZIP 作成（インストール用）
pnpm build:zip
```

ZIP ファイルを管理画面からアップロードするか、`plugins/` に直接配置。

## 開発時の注意点

1. **エラーハンドリング**: 部分的な失敗を許容し、エラーをログ
2. **重複排除**: 同じ dataType + recordedAt は除外
3. **トークン管理**: OAuth の場合はトークン更新コールバックを実装
4. **非同期処理**: すべての I/O は async/await
5. **PluginContext**: `useSkills` フラグで Claude Agent SDK の Skills 対応を判定
