import { z } from 'zod/v4';

export const healthDataQuerySchema = z.object({
  data_type: z.string().optional(),
  source: z.string().optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  limit: z.coerce.number().int().positive().max(1000).default(100),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export const healthDataCreateSchema = z.object({
  data_type: z.string().min(1),
  value: z.number(),
  unit: z.string().optional(),
  recorded_at: z.string().datetime(),
});

export const settingsUpdateSchema = z.record(z.string(), z.unknown());

export const customInstructionCreateSchema = z.object({
  instruction: z.string().min(1).max(500),
  priority: z.number().int().min(0).max(100).default(0),
  is_active: z.boolean().default(true),
});

export const customInstructionUpdateSchema = customInstructionCreateSchema.partial();

export const reportQuerySchema = z.object({
  report_type: z.enum(['on_fetch', 'daily']).optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export const generateReportSchema = z.object({
  report_type: z.enum(['on_fetch', 'daily']),
  target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export type HealthDataQuery = z.infer<typeof healthDataQuerySchema>;
export type HealthDataCreate = z.infer<typeof healthDataCreateSchema>;
export type SettingsUpdate = z.infer<typeof settingsUpdateSchema>;
export type CustomInstructionCreate = z.infer<typeof customInstructionCreateSchema>;
export type CustomInstructionUpdate = z.infer<typeof customInstructionUpdateSchema>;
export type ReportQuery = z.infer<typeof reportQuerySchema>;
export type GenerateReport = z.infer<typeof generateReportSchema>;
