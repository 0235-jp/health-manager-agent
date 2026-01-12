/**
 * Scheduler - 定期実行ジョブ
 *
 * - データ収集ジョブ（DataSourceプラグイン経由）
 * - 日次レポートジョブ
 * - データ補完機能
 * - イベント発火（EventBus経由）
 */

import cron from 'node-cron';
import { AgentService } from '../agent/index.js';
import { PluginManager } from '../plugins/manager.js';
import { reportsRepository } from '../db/repositories/reports.js';
import { healthDataRepository } from '../db/repositories/health-data.js';
import { settingsRepository } from '../db/repositories/settings.js';
import { pluginCollectionStateRepository } from '../db/repositories/plugin-collection-state.js';
import type { NotificationEvent } from '../plugins/interfaces/notification.js';
import type { PerPluginFetchOptions, PluginFetchResult } from '../plugins/interfaces/index.js';

export interface BackfillResult {
  totalFetched: number;
  inserted: number;
  skipped: number;
  errors: Array<{ pluginName: string; error: string }>;
}

export interface DataCollectionResult {
  pluginResults: PluginFetchResult[];
  totalFetched: number;
  inserted: number;
  skipped: number;
}

export class Scheduler {
  private dataCollectionJob: cron.ScheduledTask | null = null;
  private dailyReportJob: cron.ScheduledTask | null = null;
  private static DEFAULT_TIMEZONE = 'Asia/Tokyo';

  async start(): Promise<void> {
    const settings = settingsRepository.getAll();
    const intervalSeconds = (settings.collection_interval as number) || 3600;
    const timezone = (settings.timezone as string) || Scheduler.DEFAULT_TIMEZONE;
    const cronExpression = this.secondsToCron(intervalSeconds);

    this.dataCollectionJob = cron.schedule(
      cronExpression,
      () => {
        this.runDataCollection().catch((error) => {
          console.error('[Scheduler] Failed to collect data:', error);
        });
      },
      { timezone }
    );

    console.log(`[Scheduler] Data collection job scheduled: ${cronExpression} (timezone: ${timezone})`);

    // 日次レポートジョブ（毎日0:05）
    this.dailyReportJob = cron.schedule(
      '5 0 * * *',
      () => {
        this.runDailyReport().catch((error) => {
          console.error('[Scheduler] Failed to generate daily report:', error);
        });
      },
      { timezone }
    );

    console.log(`[Scheduler] Daily report job scheduled at 00:05 (timezone: ${timezone})`);
  }

