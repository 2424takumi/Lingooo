import { getAuthHeaders } from './client';
import { logger } from '@/utils/logger';

const BACKEND_URL = (() => {
  const url = process.env.EXPO_PUBLIC_BACKEND_URL;

  if (url) return url;

  if (__DEV__) {
    logger.warn('[Image Translate API] EXPO_PUBLIC_BACKEND_URL not set, using localhost');
    return 'http://localhost:3000';
  }

  throw new Error(
    'EXPO_PUBLIC_BACKEND_URL environment variable must be set in production. ' +
    'Please add it to your .env file or deployment configuration.'
  );
})();

export interface ImageTranslateRequest {
  imageData: string; // Base64 encoded image
  mimeType: string; // image/jpeg, image/png, application/pdf
  targetLang: string;
  sourceLang?: string; // Optional, auto-detect if not provided
}

export interface ImageTranslateResponse {
  extractedText: string;
  translatedText: string;
  detectedLanguage: string;
  targetLanguage: string;
}

export interface ImageTranslateError {
  error: string;
  message: string;
  usage?: {
    imageTranslationCountUsed: number;
    imageTranslationCountLimit: number;
    imageTranslationCountRemaining: number;
    resetAt: string;
  };
}

/**
 * Translate text extracted from an image
 */
export async function translateImage(
  request: ImageTranslateRequest
): Promise<ImageTranslateResponse> {
  try {
    const headers = await getAuthHeaders();

    const response = await fetch(`${BACKEND_URL}/api/translate/image`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json() as ImageTranslateError;

      // Handle specific error cases
      if (response.status === 429) {
        // Quota exceeded
        throw new Error(errorData.message || '画像翻訳の上限に達しました');
      } else if (response.status === 413) {
        // File too large
        throw new Error(errorData.message || '画像サイズが大きすぎます');
      } else if (response.status === 401) {
        // Unauthorized
        throw new Error('認証が必要です');
      }

      throw new Error(errorData.message || '画像翻訳に失敗しました');
    }

    const data = await response.json() as ImageTranslateResponse;
    return data;
  } catch (error: any) {
    console.error('[ImageTranslate] Error:', error);
    throw error;
  }
}

/**
 * Convert image URI to base64 string
 */
export async function uriToBase64(uri: string): Promise<string> {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        // Remove data:image/jpeg;base64, prefix
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('[ImageTranslate] Error converting URI to base64:', error);
    throw new Error('画像の読み込みに失敗しました');
  }
}

/**
 * Get MIME type from image URI
 */
export function getMimeTypeFromUri(uri: string): string {
  const extension = uri.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'pdf':
      return 'application/pdf';
    default:
      return 'image/jpeg'; // Default to JPEG
  }
}
