/**
 * EventBus - Pub/Subパターンによるイベント配信
 */

import type {
  NotificationEvent,
  NotificationEventType,
} from './interfaces/notification.js';

type EventHandler = (event: NotificationEvent) => Promise<void>;

/**
 * イベントバス
 * 通知プラグインへのイベント配信を担当
 */
export class EventBus {
  private handlers: Map<NotificationEventType, Set<EventHandler>> = new Map();

  /**
   * イベントハンドラを登録
   * @param eventType イベントタイプ
   * @param handler ハンドラ関数
   * @returns unsubscribe関数
   */
  subscribe(
    eventType: NotificationEventType,
    handler: EventHandler
  ): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }

    const handlers = this.handlers.get(eventType)!;
    handlers.add(handler);

    // unsubscribe関数を返す
    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.handlers.delete(eventType);
      }
    };
  }

  /**
   * 複数のイベントタイプにハンドラを登録
   * @param eventTypes イベントタイプの配列
   * @param handler ハンドラ関数
   * @returns unsubscribe関数
   */
  subscribeMany(
    eventTypes: NotificationEventType[],
    handler: EventHandler
  ): () => void {
    const unsubscribers = eventTypes.map((type) =>
      this.subscribe(type, handler)
    );

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }

  /**
   * イベントを発行
   * 登録されたすべてのハンドラに通知
   * @param event 通知イベント
   */
  async publish(event: NotificationEvent): Promise<void> {
    const handlers = this.handlers.get(event.type);

    if (!handlers || handlers.size === 0) {
      return;
    }

    const results = await Promise.allSettled(
      Array.from(handlers).map((handler) => handler(event))
    );

    // エラーをログに記録（他のハンドラは継続）
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(
          `[EventBus] Handler ${index} failed for event ${event.type}:`,
          result.reason
        );
      }
    });
  }

  /**
   * すべてのハンドラをクリア
   */
  clear(): void {
    this.handlers.clear();
  }

  /**
   * 登録されているハンドラ数を取得（デバッグ用）
   */
  getHandlerCount(eventType?: NotificationEventType): number {
    if (eventType) {
      return this.handlers.get(eventType)?.size ?? 0;
    }

    return Array.from(this.handlers.values()).reduce(
      (total, handlers) => total + handlers.size,
      0
    );
  }
}
