/**
 * LINE Messaging API クライアント
 */

import crypto from 'crypto';

const LINE_API_BASE_URL = 'https://api.line.me/v2/bot';

export interface LineMessage {
  type: 'text';
  text: string;
}

export interface PushMessageRequest {
  to: string;
  messages: LineMessage[];
}

export interface LineWebhookEvent {
  type: 'message' | 'follow' | 'unfollow' | 'postback';
  timestamp: number;
  source: {
    type: 'user' | 'group' | 'room';
    userId?: string;
    groupId?: string;
    roomId?: string;
  };
  replyToken?: string;
  message?: {
    id: string;
    type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'location' | 'sticker';
    text?: string;
  };
  postback?: {
    data: string;
  };
}

export interface LineWebhookBody {
  destination: string;
  events: LineWebhookEvent[];
}

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class LineApiClient {
  private channelAccessToken: string;
  private channelSecret: string;

  constructor(channelAccessToken: string, channelSecret: string) {
    this.channelAccessToken = channelAccessToken;
    this.channelSecret = channelSecret;
  }

  /**
   * Webhook署名を検証
   */
  verifySignature(body: Buffer, signature: string): boolean {
    const hash = crypto
      .createHmac('SHA256', this.channelSecret)
      .update(body)
      .digest('base64');

    return hash === signature;
  }

  /**
   * Pushメッセージを送信
   */
  async pushMessage(userId: string, text: string): Promise<SendMessageResult> {
    try {
      const response = await fetch(`${LINE_API_BASE_URL}/message/push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.channelAccessToken}`,
        },
        body: JSON.stringify({
          to: userId,
          messages: [{ type: 'text', text }],
        } satisfies PushMessageRequest),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('[LineApiClient] Push message failed:', response.status, errorBody);
        return {
          success: false,
          error: `LINE API error: ${response.status} - ${errorBody}`,
        };
      }

      // LINE Push APIはメッセージIDを返さないが、成功とする
      return {
        success: true,
        messageId: `line-push-${Date.now()}`,
      };
    } catch (error) {
      console.error('[LineApiClient] Push message error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * リプライメッセージを送信
   */
  async replyMessage(replyToken: string, text: string): Promise<SendMessageResult> {
    try {
      const response = await fetch(`${LINE_API_BASE_URL}/message/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.channelAccessToken}`,
        },
        body: JSON.stringify({
          replyToken,
          messages: [{ type: 'text', text }],
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('[LineApiClient] Reply message failed:', response.status, errorBody);
        return {
          success: false,
          error: `LINE API error: ${response.status} - ${errorBody}`,
        };
      }

      return {
        success: true,
        messageId: `line-reply-${Date.now()}`,
      };
    } catch (error) {
      console.error('[LineApiClient] Reply message error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * ユーザープロフィールを取得
   */
  async getProfile(userId: string): Promise<{ displayName?: string; error?: string }> {
    try {
      const response = await fetch(`${LINE_API_BASE_URL}/profile/${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.channelAccessToken}`,
        },
      });

      if (!response.ok) {
        return { error: `Failed to get profile: ${response.status}` };
      }

      const data = await response.json() as { displayName: string };
      return { displayName: data.displayName };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  }
}
