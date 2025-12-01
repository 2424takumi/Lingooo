import { logger } from '@/utils/logger';
import { MAX_TEXT_LENGTH } from '@/constants/validation';
import { authenticatedFetch } from './client';
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
