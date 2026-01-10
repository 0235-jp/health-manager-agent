import type { AgentAdapter, GenerateReportParams, ReportContent } from './interfaces/agent-adapter.js';
import { settingsRepository } from '../db/repositories/settings.js';

export class AgentService {
  private static instance: AgentService;
  private adapter: AgentAdapter | null = null;

  private constructor() {}

  static getInstance(): AgentService {
    if (!AgentService.instance) {
      AgentService.instance = new AgentService();
    }
    return AgentService.instance;
  }

  async initialize(): Promise<void> {
    const settings = settingsRepository.getAll();
    const adapterType = (settings.agent_adapter as string) || 'anthropic';

    this.adapter = await this.createAdapter(adapterType);
    await this.adapter.initialize();
  }

  private async createAdapter(type: string): Promise<AgentAdapter> {
    switch (type) {
      case 'anthropic': {
        const { AnthropicAgentAdapter } = await import('./adapters/anthropic-adapter.js');
        return new AnthropicAgentAdapter();
      }
      default:
        throw new Error(`Unknown agent adapter type: ${type}`);
    }
  }

  getAdapter(): AgentAdapter {
    if (!this.adapter) {
      throw new Error('AgentService not initialized. Call initialize() first.');
    }
    return this.adapter;
  }

  async generateReport(params: GenerateReportParams): Promise<ReportContent> {
    return this.getAdapter().generateReport(params);
  }

  async dispose(): Promise<void> {
    if (this.adapter?.dispose) {
      await this.adapter.dispose();
    }
    this.adapter = null;
  }
}

export { AgentAdapter, GenerateReportParams, ReportContent } from './interfaces/agent-adapter.js';
