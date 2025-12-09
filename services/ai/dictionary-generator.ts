/**
 * AI辞書生成サービス
 *
 * Gemini APIを使用して単語の詳細情報を生成
 * 多言語対応
 */

import { generateJSON, generateText, generateTextStream, generateJSONProgressive, generateBasicInfo, generateSuggestionsArray, generateSuggestionsArrayFast, generateUsageHint, generateUsageHints, detectLanguage, generateAdditionalInfoStream, generateSuggestionsStream, generateHintStream, type LanguageDetectionResult, type HintStreamCallbacks } from './gemini-client';
import { selectModel } from './model-selector';
import { createBasicInfoPrompt, createAdditionalDetailsPrompt, createDictionaryPrompt, createSuggestionsPrompt, getLanguageNameEn } from './prompt-generator';
import { fetchPromptWithFallback } from './langfuse-client';
import type { WordDetailResponse } from '@/types/search';
import { logger } from '@/utils/logger';

/**
 * 単語の言語を検出（専用エンドポイント使用、Groq優先）
 *
 * @param word - 検出する単語
 * @param candidateLanguages - 候補となる言語コードのリスト（例: ['en', 'pt', 'es']）
 * @returns 検出結果（言語コード、信頼度、プロバイダー、レイテンシー）
 */
export async function detectWordLanguage(
  word: string,
  candidateLanguages: string[]
): Promise<LanguageDetectionResult | null> {
  try {
    const result = await detectLanguage(word, candidateLanguages);

    logger.info('[detectWordLanguage] Detected language:', {
      word,
      candidates: candidateLanguages,
      language: result.language,
      confidence: result.confidence,
      provider: result.provider,
    });

    return result;
  } catch (error) {
    logger.error('[detectWordLanguage] Error:', error);
    return null;
  }
}

/**
 * 単語の詳細情報を生成
 *
 * @param word - 検索する単語
 * @param targetLanguage - ターゲット言語コード（例: 'en', 'es', 'pt', 'zh'）
 * @returns 単語の詳細情報とトークン使用量
 */
export async function generateWordDetail(
  word: string,
  targetLanguage: string = 'en'
): Promise<{ data: WordDetailResponse; tokensUsed: number }> {
  // モデル選択
  const modelConfig = selectModel();

  // プロンプト生成
  const prompt = createDictionaryPrompt(word, targetLanguage);

  // AI生成
  const result = await generateJSON<WordDetailResponse>(prompt, modelConfig);

  // 結果の検証
  if (!result.data.headword || !result.data.headword.lemma) {
    throw new Error(`「${word}」の生成に失敗しました。`);
  }

  return result;
}

/**
 * 日本語からターゲット言語の単語を提案（複数候補）
 *
 * @param query - 日本語クエリ
 * @param targetLanguage - ターゲット言語コード（例: 'en', 'es', 'pt', 'zh'）
 * @returns 提案される単語のリスト（3-5個）
 */
export async function generateSuggestions(
  query: string,
  targetLanguage: string = 'en'
): Promise<Array<{ lemma: string; pos: string[]; shortSense: string[]; confidence: number; usageHint: string; nuance?: number }>> {
  const modelConfig = selectModel();

  // 多言語対応プロンプト生成
  const prompt = createSuggestionsPrompt(query, targetLanguage);

  try {
    const result = await generateSuggestionsArray<{ lemma: string; pos: string[]; shortSense: string[]; confidence: number; usageHint: string; nuance?: number }>(prompt, modelConfig);

    if (!Array.isArray(result)) {
      logger.error('[generateSuggestions] Result is not array:', typeof result);
      return [];
    }

    if (result.length === 0) {
      logger.warn('[generateSuggestions] Empty array returned');
      return [];
    }

    logger.info(`[generateSuggestions] Received ${result.length} ${targetLanguage} suggestions for "${query}"`);
    return result;
  } catch (error) {
    logger.error('[generateSuggestions] Error:', error);
    return [];
  }
}

