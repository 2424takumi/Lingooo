import { logger } from '@/utils/logger';
import { authenticatedFetch } from './client';

const BACKEND_URL = (() => {
  const url = process.env.EXPO_PUBLIC_BACKEND_URL;

  if (url) return url;

  if (__DEV__) {
    logger.warn('[URL Extract API] EXPO_PUBLIC_BACKEND_URL not set, using localhost');
    return 'http://localhost:3000';
  }

  throw new Error(
    'EXPO_PUBLIC_BACKEND_URL environment variable must be set in production.'
  );
})();

export interface UrlExtractResponse {
  title: string;
  text: string;
  url: string;
  truncated: boolean;
  originalLength: number;
}

/**
 * URLからテキストを抽出する
 */
export async function extractTextFromUrl(url: string): Promise<UrlExtractResponse> {
  logger.info('[URL Extract API] Extracting text from:', url);

  const response = await authenticatedFetch(`${BACKEND_URL}/api/translate/extract-url`, {
    method: 'POST',
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const message = errorData?.userMessage || errorData?.message || 'URLからテキストを抽出できませんでした';
    logger.error('[URL Extract API] Error:', { status: response.status, message });
    throw new Error(message);
  }

  const result = await response.json();
  logger.info('[URL Extract API] Success:', {
    textLength: result.data.text.length,
    truncated: result.data.truncated,
    title: result.data.title,
  });

  return result.data;
}
