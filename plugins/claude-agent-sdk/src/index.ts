/**
 * Claude Agent SDK Plugin
 *
 * Claude Agent SDKを使用してヘルスデータ分析レポートを生成するプラグイン
 */

import { query, type PermissionResult } from '@anthropic-ai/claude-agent-sdk';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// プラグインインターフェースの型定義（serverパッケージから共有）
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
  metrics: Record<string, {
    value: number;
    unit: string;
    trend: 'up' | 'down' | 'stable';
  }>;
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

// PromptBuilder interface (from server package)
interface PromptBuilder {
  buildReportSystemPrompt(params: GenerateReportParams, useSkills: boolean): string;
  buildReportUserPrompt(params: GenerateReportParams): string;
  buildChatSystemPrompt(params: { customInstructions?: Array<{ instruction: string; priority: number }> }, useSkills: boolean): string;
}

// PluginContext interface (from server package)
interface PluginContext {
  config: Record<string, unknown>;
  toolExecutor?: unknown;
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

type ToolInput = Record<string, unknown>;

// manifest.jsonを読み込み
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const manifestPath = path.resolve(__dirname, '..', 'manifest.json');

// Tools available for health data analysis
const AVAILABLE_TOOLS = ['Bash', 'Skill', 'WebSearch', 'WebFetch'] as const;

const REPORT_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: '全体的な健康状態のサマリー' },
    metrics: {
      type: 'object',
      additionalProperties: {
        type: 'object',
        properties: {
          value: { type: 'number' },
          unit: { type: 'string' },
          trend: { type: 'string', enum: ['up', 'down', 'stable'] },
        },
        required: ['value', 'unit', 'trend'],
      },
    },
    risks: { type: 'array', items: { type: 'string' } },
    recommendations: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'metrics', 'risks', 'recommendations'],
} as const;

/**
 * Claude Agent SDK Plugin 実装
 */
class ClaudeAgentPlugin implements AgentPlugin {
  readonly manifest: AgentManifest;
  readonly name = 'claude-agent-sdk';

  private projectRoot: string;
  private model: string = 'claude-opus-4-5-20251101';
  private promptBuilder?: PromptBuilder;

  constructor(manifest: AgentManifest) {
    this.manifest = manifest;
    // プロジェクトルートを設定（プラグインディレクトリから3階層上）
    this.projectRoot = path.resolve(__dirname, '..', '..', '..');
  }

  async initialize(context: PluginContext): Promise<void> {
    const { config } = context;

    this.applyStringConfig(config, 'model', (value) => { this.model = value; });
    this.applyStringConfig(config, 'apiKey', (value) => { process.env.ANTHROPIC_API_KEY = value; });
    this.applyStringConfig(config, 'baseUrl', (value) => { process.env.ANTHROPIC_BASE_URL = value; });

    // Store promptBuilder from context
    this.promptBuilder = context.promptBuilder;

    console.log(`[ClaudeAgentPlugin] Initialized with model: ${this.model}`);
  }

  private applyStringConfig(
    config: Record<string, unknown>,
    key: string,
    apply: (value: string) => void
  ): void {
    const value = config[key];
    if (typeof value === 'string' && value) {
      apply(value);
    }
  }

  async dispose(): Promise<void> {
    // クリーンアップ不要
  }

  /**
   * ツール使用許可の判定
   */
  private canUseTool = async (
    toolName: string,
    input: ToolInput
  ): Promise<PermissionResult> => {
    // Skill, WebSearch, WebFetch は無条件許可
    if (toolName === 'Skill' || toolName === 'WebSearch' || toolName === 'WebFetch') {
      return { behavior: 'allow', updatedInput: input };
    }

    if (toolName !== 'Bash') {
      return { behavior: 'deny', message: `ツール ${toolName} は許可されていません` };
    }

    const command = input.command as string;

    if (!command.includes('curl')) {
      return { behavior: 'deny', message: `Bashコマンドは許可されていません: ${command}` };
    }

    const isLocalRequest =
      command.includes('localhost:') ||
      command.includes('127.0.0.1:');

    if (isLocalRequest) {
      return { behavior: 'allow', updatedInput: input };
    }

    return { behavior: 'deny', message: `外部へのリクエストは許可されていません: ${command}` };
  };

