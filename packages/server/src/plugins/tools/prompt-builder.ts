/**
 * Prompt Builder - constructs system prompts for agent plugins
 */

import type { ToolExecutor, ToolDefinition } from './interfaces.js';

/**
 * Custom instruction for prompts
 */
export interface CustomInstruction {
  instruction: string;
  priority: number;
}

/**
 * Parameters for building report prompts
 */
export interface ReportPromptParams {
  reportType: 'on_fetch' | 'daily';
  periodStart: Date;
  periodEnd: Date;
  customInstructions?: CustomInstruction[];
}

/**
 * Parameters for building chat prompts
 */
export interface ChatPromptParams {
  customInstructions?: CustomInstruction[];
}

/**
 * Prompt builder interface
 */
export interface PromptBuilder {
  /**
   * Build system prompt for report generation
   * @param params Report parameters
   * @param useSkills true for Skill-based agents (Claude Agent SDK), false for tool-based agents
   */
  buildReportSystemPrompt(params: ReportPromptParams, useSkills: boolean): string;

  /**
   * Build user prompt for report generation
   */
  buildReportUserPrompt(params: ReportPromptParams): string;

  /**
   * Build system prompt for chat
   * @param params Chat parameters
   * @param useSkills true for Skill-based agents (Claude Agent SDK), false for tool-based agents
   */
  buildChatSystemPrompt(params: ChatPromptParams, useSkills: boolean): string;
}

/**
 * Default implementation of PromptBuilder
 */
export class DefaultPromptBuilder implements PromptBuilder {
  constructor(
    private toolExecutor: ToolExecutor,
    private serverBaseUrl: string
  ) {}

  buildReportSystemPrompt(
    params: ReportPromptParams,
    useSkills: boolean
  ): string {
    const reportTypeLabel = params.reportType === 'daily' ? '日次' : '定期';
    const dataAccessInstructions = useSkills
      ? this.buildSkillsInstructions()
      : this.buildToolsInstructions();

    const basePrompt = `あなたはヘルスデータアナリストです。
ユーザーのヘルスデータを分析し、${reportTypeLabel}評価レポートを作成してください。

${dataAccessInstructions}

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
}`;

    return basePrompt + this.formatCustomInstructions(params.customInstructions);
  }

  buildReportUserPrompt(params: ReportPromptParams): string {
    return `${params.periodStart.toISOString()}から${params.periodEnd.toISOString()}までのヘルスデータを分析し、評価レポートを作成してください。`;
  }

  buildChatSystemPrompt(params: ChatPromptParams, useSkills: boolean): string {
    const dataAccessInstructions = useSkills
      ? this.buildSkillsInstructions()
      : this.buildToolsInstructions();

    const basePrompt = `あなたは健康管理アシスタントです。
ユーザーの健康データに基づいてアドバイスを提供します。

${dataAccessInstructions}

ユーザーに対して親切で分かりやすい日本語で回答してください。`;

    return basePrompt + this.formatCustomInstructions(params.customInstructions);
  }

  /**
   * Build instructions for Skill-based agents (Claude Agent SDK)
   */
  private buildSkillsInstructions(): string {
    return `## サーバー情報
SERVER_BASE_URL: ${this.serverBaseUrl}

ヘルスデータを取得するには、get-health-data スキルを使用してください。
データを取得する際は、必要に応じて日付範囲を指定してください。`;
  }

  /**
   * Build instructions for tool-based agents (OpenAI, etc.)
   */
  private buildToolsInstructions(): string {
    const toolDescriptions = this.generateToolDescriptions();

    return `## 利用可能なツール
以下のツールを function calling で呼び出してヘルスデータを取得してください。

${toolDescriptions}`;
  }

  /**
   * Generate tool descriptions for prompts
   */
  private generateToolDescriptions(): string {
    const tools = this.toolExecutor.getTools();

    return tools
      .map((tool) => {
        const params = this.formatToolParameters(tool);
        return `### ${tool.name}
${tool.description}

パラメータ:
${params}`;
      })
      .join('\n\n');
  }

  /**
   * Format tool parameters for display
   */
  private formatToolParameters(tool: ToolDefinition): string {
    const props = tool.parameters.properties;
    const required = tool.parameters.required;

    return Object.entries(props)
      .map(([name, prop]) => {
        const isRequired = required.includes(name);
        const requiredMark = isRequired ? ' (必須)' : '';
        return `  - ${name}${requiredMark}: ${prop.description}`;
      })
      .join('\n');
  }

  /**
   * Format custom instructions sorted by priority
   */
  private formatCustomInstructions(
    customInstructions?: CustomInstruction[]
  ): string {
    if (!customInstructions || customInstructions.length === 0) {
      return '';
    }

    const sorted = [...customInstructions].sort(
      (a, b) => b.priority - a.priority
    );
    const list = sorted.map((inst) => `- ${inst.instruction}`).join('\n');

    return `

## ユーザーからの特別な指示
以下の点に特に注意してください：
${list}`;
  }
}
