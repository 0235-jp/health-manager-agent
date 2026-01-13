# カスタムフック

## 設計原則

1. **単一責任**: 1 つのフックは 1 つの機能に特化
2. **再利用性**: 複数コンポーネントで使用可能な形で設計
3. **テスト可能性**: 副作用を分離して単体テストしやすく

## フック命名規則

- `use` プレフィックス必須
- 機能を明確に表す名前: `useHealthData`, `useDebounce`

## 新規フック作成パターン

```typescript
// hooks/useMyHook.ts
import { useState, useEffect } from 'react';

interface UseMyHookOptions {
  initialValue?: string;
}

interface UseMyHookReturn {
  value: string;
  setValue: (v: string) => void;
  reset: () => void;
}

export function useMyHook(options: UseMyHookOptions = {}): UseMyHookReturn {
  const { initialValue = '' } = options;
  const [value, setValue] = useState(initialValue);

  const reset = () => setValue(initialValue);

  return { value, setValue, reset };
}
```

## React Query との連携

データ取得系のカスタムフックは React Query をラップ:

```typescript
export function useHealthData(filters: Filters) {
  return useQuery({
    queryKey: ['health-data', filters],
    queryFn: () => api.healthData.getAll(filters),
  });
}
```