/**
 * 日本語からターゲット言語の単語を提案（高速版・基本情報のみ）
 *
 * usageHintを含まず、0.5-1秒で返却
 *
 * @param query - 日本語クエリ
 * @param targetLanguage - ターゲット言語コード（例: 'en', 'es', 'pt', 'zh'）
 * @returns 提案される単語のリスト（基本情報のみ）
 */
export async function generateSuggestionsFast(
  query: string,
  targetLanguage: string = 'en',
  nativeLanguage: string = 'ja'
): Promise<Array<{ lemma: string; pos: string[]; shortSense: string[]; confidence: number; nuance?: number }>> {
  const modelConfig = selectModel();

  // 性別が必要な言語かチェック
  const genderLanguages = ['es', 'pt', 'fr', 'de', 'it', 'ru', 'ar', 'hi'];
  const needsGender = genderLanguages.includes(targetLanguage);
  const genderField = needsGender ? ', "gender": "m/f/n（名詞のみ）"' : '';

  // 言語名（英語表記）
  const targetLanguageName = getLanguageNameEn(targetLanguage);
  const nativeLanguageName = getLanguageNameEn(nativeLanguage);

  // フォールバックプロンプト
  const fallback = `Generate 3-5 {{targetLanguageName}} words corresponding to {{nativeLanguageName}} "{{query}}" in the following JSON array structure:

[
  {"lemma": "word1", "pos": ["part of speech"], "shortSense": ["meaning1", "meaning2", "meaning3"], "confidence": relevance score 0-1, "nuance": nuance score 0-100{{genderField}}},
  {"lemma": "word2", "pos": ["part of speech"], "shortSense": ["meaning1", "meaning2", "meaning3"], "confidence": score, "nuance": nuance score{{genderField}}}
]

Requirements:
- Must return at least 3 candidates
- shortSense should return 3 meanings in the user's native language ({{nativeLanguageName}}) as an array for each word (within 10 characters each)
- Meanings should be ordered by frequency of use
- Sort by relevance
- confidence should be 1.0 for the most relevant
- nuance is a score indicating the formality level of the word (0=very casual/slang, 30=casual, 50=neutral, 70=formal, 100=very formal/academic)`;

  // Langfuseからプロンプトを取得（フォールバック付き）
  const prompt = await fetchPromptWithFallback(
    'suggestions-fast',
    fallback,
    {
      query,
      targetLanguageName: targetLanguageName, // Template expects {{targetLanguageName}}
      nativeLanguageName: nativeLanguageName, // Template expects {{nativeLanguageName}}
      nativeLanguage: nativeLanguage,         // Template expects {{nativeLanguage}}
      genderField,
    }
  );

  try {
    const result = await generateSuggestionsArrayFast<{ lemma: string; pos: string[]; shortSense: string[]; confidence: number; nuance?: number }>(prompt, modelConfig);

    if (!Array.isArray(result.data)) {
      logger.error('[generateSuggestionsFast] Result is not array:', typeof result.data);
      return [];
    }

    if (result.data.length === 0) {
      logger.warn('[generateSuggestionsFast] Empty array returned');
      return [];
    }

    logger.info(`[generateSuggestionsFast] Received ${result.data.length} ${targetLanguage} suggestions (fast) for "${query}", tokens: ${result.tokensUsed}`);
    // NOTE: トークン数は返り値に含めない（この関数はサジェストのみを返す）
    return result.data;
  } catch (error) {
    logger.error('[generateSuggestionsFast] Error:', error);
    return [];
  }
}

/**
 * サジェストをSSEストリーミングで生成（真のストリーミング版）
 *
 * 各サジェスト候補が生成されるたびに即座にコールバックを呼び出し
 *
 * @param query - 検索クエリ（母語での入力）
 * @param targetLanguage - ターゲット言語コード（例: 'en', 'es', 'pt', 'zh'）
 * @param nativeLanguage - 母国語コード（例: 'ja', 'en', 'pt'）
 * @param onSuggestion - 各サジェスト生成完了時のコールバック
 * @returns 全てのサジェストの配列
 */
