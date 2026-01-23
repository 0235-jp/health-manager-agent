/**
 * ChatPlugin - 双方向コミュニケーションプラグイン
 */

import type { Router } from 'express';
import type { BasePlugin, PluginManifest } from './base.js';
import type { NotificationEventType } from './notification.js';
import type { ReportAlert } from './agent.js';

/**
 * 会話ステータス
 */
export type ConversationStatus =
  | 'pending'    // 通知送信済み、返信待ち
  | 'snoozed'    // スヌーズ中
  | 'verifying'  // データ確認中
  | 'completed'  // 完了
  | 'cancelled'; // キャンセル済み

/**
 * ChatプラグインのマニフェストChat
 */
export interface ChatManifest extends PluginManifest {
  type: 'chat';
  /** サポートするイベントタイプ */
  supportedEvents: NotificationEventType[];
  /** Webhookパス（例: '/line'） */
  webhookPath: string;
}

/**
 * 会話情報
 */
export interface Conversation {
  id: string;
  pluginName: string;
  externalUserId: string;
  status: ConversationStatus;
  eventType: NotificationEventType;
  /** 元のアラート情報 */
  originalPayload: ReportAlert;
  /** 検証条件（アラートのverificationPrompt） */
  verificationCondition?: string;
  /** スヌーズ終了時刻 */
  snoozeUntil?: Date;
  /** リマインダー回数 */
  reminderCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * メッセージ方向
 */
export type MessageDirection = 'outbound' | 'inbound';

/**
 * チャットメッセージ
 */
export interface ChatMessageRecord {
  id: number;
  conversationId: string;
  direction: MessageDirection;
  content: string;
  externalMessageId?: string;
  createdAt: Date;
}

/**
 * リマインダー情報
 */
export interface ChatReminder {
  id: number;
  conversationId: string;
  scheduledAt: Date;
  processed: boolean;
  createdAt: Date;
}

/**
 * 会話開始パラメータ
 */
export interface StartConversationParams {
  /** 外部ユーザーID（LINE ユーザーIDなど） */
  externalUserId: string;
  /** イベントタイプ */
  eventType: NotificationEventType;
  /** アラート情報 */
  alert: ReportAlert;
}

/**
 * 会話開始結果
 */
export interface StartConversationResult {
  success: boolean;
  conversationId?: string;
  messageId?: string;
  error?: string;
}

/**
 * メッセージ送信結果
 */
export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * ユーザー返信処理結果
 */
export interface HandleUserResponseResult {
  success: boolean;
  /** 新しい会話ステータス */
  newStatus?: ConversationStatus;
  /** 返信メッセージ */
  replyMessage?: string;
  /** 次のリマインダー時刻 */
  nextReminderAt?: Date;
  error?: string;
}

/**
 * ChatPluginインターフェース
 */
export interface ChatPlugin extends BasePlugin {
  readonly manifest: ChatManifest;

  /**
   * 会話を開始してアラートを送信
   * @param params 会話開始パラメータ
   */
  startConversation(params: StartConversationParams): Promise<StartConversationResult>;

  /**
   * メッセージを送信
   * @param conversationId 会話ID
   * @param message メッセージ内容
   */
  sendMessage(conversationId: string, message: string): Promise<SendMessageResult>;

  /**
   * ユーザーからの返信を処理
   * AgentPluginのprocessUserResponseを呼び出し
   * @param conversationId 会話ID
   * @param userMessage ユーザーからのメッセージ
   */
  handleUserResponse(
    conversationId: string,
    userMessage: string
  ): Promise<HandleUserResponseResult>;

  /**
   * Webhookルーターを取得
   * Express Routerを返す
   */
  getWebhookRouter(): Router;

  /**
   * テスト通知を送信
   */
  testNotification(): Promise<SendMessageResult>;
}

/**
 * ChatPluginかどうかを判定
 */
export function isChatPlugin(plugin: BasePlugin): plugin is ChatPlugin {
  return plugin.manifest.type === 'chat';
}