  /**
   * データ収集を実行（プラグインごとの状態管理付き）
   */
  async runDataCollection(): Promise<DataCollectionResult> {
    console.log('[Scheduler] Starting data collection...');

    const pluginManager = PluginManager.getInstance();
    const agentService = AgentService.getInstance();
    const periodEnd = new Date();

    // 1. アクティブなDataSourceプラグインを取得
    const activeDataSources = pluginManager
      .getPlugins('data-source')
      .filter((state) => state.isActive);

    if (activeDataSources.length === 0) {
      console.log('[Scheduler] No active data source plugins, skipping data collection');
      return { pluginResults: [], totalFetched: 0, inserted: 0, skipped: 0 };
    }

    // 2. プラグインごとの開始時刻を計算
    const perPluginOptions: PerPluginFetchOptions = {};
    for (const pluginState of activeDataSources) {
      const pluginName = pluginState.manifest.name;
      const state = pluginCollectionStateRepository.get(pluginName);

      // 前回成功時刻から取得、なければ24時間前から
      const startDate = state?.last_success_time
        ? new Date(state.last_success_time)
        : new Date(periodEnd.getTime() - 24 * 60 * 60 * 1000);

      perPluginOptions[pluginName] = { startDate, endDate: periodEnd };
    }

    // 3. プラグインごとにデータ取得
    const results = await pluginManager.executeDataSourcePluginsWithState(
      { endDate: periodEnd },
      perPluginOptions
    );

    // 4. 結果に応じて状態更新 & データ保存
    let totalFetched = 0;
    let inserted = 0;
    const allData: Array<{ data_type: string; value: number; unit: string; source: string; recorded_at: string }> = [];

    for (const result of results) {
      if (result.success) {
        pluginCollectionStateRepository.markSuccess(result.pluginName, result.fetchedAt);
        console.log(`[Scheduler] Plugin ${result.pluginName}: fetched ${result.data.length} records`);
      } else {
        pluginCollectionStateRepository.markFailure(result.pluginName, result.fetchedAt);
        console.error(`[Scheduler] Plugin ${result.pluginName} failed:`, result.errors);
      }

      // データを収集
      for (const item of result.data) {
        totalFetched++;
        allData.push({
          data_type: item.dataType,
          value: item.value,
          unit: item.unit,
          source: result.pluginName,
          recorded_at: item.recordedAt.toISOString(),
        });
      }
    }

    // 5. バッチでDB保存（INSERT OR IGNORE）
    if (allData.length > 0) {
      const batchResult = healthDataRepository.createBatch(allData);
      inserted = batchResult.inserted;
      console.log(`[Scheduler] Saved ${inserted}/${totalFetched} records (${totalFetched - inserted} duplicates skipped)`);

      // 6. 通知イベント発火（data:fetched）
      const dataTypes = [...new Set(allData.map(d => d.data_type))];
      await this.publishEvent({
        type: 'data:fetched',
        timestamp: new Date(),
        payload: {
          sourceName: 'scheduler',
          recordCount: inserted,
          dataTypes,
        },
      });
    }

    // 7. 取得時レポート生成（Agentプラグインがある場合のみ）
    const currentAgent = pluginManager.getCurrentAgent();
    if (currentAgent && inserted > 0) {
      try {
        // 期間の計算（全プラグインの中で最も早い開始時刻を使用）
        const periodStart = Object.values(perPluginOptions).reduce(
          (earliest, opt) => (opt.startDate && opt.startDate < earliest ? opt.startDate : earliest),
          periodEnd
        );

        const content = await agentService.generateReport({
          reportType: 'on_fetch',
          periodStart,
          periodEnd,
        });

        const report = reportsRepository.create({
          reportType: 'on_fetch',
          periodStart: periodStart.toISOString(),
          periodEnd: periodEnd.toISOString(),
          content,
        });

        console.log(`[Scheduler] On-fetch report generated: id=${report.id}`);

        await this.publishEvent({
          type: 'report:generated',
          timestamp: new Date(),
          payload: {
            reportId: report.id,
            reportType: 'on_fetch',
            content,
            periodStart,
            periodEnd,
          },
        });
      } catch (error) {
        console.error('[Scheduler] Failed to generate on-fetch report:', error);
      }
    }

    console.log('[Scheduler] Data collection completed');
    return {
      pluginResults: results,
      totalFetched,
      inserted,
      skipped: totalFetched - inserted,
    };
  }

  /**
   * データ補完を実行（指定期間のデータを再取得）
   */
  async runDataBackfill(
    startDate: Date,
    endDate: Date,
    pluginNames?: string[]
  ): Promise<BackfillResult> {
    console.log(`[Scheduler] Starting data backfill: ${startDate.toISOString()} - ${endDate.toISOString()}`);

    const pluginManager = PluginManager.getInstance();
    const errors: Array<{ pluginName: string; error: string }> = [];

    // アクティブなDataSourceプラグインを取得（指定があればフィルタ）
    let activeDataSources = pluginManager
      .getPlugins('data-source')
      .filter((state) => state.isActive);

    if (pluginNames && pluginNames.length > 0) {
      activeDataSources = activeDataSources.filter(
        (state) => pluginNames.includes(state.manifest.name)
      );
    }

    if (activeDataSources.length === 0) {
      console.log('[Scheduler] No matching active data source plugins for backfill');
      return { totalFetched: 0, inserted: 0, skipped: 0, errors: [] };
    }

    // フィルタされたプラグイン名を取得
    const targetPluginNames = activeDataSources.map((state) => state.manifest.name);

    // プラグインごとにデータ取得（フィルタ適用）
    const results = await pluginManager.executeDataSourcePluginsWithState(
      { startDate, endDate },
      undefined,
      targetPluginNames
    );

    // データを収集
    const allData: Array<{ data_type: string; value: number; unit: string; source: string; recorded_at: string }> = [];

    for (const result of results) {
      if (!result.success && result.errors) {
        errors.push({
          pluginName: result.pluginName,
          error: result.errors.join(', '),
        });
      }

      for (const item of result.data) {
        allData.push({
          data_type: item.dataType,
          value: item.value,
          unit: item.unit,
          source: result.pluginName,
          recorded_at: item.recordedAt.toISOString(),
        });
      }
    }

    // バッチでDB保存（INSERT OR IGNORE）
    let inserted = 0;
    if (allData.length > 0) {
      const batchResult = healthDataRepository.createBatch(allData);
      inserted = batchResult.inserted;
    }

    const skipped = allData.length - inserted;
    console.log(`[Scheduler] Backfill completed: ${inserted}/${allData.length} records inserted (${skipped} duplicates)`);

    return {
      totalFetched: allData.length,
      inserted,
      skipped,
      errors,
    };
  }

