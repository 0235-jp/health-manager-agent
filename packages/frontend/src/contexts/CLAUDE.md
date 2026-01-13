# Context 設計

## 既存 Context

### ChatContext

チャット機能のグローバル状態管理。

```typescript
interface ChatContextValue {
  messages: ChatMessage[];
  sessionId: string | null;
  isStreaming: boolean;
  addMessage: (message: ChatMessage) => void;
  appendToLastMessage: (text: string) => void;
  setSessionId: (id: string) => void;
  clearMessages: () => void;
  setIsStreaming: (value: boolean) => void;
}
```

**使用方法:**

```typescript
import { useChat } from '../contexts/ChatContext';

function MyComponent() {
  const {
    messages,
    isStreaming,
    addMessage,
    appendToLastMessage,
    clearMessages
  } = useChat();
  // ...
}
```

## Context 使用ガイドライン

### 使用すべき場合

- 複数コンポーネント間で共有する UI 状態
- Props drilling が深くなる場合

### 使用を避けるべき場合

- サーバー状態 → React Query を使用
- 単一コンポーネント内の状態 → useState を使用

## 新規 Context 作成パターン

```typescript
// 1. 型定義
interface MyContextValue {
  value: string;
  setValue: (v: string) => void;
}

// 2. Context 作成
const MyContext = createContext<MyContextValue | null>(null);

// 3. Provider コンポーネント
export function MyProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState('');
  return (
    <MyContext.Provider value={{ value, setValue }}>
      {children}
    </MyContext.Provider>
  );
}

// 4. カスタムフック
export function useMy() {
  const context = useContext(MyContext);
  if (!context) throw new Error('useMy must be used within MyProvider');
  return context;
}
```
