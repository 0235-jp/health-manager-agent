/**
 * Prompt Builder - constructs system prompts for agent plugins
 */

import type { ToolExecutor, ToolDefinition } from './interfaces.js';
import { settingsRepository } from '../../db/repositories/settings.js';

const DEFAULT_TIMEZONE = 'Asia/Tokyo';

const SEX_LABELS: Record<string, string> = {
  male: '男性',
  female: '女性',
  other: 'その他',
};

/**
 * Format data type categories for display
 */
function formatDataTypeCategory(
  categories: Record<string, readonly string[]>
): string {
  return Object.entries(categories)
    .map(([category, types]) => `- ${category}: ${types.join(', ')}`)
    .join('\n');
}

/**
 * Data type categories for report analysis
 *
 * TREND_BASED: 計測頻度が低い、または範囲外でも最新の傾向を分析に含めたいデータ
 *   → get-health-data-trend や get-health-data-latest で最新傾向を取得
 *
 * RANGE_BASED: 計測頻度が高く、指定範囲内のデータを見たいデータ
 *   → get-health-data で範囲指定して取得
 */
export const DATA_TYPE_CATEGORIES = {
  TREND_BASED: {
    身体測定: [
      'body_weight',
      'body_fat',
      'muscle_mass',
      'bone_mass',
      'body_water',
      'visceral_fat',
    ],
    フィットネス: ['vo2_max', 'cardiovascular_age'],
    健康検査: ['blood_glucose', 'uric_acid', 'urine_bilirubin', 'urine_glucose'],
    睡眠: [
      'sleep_duration',
      'deep_sleep',
      'light_sleep',
      'rem_sleep',
      'sleep_efficiency',
      'sleep_latency',
      'time_in_bed',
      'awake_time',
    ],
    体温: [
      'body_temperature',
      'skin_temperature',
      'body_temperature_rest',
      'temperature_deviation',
    ],
  },
  RANGE_BASED: {
    '心臓・循環器': [
      'heart_rate',
      'resting_heart_rate',
      'heart_rate_variability',
      'blood_pressure_systolic',
      'blood_pressure_diastolic',
      'spo2',
      'ecg',
      'ecg_afib',
      'respiratory_rate',
    ],
    活動: ['steps', 'workout_duration', 'workout_calories', 'calories_burned', 'sedentary_time'],
    栄養: [
      'water_intake',
      'calories_intake',
      'nutrition_protein',
      'nutrition_carbs',
      'nutrition_fat',
    ],
    精神: ['session_duration'],
    CGM: ['cgm_blood_glucose'],
    女性の健康: [
      'menstrual_flow',
      'menstrual_cycle',
      'ovulation_detection',
      'cervical_mucus',
      'dysmenorrhoea',
    ],
  },
} as const;

/**
 * User profile type for prompts
 */
