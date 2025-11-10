/**
 * 検索APIサービス
 *
 * AI生成（Gemini Flash）をメインに使用
 * フォールバックとしてモックデータも利用可能
 */

import mockDictionary from '@/data/mock-dictionary.json';
import type { SuggestionItem, SuggestionResponse, WordDetailResponse, SearchError } from '@/types/search';
import { generateWordDetail, generateWordDetailStream, generateSuggestions, generateWordDetailTwoStage, generateSuggestionsFast, addUsageHintsParallel } from '@/services/ai/dictionary-generator';
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

/**
 * AI候補生成（2段階高速版）
 *
 * ステージ1: 基本情報のみを0.5~1秒で取得
 * ステージ2: usageHintを追加（バックグラウンド）
 */
async function tryGenerateAiSuggestionsTwoStage(
  query: string,
  targetLanguage: string = 'en'
): Promise<{ basic: SuggestionItem[]; enhancePromise: Promise<void> } | null> {
  try {
    // ステージ1: 基本情報を高速取得（0.5~1秒）
    logger.info('[tryGenerateAiSuggestionsTwoStage] Stage 1: Fetching basic info');
    const basicSuggestions = await withTimeout(
      generateSuggestionsFast(query, targetLanguage),
      SUGGESTION_TIMEOUT_MS
    );

    if (!Array.isArray(basicSuggestions) || basicSuggestions.length === 0) {
      logger.warn('[tryGenerateAiSuggestionsTwoStage] No suggestions returned');
      return null;
    }

    logger.info(`[tryGenerateAiSuggestionsTwoStage] Stage 1 complete: ${basicSuggestions.length} ${targetLanguage} suggestions`);

    // 基本情報を返す用のアイテム（usageHintなし）
    const basicItems: SuggestionItem[] = basicSuggestions.slice(0, 10).map(item => ({
      lemma: item.lemma,
      pos: item.pos,
      shortSenseJa: item.shortSenseJa,
      confidence: item.confidence,
    }));

    // ステージ2: usageHintを並列でバックグラウンド追加
    const enhancePromise = (async () => {
      try {
        logger.info('[tryGenerateAiSuggestionsTwoStage] Stage 2: Fetching usage hints in parallel');
        const lemmas = basicItems.map(item => item.lemma);

        // 並列生成：各ヒントが完成次第、キャッシュを更新
        await addUsageHintsParallel(lemmas, query, (hint) => {
          // 1つのヒントが完成したら即座にキャッシュ更新
          const currentItems = getCachedSuggestions(query, targetLanguage) || basicItems;
          const updatedItems = currentItems.map(item =>
            item.lemma === hint.lemma ? { ...item, usageHint: hint.usageHint } : item
          );
          setCachedSuggestions(query, updatedItems, targetLanguage);
          logger.info(`[tryGenerateAiSuggestionsTwoStage] Hint added for: ${hint.lemma}`);
        });

        logger.info('[tryGenerateAiSuggestionsTwoStage] Stage 2 complete: all hints added');
      } catch (error) {
        logger.error('[tryGenerateAiSuggestionsTwoStage] Stage 2 failed:', error);
        // ヒント追加に失敗してもbasicは既に表示されているので問題なし
      }
    })();

    return { basic: basicItems, enhancePromise };
  } catch (error) {
    logger.error('[tryGenerateAiSuggestionsTwoStage] Stage 1 failed:', error);
    return null;
  }
}

/**
 * 日本語→ターゲット言語候補検索（2段階高速版）
 *
 * ステージ1: 基本情報を0.5~1秒で返却
 * ステージ2: usageHintをバックグラウンドで追加
 *
 * @param query - 日本語の検索クエリ
 * @param targetLanguage - ターゲット言語コード（例: 'en', 'es', 'pt', 'zh'）
 * @param isOffline - オフライン状態かどうか（オプション）
 * @returns 候補のリスト
 */
