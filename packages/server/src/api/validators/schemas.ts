import { z } from 'zod';

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

export const settingsUpdateSchema = z.record(z.unknown());

export type HealthDataQuery = z.infer<typeof healthDataQuerySchema>;
export type HealthDataCreate = z.infer<typeof healthDataCreateSchema>;
export type SettingsUpdate = z.infer<typeof settingsUpdateSchema>;
