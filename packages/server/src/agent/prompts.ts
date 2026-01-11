import type { CustomInstructionRecord } from '../db/repositories/custom-instructions.js';

export interface BuildSystemPromptParams {
  reportType: 'on_fetch' | 'daily';
  customInstructions: CustomInstructionRecord[];
  serverBaseUrl: string;
}

export function buildSystemPrompt(params: BuildSystemPromptParams): string {
  const { reportType, customInstructions, serverBaseUrl } = params;
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

  const activeInstructions = customInstructions
    .filter((inst) => inst.is_active === 1)
    .sort((a, b) => b.priority - a.priority);

  if (activeInstructions.length > 0) {
    const instructionsList = activeInstructions
      .map((inst) => `- ${inst.instruction}`)
      .join('\n');
    prompt += `\n\n## ユーザーからの特別な指示\n以下の点に特に注意してください：\n${instructionsList}\n`;
  }

  return prompt;
}

export function buildUserPrompt(periodStart: Date, periodEnd: Date): string {
  return `${periodStart.toISOString()}から${periodEnd.toISOString()}までのヘルスデータを分析し、評価レポートを作成してください。`;
}
