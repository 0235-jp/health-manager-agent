/**
 * Anthropic Claude Agent Plugin
 *
 * Anthropic Claude Agent SDKを使用してヘルスデータ分析レポートを生成するプラグイン
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
  };
  configSchema?: Record<string, unknown>;
  requiredEnvVars?: string[];
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

interface AgentPlugin {
  readonly manifest: AgentManifest;
  readonly name: string;
  initialize(config: Record<string, unknown>): Promise<void>;
  dispose(): Promise<void>;
  generateReport(params: GenerateReportParams): Promise<ReportContent>;
}

type ToolInput = Record<string, unknown>;

// manifest.jsonを読み込み
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const manifestPath = path.resolve(__dirname, '..', 'manifest.json');

// Tools available for health data analysis
const AVAILABLE_TOOLS = ['Bash', 'Skill'] as const;

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
 * システムプロンプトを構築
 */
function buildSystemPrompt(
  reportType: 'on_fetch' | 'daily',
  customInstructions: Array<{ instruction: string; priority: number }>,
  serverBaseUrl: string
): string {
  const reportTypeLabel = reportType === 'daily' ? '日次' : '定期';

  let prompt = `あなたはヘルスデータアナリストです。
ユーザーのヘルスデータを分析し、${reportTypeLabel}評価レポートを作成してください。

## サーバー情報
SERVER_BASE_URL: ${serverBaseUrl}

ヘルスデータを取得するには、get-health-data スキルを使用してください。

レポートには以下を含めてください：
- 全体的な健康状態のサマリー
- 各指標の現在値とトレンド
- リスクや注意点
- 改善のための推奨事項

レポートは以下のJSON形式で出力してください：
{
  "summary": "全体サマリー",
  "metrics": {
    "metric_name": { "value": 数値, "unit": "単位", "trend": "up|down|stable" }
  },
  "risks": ["リスク1", "リスク2"],
  "recommendations": ["推奨事項1", "推奨事項2"]
}
`;

  const sortedInstructions = [...customInstructions].sort(
    (a, b) => b.priority - a.priority
  );

  if (sortedInstructions.length > 0) {
    const instructionsList = sortedInstructions
      .map((inst) => `- ${inst.instruction}`)
      .join('\n');
    prompt += `\n\n## ユーザーからの特別な指示\n以下の点に特に注意してください：\n${instructionsList}\n`;
  }

  return prompt;
}

/**
 * ユーザープロンプトを構築
 */
function buildUserPrompt(periodStart: Date, periodEnd: Date): string {
  return `${periodStart.toISOString()}から${periodEnd.toISOString()}までのヘルスデータを分析し、評価レポートを作成してください。`;
}

/**
 * Anthropic Agent Plugin 実装
 */
class AnthropicAgentPlugin implements AgentPlugin {
  readonly manifest: AgentManifest;
  readonly name = 'anthropic';

  private projectRoot: string;
  private serverBaseUrl: string = 'http://localhost:3001';
  private model: string = 'claude-opus-4-5-20251101';

  constructor(manifest: AgentManifest) {
    this.manifest = manifest;
    // プロジェクトルートを設定（プラグインディレクトリから3階層上）
    this.projectRoot = path.resolve(__dirname, '..', '..', '..');
  }

  async initialize(config: Record<string, unknown>): Promise<void> {
    // 設定からモデルを取得
    if (config.model && typeof config.model === 'string') {
      this.model = config.model;
    }

    // 環境変数からサーバーURLを取得
    if (process.env.SERVER_BASE_URL) {
      this.serverBaseUrl = process.env.SERVER_BASE_URL;
    }

    console.log(`[AnthropicAgentPlugin] Initialized with model: ${this.model}`);
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
    if (toolName === 'Bash') {
      const command = input.command as string;

      if (command.includes('curl')) {
        const isLocalRequest =
          command.includes(this.serverBaseUrl) ||
          command.includes('localhost:') ||
          command.includes('127.0.0.1:');

        if (isLocalRequest) {
          return { behavior: 'allow', updatedInput: input };
        }

        return {
          behavior: 'deny',
          message: `外部へのリクエストは許可されていません: ${command}`,
        };
      }

      return {
        behavior: 'deny',
        message: `Bashコマンドは許可されていません: ${command}`,
      };
    }

    if (toolName === 'Skill') {
      return { behavior: 'allow', updatedInput: input };
    }

    return {
      behavior: 'deny',
      message: `ツール ${toolName} は許可されていません`,
    };
  };

  async generateReport(params: GenerateReportParams): Promise<ReportContent> {
    const customInstructions = params.customInstructions || [];

    const systemPrompt = buildSystemPrompt(
      params.reportType,
      customInstructions,
      this.serverBaseUrl
    );
    const userPrompt = buildUserPrompt(params.periodStart, params.periodEnd);

    const q = query({
      prompt: userPrompt,
      options: {
        cwd: this.projectRoot,
        systemPrompt,
        settingSources: ['project'],
        model: this.model,
        tools: [...AVAILABLE_TOOLS],
        canUseTool: this.canUseTool,
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
  return new AnthropicAgentPlugin(loadManifest());
}

/**
 * デフォルトエクスポート（ファクトリ関数）
 */
export default function(): AgentPlugin {
  return new AnthropicAgentPlugin(loadManifest());
}