export async function generateSuggestionsStreamFast(
  query: string,
  targetLanguage: string = 'en',
  nativeLanguage: string = 'ja',
  onSuggestion?: (suggestion: { lemma: string; pos: string[]; shortSense: string[]; confidence: number; nuance?: number }) => void
): Promise<Array<{ lemma: string; pos: string[]; shortSense: string[]; confidence: number; nuance?: number }>> {
  const modelConfig = selectModel();

  // 性別が必要な言語かチェック
  const genderLanguages = ['es', 'pt', 'fr', 'de', 'it', 'ru', 'ar', 'hi'];
  const needsGender = genderLanguages.includes(targetLanguage);
  const genderField = needsGender ? ', "gender": "m/f/n（名詞のみ）"' : '';

  // 言語名（英語表記）
  const targetLanguageName = getLanguageNameEn(targetLanguage);
  const nativeLanguageName = getLanguageNameEn(nativeLanguage);

  // フォールバックプロンプト
  const fallback = `Generate 3-5 {{targetLanguageName}} words corresponding to {{nativeLanguageName}} "{{query}}" in the following JSON array structure:

[
  {"lemma": "word1", "pos": ["part of speech"], "shortSense": ["meaning1", "meaning2", "meaning3"], "confidence": relevance score 0-1, "nuance": nuance score 0-100{{genderField}}},
  {"lemma": "word2", "pos": ["part of speech"], "shortSense": ["meaning1", "meaning2", "meaning3"], "confidence": score, "nuance": nuance score{{genderField}}}
]

Requirements:
- Must return at least 3 candidates
- shortSense should return 3 meanings in the user's native language ({{nativeLanguageName}}) as an array for each word (within 10 characters each)
- Meanings should be ordered by frequency of use
- Sort by relevance
- confidence should be 1.0 for the most relevant
- nuance is a score indicating the formality level of the word (0=very casual/slang, 30=casual, 50=neutral, 70=formal, 100=very formal/academic)`;

  // Langfuseからプロンプトを取得（フォールバック付き）
  const prompt = await fetchPromptWithFallback(
    'suggestions-fast',
    fallback,
    {
      query,
      targetLanguageName: targetLanguageName, // Template expects {{targetLanguageName}}
      nativeLanguageName: nativeLanguageName, // Template expects {{nativeLanguageName}}
      nativeLanguage: nativeLanguage,         // Template expects {{nativeLanguage}}
      genderField,
    }
  );

  try {
    logger.info('[generateSuggestionsStreamFast] Starting SSE streaming for suggestions');

    const result = await generateSuggestionsStream<{ lemma: string; pos: string[]; shortSense: string[]; confidence: number; nuance?: number }>(
      prompt,
      modelConfig,
      (suggestion) => {
        logger.info(`[generateSuggestionsStreamFast] New suggestion streamed: ${suggestion.lemma}`);
        if (onSuggestion) {
          onSuggestion(suggestion);
        }
      }
    );

    if (!Array.isArray(result.data)) {
      logger.error('[generateSuggestionsStreamFast] Result is not array:', typeof result.data);
      return [];
    }

    if (result.data.length === 0) {
      logger.warn('[generateSuggestionsStreamFast] Empty array returned');
      return [];
    }

    logger.info(`[generateSuggestionsStreamFast] Received ${result.data.length} ${targetLanguage} suggestions via SSE, tokens: ${result.tokensUsed}`);
    return result.data;
  } catch (error) {
    logger.error('[generateSuggestionsStreamFast] Error:', error);
    return [];
  }
}

/**
 * 既存の候補にusageHintを追加（並列生成・高速版）
 *
 * 各単語を並列で生成し、完成次第コールバックを呼ぶ
 *
 * @param lemmas - 単語のリスト
 * @param query - 元の日本語クエリ
 * @param nativeLanguage - ユーザーの母国語コード
 * @param onHintGenerated - 各ヒント生成完了時のコールバック
 * @returns 全てのusageHintの配列
 */
