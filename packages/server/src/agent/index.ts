/**
 * AgentService - PluginManagerに委譲
 *
 * AgentPluginを通じてレポート生成を行う
 * 後方互換性のためAgentAdapterインターフェースを維持
 */

import type { AgentAdapter, GenerateReportParams, ReportContent } from './interfaces/agent-adapter.js';
import { PluginManager } from '../plugins/manager.js';
import { customInstructionsRepository } from '../db/repositories/custom-instructions.js';

export class AgentService {
  private static instance: AgentService;

  private constructor() {}

  static getInstance(): AgentService {
    if (!AgentService.instance) {
      AgentService.instance = new AgentService();
    }
    return AgentService.instance;
  }

  /**
   * 初期化
   * PluginManagerが初期化を担当するため、ここでは何もしない
   */
  async initialize(): Promise<void> {
    // PluginManagerが初期化を担当
    // 互換性のため空実装を維持
  }

  /**
   * 現在のAgentPluginを取得
   * AgentPluginはAgentAdapterインターフェースと互換
   */
  getAdapter(): AgentAdapter {
    const pluginManager = PluginManager.getInstance();
    const agent = pluginManager.getCurrentAgent();

    if (!agent) {
      throw new Error(
        'No agent plugin installed. Please install an agent plugin from the Plugins page.'
      );
    }

    // AgentPluginはAgentAdapterと互換のインターフェースを持つ
    return agent as unknown as AgentAdapter;
  }

  /**
   * レポートを生成
   * カスタム指示を自動的に取得してパラメータに追加
   */
  async generateReport(params: GenerateReportParams): Promise<ReportContent> {
    const adapter = this.getAdapter();

    // カスタム指示が指定されていない場合は取得
    if (!params.customInstructions) {
      const activeInstructions = customInstructionsRepository.findActive();
      params.customInstructions = activeInstructions.map((inst) => ({
        instruction: inst.instruction,
        priority: inst.priority,
      }));
    }

    return adapter.generateReport(params);
  }

  /**
   * エージェントを動的に切り替え
   * @param pluginName プラグイン名
   */
  async switchAgent(pluginName: string): Promise<void> {
    const pluginManager = PluginManager.getInstance();
    await pluginManager.setCurrentAgent(pluginName);
  }

  /**
   * クリーンアップ
   * PluginManagerが担当するため、ここでは何もしない
   */
  async dispose(): Promise<void> {
    // PluginManagerが担当
  }
}

export type { AgentAdapter, GenerateReportParams, ReportContent } from './interfaces/agent-adapter.js';
