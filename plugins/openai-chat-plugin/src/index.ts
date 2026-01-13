/**
 * OpenAI Chat Plugin
 *
 * OpenAI API互換のエージェントプラグイン
 * ToolExecutor を使用してヘルスデータにアクセス
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  OpenAIApiClient,
  type ChatMessage as ApiChatMessage,
  type ToolCall,
  type OpenAITool,
} from './api-client.js';

// プラグインインターフェースの型定義
interface AgentManifest {
  name: string;
  displayName: string;
  version: string;
  type: 'agent';
  description?: string;
  author?: string;
  main: string;
  provider: string;
  supportedModels?: string[];
  capabilities: {
    streaming?: boolean;
    functionCalling?: boolean;
    structuredOutput?: boolean;
    vision?: boolean;
    skills?: boolean;
  };
  configSchema?: Record<string, unknown>;
}

interface GenerateReportParams {
  reportType: 'on_fetch' | 'daily';
  periodStart: Date;
  periodEnd: Date;
  customInstructions?: Array<{
    instruction: string;
    priority: number;
  }>;
}

interface ReportContent {
  summary: string;
  metrics: Record<
    string,
    {
      value: number;
      unit: string;
      trend: 'up' | 'down' | 'stable';
    }
  >;
  risks: string[];
  recommendations: string[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatParams {
  message: string;
  history: ChatMessage[];
  sessionId?: string;
  customInstructions?: Array<{
    instruction: string;
    priority: number;
  }>;
}

interface ChatResult {
  sessionId: string;
}

// ToolExecutor interface (from server package)
interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
  };
}

interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

interface ToolExecutor {
  getTools(): ToolDefinition[];
  execute(name: string, args: Record<string, unknown>): Promise<ToolResult>;
  hasTool(name: string): boolean;
}

// PromptBuilder interface (from server package)
interface PromptBuilder {
  buildReportSystemPrompt(
    params: GenerateReportParams,
    useSkills: boolean
  ): string;
  buildReportUserPrompt(params: GenerateReportParams): string;
  buildChatSystemPrompt(
    params: { customInstructions?: Array<{ instruction: string; priority: number }> },
    useSkills: boolean
  ): string;
}

// PluginContext interface (from server package)
interface PluginContext {
  config: Record<string, unknown>;
  toolExecutor?: ToolExecutor;
  promptBuilder?: PromptBuilder;
  useSkills?: boolean;
}

interface AgentPlugin {
  readonly manifest: AgentManifest;
  readonly name: string;
  initialize(context: PluginContext): Promise<void>;
  dispose(): Promise<void>;
  generateReport(params: GenerateReportParams): Promise<ReportContent>;
  chat?(params: ChatParams): AsyncGenerator<string, ChatResult, unknown>;
}

// manifest.jsonを読み込み
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const manifestPath = path.resolve(__dirname, '..', 'manifest.json');

/**
 * OpenAI Chat Plugin 実装
 */
class OpenAIChatPlugin implements AgentPlugin {
  readonly manifest: AgentManifest;
  readonly name = 'openai-chat';

  private client: OpenAIApiClient | null = null;
  private toolExecutor?: ToolExecutor;
  private promptBuilder?: PromptBuilder;

  constructor(manifest: AgentManifest) {
    this.manifest = manifest;
  }

  async initialize(context: PluginContext): Promise<void> {
    const { config } = context;

    // Store toolExecutor and promptBuilder from context
    this.toolExecutor = context.toolExecutor;
    this.promptBuilder = context.promptBuilder;

    // Get configuration
    const baseUrl = (config.baseUrl as string) || 'https://api.openai.com/v1';
    const apiKey = config.apiKey as string;
    const model = (config.model as string) || 'gpt-4o-mini';

    if (apiKey) {
      this.client = new OpenAIApiClient({
        baseUrl,
        apiKey,
        model,
      });
      console.log(`[OpenAIChatPlugin] Initialized with model: ${model}`);
    } else {
      console.log('[OpenAIChatPlugin] Initialized without API key');
    }
  }

  async dispose(): Promise<void> {
    this.client = null;
  }

  /**
   * 必要な依存関係が初期化されているか検証
   */
  private ensureInitialized(): {
    client: OpenAIApiClient;
    promptBuilder: PromptBuilder;
    toolExecutor: ToolExecutor;
  } {
    if (!this.client) {
      throw new Error('API key is not configured');
    }
    if (!this.promptBuilder) {
      throw new Error('PromptBuilder not initialized');
    }
    if (!this.toolExecutor) {
      throw new Error('ToolExecutor not initialized');
    }
    return {
      client: this.client,
      promptBuilder: this.promptBuilder,
      toolExecutor: this.toolExecutor,
    };
  }