export async function addUsageHintsParallel(
  lemmas: string[],
  query: string,
  nativeLanguage: string = 'ja',
  onHintGenerated?: (hint: { lemma: string; usageHint: string }) => void
): Promise<Array<{ lemma: string; usageHint: string }>> {
  try {
    logger.info(`[addUsageHintsParallel] Starting parallel generation for: ${lemmas.join(', ')} (native: ${nativeLanguage})`);

    // 各単語を並列で生成
    const hintPromises = lemmas.map(async (lemma) => {
      const hint = await generateUsageHint(lemma, query, nativeLanguage);

      // 完成次第コールバックを呼ぶ
      if (onHintGenerated) {
        onHintGenerated(hint);
      }

      return hint;
    });

    // 全て完了するまで待つ
    const hints = await Promise.all(hintPromises);
    logger.info(`[addUsageHintsParallel] All hints generated: ${hints.length}`);
    return hints;
  } catch (error) {
    logger.error('[addUsageHintsParallel] Error:', error);
    return [];
  }
}

/**
 * 既存の候補にusageHintを追加（バッチ生成）
 *
 * @param lemmas - 英単語のリスト
 * @param query - 元の日本語クエリ
 * @returns usageHintの配列
 * @deprecated addUsageHintsParallel を使用してください
 */
export async function addUsageHints(
  lemmas: string[],
  query: string
): Promise<Array<{ lemma: string; usageHint: string }>> {
  try {
    logger.info(`[addUsageHints] Generating hints for: ${lemmas.join(', ')}`);
    const hints = await generateUsageHints(lemmas, query);
    logger.info(`[addUsageHints] Received ${hints.length} hints`);
    return hints;
  } catch (error) {
    logger.error('[addUsageHints] Error:', error);
    return [];
  }
}

/**
 * 単語の詳細情報を生成（真のストリーミング - ポーリング方式）
 *
 * バックエンドで段階的に生成し、フロントエンドがポーリングで取得。
 * 各セクションが実際に生成されるたびに即座に表示されます。
 *
 * 注意：辞書データは常に同じ構造（詳細度の概念なし）
 *
 * @param word - 検索する単語
 * @param targetLanguage - ターゲット言語コード（例: 'en', 'es', 'pt', 'zh'）
 * @param nativeLanguage - 母国語コード（例: 'ja', 'en', 'zh'）
 * @param onProgress - 進捗コールバック（0-100、部分データ付き）
 * @returns 単語の詳細情報
 */
export async function generateWordDetailStream(
  word: string,
  targetLanguage: string = 'en',
  nativeLanguage: string = 'ja',
  onProgress?: (progress: number, partialData?: Partial<WordDetailResponse>) => void
): Promise<WordDetailResponse> {
  const modelConfig = selectModel();
  const prompt = createDictionaryPrompt(word, targetLanguage, nativeLanguage);

  logger.info(`[WordDetail API] Starting TRUE streaming for: ${word} (${targetLanguage})`);

  try {
    const result = await generateJSONProgressive<WordDetailResponse>(
      prompt,
      modelConfig,
      (progress, partialData) => {
        logger.info('[WordDetail API] Progress update:', {
          progress,
          hasSections: partialData ? Object.keys(partialData) : []
        });

        if (onProgress && partialData) {
          onProgress(progress, partialData);
        }
      }
    );

    // @ts-ignore - Type inference issue with generateJSONProgressive
    if (!result.headword || !result.headword.lemma) {
      throw new Error(`「${word}」の生成に失敗しました。`);
    }

    logger.info('[WordDetail API] TRUE streaming complete');
    // @ts-ignore - Type inference issue with generateJSONProgressive
    return result;
  } catch (error) {
    logger.error('[WordDetail API] Error in generateWordDetailStream:', error);
    throw error;
  }
}

/**
 * 単語の詳細情報をストリーミング生成（旧バージョン・互換性のため残す）
 *
 * @deprecated 新しい段階的レンダリング版を使用してください
 */