export async function searchJaToEn(query: string, targetLanguage: string = 'en', isOffline: boolean = false): Promise<SuggestionResponse> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return {
      items: [],
    };
  }

  // オフライン時: キャッシュ → モックデータの順に検索
  if (isOffline) {
    logger.info('[searchJaToEn] Offline mode: checking cache and mock data');

    // キャッシュをチェック
    const cachedItems = getCachedSuggestions(trimmedQuery, targetLanguage);
    if (cachedItems && cachedItems.length > 0) {
      logger.info('[searchJaToEn] Returning cached suggestions (offline)');
      return { items: cachedItems };
    }

    // キャッシュがない場合はモックデータ
    const mockItems = findMockSuggestions(trimmedQuery);
    logger.info(`[searchJaToEn] Returning ${mockItems.length} mock suggestions (offline)`);
    if (mockItems.length > 0) {
      setCachedSuggestions(trimmedQuery, mockItems, targetLanguage);
    }
    return { items: mockItems };
  }

  // Gemini未設定の場合はモックデータのみ
  if (!(await isGeminiConfigured())) {
    const mockItems = findMockSuggestions(trimmedQuery);
    if (mockItems.length > 0) {
      setCachedSuggestions(trimmedQuery, mockItems, targetLanguage);
    }
    return {
      items: mockItems,
    };
  }

  // 2段階生成（並列版）を開始
  logger.info(`[searchJaToEn] Starting 2-stage parallel generation for: ${trimmedQuery} (${targetLanguage})`);
  const result = await tryGenerateAiSuggestionsTwoStage(trimmedQuery, targetLanguage);

  if (result && result.basic.length > 0) {
    // ステージ1: 基本情報を即座に返す & キャッシュ
    setCachedSuggestions(trimmedQuery, result.basic, targetLanguage);
    logger.info('[searchJaToEn] Returning basic suggestions immediately');

    // ステージ2はバックグラウンドで並列実行（各ヒント完成次第キャッシュ更新）
    // enhancePromiseは内部で個別にsetCachedSuggestionsを呼ぶ

    return {
      items: result.basic,
    };
  }

  // AI生成失敗時はモックデータにフォールバック
  logger.warn('[searchJaToEn] AI generation failed, falling back to mock data');
  const mockItems = findMockSuggestions(trimmedQuery);
  if (mockItems.length > 0) {
    setCachedSuggestions(trimmedQuery, mockItems, targetLanguage);
  }

  return {
    items: mockItems,
  };
}

/**
 * ターゲット言語の単語詳細取得
 *
 * @param word - 検索する単語
 * @param targetLanguage - ターゲット言語コード（例: 'en', 'es', 'pt', 'zh'）
 * @param detailLevel - AI返答の詳細度レベル（'concise' | 'detailed'）
 * @param isOffline - オフライン状態かどうか（オプション）
 * @returns 単語の詳細情報
 */
export async function getWordDetail(
  word: string,
  targetLanguage: string = 'en',
  detailLevel?: 'concise' | 'detailed',
  isOffline: boolean = false
): Promise<WordDetailResponse> {
  // オフライン時: モックデータのみ使用
  if (isOffline) {
    logger.info('[getWordDetail] Offline mode: using mock data only');
    await new Promise(resolve => setTimeout(resolve, 100));

    const enDetails = mockDictionary.en_details as Record<string, WordDetailResponse>;
    const detail = enDetails[word.toLowerCase()];

    if (!detail) {
      throw {
        type: 'not_found',
        message: `「${word}」が見つかりませんでした（オフライン）`
      } as SearchError;
    }

    return detail;
  }

  // AI生成を使用（Gemini API設定済みの場合）
  if (await isGeminiConfigured()) {
    try {
      const detail = await generateWordDetail(word, targetLanguage, detailLevel);
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
      message: `「${word}」はサンプル辞書に含まれていません。\n\nすべての単語を検索するには、設定からGemini APIキーを設定してください。`
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
 * @param detailLevel - AI返答の詳細度レベル（'concise' | 'detailed'）
 * @param onProgress - 進捗コールバック（0-100、部分データ付き）
 * @param isOffline - オフライン状態かどうか（オプション）
 * @returns 単語の詳細情報
 */
export async function getWordDetailStream(
  word: string,
  targetLanguage: string = 'en',
  detailLevel: 'concise' | 'detailed' = 'concise',
  onProgress?: (progress: number, partialData?: Partial<WordDetailResponse>) => void,
  isOffline: boolean = false
): Promise<WordDetailResponse> {
  logger.info(`[Search API] getWordDetailStream (2-stage) called for: ${word} (${targetLanguage}, ${detailLevel}, offline: ${isOffline})`);

  // オフライン時: モックデータのみ使用
  if (isOffline) {
    logger.info('[Search API] Offline mode: using mock data');

    // 進捗表示のシミュレーション
    if (onProgress) {
      onProgress(50);
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    const enDetails = mockDictionary.en_details as Record<string, WordDetailResponse>;
    const detail = enDetails[word.toLowerCase()];

    if (!detail) {
      throw {
        type: 'not_found',
        message: `「${word}」はサンプル辞書に含まれていません。\n\nオンライン時にGemini APIキーを設定すると、すべての単語を検索できます。`
      } as SearchError;
    }

    if (onProgress) {
      onProgress(100, detail);
    }

    return detail;
  }

  // AI生成を使用（Gemini API設定済みの場合）
  try {
    const isConfigured = await isGeminiConfigured();
    logger.info('[Search API] Gemini configured:', isConfigured);

    if (isConfigured) {
      try {
        logger.info('[Search API] Calling generateWordDetailTwoStage');
        const detail = await generateWordDetailTwoStage(word, targetLanguage, detailLevel, onProgress);
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
        return getWordDetail(word, targetLanguage, detailLevel, isOffline);
      }
    }
  } catch (configError) {
    logger.error('[Search API] isGeminiConfigured error:', configError);
  }

  // APIキーなしの場合は通常版を使用
  logger.info('[Search API] Using mock data');
  return getWordDetail(word, targetLanguage, detailLevel, isOffline);
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
