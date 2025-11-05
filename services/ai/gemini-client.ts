/**
 * Gemini API クライアント（バックエンド経由）
 *
 * バックエンドサーバーを経由してGemini APIにアクセス
 */

import type { ModelConfig } from './model-selector';
import { logger } from '@/utils/logger';

// バックエンドサーバーのURL
const BACKEND_URL = (() => {
  const url = process.env.EXPO_PUBLIC_BACKEND_URL;

  // 環境変数が設定されている場合はそれを使用
  if (url) {
    return url;
  }

  // 開発環境のみlocalhostにフォールバック
  if (__DEV__) {
    return 'http://localhost:3000';
  }

  // 本番環境では環境変数が必須
  throw new Error('EXPO_PUBLIC_BACKEND_URL environment variable must be set in production');
})();

/**
 * APIエラークラス
 */
class ApiError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * バックエンドAPIのベースURL
 */
function getApiUrl(endpoint: string): string {
  return `${BACKEND_URL}/api/gemini${endpoint}`;
}

/**
 * テキスト生成（ストリーミングなし）
 */
export async function generateText(
  prompt: string,
  config: ModelConfig
): Promise<string> {
  try {
    const response = await fetch(getApiUrl('/generate'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, config }),
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      let message = `API Error: ${response.status}`;

      if (contentType?.includes('application/json')) {
        try {
          const errorData = await response.json();
          message = errorData.message || errorData.error || message;
        } catch (e) {
          // JSONパース失敗時はstatus codeのみ使用
        }
      }

      throw new ApiError(message, response.status);
    }

    const data = await response.json();
    return data.text;
  } catch (error) {
    logger.error('[GeminiClient] Error in generateText:', error);
    throw error;
  }
}

/**
 * テキスト生成（ストリーミング）
 *
 * React Native/Expoの制限により、実際には非ストリーミングAPIを使用して
 * 全体を取得してから、チャンク単位でyieldすることで擬似的なストリーミングを実現
 */
export async function* generateTextStream(
  prompt: string,
  config: ModelConfig
): AsyncGenerator<string, void, unknown> {
  try {
    logger.debug('[GeminiClient] Starting generateTextStream (simulated)...');

    // 非ストリーミングAPIで全体を取得
    const fullText = await generateText(prompt, config);

    logger.debug(`[GeminiClient] Received full text, length: ${fullText.length}`);

    // チャンク単位でyieldして、ストリーミングのような体験を提供
    const CHUNK_SIZE = 100; // 文字数
    const chunks = [];

    for (let i = 0; i < fullText.length; i += CHUNK_SIZE) {
      chunks.push(fullText.slice(i, i + CHUNK_SIZE));
    }

    logger.debug(`[GeminiClient] Split into ${chunks.length} chunks`);

    for (let i = 0; i < chunks.length; i++) {
      // 少し遅延を入れてストリーミングのような体験を提供
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 30));
      }
      logger.debug(`[GeminiClient] Yielding chunk ${i + 1}/${chunks.length}`);
      yield chunks[i];
    }

    logger.debug('[GeminiClient] Stream complete (simulated)');
  } catch (error) {
    logger.error('[GeminiClient] Error in generateTextStream:', error);
    throw error;
  }
}

/**
 * JSON生成（レスポンスをJSONとしてパース）
 */
export async function generateJSON<T>(
  prompt: string,
  config: ModelConfig
): Promise<T> {
  try {
    const response = await fetch(getApiUrl('/generate-json'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, config }),
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      let message = `API Error: ${response.status}`;

      if (contentType?.includes('application/json')) {
        try {
          const errorData = await response.json();
          message = errorData.message || errorData.error || message;
        } catch (e) {
          // JSONパース失敗時はstatus codeのみ使用
        }
      }

      throw new ApiError(message, response.status);
    }

    const result = await response.json();
    return result.data as T;
  } catch (error) {
    logger.error('[GeminiClient] Error in generateJSON:', error);
    throw error;
  }
}

/**
 * SSEイベントの型定義
 */
export type StreamEvent =
  | { type: 'section'; section: string; data: any }
  | { type: 'progress'; length: number }
  | { type: 'complete'; data: any }
  | { type: 'error'; error: string };