export async function generateWordDetailStreamLegacy(
  word: string,
  onProgress?: (progress: number, partialData?: Partial<WordDetailResponse>) => void
): Promise<WordDetailResponse> {
  const modelConfig = selectModel();

  const prompt = createDictionaryPrompt(word);

  // プログレス: 10% - API呼び出し開始
  logger.info('[WordDetail API] Starting for:', word);
  if (onProgress) {
    onProgress(10);
  }

  // Gemini APIからレスポンスを取得
  const startTime = Date.now();
  let accumulatedText = '';

  for await (const chunk of generateTextStream(prompt, modelConfig)) {
    accumulatedText += chunk;
    // ストリーミング中の進捗を50%まで更新
    if (onProgress && accumulatedText.length > 0) {
      const progress = Math.min(50, 10 + Math.floor(accumulatedText.length / 10));
      onProgress(progress);
    }
  }

  const apiTime = Date.now() - startTime;
  logger.info(`[WordDetail API] Completed in ${apiTime}ms, response length: ${accumulatedText.length}`);

  // JSONパース（responseMimeType: 'application/json' により直接JSONが返される）
  let result: WordDetailResponse;
  try {
    result = JSON.parse(accumulatedText.trim()) as WordDetailResponse;
  } catch (error) {
    logger.error('[WordDetail API] JSON parse error:', error);
    logger.error('[WordDetail API] Raw text:', accumulatedText.substring(0, 200));

    // フォールバック: 旧形式（```json ... ```）も試す
    const jsonMatch = accumulatedText.match(/```json\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        result = JSON.parse(jsonMatch[1].trim()) as WordDetailResponse;
      } catch {
        throw new Error('AIの応答がJSON形式ではありませんでした。');
      }
    } else {
      throw new Error('AIの応答がJSON形式ではありませんでした。');
    }
  }

  if (!result.headword || !result.headword.lemma) {
    throw new Error(`「${word}」の生成に失敗しました。`);
  }

  // 100% - 完了（データ全体を返す）
  logger.info('[WordDetail API] Parse successful, returning data');
  if (onProgress) {
    onProgress(100, result);
  }

  return result;
}

/**
 * 単語の詳細情報を2段階で生成（超高速版・最適化）
 *
 * ステージ1: 基本情報（headword + senses）を0.2~0.3秒で取得 → 即表示
 * ステージ2: 追加詳細（hint + metrics + examples）のみを生成 → マージして表示
 *
 * 最適化: Stage 2で headword/senses を再生成せず、追加情報のみ生成してトークンを40-50%削減
 * 体感速度が10倍以上向上 + コスト大幅削減！
 *
 * 注意：辞書データは常に同じ構造（詳細度の概念なし）
 *
 * @param word - 検索する単語
 * @param targetLanguage - ターゲット言語コード（例: 'en', 'es', 'pt', 'zh'）
 * @param nativeLanguage - ユーザーの母国語コード（例: 'ja', 'en'）
 * @param onProgress - 進捗コールバック（0-100、部分データ付き）
 * @returns 単語の詳細情報
 */
export async function generateWordDetailTwoStage(
  word: string,
  targetLanguage: string = 'en',
  nativeLanguage: string = 'ja',
  onProgress?: (progress: number, partialData?: Partial<WordDetailResponse>) => void
): Promise<{ data: WordDetailResponse; tokensUsed: number }> {
  const modelConfig = selectModel();

  logger.info(`[WordDetail 2-Stage] Starting two-stage generation for: ${word} (${targetLanguage})`);

  try {
    let totalTokens = 0;

    // ステージ1: 基本情報を超高速取得（0.2~0.3秒）
    const basicPrompt = await createBasicInfoPrompt(word, targetLanguage, nativeLanguage);
    const basicPromise = generateBasicInfo<Partial<WordDetailResponse>>(basicPrompt, modelConfig);

    // ステージ2: 追加詳細のみをSSEストリーミングで生成（hint + metrics + examples）
    // 最適化: headword/senses は再生成せず、トークンを40-50%削減
    const additionalPrompt = await createAdditionalDetailsPrompt(word, targetLanguage, nativeLanguage);

    // 基本情報が来たら即表示（0.2~0.3秒）
    const basicResult = await basicPromise;
    totalTokens += basicResult.tokensUsed;
    logger.info('[WordDetail 2-Stage] Basic info received, tokens:', basicResult.tokensUsed);
    if (onProgress) {
      onProgress(30, basicResult.data); // ヘッダー + 意味だけ表示
    }

    // 追加詳細をSSEストリーミングで取得
    // 各セクション完成時に即座にコールバックが呼ばれる
    let currentProgress = 30;
    const additionalResult = await generateAdditionalInfoStream<Partial<WordDetailResponse>>(
      additionalPrompt,
      modelConfig,
      (section, data) => {
        // セクションごとに進捗を更新
        if (section === 'hint') {
          currentProgress = 50;
          logger.info('[WordDetail 2-Stage] Usage hint received via SSE');
        } else if (section === 'metrics') {
          currentProgress = 70;
          logger.info('[WordDetail 2-Stage] Metrics received via SSE');
        } else if (section === 'examples') {
          currentProgress = 90;
          logger.info('[WordDetail 2-Stage] Examples received via SSE');
        }

        // 基本情報と新しいセクションをマージして即座に表示
        if (onProgress) {
          const partialMerged = {
            ...basicResult.data,
            [section]: data,
          };
          onProgress(currentProgress, partialMerged);
        }
      }
    );

    totalTokens += additionalResult.tokensUsed;
    logger.info('[WordDetail 2-Stage] Additional details received via SSE, tokens:', additionalResult.tokensUsed);

    // 基本情報と追加詳細をマージ
    const mergedData: WordDetailResponse = {
      ...basicResult.data,
      ...additionalResult.data,
    } as WordDetailResponse;

    if (!mergedData.headword || !mergedData.headword.lemma) {
      throw new Error(`「${word}」の生成に失敗しました。`);
    }

    if (onProgress) {
      onProgress(100, mergedData); // 完全なデータを表示
    }

    logger.info(`[WordDetail 2-Stage] Total tokens used: ${totalTokens} (optimized)`);
    return {
      data: mergedData,
      tokensUsed: totalTokens,
    };
  } catch (error) {
    logger.error('[WordDetail 2-Stage] Error:', error);
    throw error;
  }
}

/**
 * 部分的なJSONをパースする（不完全でも可）
 */
function tryParsePartialJSON(text: string): Partial<WordDetailResponse> | null {
  try {
    // JSONが不完全でも、既に完成している部分を抽出
    const trimmed = text.trim();

    // 最低限headwordが含まれているかチェック
    if (!trimmed.includes('"headword"')) {
      return null;
    }

    // 不完全なJSONを完結させる試み
    let jsonText = trimmed;

    // 閉じカッコが足りない場合は追加
    const openBraces = (jsonText.match(/{/g) || []).length;
    const closeBraces = (jsonText.match(/}/g) || []).length;
    if (openBraces > closeBraces) {
      jsonText += '}'.repeat(openBraces - closeBraces);
    }

    // 最後がカンマで終わっている場合は削除
    jsonText = jsonText.replace(/,\s*}/g, '}');
    jsonText = jsonText.replace(/,\s*]$/g, ']');

    return JSON.parse(jsonText);
  } catch {
    return null;
  }
}

/**
 * 単語の詳細情報を2段階で生成（Hintストリーミング版）
 *
 * ステージ1: 基本情報（headword + senses）を0.2~0.3秒で取得 → 即表示
 * ステージ2A: Hintをプレーンテキストストリーミング（5-10文字ずつ、チャットのようにスムーズ）
 * ステージ2B: Metrics + Examples をJSONで生成
 *
 * 最適化: Hintは文字単位で表示、チャットと同じ体験
 *
 * @param word - 検索する単語
 * @param targetLanguage - ターゲット言語コード（例: 'en', 'es', 'pt', 'zh'）
 * @param nativeLanguage - ユーザーの母国語コード（例: 'ja', 'en'）
 * @param onProgress - 進捗コールバック（0-100、部分データ付き）
 * @param onHintChunk - Hintテキストチャンク受信コールバック（5-10文字ずつ）
 * @returns 単語の詳細情報
 */
export async function generateWordDetailWithHintStreaming(
  word: string,
  targetLanguage: string = 'en',
  nativeLanguage: string = 'ja',
  onProgress?: (progress: number, partialData?: Partial<WordDetailResponse>) => void,
  onHintChunk?: (chunk: string) => void
): Promise<{ data: WordDetailResponse; tokensUsed: number }> {
  const modelConfig = selectModel();

  logger.info(`[WordDetail Hint Streaming] Starting generation for: ${word} (${targetLanguage} -> ${nativeLanguage})`);

  try {
    let totalTokens = 0;
    let accumulatedHintText = '';

    // ステージ1: 基本情報を超高速取得（0.2~0.3秒）
    const basicPrompt = await createBasicInfoPrompt(word, targetLanguage, nativeLanguage);
    const basicResult = await generateBasicInfo<Partial<WordDetailResponse>>(basicPrompt, modelConfig);

    totalTokens += basicResult.tokensUsed;
    logger.info('[WordDetail Hint Streaming] Basic info received, tokens:', basicResult.tokensUsed);

    if (onProgress) {
      onProgress(30, basicResult.data); // ヘッダー + 意味だけ表示
    }

    // ステージ2A: Hintをプレーンテキストストリーミング（5-10文字ずつ）
    await generateHintStream(
      word,
      targetLanguage,
      nativeLanguage,
      {
        onChunk: (chunk: string) => {
          accumulatedHintText += chunk;
          // リアルタイムでチャンクを通知（チャットと同じ体験）
          if (onHintChunk) {
            onHintChunk(chunk);
          }
          logger.debug(`[WordDetail Hint Streaming] Hint chunk: "${chunk}"`);
        },
        onComplete: (fullText: string) => {
          logger.info(`[WordDetail Hint Streaming] Hint complete: "${fullText}"`);
          // Hint完成後、50%まで進捗を進める
          if (onProgress) {
            const partialData = {
              ...basicResult.data,
              hint: { text: fullText },
            };
            onProgress(50, partialData);
          }
        },
        onError: (error: Error) => {
          logger.error('[WordDetail Hint Streaming] Hint stream error:', error);
          // エラー時は空のHintで続行
          accumulatedHintText = '';
        },
      }
    );

    // ステージ2B: Metrics + Examples をJSONで生成
    // TODO: ここもストリーミング化するなら、別のendpointを使う
    // 現状はHintのみストリーミング、残りはJSON一括生成
    const additionalPrompt = await createAdditionalDetailsPrompt(word, targetLanguage, nativeLanguage);

    let currentProgress = 50;
    const additionalResult = await generateAdditionalInfoStream<Partial<WordDetailResponse>>(
      additionalPrompt,
      modelConfig,
      (section, data) => {
        // Hintは既にストリーミング済みなのでスキップ
        if (section === 'hint') {
          return;
        }

        if (section === 'metrics') {
          currentProgress = 70;
          logger.info('[WordDetail Hint Streaming] Metrics received via SSE');
        } else if (section === 'examples') {
          currentProgress = 90;
          logger.info('[WordDetail Hint Streaming] Examples received via SSE');
        }

        // 基本情報 + Hint + 新しいセクションをマージして即座に表示
        if (onProgress) {
          const partialMerged = {
            ...basicResult.data,
            hint: { text: accumulatedHintText },
            [section]: data,
          };
          onProgress(currentProgress, partialMerged);
        }
      }
    );

    totalTokens += additionalResult.tokensUsed;
    logger.info('[WordDetail Hint Streaming] Additional details received, tokens:', additionalResult.tokensUsed);

    // 全てをマージ
    const mergedData: WordDetailResponse = {
      ...basicResult.data,
      ...additionalResult.data,
      hint: { text: accumulatedHintText }, // ストリーミングしたHintを使用
    } as WordDetailResponse;

    if (!mergedData.headword || !mergedData.headword.lemma) {
      throw new Error(`「${word}」の生成に失敗しました。`);
    }

    if (onProgress) {
      onProgress(100, mergedData); // 完全なデータを表示
    }

    logger.info(`[WordDetail Hint Streaming] Total tokens used: ${totalTokens}`);
    return {
      data: mergedData,
      tokensUsed: totalTokens,
    };
  } catch (error) {
    logger.error('[WordDetail Hint Streaming] Error:', error);
    throw error;
  }
}

/**
 * @deprecated この関数は使用されていません。
 * hint フィールドは createDictionaryPrompt() と createAdditionalDetailsPrompt() で生成されます。
 * 削除予定（デッドコード）。
 */
