import { logger } from '@/utils/logger';
import { MAX_TEXT_LENGTH } from '@/constants/validation';
import { authenticatedFetch, getAuthHeaders } from './client';
import { getCachedTranslation, setCachedTranslation } from '@/services/cache/translate-cache';

const BACKEND_URL = (() => {
  const url = process.env.EXPO_PUBLIC_BACKEND_URL;

  if (url) return url;

  if (__DEV__) {
    logger.warn('[Translate API] EXPO_PUBLIC_BACKEND_URL not set, using localhost');
    return 'http://localhost:3000';
  }

  throw new Error(
    'EXPO_PUBLIC_BACKEND_URL environment variable must be set in production. ' +
    'Please add it to your .env file or deployment configuration.'
  );
})();

export interface TranslateRequest {
  text: string;
  sourceLang: string;
  targetLang: string;
}

export interface TranslateResponse {
  originalText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
}

/**
 * テキストを翻訳する
 */
export async function translateText(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<TranslateResponse> {
  logger.info('[Translate] translateText called with:', {
    text: text.substring(0, 50),
    textLength: text.length,
    sourceLang,
    targetLang,
  });

  try {
    // 文字数制限チェック
    if (text.length > MAX_TEXT_LENGTH) {
      throw new Error(`翻訳できるのは${MAX_TEXT_LENGTH}文字までです。現在の文字数: ${text.length}文字`);
    }

    // キャッシュチェック（翻訳結果が空でない場合のみ使用）
    const cached = await getCachedTranslation(text, sourceLang, targetLang);
    if (cached && cached.translatedText) {
      logger.info('[Translate] Using cached translation');
      return cached;
    }

    logger.info('[Translate] Translating text:', {
      textLength: text.length,
      sourceLang,
      targetLang,
      backendUrl: BACKEND_URL,
    });

    logger.info('[Translate] Making API request to:', `${BACKEND_URL}/api/translate`);
    const response = await authenticatedFetch(`${BACKEND_URL}/api/translate`, {
      method: 'POST',
      body: JSON.stringify({
        text,
        sourceLang,
        targetLang,
      } as TranslateRequest),
    });

    logger.info('[Translate] API response received:', {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Translation failed: ${response.statusText}`);
    }

    const data: TranslateResponse = await response.json();
    logger.info('[Translate] Translation successful', {
      originalText: data.originalText.substring(0, 50),
      translatedText: data.translatedText ? data.translatedText.substring(0, 50) : '(empty)',
      translatedLength: data.translatedText.length,
    });

    // キャッシュに保存（翻訳結果が空でない場合のみ）
    if (data.translatedText) {
      await setCachedTranslation(text, sourceLang, targetLang, data);
    } else {
      logger.warn('[Translate] Translation result is empty, not caching');
    }

    return data;
  } catch (error) {
    logger.error('[Translate] Translation error:', error);
    throw error;
  }
}

/**
 * テキストをストリーミング翻訳する（リアルタイムで単語ごとに表示）
 * SSE (Server-Sent Events) 形式
 */
export async function translateTextStream(
  text: string,
  sourceLang: string,
  targetLang: string,
  onChunk: (chunk: string) => void,
  onComplete: (translatedText: string) => void,
  onError: (error: Error) => void
): Promise<void> {
  logger.info('[TranslateStream] Starting streaming translation:', {
    textLength: text.length,
    sourceLang,
    targetLang,
  });

  return new Promise(async (resolve, reject) => {
    try {
      // 文字数制限チェック
      if (text.length > MAX_TEXT_LENGTH) {
        const error = new Error(`翻訳できるのは${MAX_TEXT_LENGTH}文字までです。現在の文字数: ${text.length}文字`);
        onError(error);
        reject(error);
        return;
      }

      // キャッシュチェック（翻訳結果が空でない場合のみ使用）
      const cached = await getCachedTranslation(text, sourceLang, targetLang);
      if (cached && cached.translatedText) {
        logger.info('[TranslateStream] Using cached translation');
        // キャッシュがある場合は即座に完了として返す
        onComplete(cached.translatedText);
        resolve();
        return;
      }

      // 認証ヘッダーを取得
      const authHeaders = await getAuthHeaders();

      const xhr = new XMLHttpRequest();

      xhr.open('POST', `${BACKEND_URL}/api/translate/stream`, true);
      xhr.setRequestHeader('Content-Type', 'application/json');

      // 認証トークンを設定
      if (authHeaders.Authorization) {
        xhr.setRequestHeader('Authorization', authHeaders.Authorization);
      }

      let processedLength = 0;
      let fullTranslation = '';

      xhr.onprogress = () => {
        // 新しいデータのみを取得（差分）
        const newData = xhr.responseText.substring(processedLength);
        processedLength = xhr.responseText.length;

        // 各行を処理
        const lines = newData.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.substring(6); // 'data: ' を削除
              const data = JSON.parse(jsonStr);

              if (data.type === 'chunk') {
                // チャンクを即座にコールバック
                fullTranslation += data.data;
                onChunk(data.data);
              } else if (data.type === 'done') {
                // 完了通知
                logger.info('[TranslateStream] Stream complete:', {
                  translatedLength: data.translatedText.length,
                  latency: data.latency,
                });
                // キャッシュに保存
                if (data.translatedText) {
                  setCachedTranslation(text, sourceLang, targetLang, {
                    originalText: text,
                    translatedText: data.translatedText,
                    sourceLang,
                    targetLang,
                  }).catch(err => {
                    logger.warn('[TranslateStream] Failed to cache translation:', err);
                  });
                }
                onComplete(data.translatedText);
              } else if (data.type === 'error') {
                // エラー通知
                logger.error('[TranslateStream] Server error:', data.message);
                onError(new Error(data.message));
                reject(new Error(data.message));
              }
            } catch (parseError) {
              logger.error('[TranslateStream] Failed to parse SSE message:', parseError);
            }
          }
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          logger.info('[TranslateStream] Stream ended successfully');
          resolve();
        } else {
          const error = new Error(`HTTP ${xhr.status}: ${xhr.statusText}`);
          logger.error('[TranslateStream] Stream failed:', error);
          onError(error);
          reject(error);
        }
      };

      xhr.onerror = () => {
        const error = new Error('SSE connection failed');
        logger.error('[TranslateStream] Connection error');
        onError(error);
        reject(error);
      };

      xhr.ontimeout = () => {
        const error = new Error('SSE connection timeout');
        logger.error('[TranslateStream] Timeout');
        onError(error);
        reject(error);
      };

      xhr.timeout = 30000; // 30秒タイムアウト

      // リクエスト送信
      xhr.send(JSON.stringify({
        text,
        sourceLang,
        targetLang,
      } as TranslateRequest));

      logger.info('[TranslateStream] Request sent');
    } catch (error) {
      logger.error('[TranslateStream] Setup error:', error);
      onError(error instanceof Error ? error : new Error(String(error)));
      reject(error);
    }
  });
}

export interface WordContextRequest {
  word: string;
  context: string;
  sourceLang: string;
  targetLang: string;
}

export interface WordContextResponse {
  translation: string;
  partOfSpeech: string[];
  nuance: string;
}

export interface OriginalParagraph {
  originalText: string;
  index: number;
}

export interface SplitOriginalRequest {
  originalText: string;
  sourceLang: string;
}

export interface SplitOriginalResponse {
  paragraphs: OriginalParagraph[];
}

export interface TranslateParagraphRequest {
  text: string;
  sourceLang: string;
  targetLang: string;
  previousParagraph?: string;
  nextParagraph?: string;
  index: number;
}

export interface TranslateParagraphResponse {
  translatedText: string;
  index: number;
}

/**
 * Get contextual word information (translation, POS, nuance)
 */
export async function getWordContext(
  word: string,
  context: string,
  sourceLang: string,
  targetLang: string
): Promise<WordContextResponse> {
  logger.info('[WordContext] getWordContext called with:', {
    word,
    contextLength: context.length,
    sourceLang,
    targetLang,
  });

  try {
    logger.info('[WordContext] Making API request to:', `${BACKEND_URL}/api/translate/word-context`);
    const response = await authenticatedFetch(`${BACKEND_URL}/api/translate/word-context`, {
      method: 'POST',
      body: JSON.stringify({
        word,
        context,
        sourceLang,
        targetLang,
      } as WordContextRequest),
    });

    logger.info('[WordContext] API response received:', {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Word context request failed: ${response.statusText}`);
    }

    const data: WordContextResponse = await response.json();
    logger.info('[WordContext] Word context received:', {
      translation: data.translation,
      partOfSpeech: data.partOfSpeech,
      nuance: data.nuance.substring(0, 50),
    });

    return data;
  } catch (error) {
    logger.error('[WordContext] Word context error:', error);
    throw error;
  }
}

/**
 * 原文のみを段落に分割する（翻訳前）
 */
export async function splitOriginalText(
  originalText: string,
  sourceLang: string
): Promise<OriginalParagraph[]> {
  logger.info('[SplitOriginal] splitOriginalText called with:', {
    textLength: originalText.length,
    sourceLang,
  });

  try {
    logger.info('[SplitOriginal] Making API request to:', `${BACKEND_URL}/api/translate/split-original`);
    const response = await authenticatedFetch(`${BACKEND_URL}/api/translate/split-original`, {
      method: 'POST',
      body: JSON.stringify({
        originalText,
        sourceLang,
      } as SplitOriginalRequest),
    });

    logger.info('[SplitOriginal] API response received:', {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Split original text failed: ${response.statusText}`);
    }

    const data: SplitOriginalResponse = await response.json();
    logger.info('[SplitOriginal] Split successful:', {
      paragraphCount: data.paragraphs.length,
    });

    return data.paragraphs;
  } catch (error) {
    logger.error('[SplitOriginal] Split original text error:', error);
    throw error;
  }
}

/**
 * 原文を段落に分割（SSEストリーミング版、リアルタイムで段落を受信）
 * XMLHttpRequestを使用してServer-Sent Eventsを処理
 */
export async function splitOriginalTextStreamSSE(
  originalText: string,
  sourceLang: string,
  onParagraph: (paragraph: OriginalParagraph) => void,
  onComplete: (paragraphCount: number) => void,
  onError: (error: Error) => void
): Promise<void> {
  logger.info('[SplitOriginalSSE] Starting SSE split:', {
    textLength: originalText.length,
    sourceLang,
  });

  return new Promise(async (resolve, reject) => {
    try {
      // 認証ヘッダーを取得
      const authHeaders = await getAuthHeaders();

      const xhr = new XMLHttpRequest();

      xhr.open('POST', `${BACKEND_URL}/api/translate/split-original-stream`, true);
      xhr.setRequestHeader('Content-Type', 'application/json');

      // 認証トークンを設定
      if (authHeaders.Authorization) {
        xhr.setRequestHeader('Authorization', authHeaders.Authorization);
      }

      let processedLength = 0;

      xhr.onprogress = () => {
        // 新しいデータのみを取得（差分）
        const newData = xhr.responseText.substring(processedLength);
        processedLength = xhr.responseText.length;

        // 各行を処理
        const lines = newData.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.substring(6); // 'data: ' を削除
              const data = JSON.parse(jsonStr);

              logger.info('[SplitOriginalSSE] Received event:', {
                type: data.type,
                index: data.data?.index,
              });

              if (data.type === 'started') {
                // 接続確立通知
                logger.info('[SplitOriginalSSE] Connection established, processing started');
              } else if (data.type === 'paragraph') {
                // 段落を即座にコールバック
                onParagraph(data.data);
              } else if (data.type === 'done') {
                // 完了通知
                logger.info('[SplitOriginalSSE] Stream complete:', {
                  paragraphCount: data.paragraphCount,
                  latency: data.latency,
                });
                onComplete(data.paragraphCount);
              } else if (data.type === 'error') {
                // エラー通知
                logger.error('[SplitOriginalSSE] Server error:', data.message);
                onError(new Error(data.message));
                reject(new Error(data.message));
              }
            } catch (parseError) {
              logger.error('[SplitOriginalSSE] Failed to parse SSE message:', parseError);
            }
          }
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          logger.info('[SplitOriginalSSE] Stream ended successfully');
          resolve();
        } else {
          const error = new Error(`HTTP ${xhr.status}: ${xhr.statusText}`);
          logger.error('[SplitOriginalSSE] Stream failed:', error);
          onError(error);
          reject(error);
        }
      };

      xhr.onerror = () => {
        const error = new Error('SSE connection failed');
        logger.error('[SplitOriginalSSE] Connection error');
        onError(error);
        reject(error);
      };

      xhr.ontimeout = () => {
        const error = new Error('SSE connection timeout');
        logger.error('[SplitOriginalSSE] Timeout');
        onError(error);
        reject(error);
      };

      xhr.timeout = 60000; // 60秒タイムアウト (長文の段落分割には時間がかかる)

      // リクエスト送信
      xhr.send(JSON.stringify({
        originalText,
        sourceLang,
      } as SplitOriginalRequest));

      logger.info('[SplitOriginalSSE] Request sent');
    } catch (error) {
      logger.error('[SplitOriginalSSE] Setup error:', error);
      onError(error instanceof Error ? error : new Error(String(error)));
      reject(error);
    }
  });
}

/**
 * 原文を段落に分割（通常のAPI呼び出し、段落ごとに即座にコールバック）
 * React NativeのfetchはReadableStreamをサポートしないため、通常のJSON APIを使用
 * フォールバック用として保持
 */
export async function splitOriginalTextStream(
  originalText: string,
  sourceLang: string,
  onParagraph: (paragraph: OriginalParagraph) => void,
  onComplete: (paragraphCount: number) => void,
  onError: (error: Error) => void
): Promise<void> {
  logger.info('[SplitOriginalStream] Starting split:', {
    textLength: originalText.length,
    sourceLang,
  });

  try {
    // 通常のAPI呼び出し（既存のsplitOriginalTextを使用）
    const paragraphs = await splitOriginalText(originalText, sourceLang);

    logger.info('[SplitOriginalStream] Split complete, emitting paragraphs:', {
      paragraphCount: paragraphs.length,
    });

    // 各段落を順番にコールバック
    for (const paragraph of paragraphs) {
      logger.info('[SplitOriginalStream] Emitting paragraph:', {
        index: paragraph.index,
        textLength: paragraph.originalText.length,
      });
      onParagraph(paragraph);
    }

    // 完了通知
    onComplete(paragraphs.length);
  } catch (error) {
    logger.error('[SplitOriginalStream] Split error:', error);
    onError(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * 単一段落を翻訳する（文脈保持のため前後の段落も含む）
 */
export async function translateParagraph(
  text: string,
  sourceLang: string,
  targetLang: string,
  index: number,
  previousParagraph?: string,
  nextParagraph?: string
): Promise<string> {
  logger.info('[TranslateParagraph] translateParagraph called with:', {
    textLength: text.length,
    sourceLang,
    targetLang,
    index,
    hasPrevious: !!previousParagraph,
    hasNext: !!nextParagraph,
  });

  try {
    logger.info('[TranslateParagraph] Making API request to:', `${BACKEND_URL}/api/translate/paragraph`);
    const response = await authenticatedFetch(`${BACKEND_URL}/api/translate/paragraph`, {
      method: 'POST',
      body: JSON.stringify({
        text,
        sourceLang,
        targetLang,
        previousParagraph,
        nextParagraph,
        index,
      } as TranslateParagraphRequest),
    });

    logger.info('[TranslateParagraph] API response received:', {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Translate paragraph failed: ${response.statusText}`);
    }

    const data: TranslateParagraphResponse = await response.json();
    logger.info('[TranslateParagraph] Translation successful:', {
      translatedLength: data.translatedText.length,
      index: data.index,
    });

    return data.translatedText;
  } catch (error) {
    logger.error('[TranslateParagraph] Translate paragraph error:', error);
    throw error;
  }
}

/**
 * 単一段落をストリーミング翻訳する（リアルタイムで単語ごとに表示）
 * SSE (Server-Sent Events) 形式
 */
export async function translateParagraphStream(
  text: string,
  sourceLang: string,
  targetLang: string,
  index: number,
  onChunk: (chunk: string) => void,
  onComplete: (translatedText: string) => void,
  onError: (error: Error) => void,
  previousParagraph?: string,
  nextParagraph?: string
): Promise<void> {
  logger.info('[TranslateParagraphStream] Starting streaming translation:', {
    textLength: text.length,
    sourceLang,
    targetLang,
    index,
  });

  return new Promise(async (resolve, reject) => {
    try {
      // 認証ヘッダーを取得
      const authHeaders = await getAuthHeaders();

      const xhr = new XMLHttpRequest();

      xhr.open('POST', `${BACKEND_URL}/api/translate/paragraph-stream`, true);
      xhr.setRequestHeader('Content-Type', 'application/json');

      // 認証トークンを設定
      if (authHeaders.Authorization) {
        xhr.setRequestHeader('Authorization', authHeaders.Authorization);
      }

      let processedLength = 0;
      let fullTranslation = '';

      xhr.onprogress = () => {
        // 新しいデータのみを取得（差分）
        const newData = xhr.responseText.substring(processedLength);
        processedLength = xhr.responseText.length;

        // 各行を処理
        const lines = newData.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.substring(6); // 'data: ' を削除
              const data = JSON.parse(jsonStr);

              if (data.type === 'chunk') {
                // チャンクを即座にコールバック
                fullTranslation += data.data;
                onChunk(data.data);
              } else if (data.type === 'done') {
                // 完了通知
                logger.info('[TranslateParagraphStream] Stream complete:', {
                  index: data.index,
                  translatedLength: data.translatedText.length,
                  latency: data.latency,
                });
                onComplete(data.translatedText);
              } else if (data.type === 'error') {
                // エラー通知
                logger.error('[TranslateParagraphStream] Server error:', data.message);
                onError(new Error(data.message));
                reject(new Error(data.message));
              }
            } catch (parseError) {
              logger.error('[TranslateParagraphStream] Failed to parse SSE message:', parseError);
            }
          }
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          logger.info('[TranslateParagraphStream] Stream ended successfully');
          resolve();
        } else {
          // Try to parse error response body for detailed error message
          let errorMessage = `HTTP ${xhr.status}: ${xhr.statusText || 'Unknown error'}`;

          try {
            const errorResponse = JSON.parse(xhr.responseText);
            if (errorResponse.error || errorResponse.message) {
              // Use backend's detailed error message
              errorMessage = errorResponse.error || errorResponse.message;
            }
          } catch (parseError) {
            // If response is not JSON, use default message
            logger.warn('[TranslateParagraphStream] Could not parse error response:', parseError);
          }

          const error = new Error(errorMessage);
          logger.error('[TranslateParagraphStream] Stream failed:', error);
          onError(error);
          reject(error);
        }
      };

      xhr.onerror = () => {
        const error = new Error('SSE connection failed');
        logger.error('[TranslateParagraphStream] Connection error');
        onError(error);
        reject(error);
      };

      xhr.ontimeout = () => {
        const error = new Error('SSE connection timeout');
        logger.error('[TranslateParagraphStream] Timeout');
        onError(error);
        reject(error);
      };

      xhr.timeout = 30000; // 30秒タイムアウト

      // リクエスト送信
      xhr.send(JSON.stringify({
        text,
        sourceLang,
        targetLang,
        previousParagraph,
        nextParagraph,
        index,
      } as TranslateParagraphRequest));

      logger.info('[TranslateParagraphStream] Request sent');
    } catch (error) {
      logger.error('[TranslateParagraphStream] Setup error:', error);
      onError(error instanceof Error ? error : new Error(String(error)));
      reject(error);
    }
  });
}
