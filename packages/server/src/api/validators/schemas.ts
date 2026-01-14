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
  report_type: z.enum(['on_fetch', 'daily', 'manual']).optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
});

// datetime-local形式: YYYY-MM-DDTHH:mm (時間は1桁または2桁)
const datetimeLocalRegex = /^\d{4}-\d{2}-\d{2}T\d{1,2}:\d{2}$/;

export const generateReportSchema = z
  .object({
    report_type: z.enum(['on_fetch', 'daily', 'manual']),
    target_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    start_datetime: z.string().regex(datetimeLocalRegex).optional(),
    end_datetime: z.string().regex(datetimeLocalRegex).optional(),
  })
  .refine(
    (data) => {
      // manual タイプの場合は start_datetime と end_datetime が必須
      if (data.report_type === 'manual') {
        return data.start_datetime && data.end_datetime;
      }
      return true;
    },
    { message: 'manual report requires start_datetime and end_datetime' }
  )
  .refine(
    (data) => {
      // start_datetime <= end_datetime のバリデーション（日時として比較）
      if (data.start_datetime && data.end_datetime) {
        const start = new Date(data.start_datetime);
        const end = new Date(data.end_datetime);
        return start <= end;
      }
      return true;
    },
    { message: 'start_datetime must be before or equal to end_datetime' }
  );

// チャット用スキーマ
export const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

export const chatRequestSchema = z.object({
  message: z.string().min(1).max(10000),
  history: z.array(chatMessageSchema).default([]),
  session_id: z.string().nullish(),
});

export type HealthDataQuery = z.infer<typeof healthDataQuerySchema>;
export type HealthDataCreate = z.infer<typeof healthDataCreateSchema>;
export type SettingsUpdate = z.infer<typeof settingsUpdateSchema>;
export type CustomInstructionCreate = z.infer<typeof customInstructionCreateSchema>;
export type CustomInstructionUpdate = z.infer<typeof customInstructionUpdateSchema>;
export type ReportQuery = z.infer<typeof reportQuerySchema>;
export type GenerateReport = z.infer<typeof generateReportSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;
