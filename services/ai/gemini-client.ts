/**
 * Gemini API クライアント（バックエンド経由）
 *
 * バックエンドサーバーを経由してGemini APIにアクセス
 */

import type { ModelConfig } from './model-selector';
import { logger } from '@/utils/logger';
import { authenticatedFetch, getAuthHeaders as getAuthHeadersFromClient } from '../api/client';

// バックエンドサーバーのURL
const BACKEND_URL = (() => {
  const url = process.env.EXPO_PUBLIC_BACKEND_URL;

  logger.info(`[GeminiClient] EXPO_PUBLIC_BACKEND_URL from env: ${url}`);

  // 環境変数が設定されている場合はそれを使用
  if (url) {
    logger.info(`[GeminiClient] Using backend URL: ${url}`);
    return url;
  }

  // 開発環境のみlocalhostにフォールバック
  if (__DEV__) {
    logger.info('[GeminiClient] Using fallback URL: http://localhost:3000');
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
    const response = await authenticatedFetch(getApiUrl('/generate'), {
      method: 'POST',
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
): Promise<{ data: T; tokensUsed: number }> {
  try {
    const response = await authenticatedFetch(getApiUrl('/generate-json'), {
      method: 'POST',
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
    return {
      data: result.data as T,
      tokensUsed: result.tokensUsed || 0,
    };
  } catch (error) {
    logger.error('[GeminiClient] Error in generateJSON:', error);
    throw error;
  }
}

/**
 * JSON生成（ポーリング方式 - 真のストリーミング）
 *
 * React Native対応: バックエンドで段階的に生成し、フロントエンドがポーリングで取得。
 * 各セクションが生成されるたびに即座にコールバックを呼び出します。
 */
export async function generateJSONProgressive<T>(
  prompt: string,
  config: ModelConfig,
  onProgress: (progress: number, partialData?: Partial<T>) => void
): Promise<{ data: T; tokensUsed: number }> {
  try {
    logger.info('[GeminiClient] Starting progressive generation');

    // タスクを開始
    const startResponse = await authenticatedFetch(getApiUrl('/generate-json-progressive'), {
      method: 'POST',
      body: JSON.stringify({ prompt, config }),
    });

    if (!startResponse.ok) {
      throw new ApiError(`API Error: ${startResponse.status}`, startResponse.status);
    }

    const { taskId } = await startResponse.json();
    logger.info('[GeminiClient] Task started:', taskId);

    // ポーリング開始
    let lastProgress = 0;
    let lastPartialData: Partial<T> | null = null;
    const POLLING_INTERVAL = 500; // 500ms - レート制限を回避
    const MAX_RETRIES = 3; // 404エラー時の最大リトライ回数
    let notFoundRetries = 0;

    while (true) {
      await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));

      const statusResponse = await authenticatedFetch(getApiUrl(`/task/${taskId}`));
      if (!statusResponse.ok) {
        logger.error(`[GeminiClient] Task status fetch failed: ${statusResponse.status} ${statusResponse.statusText}`);

        // タスクが見つからない場合は、既に完了している可能性がある
        if (statusResponse.status === 404 && lastProgress >= 75 && lastPartialData) {
          notFoundRetries++;
          logger.warn(`[GeminiClient] Task not found (${notFoundRetries}/${MAX_RETRIES}), last progress: ${lastProgress}`);

          // 数回リトライしても見つからない場合は、最後のデータを返す
          if (notFoundRetries >= MAX_RETRIES) {
            logger.info('[GeminiClient] Returning last partial data as completed');
            onProgress(100, lastPartialData);
            return {
              data: lastPartialData as T,
              tokensUsed: 0, // タスクが見つからないためトークン数は不明
            };
          }
          // リトライを続ける
          continue;
        }

        // レート制限の場合は少し待ってリトライ
        if (statusResponse.status === 429) {
          logger.warn('[GeminiClient] Rate limit hit, waiting 1 second...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        throw new Error(`Failed to fetch task status: ${statusResponse.status}`);
      }

      // タスクが見つかったらリトライカウントをリセット
      notFoundRetries = 0;

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
        // 部分データを保存
        if (task.partialData) {
          lastPartialData = task.partialData;
        }
      }

      // 完了
      if (task.status === 'completed') {
        logger.info('[GeminiClient] Task completed');
        return {
          data: task.partialData as T,
          tokensUsed: task.tokensUsed || 0,
        };
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
 * 追加情報のストリーミング生成（SSE方式）
 *
 * Server-Sent Eventsを使用して、生成中の各セクションを即座に通知。
 * チャットと同様の真のストリーミングを実現。
 */
export interface AdditionalInfoSection {
  hint?: { text: string };
  metrics?: any;
  examples?: any[];
}

export async function generateAdditionalInfoStream<T>(
  prompt: string,
  config: ModelConfig,
  onSection: (section: 'hint' | 'metrics' | 'examples', data: any) => void
): Promise<{ data: T; tokensUsed: number }> {
  return new Promise(async (resolve, reject) => {
    try {
      logger.info('[GeminiClient] Starting SSE stream for additional info');

      const xhr = new XMLHttpRequest();
      let buffer = '';
      let lastProcessedIndex = 0;
      let accumulatedData: Partial<T> = {};
      let finalProvider = 'gemini';
      let tokensUsed = 0;

      // 認証ヘッダーを取得（非同期）
      const authHeaders = await getAuthHeadersFromClient();

      xhr.open('POST', getApiUrl('/generate-additional-stream'), true);
      xhr.setRequestHeader('Content-Type', 'application/json');

      // 認証ヘッダーを追加
      Object.entries(authHeaders).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value);
      });

      xhr.onprogress = () => {
        const newText = xhr.responseText.substring(lastProcessedIndex);
        lastProcessedIndex = xhr.responseText.length;
        buffer += newText;

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              logger.info('[GeminiClient] SSE stream completed');
              continue;
            }

            try {
              const event = JSON.parse(data);

              if (event.type === 'section') {
                // セクション完成時のコールバック
                logger.info(`[GeminiClient] Section received: ${event.section}`);
                onSection(event.section, event.data);

                // データを蓄積
                if (event.section === 'hint') {
                  accumulatedData = { ...accumulatedData, hint: event.data };
                } else if (event.section === 'metrics') {
                  accumulatedData = { ...accumulatedData, metrics: event.data };
                } else if (event.section === 'examples') {
                  accumulatedData = { ...accumulatedData, examples: event.data };
                }
              } else if (event.type === 'complete') {
                // 全体完了
                logger.info('[GeminiClient] Complete data received');
                finalProvider = event.provider || 'gemini';
                accumulatedData = event.data;
              } else if (event.type === 'chunk') {
                // テキストチャンク（現時点では特に処理不要）
                logger.debug('[GeminiClient] Text chunk received');
              } else if (event.type === 'error') {
                logger.error('[GeminiClient] Stream error:', event.error);
                reject(new Error(event.error || 'Stream error'));
              }
            } catch (e) {
              logger.warn('[GeminiClient] Failed to parse SSE data:', e);
            }
          }
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          logger.info('[GeminiClient] SSE stream finished successfully');
          resolve({
            data: accumulatedData as T,
            tokensUsed,
          });
        } else {
          logger.error(`[GeminiClient] SSE stream failed with status ${xhr.status}`);
          reject(new Error(`Request failed with status ${xhr.status}`));
        }
      };

      xhr.onerror = () => {
        logger.error('[GeminiClient] SSE stream network error');
        reject(new Error('Network error'));
      };

      xhr.send(JSON.stringify({ prompt, config }));
    } catch (error) {
      logger.error('[GeminiClient] Error in generateAdditionalInfoStream:', error);
      reject(error);
    }
  });
}

/**
 * サジェストをSSEストリーミングで生成
 *
 * 各サジェスト候補が生成されるたびにコールバックを呼び出し
 */
export async function generateSuggestionsStream<T>(
  prompt: string,
  config: ModelConfig,
  onSuggestion: (suggestion: T) => void
): Promise<{ data: T[]; tokensUsed: number }> {
  return new Promise(async (resolve, reject) => {
    try {
      logger.info('[GeminiClient] Starting SSE stream for suggestions');

      const xhr = new XMLHttpRequest();
      let buffer = '';
      let lastProcessedIndex = 0;
      let suggestions: T[] = [];
      let finalProvider = 'gemini';
      let tokensUsed = 0;
      const seenSuggestions = new Set<string>(); // 重複チェック用

      // 認証ヘッダーを取得（非同期）
      const authHeaders = await getAuthHeadersFromClient();

      xhr.open('POST', getApiUrl('/generate-suggestions-stream'), true);
      xhr.setRequestHeader('Content-Type', 'application/json');

      // 認証ヘッダーを追加
      Object.entries(authHeaders).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value);
      });

      xhr.onprogress = () => {
        const newText = xhr.responseText.substring(lastProcessedIndex);
        lastProcessedIndex = xhr.responseText.length;
        buffer += newText;

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              logger.info('[GeminiClient] SSE suggestions stream completed');
              continue;
            }

            try {
              const event = JSON.parse(data);

              if (event.type === 'suggestion') {
                // 新しいサジェスト候補が完成
                const suggestion = event.data as T;
                const suggestionKey = JSON.stringify(suggestion);

                // 重複チェック
                if (!seenSuggestions.has(suggestionKey)) {
                  seenSuggestions.add(suggestionKey);
                  suggestions.push(suggestion);
                  logger.info(`[GeminiClient] New suggestion received (${suggestions.length}):`, event.data);
                  onSuggestion(suggestion);
                }
              } else if (event.type === 'complete') {
                // 全体完了
                logger.info('[GeminiClient] Complete suggestions data received');
                finalProvider = event.provider || 'gemini';
                suggestions = event.data || suggestions;
              } else if (event.type === 'chunk') {
                // テキストチャンク（特に処理不要）
                logger.debug('[GeminiClient] Text chunk received');
              } else if (event.type === 'error') {
                logger.error('[GeminiClient] Suggestions stream error:', event.error);
                reject(new Error(event.error || 'Stream error'));
              }
            } catch (e) {
              logger.warn('[GeminiClient] Failed to parse SSE data:', e);
            }
          }
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          logger.info('[GeminiClient] SSE suggestions stream finished successfully');
          resolve({
            data: suggestions,
            tokensUsed,
          });
        } else {
          logger.error(`[GeminiClient] SSE suggestions stream failed with status ${xhr.status}`);
          reject(new Error(`Request failed with status ${xhr.status}`));
        }
      };

      xhr.onerror = () => {
        logger.error('[GeminiClient] SSE suggestions stream network error');
        reject(new Error('Network error'));
      };

      xhr.send(JSON.stringify({ prompt, config }));
    } catch (error) {
      logger.error('[GeminiClient] Error in generateSuggestionsStream:', error);
      reject(error);
    }
  });
}

