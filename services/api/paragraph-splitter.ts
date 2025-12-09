import { logger } from '@/utils/logger';
import { authenticatedFetch } from './client';
import { generateId } from '@/utils/id';

const BACKEND_URL = (() => {
  const url = process.env.EXPO_PUBLIC_BACKEND_URL;

  if (url) return url;

  if (__DEV__) {
    logger.warn('[ParagraphSplitter] EXPO_PUBLIC_BACKEND_URL not set, using localhost');
    return 'http://localhost:3000';
  }

  throw new Error(
    'EXPO_PUBLIC_BACKEND_URL environment variable must be set in production. ' +
    'Please add it to your .env file or deployment configuration.'
  );
})();

export interface Paragraph {
  id: string;
  originalText: string;
  translatedText: string;
  index: number;
}

export interface ParagraphSplitRequest {
  originalText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
}

interface BackendParagraph {
  originalText: string;
  translatedText: string;
}

interface ParagraphSplitResponse {
  paragraphs: BackendParagraph[];
}

/**
 * シンプルな空行分割を試行
 */
function trySimpleSplit(request: ParagraphSplitRequest): Paragraph[] | null {
  const { originalText, translatedText } = request;

  // 空行で分割
  const originalParagraphs = originalText
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  const translatedParagraphs = translatedText
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  // 段落が1つしかない場合はnullを返す（AI分割が必要）
  if (originalParagraphs.length === 1 && translatedParagraphs.length === 1) {
    return null;
  }

  // 段落数が大きく異なる場合もnullを返す（AI分割が必要）
  if (Math.abs(originalParagraphs.length - translatedParagraphs.length) > 2) {
    return null;
  }

  // 段落数を合わせる
  const paragraphCount = Math.min(originalParagraphs.length, translatedParagraphs.length);
  const paragraphs: Paragraph[] = [];

  for (let i = 0; i < paragraphCount; i++) {
    paragraphs.push({
      id: generateId(),
      originalText: originalParagraphs[i],
      translatedText: translatedParagraphs[i],
      index: i,
    });
  }

  // どちらかが余った場合、最後の段落にまとめる
  if (originalParagraphs.length > paragraphCount) {
    const remaining = originalParagraphs.slice(paragraphCount).join('\n\n');
    if (paragraphs.length > 0) {
      paragraphs[paragraphs.length - 1].originalText += '\n\n' + remaining;
    }
  }
  if (translatedParagraphs.length > paragraphCount) {
    const remaining = translatedParagraphs.slice(paragraphCount).join('\n\n');
    if (paragraphs.length > 0) {
      paragraphs[paragraphs.length - 1].translatedText += '\n\n' + remaining;
    }
  }

  return paragraphs;
}

/**
 * AIを使用して段落を分割
 */
async function aiSplitParagraphs(request: ParagraphSplitRequest): Promise<Paragraph[]> {
  logger.info('[ParagraphSplitter] Calling AI split API');

  const response = await authenticatedFetch(`${BACKEND_URL}/api/translate/split-paragraphs`, {
    method: 'POST',
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Paragraph split failed: ${response.statusText}`);
  }

  const data: ParagraphSplitResponse = await response.json();

  logger.info('[ParagraphSplitter] AI split successful:', data.paragraphs.length, 'paragraphs');

  // バックエンドのレスポンスをフロントエンドの型に変換
  return data.paragraphs.map((p, index) => ({
    id: generateId(),
    originalText: p.originalText,
    translatedText: p.translatedText,
    index,
  }));
}

/**
 * 翻訳結果を段落に分割
 *
 * まず空行（\n\n）での分割を試行し、
 * 分割できない/不明瞭な場合はAIを使用
 */
export async function splitIntoParagraphs(
  request: ParagraphSplitRequest
): Promise<Paragraph[]> {
  try {
    logger.info('[ParagraphSplitter] Splitting paragraphs:', {
      originalLength: request.originalText.length,
      translatedLength: request.translatedText.length,
    });

    // まずシンプルな分割を試行
    const simpleSplit = trySimpleSplit(request);

    if (simpleSplit && simpleSplit.length > 1) {
      logger.info('[ParagraphSplitter] Simple split successful:', simpleSplit.length, 'paragraphs');
      return simpleSplit;
    }

    // 文章が短い場合（500文字以下）はAI分割をスキップ
    if (request.originalText.length <= 500) {
      logger.info('[ParagraphSplitter] Text too short, returning as single paragraph');
      return [{
        id: generateId(),
        originalText: request.originalText.trim(),
        translatedText: request.translatedText.trim(),
        index: 0,
      }];
    }

    // AI分割を試行
    try {
      return await aiSplitParagraphs(request);
    } catch (aiError) {
      logger.error('[ParagraphSplitter] AI split failed:', aiError);

      // フォールバック: 全体を1段落として返す
      logger.info('[ParagraphSplitter] Falling back to single paragraph');
      return [{
        id: generateId(),
        originalText: request.originalText.trim(),
        translatedText: request.translatedText.trim(),
        index: 0,
      }];
    }
  } catch (error) {
    logger.error('[ParagraphSplitter] Paragraph split error:', error);

    // 最終フォールバック
    return [{
      id: generateId(),
      originalText: request.originalText.trim(),
      translatedText: request.translatedText.trim(),
      index: 0,
    }];
  }
}
