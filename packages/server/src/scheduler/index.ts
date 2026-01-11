/**
 * Scheduler - 定期実行ジョブ
 *
 * - データ収集ジョブ（DataSourceプラグイン経由）
 * - 日次レポートジョブ
 * - イベント発火（EventBus経由）
 */

import cron from 'node-cron';
import { AgentService } from '../agent/index.js';
import { PluginManager } from '../plugins/manager.js';
import { reportsRepository } from '../db/repositories/reports.js';
import { healthDataRepository } from '../db/repositories/health-data.js';
import { settingsRepository } from '../db/repositories/settings.js';
import type { NotificationEvent } from '../plugins/interfaces/notification.js';

export class Scheduler {
  private dataCollectionJob: cron.ScheduledTask | null = null;
  private dailyReportJob: cron.ScheduledTask | null = null;
  private lastCollectionTime: Date | null = null;

  async start(): Promise<void> {
    // データ収集ジョブ（設定から間隔を取得）
    const settings = settingsRepository.getAll();
    const intervalSeconds = (settings.collection_interval as number) || 3600;
    const cronExpression = this.secondsToCron(intervalSeconds);

    this.dataCollectionJob = cron.schedule(cronExpression, () => {
      this.runDataCollection().catch((error) => {
        console.error('[Scheduler] Failed to collect data:', error);
      });
    });

    console.log(`[Scheduler] Data collection job scheduled: ${cronExpression}`);

    // 日次レポートジョブ（毎日0:05）
    this.dailyReportJob = cron.schedule('5 0 * * *', () => {
      this.runDailyReport().catch((error) => {
        console.error('[Scheduler] Failed to generate daily report:', error);
      });
    });

    console.log('[Scheduler] Daily report job scheduled at 00:05');
  }

  /**
   * データ収集を実行
   */
  async runDataCollection(): Promise<void> {
    console.log('[Scheduler] Starting data collection...');

    const pluginManager = PluginManager.getInstance();
    const agentService = AgentService.getInstance();

    const periodEnd = new Date();
    const periodStart = this.lastCollectionTime || new Date(periodEnd.getTime() - 24 * 60 * 60 * 1000);

    try {
      // 1. DataSourceプラグインからデータ取得
      const activeDataSources = pluginManager
        .getPlugins('data-source')
        .filter((state) => state.isActive);

      if (activeDataSources.length === 0) {
        console.log('[Scheduler] No active data source plugins, skipping data collection');
        this.lastCollectionTime = periodEnd;
        return;
      }

      const data = await pluginManager.executeDataSourcePlugins({
        startDate: periodStart,
        endDate: periodEnd,
      });

      console.log(`[Scheduler] Fetched ${data.length} data points`);

      // 2. DBに保存
      if (data.length > 0) {
        for (const item of data) {
          try {
            healthDataRepository.create({
              data_type: item.dataType,
              value: item.value,
              unit: item.unit,
              recorded_at: item.recordedAt.toISOString(),
            });
          } catch (error) {
            // 重複エラーは無視
            if (!(error instanceof Error && error.message.includes('UNIQUE'))) {
              console.error('[Scheduler] Failed to save data:', error);
            }
          }
        }

        // 3. 通知イベント発火（data:fetched）
        const dataTypes = [...new Set(data.map(d => d.dataType))];
        await this.publishEvent({
          type: 'data:fetched',
          timestamp: new Date(),
          payload: {
            sourceName: 'scheduler',
            recordCount: data.length,
            dataTypes,
          },
        });
      }

      // 4. 取得時レポート生成（Agentプラグインがある場合のみ）
      const currentAgent = pluginManager.getCurrentAgent();
      if (currentAgent && data.length > 0) {
        try {
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

          // 5. 通知イベント発火（report:generated）
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

      this.lastCollectionTime = periodEnd;
      console.log('[Scheduler] Data collection completed');
    } catch (error) {
      console.error('[Scheduler] Data collection failed:', error);
      throw error;
    }
  }

  /**
   * 日次レポートを生成
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
      // 1. 日次レポート生成
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

      // 2. 通知イベント発火（report:daily）
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
}

let scheduler: Scheduler | null = null;

export function getScheduler(): Scheduler {
  if (!scheduler) {
    scheduler = new Scheduler();
  }
  return scheduler;
}