interface UserProfile {
  birthDate?: string;
  height?: number;
  sex?: 'male' | 'female' | 'other';
  medicalConditions?: string[];
  allergies?: string[];
}

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
    const userProfileSection = this.buildUserProfileSection();
    const dataTypeCategoriesSection = this.buildDataTypeCategoriesSection();

    const basePrompt = `あなたはヘルスデータアナリストです。
ユーザーのヘルスデータを分析し、${reportTypeLabel}評価レポートを作成してください。
${userProfileSection ? `\n${userProfileSection}\n` : ''}
${dataAccessInstructions}

${dataTypeCategoriesSection}

レポートには以下を含めてください：
- 全体的な健康状態のサマリー
- 各指標の現在値とトレンド
- 健康診断画像がある場合、その内容の分析結果
- リスクや注意点
- 改善のための推奨事項
- ユーザーに即座に通知すべきアラート（運動不足、睡眠不良、異常値など）

レポートは以下のJSON形式で出力してください：
{
  "summary": "全体サマリー",
  "metrics": {
    "metric_name": { "value": 数値, "unit": "単位", "trend": "up|down|stable" }
  },
  "risks": ["リスク1", "リスク2"],
  "recommendations": ["推奨事項1", "推奨事項2"],
  "alerts": [
    {
      "id": "alert_タイプ_日付（例: alert_low_steps_20260124）",
      "type": "アラートタイプ（例: low_steps, poor_sleep, high_heart_rate）",
      "message": "ユーザーへの通知メッセージ（チャットで送信される）",
      "priority": "high|medium|low",
      "actionRequired": true,
      "verificationPrompt": "対応後の検証プロンプト（オプション）"
    }
  ]
}

alertsフィールドについて：
- ユーザーにチャットで即座に通知すべき内容がある場合に含めてください
- 極端な運動不足、睡眠の質低下、バイタルの異常値など、アクションが必要な状況で使用してください
- アラートがない場合は空配列 [] にしてください`;

    return basePrompt + this.formatCustomInstructions(params.customInstructions);
  }

  buildReportUserPrompt(params: ReportPromptParams): string {
    const settings = settingsRepository.getAll();
    const timezone = (settings.timezone as string) || DEFAULT_TIMEZONE;
    const startStr = this.formatDateForDisplay(params.periodStart, timezone);
    const endStr = this.formatDateForDisplay(params.periodEnd, timezone);
    return `${startStr}から${endStr}までのヘルスデータを分析し、評価レポートを作成してください。`;
  }

  private formatDateForDisplay(date: Date, timezone: string): string {
    const formatted = date.toLocaleString('ja-JP', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${formatted} (${timezone})`;
  }

  buildChatSystemPrompt(params: ChatPromptParams, useSkills: boolean): string {
    const dataAccessInstructions = useSkills
      ? this.buildSkillsInstructions()
      : this.buildToolsInstructions();

    const basePrompt = `あなたは健康管理アシスタントです。
ユーザーの健康データに基づいてアドバイスを提供します。
健康診断画像も参照可能です。ユーザーが画像について質問した場合は画像データを取得して分析してください。

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

ヘルスデータを取得するには、以下のスキルを使用してください：
- get-health-data: 日次データの取得（期間指定、最新値、トレンド分析）
- get-health-data-timeseries: 時系列データの取得（心拍数、HRV、睡眠フェーズなど高頻度データ）
- get-health-images: 健康診断画像の取得（ファイルパスを取得して直接参照してください）

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

  /**
   * Build data type categories section for prompts
   */
  private buildDataTypeCategoriesSection(): string {
    return `## データタイプと取得方法

### トレンドベース（最新傾向を見るデータ）
以下のデータは計測頻度が低い、または評価期間外でも最新の傾向を分析に含めるべきデータです。
get-health-data-trend や get-health-data-latest を使用して最新傾向を取得してください。

${formatDataTypeCategory(DATA_TYPE_CATEGORIES.TREND_BASED)}

### 範囲ベース（期間内データを見るデータ）
以下のデータは評価期間内のデータを get-health-data で取得して分析してください。

${formatDataTypeCategory(DATA_TYPE_CATEGORIES.RANGE_BASED)}

### 時系列データ
以下の高頻度データも利用可能です。詳細な分析が必要な場合は get-health-data-timeseries を使用してください。
- heart_rate_timeseries: 心拍数（1分間隔）
- oura:sleep_hr: 睡眠中心拍数（5分間隔）
- oura:sleep_hrv: 睡眠中HRV（5分間隔）
- oura:met: MET値（1分間隔）
- oura:sleep_phase: 睡眠フェーズ（5分間隔、1=deep,2=light,3=rem,4=awake）
- oura:activity_class: アクティビティクラス（5分間隔、0-5）

時系列データは集計（min/max/avg）やリサンプリングにも対応しています。

### その他のデータタイプ
上記以外のデータタイプも存在する場合があります。get-data-types で利用可能なデータタイプ一覧を確認し、分析に有用なものがあれば積極的に活用してください。`;
  }

  /**
   * Build user profile section for prompts
   */
  private buildUserProfileSection(): string {
    const settings = settingsRepository.getAll();
    const profile = settings.user_profile as UserProfile | undefined;

    if (!profile) {
      return '';
    }

    const lines: string[] = [];

    if (profile.birthDate) {
      const age = this.calculateAge(profile.birthDate);
      if (age !== null) {
        lines.push(`- 年齢: ${age}歳`);
      }
    }

    if (profile.height) {
      lines.push(`- 身長: ${profile.height} cm`);
    }

    if (profile.sex) {
      lines.push(`- 性別: ${SEX_LABELS[profile.sex] || profile.sex}`);
    }

    if (profile.medicalConditions && profile.medicalConditions.length > 0) {
      lines.push(`- 持病: ${profile.medicalConditions.join('、')}`);
    }

    if (profile.allergies && profile.allergies.length > 0) {
      lines.push(`- アレルギー: ${profile.allergies.join('、')}`);
    }

    if (lines.length === 0) {
      return '';
    }

    return `## ユーザー情報
${lines.join('\n')}`;
  }

  /**
   * Calculate age from birth date
   */
  private calculateAge(birthDate: string): number | null {
    const birth = new Date(birthDate);
    if (isNaN(birth.getTime())) {
      return null;
    }

    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      age--;
    }

    return age;
  }
}
