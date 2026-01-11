import { query, type PermissionResult } from '@anthropic-ai/claude-agent-sdk';
import path from 'path';
import type { AgentAdapter, GenerateReportParams, ReportContent } from '../interfaces/agent-adapter.js';
import { buildSystemPrompt, buildUserPrompt } from '../prompts.js';
import { customInstructionsRepository } from '../../db/repositories/custom-instructions.js';
import { config } from '../../config/index.js';

type ToolInput = Record<string, unknown>;

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

export class AnthropicAgentAdapter implements AgentAdapter {
  readonly name = 'anthropic';
  private projectRoot: string;
  private serverBaseUrl: string;

  constructor() {
    this.projectRoot = path.resolve(import.meta.dirname, '../../../../..');
    this.serverBaseUrl = config.serverBaseUrl;
  }

  async initialize(): Promise<void> {}

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
    const customInstructions =
      params.customInstructions ?? customInstructionsRepository.findActive();

    const systemPrompt = buildSystemPrompt({
      reportType: params.reportType,
      customInstructions,
      serverBaseUrl: this.serverBaseUrl,
    });
    const userPrompt = buildUserPrompt(params.periodStart, params.periodEnd);

    const q = query({
      prompt: userPrompt,
      options: {
        cwd: this.projectRoot,
        systemPrompt,
        settingSources: ['project'],
        model: 'claude-opus-4-5-20251101',
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

  async dispose(): Promise<void> {}
}
