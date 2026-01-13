# エージェント統合

## 概要

`AgentService` は、プラグインシステムを経由して AI エージェントと連携する統合レイヤー。

## 主要ファイル

```
agent/
├── index.ts           # AgentService（シングルトン）
└── interfaces/        # アダプタインターフェース
```

## AgentService

現在アクティブな AgentPlugin を使用してレポート生成・チャットを実行。

```typescript
class AgentService {
  async generateReport(params: GenerateReportParams): Promise<ReportContent>
  async *chat(params: ChatParams): AsyncGenerator<string, ChatResult>
}
```

## 使用方法

```typescript
import { agentService } from './agent';

// レポート生成
const report = await agentService.generateReport({
  reportType: 'daily',
  periodStart: new Date('2024-01-01'),
  periodEnd: new Date('2024-01-07'),
});

// チャット（ストリーミング）
for await (const chunk of agentService.chat({ message: 'Hello' })) {
  console.log(chunk);
}
```

## プラグインとの関係

- `AgentService` は `PluginManager` から現在の AgentPlugin を取得
- AgentPlugin がない場合はエラー
- プラグイン切り替えは `PluginManager.setCurrentAgent()` で実行