  /**
   * レポート生成
   */
  async generateReport(params: GenerateReportParams): Promise<ReportContent> {
    const { client, promptBuilder, toolExecutor } = this.ensureInitialized();

    // 1. プロンプト生成 (useSkills=false)
    const systemPrompt = promptBuilder.buildReportSystemPrompt(params, false);
    const userPrompt = promptBuilder.buildReportUserPrompt(params);

    // 2. ツール定義を OpenAI 形式に変換
    const tools = this.convertToolsToOpenAIFormat(toolExecutor.getTools());

    // 3. メッセージ履歴を初期化
    const messages: ApiChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    // 4. ツール呼び出しループ
    const maxIterations = 10;
    for (let i = 0; i < maxIterations; i++) {
      const response = await client.chatCompletion(messages, tools);

      // ツール呼び出しがない場合は終了
      if (!response.tool_calls || response.tool_calls.length === 0) {
        return this.parseReportContent(response.content || '');
      }

      // アシスタントメッセージを追加
      messages.push({
        role: 'assistant',
        content: response.content,
        tool_calls: response.tool_calls,
      });

      // 各ツールを実行して結果を追加
      for (const toolCall of response.tool_calls) {
        const result = await this.executeToolCall(toolCall);
        messages.push({
          role: 'tool',
          content: JSON.stringify(result),
          tool_call_id: toolCall.id,
        });
      }
    }

    throw new Error('Max iterations reached without completing report');
  }

  /**
   * ストリーミングチャット
   */
  async *chat(params: ChatParams): AsyncGenerator<string, ChatResult, unknown> {
    const { client, promptBuilder, toolExecutor } = this.ensureInitialized();

    // 1. プロンプト生成 (useSkills=false)
    const systemPrompt = promptBuilder.buildChatSystemPrompt(
      { customInstructions: params.customInstructions },
      false
    );

    // 2. ツール定義
    const tools = this.convertToolsToOpenAIFormat(toolExecutor.getTools());

    // 3. メッセージ構築
    const messages: ApiChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...params.history.map((h) => ({
        role: h.role,
        content: h.content,
      })),
      { role: 'user', content: params.message },
    ];

    // 4. ストリーミングループ
    const maxIterations = 10;
    for (let i = 0; i < maxIterations; i++) {
      let toolCalls: ToolCall[] = [];
      let textContent = '';

      for await (const chunk of client.chatCompletionStream(messages, tools)) {
        if (chunk.type === 'text') {
          textContent += chunk.text;
          yield chunk.text;
        } else if (chunk.type === 'tool_calls') {
          toolCalls = chunk.tool_calls;
        }
      }

      // ツール呼び出しがない場合は終了
      if (toolCalls.length === 0) {
        return { sessionId: params.sessionId || this.generateSessionId() };
      }

      // アシスタントメッセージを追加
      messages.push({
        role: 'assistant',
        content: textContent || null,
        tool_calls: toolCalls,
      });

      // 各ツールを実行して結果を追加
      for (const toolCall of toolCalls) {
        const result = await this.executeToolCall(toolCall);
        messages.push({
          role: 'tool',
          content: JSON.stringify(result),
          tool_call_id: toolCall.id,
        });
      }
    }

    return { sessionId: params.sessionId || this.generateSessionId() };
  }

  /**
   * ツール呼び出しを実行
   */
  private async executeToolCall(toolCall: ToolCall): Promise<ToolResult> {
    if (!this.toolExecutor) {
      return { success: false, error: 'ToolExecutor not available' };
    }

    try {
      const args = JSON.parse(toolCall.function.arguments);
      console.log(`[OpenAIChatPlugin] Executing tool: ${toolCall.function.name}`, args);
      const result = await this.toolExecutor.execute(toolCall.function.name, args);
      console.log(`[OpenAIChatPlugin] Tool result:`, JSON.stringify(result).slice(0, 200));
      return result;
    } catch (error) {
      console.error(`[OpenAIChatPlugin] Tool execution error:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * ツール定義を OpenAI 形式に変換
   */
  private convertToolsToOpenAIFormat(tools: ToolDefinition[]): OpenAITool[] {
    return tools.map((tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }

  /**
   * レポートコンテンツをパース
   */
  private parseReportContent(content: string): ReportContent {
    try {
      // JSONブロックを抽出
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;

      const parsed = JSON.parse(jsonStr);
      return {
        summary: parsed.summary || '',
        metrics: parsed.metrics || {},
        risks: parsed.risks || [],
        recommendations: parsed.recommendations || [],
      };
    } catch {
      // パースに失敗した場合はフォールバック
      return {
        summary: content,
        metrics: {},
        risks: [],
        recommendations: [],
      };
    }
  }

  /**
   * セッションIDを生成
   */
  private generateSessionId(): string {
    return `openai-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}

// manifest.jsonを読み込んでキャッシュ
let cachedManifest: AgentManifest | null = null;

function loadManifest(): AgentManifest {
  if (!cachedManifest) {
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    cachedManifest = JSON.parse(manifestContent) as AgentManifest;
  }
  return cachedManifest;
}

/**
 * プラグインファクトリ関数
 */
export function createPlugin(): AgentPlugin {
  return new OpenAIChatPlugin(loadManifest());
}

export default createPlugin;
