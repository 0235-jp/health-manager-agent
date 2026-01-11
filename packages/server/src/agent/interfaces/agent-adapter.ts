import type { HealthDataRecord } from '../../db/repositories/health-data.js';

export interface AgentAdapter {
  readonly name: string;

  initialize(): Promise<void>;

  generateReport(params: GenerateReportParams): Promise<ReportContent>;

  dispose?(): Promise<void>;
}

export interface GenerateReportParams {
  reportType: 'on_fetch' | 'daily';
  periodStart: Date;
  periodEnd: Date;
  healthData?: HealthDataRecord[];
  customInstructions?: Array<{
    instruction: string;
    priority: number;
  }>;
}

export interface MetricValue {
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
}

export interface ReportContent {
  summary: string;
  metrics: Record<string, MetricValue>;
  risks: string[];
  recommendations: string[];
}
