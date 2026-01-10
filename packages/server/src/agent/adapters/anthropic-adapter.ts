import { query } from '@anthropic-ai/claude-agent-sdk';
import type { AgentAdapter, GenerateReportParams, ReportContent } from '../interfaces/agent-adapter.js';
import { buildSystemPrompt, buildUserPrompt } from '../prompts.js';
import { customInstructionsRepository } from '../../db/repositories/custom-instructions.js';

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

  async initialize(): Promise<void> {}

  async generateReport(params: GenerateReportParams): Promise<ReportContent> {
    const customInstructions =
      params.customInstructions ?? customInstructionsRepository.findActive();

    const systemPrompt = buildSystemPrompt(params.reportType, customInstructions);
    const userPrompt = buildUserPrompt(params.periodStart, params.periodEnd);

    const q = query({
      prompt: userPrompt,
      options: {
        systemPrompt,
        model: 'claude-opus-4-5-20251101',
        maxTurns: 1,
        tools: [],
        outputFormat: { type: 'json_schema', schema: REPORT_SCHEMA },
        permissionMode: 'dontAsk',
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
            // If JSON parsing fails, create a basic report from the text
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
