import { query } from '@anthropic-ai/claude-agent-sdk';
import type { AgentAdapter, GenerateReportParams, ReportContent } from '../interfaces/agent-adapter.js';
import { buildSystemPrompt, buildUserPrompt } from '../prompts.js';
import { healthDataRepository } from '../../db/repositories/health-data.js';
import { customInstructionsRepository } from '../../db/repositories/custom-instructions.js';

export class AnthropicAgentAdapter implements AgentAdapter {
  readonly name = 'anthropic';

  async initialize(): Promise<void> {
    // No initialization needed - SDK uses Claude Code subscription
  }

  async generateReport(params: GenerateReportParams): Promise<ReportContent> {
    const customInstructions =
      params.customInstructions ?? customInstructionsRepository.findActive();

    const systemPrompt = buildSystemPrompt(params.reportType, customInstructions);
    const userPrompt = buildUserPrompt(params.periodStart, params.periodEnd);

    // Prepare health data context
    const healthData = params.healthData ?? this.fetchHealthData(params);
    const dataContext = this.formatHealthDataContext(healthData);

    const fullUserPrompt = `${userPrompt}\n\n## 利用可能なデータ\n${dataContext}`;

    const q = query({
      prompt: fullUserPrompt,
      options: {
        systemPrompt,
        model: 'claude-sonnet-4-20250514',
        maxTurns: 1,
        tools: [], // Disable tools for simple report generation
        outputFormat: {
          type: 'json_schema',
          schema: {
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
          },
        },
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

  private fetchHealthData(params: GenerateReportParams): import('../../db/repositories/health-data.js').HealthDataRecord[] {
    const dataTypes = ['weight', 'sleep_duration', 'steps', 'heart_rate', 'body_temperature'];
    return healthDataRepository.getRange(
      dataTypes,
      params.periodStart.toISOString(),
      params.periodEnd.toISOString()
    );
  }

  private formatHealthDataContext(
    data: import('../../db/repositories/health-data.js').HealthDataRecord[]
  ): string {
    if (data.length === 0) {
      return 'データがありません。';
    }

    const grouped: Record<string, typeof data> = {};
    for (const record of data) {
      if (!grouped[record.data_type]) {
        grouped[record.data_type] = [];
      }
      grouped[record.data_type].push(record);
    }

    let context = '';
    for (const [dataType, records] of Object.entries(grouped)) {
      context += `### ${dataType}\n`;
      for (const record of records.slice(-10)) {
        // Show last 10 records per type
        context += `- ${record.recorded_at}: ${record.value} ${record.unit ?? ''}\n`;
      }
      context += '\n';
    }

    return context;
  }

  private createFallbackReport(text: string): ReportContent {
    return {
      summary: text || 'レポートを生成できませんでした。',
      metrics: {},
      risks: [],
      recommendations: [],
    };
  }

  async dispose(): Promise<void> {
    // No cleanup needed
  }
}
