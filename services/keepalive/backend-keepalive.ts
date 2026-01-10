/**
 * Backend Keepalive Service
 *
 * Renderの無料プランでは15分間アクセスがないとサーバーがスリープします。
 * このサービスは定期的にhealthエンドポイントにpingして、サーバーをアクティブに保ちます。
 */

import { logger } from '@/utils/logger';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const KEEPALIVE_INTERVAL = 5 * 60 * 1000; // 5分ごと（15分のスリープより前、3倍の安全マージン）
const HEALTH_ENDPOINT = '/health';
const WARMUP_ENDPOINT = '/warmup';

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

  // 初回はウォームアップリクエストを送信（Langfuseプロンプトをキャッシュ）
  sendWarmup().catch((error) => {
    logger.warn('[Keepalive] Initial warmup failed:', error);
  });

  // 定期的にヘルスチェックを実行（サーバーをアクティブに保つ）
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
 * ウォームアップリクエストを送信（Langfuseプロンプトを事前キャッシュ）
 *
 * 起動時に1回実行して、Langfuseプロンプトをキャッシュに読み込みます。
 * これにより初回リクエストの遅延を削減します。
 */
async function sendWarmup(): Promise<boolean> {
  if (!BACKEND_URL) {
    logger.warn('[Keepalive] BACKEND_URL not configured');
    return false;
  }

  try {
    const url = `${BACKEND_URL}${WARMUP_ENDPOINT}`;
    logger.info('[Keepalive] Sending warmup request to:', url);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15秒タイムアウト

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      logger.info('[Keepalive] ✓ Warmup completed:', data);
      return true;
    } else {
      logger.warn('[Keepalive] Warmup returned non-OK status:', response.status);
      return false;
    }
  } catch (error) {
    // ウォームアップ失敗は警告のみ
    logger.debug('[Keepalive] Warmup failed:', error);
    return false;
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
  await sendWarmup();
}
