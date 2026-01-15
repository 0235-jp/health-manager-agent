/**
 * デバッグログユーティリティ
 * API取得データとチャットデータをファイルに保存
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { settingsRepository } from '../db/repositories/settings.js';
import type { FetchOptions, PluginFetchResult } from '../plugins/interfaces/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEBUG_BASE_PATH = path.resolve(__dirname, '../../../../data/debug');

/**
 * 日付をYYYY-MM-DD形式に変換
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * ディレクトリを再帰的に作成
 */
function ensureDirectoryExists(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

/**
 * API取得データをファイルに保存
 */
export async function logApiResponse(
  options: FetchOptions,
  result: PluginFetchResult
): Promise<void> {
  const enabled = settingsRepository.get('debug_api_responses') as boolean;
  if (!enabled) {
    return;
  }

  const dateFolder = formatDate(result.fetchedAt);
  const timestamp = result.fetchedAt.getTime();

  const dirPath = path.join(DEBUG_BASE_PATH, 'api-responses', result.pluginName, dateFolder);
  ensureDirectoryExists(dirPath);

  const filePath = path.join(dirPath, `${timestamp}.json`);
  const data = {
    fetchedAt: result.fetchedAt.toISOString(),
    pluginName: result.pluginName,
    options: {
      startDate: options.startDate?.toISOString(),
      endDate: options.endDate?.toISOString(),
      dataTypes: options.dataTypes,
    },
    result: {
      success: result.success,
      data: result.data,
      timeseriesData: result.timeseriesData,
      errors: result.errors,
    },
  };

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`[DebugLogger] Saved API response to ${filePath}`);
}

/**
 * チャットデータ（リクエストとレスポンス）
 */
export interface ChatLogData {
  message: string;
  history: Array<{ role: string; content: string }>;
  sessionId?: string;
  response: string;
}

/**
 * チャットデータをファイルに保存
 */
export async function logChatExchange(data: ChatLogData): Promise<void> {
  const enabled = settingsRepository.get('debug_chat') as boolean;
  if (!enabled) {
    return;
  }

  const now = new Date();
  const dateFolder = formatDate(now);
  const timestamp = now.getTime();
  const sessionId = data.sessionId || 'unknown';

  const dirPath = path.join(DEBUG_BASE_PATH, 'chat', dateFolder);
  ensureDirectoryExists(dirPath);

  const filePath = path.join(dirPath, `${sessionId}-${timestamp}.json`);
  const logData = {
    loggedAt: now.toISOString(),
    sessionId: data.sessionId,
    request: {
      message: data.message,
      history: data.history,
    },
    response: data.response,
  };

  fs.writeFileSync(filePath, JSON.stringify(logData, null, 2), 'utf-8');
  console.log(`[DebugLogger] Saved chat exchange to ${filePath}`);
}
