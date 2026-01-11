import cron from 'node-cron';
import { AgentService } from '../agent/index.js';
import { reportsRepository } from '../db/repositories/reports.js';

export class Scheduler {
  private dailyReportJob: cron.ScheduledTask | null = null;

  async start(): Promise<void> {
    this.dailyReportJob = cron.schedule('5 0 * * *', () => {
      this.runDailyReport().catch((error) => {
        console.error('Failed to generate daily report:', error);
      });
    });

    console.log('Scheduler started: daily report job scheduled at 00:05');
  }

  async runDailyReport(): Promise<void> {
    console.log('Starting daily report generation...');

    const periodEnd = new Date();
    periodEnd.setHours(0, 0, 0, 0);

    const periodStart = new Date(periodEnd);
    periodStart.setDate(periodStart.getDate() - 1);

    try {
      const agentService = AgentService.getInstance();
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

      console.log(`Daily report generated successfully: id=${report.id}`);
    } catch (error) {
      console.error('Failed to generate daily report:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.dailyReportJob) {
      this.dailyReportJob.stop();
      this.dailyReportJob = null;
      console.log('Scheduler stopped');
    }
  }
}

let scheduler: Scheduler | null = null;

export function getScheduler(): Scheduler {
  if (!scheduler) {
    scheduler = new Scheduler();
  }
  return scheduler;
}
