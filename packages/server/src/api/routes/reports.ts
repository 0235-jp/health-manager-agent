import { Router } from 'express';
import type { Request } from 'express';
import { reportsRepository } from '../../db/repositories/reports.js';
import { PluginManager } from '../../plugins/manager.js';
import { asyncHandler } from '../middlewares/async-handler.js';
import { validateQuery, validateBody } from '../middlewares/validation.js';
import {
  reportQuerySchema,
  generateReportSchema,
  type ReportQuery,
  type GenerateReport,
} from '../validators/schemas.js';

export const reportsRouter = Router();

const NOT_FOUND_ERROR = { error: { message: 'Report not found' } };

function parseId(req: Request): number {
  return parseInt(req.params.id, 10);
}

reportsRouter.get(
  '/',
  validateQuery(reportQuerySchema),
  asyncHandler((req, res) => {
    const query = req.query as unknown as ReportQuery;
    const result = reportsRepository.findAll(query);
    res.json(result);
  })
);

reportsRouter.get(
  '/latest',
  asyncHandler((req, res) => {
    const reportType = req.query.report_type as 'on_fetch' | 'daily' | undefined;
    const report = reportsRepository.findLatest(reportType);

    if (!report) {
      res.status(404).json(NOT_FOUND_ERROR);
      return;
    }

    res.json(report);
  })
);

reportsRouter.get(
  '/:id',
  asyncHandler((req, res) => {
    const report = reportsRepository.findById(parseId(req));

    if (!report) {
      res.status(404).json(NOT_FOUND_ERROR);
      return;
    }

    res.json(report);
  })
);

reportsRouter.post(
  '/generate',
  validateBody(generateReportSchema),
  asyncHandler(async (req, res) => {
    const { report_type, target_date } = req.body as GenerateReport;

    let periodStart: Date;
    let periodEnd: Date;

    if (target_date) {
      periodStart = new Date(target_date);
      periodStart.setHours(0, 0, 0, 0);
      periodEnd = new Date(target_date);
      periodEnd.setHours(23, 59, 59, 999);
    } else {
      periodEnd = new Date();
      periodStart = new Date();
      if (report_type === 'daily') {
        periodStart.setDate(periodStart.getDate() - 1);
      } else {
        periodStart.setHours(periodStart.getHours() - 1);
      }
    }

    const pluginManager = PluginManager.getInstance();
    const content = await pluginManager.generateReport({
      reportType: report_type,
      periodStart,
      periodEnd,
    });

    const report = reportsRepository.create({
      reportType: report_type,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      content,
    });

    res.status(201).json(report);
  })
);

reportsRouter.delete(
  '/:id',
  asyncHandler((req, res) => {
    const deleted = reportsRepository.delete(parseId(req));

    if (!deleted) {
      res.status(404).json(NOT_FOUND_ERROR);
      return;
    }

    res.status(204).send();
  })
);
