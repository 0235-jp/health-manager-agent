/**
 * get-health-images tool - Retrieve health checkup images for agent analysis
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { healthImagesRepository } from '../../../db/repositories/health-images.js';
import { settingsRepository } from '../../../db/repositories/settings.js';
import { normalizeToUTC, DEFAULT_TIMEZONE } from '../../../utils/datetime.js';
import { pdfToImages } from '../../../utils/pdf-to-images.js';
import type { ToolDefinition, ToolResult } from '../interfaces.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../../../../../data');

export const getHealthImagesTool: ToolDefinition = {
  name: 'get-health-images',
  description:
    '健康診断画像を取得します。日付範囲を指定して画像のメタデータとファイルパス（またはbase64エンコードされた画像データ）を返します。',
  parameters: {
    type: 'object',
    properties: {
      start_date: {
        type: 'string',
        description: '開始日時（ISO 8601形式、例: "2025-01-01T00:00:00Z"）',
      },
      end_date: {
        type: 'string',
        description: '終了日時（ISO 8601形式、例: "2025-12-31T23:59:59Z"）',
      },
      limit: {
        type: 'number',
        description: '最大取得件数（デフォルト: 10、最大: 50）',
      },
      response_format: {
        type: 'string',
        description: 'レスポンス形式: "file_path"（ファイルパスを返す）または "base64"（base64エンコードデータを返す）',
        enum: ['file_path', 'base64'],
      },
    },
    required: [],
  },
};

export interface GetHealthImagesArgs {
  start_date?: string;
  end_date?: string;
  limit?: number;
  response_format?: 'file_path' | 'base64';
}

export async function executeGetHealthImages(args: GetHealthImagesArgs): Promise<ToolResult> {
  try {
    const settings = settingsRepository.getAll();
    const _timezone = (settings.timezone as string) || DEFAULT_TIMEZONE;

    let startDate: string | undefined;
    let endDate: string | undefined;

    if (args.start_date) {
      startDate = normalizeToUTC(args.start_date);
    }
    if (args.end_date) {
      endDate = normalizeToUTC(args.end_date);
    }

    // Default: last 1 year
    if (!startDate) {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      startDate = oneYearAgo.toISOString();
    }
    if (!endDate) {
      endDate = new Date().toISOString();
    }

    const limit = Math.min(args.limit ?? 10, 50);
    const responseFormat = args.response_format || 'file_path';

    const images = healthImagesRepository.findByDateRange(startDate, endDate, limit);

    if (images.length === 0) {
      return {
        success: true,
        data: { images: [], message: '指定期間内に健康診断画像はありません。' },
      };
    }

    if (responseFormat === 'file_path') {
      const result = images.map((img) => ({
        id: img.id,
        title: img.title,
        memo: img.memo,
        file_path: path.resolve(DATA_DIR, img.file_path),
        original_filename: img.original_filename,
        mime_type: img.mime_type,
        recorded_at: img.recorded_at,
      }));

      return { success: true, data: { images: result } };
    }

    // base64 format
    const result = [];
    for (const img of images) {
      const filePath = path.resolve(DATA_DIR, img.file_path);
      if (!fs.existsSync(filePath)) {
        continue;
      }

      if (img.mime_type === 'application/pdf') {
        // Convert PDF pages to base64 PNG images
        const pages = await pdfToImages(filePath);
        result.push({
          id: img.id,
          title: img.title,
          memo: img.memo,
          original_filename: img.original_filename,
          mime_type: img.mime_type,
          recorded_at: img.recorded_at,
          pages: pages.map((p) => ({
            page: p.page,
            mime_type: p.mime_type,
            base64: p.buffer.toString('base64'),
          })),
        });
      } else {
        // Image files: read and base64 encode directly
        const buffer = fs.readFileSync(filePath);
        result.push({
          id: img.id,
          title: img.title,
          memo: img.memo,
          original_filename: img.original_filename,
          mime_type: img.mime_type,
          recorded_at: img.recorded_at,
          base64: buffer.toString('base64'),
        });
      }
    }

    return { success: true, data: { images: result } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
