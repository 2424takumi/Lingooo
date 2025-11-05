/**
 * AI辞書生成サービス
 *
 * Gemini APIを使用して単語の詳細情報を生成
 * 多言語対応
 */

import { generateJSON, generateTextStream, generateJSONProgressive, generateBasicInfo, generateSuggestionsArray } from './gemini-client';
import { selectModel } from './model-selector';
import { createBasicInfoPrompt, createDictionaryPrompt, createSuggestionsPrompt } from './prompt-generator';
import type { WordDetailResponse } from '@/types/search';
import { logger } from '@/utils/logger';

/**
 * 単語の詳細情報を生成
 *
 * @param word - 検索する単語
 * @param targetLanguage - ターゲット言語コード（例: 'en', 'es', 'pt', 'zh'）
 * @returns 単語の詳細情報
 */
export async function generateWordDetail(
  word: string,
  targetLanguage: string = 'en'
): Promise<WordDetailResponse> {
  // モデル選択
  const modelConfig = selectModel();

  // プロンプト生成
  const prompt = createDictionaryPrompt(word, targetLanguage);

  // AI生成
  const result = await generateJSON<WordDetailResponse>(prompt, modelConfig);

  // 結果の検証
  if (!result.headword || !result.headword.lemma) {
    throw new Error(`「${word}」の生成に失敗しました。`);
  }

  return result;
}

/**
 * 日本語からターゲット言語の単語を提案（複数候補）
 *
 * @param japaneseQuery - 日本語クエリ
 * @param targetLanguage - ターゲット言語コード（例: 'en', 'es', 'pt', 'zh'）
 * @returns 提案される単語のリスト（3-5個）
 */
export async function generateSuggestions(
  japaneseQuery: string,
  targetLanguage: string = 'en'
): Promise<Array<{ lemma: string; pos: string[]; shortSenseJa: string; confidence: number; usageHint: string }>> {
  const modelConfig = selectModel();

  // 多言語対応プロンプト生成
  const prompt = createSuggestionsPrompt(japaneseQuery, targetLanguage);

  try {
    const result = await generateSuggestionsArray<{ lemma: string; pos: string[]; shortSenseJa: string; confidence: number; usageHint: string }>(prompt, modelConfig);

    if (!Array.isArray(result)) {
      logger.error('[generateSuggestions] Result is not array:', typeof result);
      return [];
    }

    if (result.length === 0) {
      logger.warn('[generateSuggestions] Empty array returned');
      return [];
    }

    logger.info(`[generateSuggestions] Received ${result.length} ${targetLanguage} suggestions for "${japaneseQuery}"`);
    return result;
  } catch (error) {
    logger.error('[generateSuggestions] Error:', error);
    return [];
  }
}

/**
 * 単語の詳細情報を生成（真のストリーミング - ポーリング方式）
 *
 * バックエンドで段階的に生成し、フロントエンドがポーリングで取得。
 * 各セクションが実際に生成されるたびに即座に表示されます。
 *
 * @param word - 検索する単語
 * @param targetLanguage - ターゲット言語コード（例: 'en', 'es', 'pt', 'zh'）
 * @param onProgress - 進捗コールバック（0-100、部分データ付き）
 * @returns 単語の詳細情報
 */
export async function generateWordDetailStream(
  word: string,
  targetLanguage: string = 'en',
  onProgress?: (progress: number, partialData?: Partial<WordDetailResponse>) => void
): Promise<WordDetailResponse> {
  const modelConfig = selectModel();
  const prompt = createDictionaryPrompt(word, targetLanguage);

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

    if (!result.headword || !result.headword.lemma) {
      throw new Error(`「${word}」の生成に失敗しました。`);
    }

    logger.info('[WordDetail API] TRUE streaming complete');
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
 * 単語の詳細情報を2段階で生成（超高速版）
 *
 * ステージ1: 基本情報（headword + senses）を0.2~0.3秒で取得 → 即表示
 * ステージ2: 詳細情報（metrics + examples）を並行生成 → 後から追加
 *
 * 体感速度が10倍以上向上！
 *
 * @param word - 検索する単語
 * @param targetLanguage - ターゲット言語コード（例: 'en', 'es', 'pt', 'zh'）
 * @param onProgress - 進捗コールバック（0-100、部分データ付き）
 * @returns 単語の詳細情報
 */
export async function generateWordDetailTwoStage(
  word: string,
  targetLanguage: string = 'en',
  onProgress?: (progress: number, partialData?: Partial<WordDetailResponse>) => void
): Promise<WordDetailResponse> {
  const modelConfig = selectModel();

  logger.info(`[WordDetail 2-Stage] Starting two-stage generation for: ${word} (${targetLanguage})`);

  try {
    // ステージ1: 基本情報を超高速取得（0.2~0.3秒）
    const basicPrompt = createBasicInfoPrompt(word, targetLanguage);
    const basicPromise = generateBasicInfo<Partial<WordDetailResponse>>(basicPrompt, modelConfig);

    // ステージ2: 詳細情報を並行生成（2.5秒）
    const detailPrompt = createDictionaryPrompt(word, targetLanguage);
    const detailPromise = generateJSONProgressive<WordDetailResponse>(
      detailPrompt,
      modelConfig,
      (progress, partialData) => {
        // 詳細情報の進捗は30%から開始（基本情報で0-30%使用）
        const adjustedProgress = 30 + Math.floor(progress * 0.7);
        if (onProgress && partialData) {
          onProgress(adjustedProgress, partialData);
        }
      }
    );

    // 基本情報が来たら即表示（0.2~0.3秒）
    const basicData = await basicPromise;
    logger.info('[WordDetail 2-Stage] Basic info received');
    if (onProgress) {
      onProgress(30, basicData); // ヘッダー + 意味だけ表示
    }

    // 詳細情報を待つ（2.5秒）
    const fullData = await detailPromise;
    logger.info('[WordDetail 2-Stage] Full data received');

    if (!fullData.headword || !fullData.headword.lemma) {
      throw new Error(`「${word}」の生成に失敗しました。`);
    }

    if (onProgress) {
      onProgress(100, fullData); // メトリクス + 例文を追加
    }

    return fullData;
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
