import { logger } from '@/utils/logger';

/**
 * WebSocketメッセージの型定義
 */
export interface WebSocketMessage {
  type: string;
  id: string;
  data?: any;
}

/**
 * ストリーミングイベントのコールバック
 */
export interface StreamCallbacks {
  onChunk?: (data: any) => void;
  onMetadata?: (data: any) => void;
  onDone?: () => void;
  onError?: (error: Error) => void;
}

/**
 * WebSocketクライアント
 *
 * React Nativeの標準WebSocket APIを使用した
 * リアルタイム通信クライアント
 */
export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private callbacks = new Map<string, StreamCallbacks>();
  private isIntentionalClose = false;

  constructor(url: string) {
    this.url = url;
  }

  /**
   * WebSocket接続を確立
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        logger.info('[WebSocket] Connecting to:', this.url);

        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          logger.info('[WebSocket] Connected successfully');
          this.reconnectAttempts = 0;
          this.startPingInterval();
          resolve();
        };

        this.ws.onerror = (error) => {
          logger.error('[WebSocket] Connection error:', error);

          // 待機中のコールバックをエラーでドレイン
          const connectionError = new Error('WebSocket connection failed');
          this.drainCallbacksWithError(connectionError);

          reject(connectionError);
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.ws.onclose = (event) => {
          logger.info('[WebSocket] Connection closed:', event.code, event.reason);
          this.stopPingInterval();

          // 待機中のコールバックをエラーでドレイン
          const connectionError = new Error(`WebSocket closed: ${event.code} ${event.reason || 'Unknown reason'}`);
          this.drainCallbacksWithError(connectionError);

          if (!this.isIntentionalClose) {
            this.handleReconnect();
          }
        };

      } catch (error) {
        logger.error('[WebSocket] Failed to create WebSocket:', error);
        reject(error);
      }
    });
  }

  /**
   * メッセージを受信して処理
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data as string);

      logger.debug('[WebSocket] Received message:', message.type, message.id);

      // コールバックを取得
      const callbacks = this.callbacks.get(message.id);

      if (!callbacks) {
        // システムメッセージ（接続成功など）
        if (message.type === 'connection') {
          logger.info('[WebSocket] Connection confirmed:', message.data);
        }
        return;
      }

      // メッセージタイプに応じて処理
      switch (message.type) {
        case 'chat_chunk':
          callbacks.onChunk?.(message.data);
          break;

        case 'chat_metadata':
          callbacks.onMetadata?.(message.data);
          break;

        case 'chat_done':
          callbacks.onDone?.();
          this.callbacks.delete(message.id);
          break;

        case 'error':
          const error = new Error(message.data?.error || 'Unknown error');
          callbacks.onError?.(error);
          this.callbacks.delete(message.id);
          break;

        case 'pong':
          // Pongを受信（接続維持）
          break;

        default:
          logger.warn('[WebSocket] Unknown message type:', message.type);
      }
    } catch (error) {
      logger.error('[WebSocket] Failed to parse message:', error);
    }
  }

  /**
   * Ping/Pongで接続を維持
   */
  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({
          type: 'ping',
          id: `ping_${Date.now()}`,
        });
      }
    }, 30000); // 30秒ごと
  }

  /**
   * Pingインターバルを停止
   */
  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * 再接続を試行
   */
  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('[WebSocket] Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    logger.info(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      this.connect().catch((error) => {
        logger.error('[WebSocket] Reconnection failed:', error);
      });
    }, delay);
  }

  /**
   * メッセージを送信
   */
  private send(message: WebSocketMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }

    this.ws.send(JSON.stringify(message));
  }

  /**
   * チャットストリーミングを開始
   */
  async streamChat(
    requestId: string,
    data: any,
    callbacks: StreamCallbacks
  ): Promise<void> {
    // 接続確認
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connect();
    }

    // コールバックを登録
    this.callbacks.set(requestId, callbacks);

    // リクエストを送信
    this.send({
      type: 'chat',
      id: requestId,
      data,
    });
  }

  /**
   * ストリームをキャンセル
   * コールバックを削除してメモリリークを防ぐ
   */
  cancelStream(requestId: string): void {
    const deleted = this.callbacks.delete(requestId);
    if (deleted) {
      logger.info('[WebSocket] Cancelled stream and removed callbacks for:', requestId);
    } else {
      logger.warn('[WebSocket] No callbacks found to cancel for:', requestId);
    }
  }

  /**
   * 待機中のコールバックをエラーでドレイン
   * WebSocket切断時に呼び出され、UIが永久に待機しないようにする
   */
  private drainCallbacksWithError(error: Error): void {
    logger.info(`[WebSocket] Draining ${this.callbacks.size} pending callbacks with error`);

    // すべてのコールバックにエラーを通知
    for (const [requestId, callbacks] of this.callbacks.entries()) {
      if (callbacks.onError) {
        callbacks.onError(error);
      }
    }

    // コールバックをクリア
    this.callbacks.clear();
  }

  /**
   * 接続を切断
   */
  disconnect(): void {
    this.isIntentionalClose = true;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.stopPingInterval();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.callbacks.clear();
    this.reconnectAttempts = 0;
  }

  /**
   * 接続状態を取得
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

/**
 * シングルトンWebSocketクライアント
 */
const WEBSOCKET_URL = (() => {
  const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';
  // httpまたはhttpsをwsまたはwssに置き換え
  return baseUrl.replace(/^http/, 'ws') + '/ws';
})();

export const wsClient = new WebSocketClient(WEBSOCKET_URL);
