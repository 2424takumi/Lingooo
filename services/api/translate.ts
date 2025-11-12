import { logger } from '@/utils/logger';
import { MAX_TEXT_LENGTH } from '@/constants/validation';

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
  try {
    // 文字数制限チェック
    if (text.length > MAX_TEXT_LENGTH) {
      throw new Error(`翻訳できるのは${MAX_TEXT_LENGTH}文字までです。現在の文字数: ${text.length}文字`);
    }

    logger.info('[Translate] Translating text:', {
      textLength: text.length,
      sourceLang,
      targetLang,
    });

    const response = await fetch(`${BACKEND_URL}/api/translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        sourceLang,
        targetLang,
      } as TranslateRequest),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Translation failed: ${response.statusText}`);
    }

    const data: TranslateResponse = await response.json();
    logger.info('[Translate] Translation successful');

    return data;
  } catch (error) {
    logger.error('[Translate] Translation error:', error);
    throw error;
  }
}
