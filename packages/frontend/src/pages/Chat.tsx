import { useState, useRef, useEffect, useCallback } from 'react';
import { useChat } from '../contexts/ChatContext';
import { useHeaderActions } from '../hooks/useHeaderActions';
import { api } from '../lib/api';
import type { ChatMessage } from '../types';
import { Markdown } from '../components/Markdown';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

function createMessage(role: 'user' | 'assistant', content: string): ChatMessage {
  return { id: generateId(), role, content, timestamp: new Date() };
}

interface MessageBubbleProps {
  message: ChatMessage;
}

function MessageBubble({ message }: MessageBubbleProps): React.ReactElement {
  const isUser = message.role === 'user';
  const alignment = isUser ? 'justify-end' : 'justify-start';
  const bubbleStyle = isUser ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-900';

  return (
    <div className={`flex ${alignment}`}>
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${bubbleStyle}`}>
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose prose-sm max-w-none">
            <Markdown>{message.content || '...'}</Markdown>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Chat(): React.ReactElement {
  const {
    messages,
    sessionId,
    isStreaming,
    addMessage,
    appendToLastMessage,
    setSessionId,
    clearMessages,
    setIsStreaming,
  } = useChat();

  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // メッセージが追加されたら自動スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 初回表示時にフォーカス
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    const trimmedInput = inputValue.trim();
    if (!trimmedInput || isStreaming) return;

    // ユーザーメッセージを作成
    const userMessage = createMessage('user', trimmedInput);

    // API用の履歴を手動構築（React状態更新は非同期のため）
    const historyForApi = [...messages, userMessage];

    // UI状態を更新
    addMessage(userMessage);
    setInputValue('');
    setError(null);
    setIsStreaming(true);

    // アシスタントの空メッセージを追加（ストリーミング用）
    addMessage(createMessage('assistant', ''));

    try {
      await api.chat.stream(
        trimmedInput,
        historyForApi,
        sessionId,
        appendToLastMessage,
        (newSessionId) => {
          if (newSessionId) setSessionId(newSessionId);
        },
        setError
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setIsStreaming(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  const handleClear = useCallback(() => {
    clearMessages();
  }, [clearMessages]);

  useHeaderActions([{
    label: 'クリア',
    onClick: handleClear,
    variant: 'secondary',
    disabled: isStreaming || messages.length === 0,
  }], [handleClear, isStreaming, messages.length]);

  return (
    <div className="flex flex-col h-full">
      {/* メッセージエリア */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <p className="text-lg mb-2">健康データについて質問してください</p>
              <p className="text-sm">例: 「今週の睡眠時間の傾向を教えて」</p>
            </div>
          </div>
        ) : (
          messages.map((message) => <MessageBubble key={message.id} message={message} />)
        )}
        {error && (
          <div className="flex justify-center">
            <div className="bg-red-100 text-red-700 rounded-lg px-4 py-2 text-sm">
              {error}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 入力エリア */}
      <div className="border-t border-gray-200 px-6 py-4">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="メッセージを入力..."
            disabled={isStreaming}
            rows={1}
            className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            style={{ minHeight: '48px', maxHeight: '200px' }}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isStreaming}
            className="px-6 py-3 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isStreaming ? '...' : '送信'}
          </button>
        </form>
      </div>
    </div>
  );
}
