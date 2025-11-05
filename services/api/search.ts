/**
 * 検索APIサービス
 *
 * AI生成（Gemini Flash）をメインに使用
 * フォールバックとしてモックデータも利用可能
 */

import mockDictionary from '@/data/mock-dictionary.json';
import type { SuggestionItem, SuggestionResponse, WordDetailResponse, SearchError } from '@/types/search';
import { generateWordDetail, generateWordDetailStream, generateSuggestions, generateWordDetailTwoStage } from '@/services/ai/dictionary-generator';
import { isGeminiConfigured } from '@/services/ai/gemini-client';
import { setCachedSuggestions, getCachedSuggestions } from '@/services/cache/suggestion-cache';
import { logger } from '@/utils/logger';

const SUGGESTION_TIMEOUT_MS = 10000; // 10秒に延長（AI生成に時間がかかるため）
const jaToEnDictionary = mockDictionary.ja_to_en as Record<string, SuggestionItem[]>;
const jaToEnEntries = Object.entries(jaToEnDictionary);

function findMockSuggestions(query: string): SuggestionItem[] {
  const trimmed = query.trim();

  if (!trimmed) {
    return [];
  }

  const exactMatches = jaToEnDictionary[trimmed];
  if (exactMatches?.length) {
    return exactMatches.slice(0, 10);
  }

  for (const [key, value] of jaToEnEntries) {
    if (key.includes(trimmed) && value?.length) {
      return value.slice(0, 10);
    }
  }

  return [];
}

function mergeSuggestions(primary: SuggestionItem[], secondary: SuggestionItem[]): SuggestionItem[] {
  const result: SuggestionItem[] = [];
  const seen = new Set<string>();

  for (const item of primary) {
    if (!seen.has(item.lemma)) {
      seen.add(item.lemma);
      result.push(item);
    }
  }

  for (const item of secondary) {
    if (!seen.has(item.lemma)) {
      seen.add(item.lemma);
      result.push(item);
    }
  }

  return result.slice(0, 10);
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('timeout')), timeoutMs);
  });

  return Promise.race([
    promise.finally(() => clearTimeout(timeoutId)),
    timeoutPromise,
  ]) as Promise<T>;
}

async function tryGenerateAiSuggestions(query: string, targetLanguage: string = 'en'): Promise<SuggestionItem[] | null> {
  try {
    const suggestions = await withTimeout(generateSuggestions(query, targetLanguage), SUGGESTION_TIMEOUT_MS);

    // 配列チェック（念のため）
    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      logger.warn('[tryGenerateAiSuggestions] No suggestions returned');
      return null;
    }

    logger.info(`[tryGenerateAiSuggestions] Received ${suggestions.length} ${targetLanguage} suggestions`);
    return suggestions.slice(0, 10);
  } catch (error) {
    logger.error('AI生成エラー、モックデータにフォールバック:', error);
    return null;
  }
}

/**
 * 日本語→ターゲット言語候補検索
 *
 * @param query - 日本語の検索クエリ
 * @param targetLanguage - ターゲット言語コード（例: 'en', 'es', 'pt', 'zh'）
 * @returns 候補のリスト
 */
export async function searchJaToEn(query: string, targetLanguage: string = 'en'): Promise<SuggestionResponse> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return {
      items: [],
    };
  }
  const mockItems = findMockSuggestions(trimmedQuery);

  if (mockItems.length > 0) {
    setCachedSuggestions(trimmedQuery, mockItems);
  }

  if (!(await isGeminiConfigured())) {
    return {
      items: mockItems,
    };
  }

  const aiPromise = tryGenerateAiSuggestions(trimmedQuery, targetLanguage);

  if (mockItems.length === 0) {
    const aiItems = await aiPromise;

    if (aiItems && aiItems.length > 0) {
      setCachedSuggestions(trimmedQuery, aiItems);
      return {
        items: aiItems,
      };
    }

    return {
      items: [],
    };
  }

  aiPromise
    .then((aiItems) => {
      if (!aiItems || aiItems.length === 0) {
        return;
      }

      const existing = getCachedSuggestions(trimmedQuery) ?? mockItems;
      const merged = mergeSuggestions(aiItems, existing);
      setCachedSuggestions(trimmedQuery, merged);
    })
    .catch(() => {
      // 例外は tryGenerateAiSuggestions 内でログ済み
    });

  return {
    items: mockItems,
  };
}

