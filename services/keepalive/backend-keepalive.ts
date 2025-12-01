/**
 * Backend Keepalive Service
 *
 * Renderの無料プランでは15分間アクセスがないとサーバーがスリープします。
 * このサービスは定期的にhealthエンドポイントにpingして、サーバーをアクティブに保ちます。
 */

import { logger } from '@/utils/logger';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const KEEPALIVE_INTERVAL = 10 * 60 * 1000; // 10分ごと（15分のスリープより前）
const HEALTH_ENDPOINT = '/health';

let keepaliveTimer: NodeJS.Timeout | null = null;

/**
 * バックエンドにkeepaliveリクエストを送信
 */
async function sendKeepalive(): Promise<boolean> {
  if (!BACKEND_URL) {
    logger.warn('[Keepalive] BACKEND_URL not configured');
    return false;
  }

  try {
    const url = `${BACKEND_URL}${HEALTH_ENDPOINT}`;
    logger.debug('[Keepalive] Sending keepalive to:', url);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒タイムアウト

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      logger.info('[Keepalive] ✓ Backend is alive');
      return true;
    } else {
      logger.warn('[Keepalive] Backend returned non-OK status:', response.status);
      return false;
    }
  } catch (error) {
    // エラーは警告のみ（ネットワーク切断時など、正常な状況もある）
    logger.debug('[Keepalive] Failed to reach backend:', error);
    return false;
  }
}

/**
 * Keepaliveサービスを開始
 *
 * アプリ起動時に呼び出して、バックグラウンドで定期的にpingを送ります。
 */
export function startKeepalive(): void {
  // 既に実行中の場合は何もしない
  if (keepaliveTimer) {
    logger.debug('[Keepalive] Already running');
    return;
  }

  logger.info('[Keepalive] Starting keepalive service');

  // 即座に1回実行（サーバーのウォームアップ）
  sendKeepalive();

  // 定期的に実行
  keepaliveTimer = setInterval(() => {
    sendKeepalive();
  }, KEEPALIVE_INTERVAL);
}

/**
 * Keepaliveサービスを停止
 *
 * 通常は呼び出す必要はありませんが、アプリ終了時などに使用できます。
 */
export function stopKeepalive(): void {
  if (keepaliveTimer) {
    logger.info('[Keepalive] Stopping keepalive service');
    clearInterval(keepaliveTimer);
    keepaliveTimer = null;
  }
}

/**
 * 手動でkeepaliveを実行
 *
 * ユーザーが重要な操作を開始する前に、サーバーをウォームアップするために使用します。
 * 例: 検索画面を開く前、翻訳を開始する前など
 */
export async function warmupBackend(): Promise<void> {
  logger.info('[Keepalive] Manual warmup requested');
  await sendKeepalive();
}