/**
 * JSON生成（ストリーミング・段階的レンダリング対応）
 *
 * バックエンドの /generate-json-stream エンドポイントを使用して、
 * JSONの各セクションが生成されるたびにコールバックを呼び出します。
 */
export async function generateJSONStream<T>(
  prompt: string,
  config: ModelConfig,
  onEvent: (event: StreamEvent) => void
): Promise<T> {
  try {
    logger.info('[GeminiClient] Starting generateJSONStream request');
    const response = await fetch(getApiUrl('/generate-json-stream'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, config }),
    });

    logger.info('[GeminiClient] Response received:', {
      ok: response.ok,
      status: response.status,
      hasBody: !!response.body,
      headers: response.headers
    });

    if (!response.ok) {
      throw new ApiError(`API Error: ${response.status}`, response.status);
    }

    if (!response.body) {
      logger.error('[GeminiClient] Response body is null!');
      throw new Error('Response body is null');
    }

    // レスポンスストリームを読む
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finalData: T | null = null;

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      // デコードしてバッファに追加
      buffer += decoder.decode(value, { stream: true });

      // SSEイベントを行ごとに処理
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // 最後の不完全な行をバッファに残す

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6); // 'data: ' を削除

          if (data === '[DONE]') {
            continue;
          }

          try {
            const event = JSON.parse(data) as StreamEvent;
            onEvent(event);

            // 完全なデータを保存
            if (event.type === 'complete') {
              finalData = event.data as T;
            }
          } catch (e) {
            logger.error('[GeminiClient] Failed to parse SSE event:', e);
          }
        }
      }
    }

    if (!finalData) {
      throw new Error('No complete data received from stream');
    }

    return finalData;
  } catch (error) {
    logger.error('[GeminiClient] Error in generateJSONStream:', error);
    throw error;
  }
}

/**
 * JSON生成（ポーリング方式 - 真のストリーミング）
 *
 * バックエンドで段階的に生成し、フロントエンドがポーリングで取得。
 * 各セクションが生成されるたびに即座にコールバックを呼び出します。
 */
export async function generateJSONProgressive<T>(
  prompt: string,
  config: ModelConfig,
  onProgress: (progress: number, partialData?: Partial<T>) => void
): Promise<T> {
  try {
    logger.info('[GeminiClient] Starting progressive generation');

    // タスクを開始
    const startResponse = await fetch(getApiUrl('/generate-json-progressive'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, config }),
    });

    if (!startResponse.ok) {
      throw new ApiError(`API Error: ${startResponse.status}`, startResponse.status);
    }

    const { taskId } = await startResponse.json();
    logger.info('[GeminiClient] Task started:', taskId);

    // ポーリング開始
    let lastProgress = 0;
    const POLLING_INTERVAL = 200; // 200ms

    while (true) {
      await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));

      const statusResponse = await fetch(getApiUrl(`/task/${taskId}`));
      if (!statusResponse.ok) {
        throw new Error('Failed to fetch task status');
      }

      const task = await statusResponse.json();
      logger.debug('[GeminiClient] Task status:', {
        status: task.status,
        progress: task.progress,
      });

      // 進捗が更新されていたら通知
      if (task.progress > lastProgress) {
        logger.info('[GeminiClient] Progress update:', task.progress);
        onProgress(task.progress, task.partialData);
        lastProgress = task.progress;
      }

      // 完了
      if (task.status === 'completed') {
        logger.info('[GeminiClient] Task completed');
        return task.partialData as T;
      }

      // エラー
      if (task.status === 'error') {
        logger.error('[GeminiClient] Task error:', task.error);
        throw new Error(task.error || 'Generation failed');
      }
    }
  } catch (error) {
    logger.error('[GeminiClient] Error in generateJSONProgressive:', error);
    throw error;
  }
}

/**
 * バックエンドでAPIキーが設定されているかチェック
 */
export async function isGeminiConfigured(): Promise<boolean> {
  try {
    const response = await fetch(getApiUrl('/status'));
    if (!response.ok) {
      return false;
    }
    const data = await response.json();
    return data.configured;
  } catch (error) {
    logger.error('[GeminiClient] Error checking configuration:', error);
    return false;
  }
}