/**
 * ターゲット言語の単語詳細取得
 *
 * @param word - 検索する単語
 * @param targetLanguage - ターゲット言語コード（例: 'en', 'es', 'pt', 'zh'）
 * @returns 単語の詳細情報
 */
export async function getWordDetail(word: string, targetLanguage: string = 'en'): Promise<WordDetailResponse> {
  // AI生成を使用（Gemini API設定済みの場合）
  if (await isGeminiConfigured()) {
    try {
      const detail = await generateWordDetail(word, targetLanguage);
      return detail;
    } catch (error) {
      logger.error('AI生成エラー、モックデータにフォールバック:', error);
      // エラー時はモックデータにフォールバック
    }
  }

  // フォールバック: モックデータを使用（英語のみ）
  await new Promise(resolve => setTimeout(resolve, 300));

  const enDetails = mockDictionary.en_details as Record<string, WordDetailResponse>;
  const detail = enDetails[word.toLowerCase()];

  if (!detail) {
    throw {
      type: 'not_found',
      message: `「${word}」が見つかりませんでした`
    } as SearchError;
  }

  return detail;
}

/**
 * ターゲット言語の単語詳細取得（ストリーミング版 - 2段階超高速）
 *
 * ステージ1: 基本情報を0.2~0.3秒で表示
 * ステージ2: 詳細情報を2.5秒で追加
 *
 * @param word - 検索する単語
 * @param targetLanguage - ターゲット言語コード（例: 'en', 'es', 'pt', 'zh'）
 * @param onProgress - 進捗コールバック（0-100、部分データ付き）
 * @returns 単語の詳細情報
 */
export async function getWordDetailStream(
  word: string,
  targetLanguage: string = 'en',
  onProgress?: (progress: number, partialData?: Partial<WordDetailResponse>) => void
): Promise<WordDetailResponse> {
  logger.info(`[Search API] getWordDetailStream (2-stage) called for: ${word} (${targetLanguage})`);

  // AI生成を使用（Gemini API設定済みの場合）
  try {
    const isConfigured = await isGeminiConfigured();
    logger.info('[Search API] Gemini configured:', isConfigured);

    if (isConfigured) {
      try {
        logger.info('[Search API] Calling generateWordDetailTwoStage');
        const detail = await generateWordDetailTwoStage(word, targetLanguage, onProgress);
        logger.info('[Search API] generateWordDetailTwoStage succeeded');
        return detail;
      } catch (error) {
        // 429エラー（レート制限）の場合は特別なメッセージ
        const isRateLimitError = error instanceof Error &&
          (error.message.includes('429') || error.message.includes('rate limit'));

        if (isRateLimitError) {
          logger.warn('[Search API] Rate limit exceeded, using mock data');
        } else {
          logger.error('[Search API] AI生成エラー、モックデータにフォールバック:', error);
        }

        // エラー時は通常版にフォールバック
        return getWordDetail(word, targetLanguage);
      }
    }
  } catch (configError) {
    logger.error('[Search API] isGeminiConfigured error:', configError);
  }

  // APIキーなしの場合は通常版を使用
  logger.info('[Search API] Using mock data');
  return getWordDetail(word, targetLanguage);
}

/**
 * タイポ補正候補を取得
 *
 * 編集距離1以内の候補を返す（簡易実装）
 *
 * @param word - 単語
 * @returns 候補のリスト
 */
export function getTypoSuggestions(word: string): string[] {
  const enDetails = mockDictionary.en_details as Record<string, WordDetailResponse>;
  const allWords = Object.keys(enDetails);

  // 簡易実装: 先頭文字が同じものを候補として返す
  return allWords
    .filter(w => w[0] === word[0] && w !== word)
    .slice(0, 3);
}
