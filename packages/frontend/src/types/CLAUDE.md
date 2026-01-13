# 型定義

## 型定義ファイル構造

`types/index.ts` に全ての型を集約。

## 主要な型

### ヘルスデータ

```typescript
interface HealthData {
  id: number;
  data_type: string;
  value: number;
  unit: string | null;
  source: string;
  recorded_at: string;
  created_at: string;
  updated_at: string;
}
```

### レポート

```typescript
interface ReportContent {
  summary: string;
  metrics: Record<string, MetricValue>;
  risks: string[];
  recommendations: string[];
}

interface Report {
  id: number;
  report_type: 'on_fetch' | 'daily';
  period_start: string;
  period_end: string;
  content: ReportContent;
  created_at: string;
}
```

### プラグイン

```typescript
interface Plugin {
  name: string;
  displayName: string;
  version: string;
  type: 'data-source' | 'agent' | 'notification';
  description?: string;
  isActive: boolean;
  isLoaded: boolean;
  config: Record<string, unknown>;
  configSchema?: Record<string, ConfigField>;
  supportedDataTypes?: DataTypeDefinition[];
  supportedModels?: string[];
  capabilities?: string[];
  installedAt?: string;
  updatedAt?: string;
}
```

### 設定

```typescript
interface Settings {
  collection_interval: number;
  timezone: string;
  active_plugins: string[];
  data_source_priority: Record<string, string>;
  report_excluded_periods: ExcludedPeriod[];
  user_profile?: UserProfile;
}

interface ExcludedPeriod {
  id: string;
  startTime: string;  // HH:MM 形式
  endTime: string;    // HH:MM 形式
  enabled: boolean;
}

interface UserProfile {
  birthDate?: string;
  height?: number;
  sex?: 'male' | 'female' | 'other';
  medicalConditions?: string[];
  allergies?: string[];
}
```

### カスタム指示

```typescript
interface CustomInstruction {
  id: number;
  instruction: string;
  priority: number;
  is_active: number;  // SQLite boolean (0 or 1)
  created_at: string;
  updated_at: string;
}
```

### チャット

```typescript
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatStreamEvent {
  type: 'text' | 'done' | 'error';
  content?: string;
  session_id?: string;
  message?: string;
}
```

## 型定義のベストプラクティス

1. **API レスポンス型**: サーバー側の snake_case に合わせる
2. **UI 専用型**: 必要に応じて変換した型を定義
3. **Union 型**: 有限の選択肢は Union で表現
4. **Optional プロパティ**: 省略可能な項目は `?` を使用
5. **Nullable**: null を許容する場合は `| null` を明示