/**
 * 基本情報のみを超高速生成（headword + senses のみ）
 *
 * 詳細情報なしで0.2~0.3秒で返却
 */
export async function generateBasicInfo<T>(
  prompt: string,
  config: ModelConfig
): Promise<{ data: T; tokensUsed: number }> {
  try {
    const response = await authenticatedFetch(getApiUrl('/generate-basic-info'), {
      method: 'POST',
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
    return {
      data: result.data as T,
      tokensUsed: result.tokensUsed || 0,
    };
  } catch (error) {
    logger.error('[GeminiClient] Error in generateBasicInfo:', error);
    throw error;
  }
}

/**
 * サジェスト生成（複数候補を配列で返す）
 *
 * 日本語→英語のサジェスト専用。
 * 複数の候補を配列で返すため、専用エンドポイントを使用。
 */
export async function generateSuggestionsArray<T>(
  prompt: string,
  config: ModelConfig
): Promise<T[]> {
  try {
    const response = await authenticatedFetch(getApiUrl('/generate-suggestions'), {
      method: 'POST',
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

    // 必ず配列を返す
    if (!Array.isArray(result.data)) {
      logger.warn('[GeminiClient] generateSuggestionsArray: result.data is not array, wrapping');
      return [result.data] as T[];
    }

    return result.data as T[];
  } catch (error) {
    logger.error('[GeminiClient] Error in generateSuggestionsArray:', error);
    throw error;
  }
}

/**
 * 高速サジェスト生成（基本情報のみ）
 *
 * usageHintを含まない、lemma/pos/shortSenseのみの高速版
 */
export async function generateSuggestionsArrayFast<T>(
  prompt: string,
  config: ModelConfig
): Promise<{ data: T[]; tokensUsed: number }> {
  try {
    logger.info('[GeminiClient] Starting fast suggestions generation');
    const response = await authenticatedFetch(getApiUrl('/generate-suggestions-fast'), {
      method: 'POST',
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

    if (!Array.isArray(result.data)) {
      logger.warn('[GeminiClient] Fast suggestions: result.data is not array, wrapping');
      return {
        data: [result.data] as T[],
        tokensUsed: result.tokensUsed || 0,
      };
    }

    logger.info('[GeminiClient] Fast suggestions completed:', result.data.length);
    return {
      data: result.data as T[],
      tokensUsed: result.tokensUsed || 0,
    };
  } catch (error) {
    logger.error('[GeminiClient] Error in generateSuggestionsArrayFast:', error);
    throw error;
  }
}

/**
 * 単一単語のUsageHintを生成（並列実行用）
 *
 * @param lemma - 単語
 * @param query - 元のクエリ（ユーザーの母国語）
 */
export async function generateUsageHint(
  lemma: string,
  query: string
): Promise<{ lemma: string; usageHint: string }> {
  try {
    logger.info(`[GeminiClient] Starting usage hint generation for: ${lemma}`);
    const response = await authenticatedFetch(getApiUrl('/generate-usage-hint'), {
      method: 'POST',
      body: JSON.stringify({ lemma, query }),
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
    logger.info(`[GeminiClient] Usage hint generated for: ${lemma}`, result.data);
    logger.info(`[GeminiClient] Hint content: "${result.data?.usageHint}"`);
    return result.data;
  } catch (error) {
    logger.error(`[GeminiClient] Error in generateUsageHint for ${lemma}:`, error);
    // エラー時は空のヒントを返す
    return { lemma, usageHint: '' };
  }
}

/**
 * UsageHintsをバッチ生成（非推奨）
 *
 * @param lemmas - 英単語のリスト
 * @param query - 元のクエリ（ユーザーの母国語）
 * @deprecated generateUsageHint を並列実行してください
 */
export async function generateUsageHints(
  lemmas: string[],
  query: string
): Promise<Array<{ lemma: string; usageHint: string }>> {
  try {
    logger.info('[GeminiClient] Starting usage hints generation for:', lemmas);
    const response = await authenticatedFetch(getApiUrl('/generate-usage-hints'), {
      method: 'POST',
      body: JSON.stringify({ lemmas, query }),
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

    if (!Array.isArray(result.data)) {
      logger.warn('[GeminiClient] Usage hints: result.data is not array, wrapping');
      return [result.data];
    }

    logger.info('[GeminiClient] Usage hints completed:', result.data.length);
    return result.data;
  } catch (error) {
    logger.error('[GeminiClient] Error in generateUsageHints:', error);
    throw error;
  }
}

/**
 * バックエンドでAPIキーが設定されているかチェック
 */
/**
 * 言語判定（専用エンドポイント使用、Groq優先）
 *
 * @param text - 判定するテキスト
 * @param candidates - 候補となる言語コードのリスト
 * @returns 検出された言語コード（候補にない場合はnull）
 */
export interface LanguageDetectionResult {
  language: string | null;
  confidence: number;
  provider: 'groq' | 'gemini';
  latency: number;
}

export async function detectLanguage(
  text: string,
  candidates?: string[]
): Promise<LanguageDetectionResult> {
  try {
    const response = await authenticatedFetch(`${BACKEND_URL}/api/language-detect`, {
      method: 'POST',
      body: JSON.stringify({ text, candidates }),
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

    const data: LanguageDetectionResult = await response.json();
    logger.info('[GeminiClient] Language detected:', {
      language: data.language,
      confidence: data.confidence,
      provider: data.provider,
      latency: data.latency,
    });
    return data;
  } catch (error) {
    logger.error('[GeminiClient] Error in detectLanguage:', error);
    throw error;
  }
}

export async function isGeminiConfigured(): Promise<boolean> {
  try {
    const statusUrl = getApiUrl('/status');
    logger.info(`[GeminiClient] Checking backend status at: ${statusUrl}`);

    const response = await authenticatedFetch(statusUrl);
    logger.info(`[GeminiClient] Status response: ${response.ok}, status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      logger.warn(`[GeminiClient] Status check failed: ${errorText}`);
      return false;
    }
    const data = await response.json();
    logger.info(`[GeminiClient] Backend configured: ${data.configured}`);
    return data.configured;
  } catch (error) {
    // バックエンドサーバーが起動していない場合はモックデータを使用（正常な動作）
    logger.error('[GeminiClient] Backend server not available:', error);
    logger.debug('[GeminiClient] Backend server not available, using mock data');
    return false;
  }
}
