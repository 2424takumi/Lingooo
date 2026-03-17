/**
 * 検索APIサービス
 *
 * AI生成（Gemini Flash）をメインに使用
 * フォールバックとしてモックデータも利用可能
 */

import mockDictionary from '@/data/mock-dictionary.json';
import type { SuggestionItem, SuggestionResponse, WordDetailResponse, SearchError } from '@/types/search';
import { generateWordDetail, generateWordDetailStream, generateSuggestions, generateWordDetailTwoStage, generateSuggestionsFast, addUsageHintsParallel, generateSuggestionsStreamFast, generateWordDetailWithHintStreaming } from '@/services/ai/dictionary-generator';
import { isGeminiConfigured } from '@/services/ai/gemini-client';
import { setCachedSuggestions, setCachedSuggestionsAsync, getCachedSuggestions, getCachedSuggestionsSync } from '@/services/cache/suggestion-cache';
import { logger } from '@/utils/logger';

const SUGGESTION_TIMEOUT_MS = 30000; // 30秒に延長（AI生成に時間がかかるため）
// @ts-ignore - Mock data type compatibility
const jaToEnDictionary = mockDictionary.ja_to_en as Record<string, SuggestionItem[]>;
const jaToEnEntries = Object.entries(jaToEnDictionary);

function findMockSuggestions(query: string): SuggestionItem[] {
  const trimmed = query.trim();

  if (!trimmed) {
    return [];
  }

  // データを配列形式に正規化するヘルパー関数
  const normalizeItem = (item: any): SuggestionItem => {
    // shortSenseが文字列の場合は配列に変換（後方互換性）
    // 古いフィールド名shortSenseJaもサポート
    const shortSense = Array.isArray(item.shortSense)
      ? item.shortSense
      : Array.isArray(item.shortSenseJa)
      ? item.shortSenseJa
      : [item.shortSense || item.shortSenseJa].filter(Boolean);

    return {
      ...item,
      shortSense,
    };
  };

  const exactMatches = jaToEnDictionary[trimmed];
  if (exactMatches?.length) {
    return exactMatches.map(normalizeItem).slice(0, 10);
  }

  for (const [key, value] of jaToEnEntries) {
    if (key.includes(trimmed) && value?.length) {
      return value.map(normalizeItem).slice(0, 10);
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
 * AI候補生成（SSEストリーミング版）
 *
 * 各サジェスト候補が生成されるたびに即座にキャッシュを更新してUIに反映
 * ステージ2: usageHintを追加（バックグラウンド）
 */
async function tryGenerateAiSuggestionsTwoStage(
  query: string,
  targetLanguage: string = 'en',
  nativeLanguage: string = 'ja'
): Promise<{ basic: SuggestionItem[]; enhancePromise: Promise<void> } | null> {
  try {
    logger.info('[tryGenerateAiSuggestionsTwoStage] Starting SSE streaming for suggestions');

    const receivedSuggestions: SuggestionItem[] = [];

    // SSEストリーミングで各サジェストを取得
    const suggestions = await withTimeout(
      generateSuggestionsStreamFast(query, targetLanguage, nativeLanguage, (suggestion) => {
        // 各サジェストが生成されるたびに即座にキャッシュを更新
        // 防御的パース: shortSenseが文字列の場合は配列に変換
        const normalizedShortSense = Array.isArray(suggestion.shortSense)
          ? suggestion.shortSense
          : [suggestion.shortSense].filter(Boolean);

        const newItem: SuggestionItem = {
          lemma: suggestion.lemma,
          pos: suggestion.pos,
          shortSense: normalizedShortSense,
          confidence: suggestion.confidence,
          nuance: suggestion.nuance,
        };
        receivedSuggestions.push(newItem);

        logger.info(`[tryGenerateAiSuggestionsTwoStage] Streaming suggestion ${receivedSuggestions.length}: ${suggestion.lemma}`);

        // キャッシュを更新（UIが即座に反映）
        setCachedSuggestions(query, receivedSuggestions, targetLanguage);
      }),
      SUGGESTION_TIMEOUT_MS
    );

    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      logger.warn('[tryGenerateAiSuggestionsTwoStage] No suggestions returned');
      return null;
    }

    logger.info(`[tryGenerateAiSuggestionsTwoStage] SSE streaming complete: ${suggestions.length} ${targetLanguage} suggestions`);

    // 基本情報を返す用のアイテム（usageHintなし）
    // 防御的パース: shortSenseが文字列の場合は配列に変換
    const basicItems: SuggestionItem[] = suggestions.slice(0, 10).map(item => ({
      lemma: item.lemma,
      pos: item.pos,
      shortSense: Array.isArray(item.shortSense)
        ? item.shortSense
        : [item.shortSense].filter(Boolean),
      confidence: item.confidence,
      nuance: item.nuance,
    }));

    // ステージ2: usageHintを並列でバックグラウンド追加
    const enhancePromise = (async () => {
      try {
        logger.info('[tryGenerateAiSuggestionsTwoStage] Stage 2: Fetching usage hints in parallel');
        const lemmas = basicItems.map(item => item.lemma);

        // 並列生成：各ヒントが完成次第、キャッシュを更新（永続化を確実に実行）
        await addUsageHintsParallel(lemmas, query, nativeLanguage, async (hint) => {
          // 1つのヒントが完成したら即座にキャッシュ更新（非同期版で永続化を保証）
          const currentItems = getCachedSuggestionsSync(query, targetLanguage) || basicItems;
          const updatedItems = currentItems.map(item =>
            item.lemma === hint.lemma ? { ...item, usageHint: hint.usageHint } : item
          );
          await setCachedSuggestionsAsync(query, updatedItems, targetLanguage);
          logger.info(`[tryGenerateAiSuggestionsTwoStage] Hint added and persisted for: ${hint.lemma}`);
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
 * @param query - 検索クエリ（母語での入力）
 * @param targetLanguage - ターゲット言語コード（例: 'en', 'es', 'pt', 'zh'）
 * @param nativeLanguage - 母国語コード（例: 'ja', 'en', 'pt'）
 * @param isOffline - オフライン状態かどうか（オプション）
 * @returns 候補のリスト
 */
export async function searchJaToEn(query: string, targetLanguage: string = 'en', nativeLanguage: string = 'ja', isOffline: boolean = false): Promise<SuggestionResponse> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return {
      items: [],
    };
  }

  // 🚀 CACHE-FIRST OPTIMIZATION: まずキャッシュをチェック（オフライン・オンライン共通）
  // AsyncStorageから永続化されたキャッシュもチェック
  const cachedItems = await getCachedSuggestions(trimmedQuery, targetLanguage);
  if (cachedItems && cachedItems.length > 0) {
    logger.info('[searchJaToEn] ⚡ Returning cached suggestions (instant)');
    return { items: cachedItems };
  }

  // オフライン時: モックデータを使用
  if (isOffline) {
    logger.info('[searchJaToEn] Offline mode: using mock data');

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

  // 2段階生成（並列版）を開始（リトライ付き）
  logger.info(`[searchJaToEn] Starting AI generation for: ${trimmedQuery} (${targetLanguage}, native: ${nativeLanguage})`);

  const MAX_RETRIES = 1; // 1回リトライ（合計2回試行）
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const result = await tryGenerateAiSuggestionsTwoStage(trimmedQuery, targetLanguage, nativeLanguage);

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

    if (attempt < MAX_RETRIES) {
      logger.warn(`[searchJaToEn] AI generation attempt ${attempt + 1} failed, retrying...`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1秒待ってリトライ
    }
  }

  // AI生成失敗時はモックデータにフォールバック
  logger.warn('[searchJaToEn] AI generation failed after retries, falling back to mock data');
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
 * @param isOffline - オフライン状態かどうか（オプション）
 * @returns 単語の詳細情報
 */
export async function getWordDetail(
  word: string,
  targetLanguage: string = 'en',
  isOffline: boolean = false
): Promise<{ data: WordDetailResponse; tokensUsed: number }> {
  // オフライン時: モックデータのみ使用
  if (isOffline) {
    logger.info('[getWordDetail] Offline mode: using mock data only');
    await new Promise(resolve => setTimeout(resolve, 100));

    // @ts-ignore - Mock data type compatibility
    const enDetails = mockDictionary.en_details as Record<string, WordDetailResponse>;
    const detail = enDetails[word.toLowerCase()];

    if (!detail) {
      throw {
        type: 'not_found',
        message: `「${word}」が見つかりませんでした（オフライン）`
      } as SearchError;
    }

    return {
      data: detail,
      tokensUsed: 0,
    };
  }

  // AI生成を使用（Gemini API設定済みの場合）
  if (await isGeminiConfigured()) {
    try {
      const result = await generateWordDetail(word, targetLanguage);
      return result;
    } catch (error) {
      logger.error('AI生成エラー、モックデータにフォールバック:', error);
      // エラー時はモックデータにフォールバック
    }
  }

  // フォールバック: モックデータを使用（英語のみ）
  await new Promise(resolve => setTimeout(resolve, 300));

  // @ts-ignore - Mock data type compatibility
  const enDetails = mockDictionary.en_details as Record<string, WordDetailResponse>;
  const detail = enDetails[word.toLowerCase()];

  if (!detail) {
    throw {
      type: 'not_found',
      message: `「${word}」が見つかりませんでした。\n\nサーバーに接続できませんでした。しばらくしてからもう一度お試しください。`
    } as SearchError;
  }

  return {
    data: detail,
    tokensUsed: 0,
  };
}

/**
 * ターゲット言語の単語詳細取得（ストリーミング版 - 2段階超高速 + Hintストリーミング）
 *
 * ステージ1: 基本情報を0.2~0.3秒で表示
 * ステージ2A: Hintを文字単位でストリーミング（チャットのようにスムーズ）
 * ステージ2B: 詳細情報を2.5秒で追加
 *
 * @param word - 検索する単語
 * @param targetLanguage - ターゲット言語コード（例: 'en', 'es', 'pt', 'zh'）
 * @param nativeLanguage - 母国語コード（例: 'ja', 'en', 'zh'）
 * @param onProgress - 進捗コールバック（0-100、部分データ付き）
 * @param isOffline - オフライン状態かどうか（オプション）
 * @param onHintChunk - Hintテキストチャンク受信コールバック（5-10文字ずつ）
 * @returns 単語の詳細情報
 */
export async function getWordDetailStream(
  word: string,
  targetLanguage: string = 'en',
  nativeLanguage: string = 'ja',
  onProgress?: (progress: number, partialData?: Partial<WordDetailResponse>) => void,
  isOffline: boolean = false,
  onHintChunk?: (chunk: string) => void
): Promise<{ data: WordDetailResponse; tokensUsed: number }> {
  logger.info(`[Search API] getWordDetailStream (Hint streaming) called for: ${word} (${targetLanguage}, native: ${nativeLanguage}, offline: ${isOffline})`);

  // オフライン時: モックデータのみ使用
  if (isOffline) {
    logger.info('[Search API] Offline mode: using mock data');

    // 進捗表示のシミュレーション
    if (onProgress) {
      onProgress(50);
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // @ts-ignore - Mock data type compatibility
    const enDetails = mockDictionary.en_details as Record<string, WordDetailResponse>;
    const detail = enDetails[word.toLowerCase()];

    if (!detail) {
      throw {
        type: 'not_found',
        message: `「${word}」が見つかりませんでした。\n\nオフラインのため検索できません。インターネットに接続してからもう一度お試しください。`
      } as SearchError;
    }

    if (onProgress) {
      onProgress(100, detail);
    }

    return {
      data: detail,
      tokensUsed: 0, // オフライン時はトークン使用なし
    };
  }

  // AI生成を使用（Gemini API設定済みの場合）
  try {
    const isConfigured = await isGeminiConfigured();
    logger.info('[Search API] Gemini configured:', isConfigured);

    if (isConfigured) {
      try {
        logger.info('[Search API] Calling generateWordDetailWithHintStreaming');
        const result = await generateWordDetailWithHintStreaming(
          word,
          targetLanguage,
          nativeLanguage,
          onProgress,
          onHintChunk
        );
        logger.info('[Search API] generateWordDetailWithHintStreaming succeeded');
        return result;
      } catch (error) {
        // 429エラー（レート制限）の場合は特別なメッセージ
        const isRateLimitError = error instanceof Error &&
          (error.message.includes('429') || error.message.includes('rate limit'));

        if (isRateLimitError) {
          logger.warn('[Search API] Rate limit exceeded, using mock data');
        } else {
          logger.error('[Search API] AI生成エラー、モックデータにフォールバック:', error);
        }

        // エラー時は通常版にフォールバック（これもトークン数を返す）
        const fallbackResult = await getWordDetail(word, targetLanguage, isOffline);
        return fallbackResult;
      }
    }
  } catch (configError) {
    logger.error('[Search API] isGeminiConfigured error:', configError);
  }

  // APIキーなしの場合は通常版を使用（これもトークン数を返す）
  logger.info('[Search API] Using mock data');
  const mockResult = await getWordDetail(word, targetLanguage, isOffline);
  return mockResult;
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
  // @ts-ignore - Mock data type compatibility
  const enDetails = mockDictionary.en_details as Record<string, WordDetailResponse>;
  const allWords = Object.keys(enDetails);

  // 簡易実装: 先頭文字が同じものを候補として返す
  return allWords
    .filter(w => w[0] === word[0] && w !== word)
    .slice(0, 3);
}
