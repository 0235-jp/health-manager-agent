/**
 * OpenAI API Client
 *
 * OpenAI互換APIを呼び出すためのクライアント
 */

export interface OpenAIClientConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ChatCompletionResponse {
  content: string | null;
  tool_calls?: ToolCall[];
  finish_reason: 'stop' | 'tool_calls' | 'length' | 'content_filter' | null;
}

interface StreamDelta {
  content?: string;
  tool_calls?: Array<{
    index: number;
    id?: string;
    type?: 'function';
    function?: {
      name?: string;
      arguments?: string;
    };
  }>;
}

/**
 * OpenAI API Client
 */
export class OpenAIApiClient {
  private baseUrl: string;
  private apiKey: string;
  private model: string;

  constructor(config: OpenAIClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
    this.model = config.model;
  }

  /**
   * 通常のチャット完了
   */
  async chatCompletion(
    messages: ChatMessage[],
    tools?: OpenAITool[]
  ): Promise<ChatCompletionResponse> {
    const body: Record<string, unknown> = {
      model: this.model,
      messages: messages.map((m) => this.formatMessage(m)),
    };

    if (tools && tools.length > 0) {
      body.tools = tools;
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${error}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{
        message?: { content?: string; tool_calls?: ToolCall[] };
        finish_reason?: 'stop' | 'tool_calls' | 'length' | 'content_filter' | null;
      }>;
    };
    const choice = data.choices?.[0];

    if (!choice) {
      throw new Error('No response from OpenAI API');
    }

    return {
      content: choice.message?.content || null,
      tool_calls: choice.message?.tool_calls,
      finish_reason: choice.finish_reason ?? null,
    };
  }

  /**
   * ストリーミングチャット
   * テキストチャンクと、最終的なツール呼び出しを返す
   */
  async *chatCompletionStream(
    messages: ChatMessage[],
    tools?: OpenAITool[]
  ): AsyncGenerator<{ type: 'text'; text: string } | { type: 'tool_calls'; tool_calls: ToolCall[] }, void, unknown> {
    const body: Record<string, unknown> = {
      model: this.model,
      messages: messages.map((m) => this.formatMessage(m)),
      stream: true,
    };

    if (tools && tools.length > 0) {
      body.tools = tools;
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${error}`);
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    // ツール呼び出しを集約するためのマップ
    const toolCallsMap = new Map<number, { id: string; type: 'function'; function: { name: string; arguments: string } }>();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          if (!trimmed.startsWith('data: ')) continue;

          try {
            const json = JSON.parse(trimmed.slice(6));
            const delta: StreamDelta = json.choices?.[0]?.delta;

            if (delta?.content) {
              yield { type: 'text', text: delta.content };
            }

            if (delta?.tool_calls) {
              for (const tc of delta.tool_calls) {
                const existing = toolCallsMap.get(tc.index);
                if (!existing) {
                  toolCallsMap.set(tc.index, {
                    id: tc.id || '',
                    type: 'function',
                    function: {
                      name: tc.function?.name || '',
                      arguments: tc.function?.arguments || '',
                    },
                  });
                } else {
                  if (tc.id) existing.id = tc.id;
                  if (tc.function?.name) existing.function.name += tc.function.name;
                  if (tc.function?.arguments) existing.function.arguments += tc.function.arguments;
                }
              }
            }
          } catch (error) {
            // JSON parse error during streaming - may occur with incomplete chunks
            console.debug('[OpenAI] JSON parse error in stream:', error);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    // ツール呼び出しがあれば最後に返す
    if (toolCallsMap.size > 0) {
      const toolCalls = Array.from(toolCallsMap.values());
      yield { type: 'tool_calls', tool_calls: toolCalls };
    }
  }

  /**
   * メッセージを OpenAI API 形式に変換
   */
  private formatMessage(message: ChatMessage): Record<string, unknown> {
    const formatted: Record<string, unknown> = {
      role: message.role,
      content: message.content,
    };

    if (message.tool_calls) {
      formatted.tool_calls = message.tool_calls;
    }

    if (message.tool_call_id) {
      formatted.tool_call_id = message.tool_call_id;
    }

    return formatted;
  }
}