  /**
   * 日次レポートを生成（データ補完付き）
   */
  async runDailyReport(): Promise<void> {
    console.log('[Scheduler] Starting daily report generation...');

    const pluginManager = PluginManager.getInstance();
    const agentService = AgentService.getInstance();

    // Agentプラグインがない場合はスキップ
    const currentAgent = pluginManager.getCurrentAgent();
    if (!currentAgent) {
      console.log('[Scheduler] No agent plugin available, skipping daily report');
      return;
    }

    const periodEnd = new Date();
    periodEnd.setHours(0, 0, 0, 0);

    const periodStart = new Date(periodEnd);
    periodStart.setDate(periodStart.getDate() - 1);

    try {
      // 1. データ補完: 1日分のデータを全プラグインから再取得
      const backfillResult = await this.runDataBackfill(periodStart, periodEnd);
      console.log(`[Scheduler] Daily backfill: ${backfillResult.inserted} new records`);

      // 2. 日次レポート生成
      const content = await agentService.generateReport({
        reportType: 'daily',
        periodStart,
        periodEnd,
      });

      const report = reportsRepository.create({
        reportType: 'daily',
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        content,
      });

      console.log(`[Scheduler] Daily report generated: id=${report.id}`);

      // 3. 通知イベント発火（report:daily）
      await this.publishEvent({
        type: 'report:daily',
        timestamp: new Date(),
        payload: {
          reportId: report.id,
          reportType: 'daily',
          content,
          periodStart,
          periodEnd,
        },
      });
    } catch (error) {
      console.error('[Scheduler] Failed to generate daily report:', error);
      throw error;
    }
  }

  /**
   * イベントを発行
   */
  private async publishEvent(event: NotificationEvent): Promise<void> {
    try {
      const pluginManager = PluginManager.getInstance();
      await pluginManager.publishEvent(event);
    } catch (error) {
      console.error('[Scheduler] Failed to publish event:', error);
    }
  }

  /**
   * 秒数をcron式に変換
   */
  private secondsToCron(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) {
      return `*/${seconds} * * * * *`;
    } else if (minutes < 60) {
      return `*/${minutes} * * * *`;
    } else {
      return `0 */${hours} * * *`;
    }
  }

  /**
   * プラグインの収集状態を取得
   */
  getPluginStates() {
    return pluginCollectionStateRepository.getAll();
  }

  async stop(): Promise<void> {
    if (this.dataCollectionJob) {
      this.dataCollectionJob.stop();
      this.dataCollectionJob = null;
    }

    if (this.dailyReportJob) {
      this.dailyReportJob.stop();
      this.dailyReportJob = null;
    }

    console.log('[Scheduler] Stopped');
  }

  async restart(): Promise<void> {
    await this.stop();
    await this.start();
    console.log('[Scheduler] Restarted with new settings');
  }
}

let scheduler: Scheduler | null = null;

export function getScheduler(): Scheduler {
  if (!scheduler) {
    scheduler = new Scheduler();
  }
  return scheduler;
}
