import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { ChatMessage } from '../types';

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

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }): ReactNode {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionIdState] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  const addMessage = useCallback((message: ChatMessage) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const appendToLastMessage = useCallback((text: string) => {
    setMessages((prev) => {
      if (prev.length === 0) return prev;
      const lastMessage = prev[prev.length - 1];
      return [
        ...prev.slice(0, -1),
        { ...lastMessage, content: lastMessage.content + text },
      ];
    });
  }, []);

  const setSessionId = useCallback((id: string) => {
    setSessionIdState(id);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setSessionIdState(null);
  }, []);

  const value: ChatContextValue = {
    messages,
    sessionId,
    isStreaming,
    addMessage,
    appendToLastMessage,
    setSessionId,
    clearMessages,
    setIsStreaming,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