  async generateReport(params: GenerateReportParams): Promise<ReportContent> {
    if (!this.promptBuilder) {
      throw new Error('PromptBuilder not initialized');
    }

    // Use promptBuilder from server (useSkills=true for Claude Agent SDK)
    const systemPrompt = this.promptBuilder.buildReportSystemPrompt(params, true);
    const userPrompt = this.promptBuilder.buildReportUserPrompt(params);

    const q = query({
      prompt: userPrompt,
      options: {
        ...this.getBaseQueryOptions(),
        systemPrompt,
        outputFormat: { type: 'json_schema', schema: REPORT_SCHEMA },
        persistSession: false,
      },
    });

    let reportContent: ReportContent | null = null;

    for await (const message of q) {
      if (message.type === 'result') {
        if (message.subtype === 'success' && message.result) {
          try {
            reportContent = JSON.parse(message.result) as ReportContent;
          } catch {
            reportContent = this.createFallbackReport(message.result);
          }
        } else if (message.subtype.startsWith('error_')) {
          throw new Error(`Agent error: ${message.subtype}`);
        }
      }
    }

    if (!reportContent) {
      throw new Error('No report content generated');
    }

    return reportContent;
  }

  private createFallbackReport(text: string): ReportContent {
    return {
      summary: text || 'レポートを生成できませんでした。',
      metrics: {},
      risks: [],
      recommendations: [],
    };
  }

  /**
   * 共通のクエリオプションを取得
   */
  private getBaseQueryOptions() {
    return {
      cwd: this.projectRoot,
      settingSources: ['project'] as ('project' | 'user')[],
      model: this.model,
      tools: [...AVAILABLE_TOOLS],
      canUseTool: this.canUseTool,
    };
  }

  /**
   * ストリーミングチャット
   * Claude Agent SDK のセッション機能を使用して会話を継続
   */
  async *chat(params: ChatParams): AsyncGenerator<string, ChatResult, unknown> {
    // 新規セッションの場合はpromptBuilderが必須
    if (!params.sessionId && !this.promptBuilder) {
      throw new Error('PromptBuilder not initialized');
    }

    const baseOptions = this.getBaseQueryOptions();

    // Build system prompt using promptBuilder (useSkills=true for Claude Agent SDK)
    const systemPrompt = params.sessionId
      ? undefined
      : this.promptBuilder!.buildChatSystemPrompt(
          { customInstructions: params.customInstructions },
          true
        );

    // セッションIDがある場合は再開、なければ新規セッション
    const queryOptions = params.sessionId
      ? { ...baseOptions, resume: params.sessionId }
      : {
          ...baseOptions,
          systemPrompt,
          persistSession: true,
        };

    const q = query({ prompt: params.message, options: queryOptions });
    let sessionId = params.sessionId || '';

    for await (const message of q) {
      // 初期化メッセージからセッションIDを取得
      if (message.type === 'system' && message.subtype === 'init') {
        sessionId = (message as { session_id?: string }).session_id || sessionId;
      }

      // アシスタントのテキストメッセージをストリーミング
      if (message.type === 'assistant' && message.message) {
        const content = message.message.content;
        if (Array.isArray(content)) {
          for (const block of content) {
            if (block.type === 'text' && block.text) {
              yield block.text;
            }
          }
        }
      }

      // エラー処理
      if (message.type === 'result' && message.subtype.startsWith('error_')) {
        throw new Error(`Agent error: ${message.subtype}`);
      }
    }

    return { sessionId };
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
  return new ClaudeAgentPlugin(loadManifest());
}

export default createPlugin;
