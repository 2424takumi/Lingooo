/**
 * AI辞書生成サービス
 *
 * Gemini APIを使用して単語の詳細情報を生成
 * 多言語対応
 */

import { generateJSON, generateText, generateTextStream, generateJSONProgressive, generateBasicInfo, generateSuggestionsArray, generateSuggestionsArrayFast, generateUsageHint, generateUsageHints } from './gemini-client';
import { selectModel } from './model-selector';
import { createBasicInfoPrompt, createDictionaryPrompt, createSuggestionsPrompt } from './prompt-generator';
import type { WordDetailResponse } from '@/types/search';
import { logger } from '@/utils/logger';

/**
 * 単語の言語を検出
 *
 * @param word - 検出する単語
 * @param candidateLanguages - 候補となる言語コードのリスト（例: ['en', 'pt', 'es']）
 * @returns 検出された言語コード（候補にない場合はnull）
 */
export async function detectWordLanguage(
  word: string,
  candidateLanguages: string[]
): Promise<string | null> {
  const modelConfig = selectModel();

  // 言語名のマッピング
  const languageNames: Record<string, string> = {
    en: '英語',
    pt: 'ポルトガル語',
    es: 'スペイン語',
    fr: 'フランス語',
    de: 'ドイツ語',
    it: 'イタリア語',
    zh: '中国語',
    ko: '韓国語',
    vi: 'ベトナム語',
    id: 'インドネシア語',
    ja: '日本語',
  };

  const candidateLanguageNames = candidateLanguages
    .map(code => languageNames[code] || code)
    .join('、');

  const prompt = `単語「${word}」はどの言語の単語ですか？

候補言語: ${candidateLanguageNames}

以下の条件に従って回答してください：
1. 候補言語の中にこの単語が存在する言語があれば、その言語コード（例: en, pt, es）のみを返す
2. 複数の候補言語に存在する場合は、最も一般的な言語を1つだけ返す
3. 候補言語のいずれにも存在しない場合は「none」と返す
4. 言語コード以外の説明や記号は一切含めない

回答（言語コードのみ）:`;

  try {
    const result = await generateText(prompt, modelConfig);
    const detectedLanguage = result.trim().toLowerCase();

    logger.info('[detectWordLanguage] Detected language:', {
      word,
      candidates: candidateLanguages,
      detected: detectedLanguage,
    });

    // 候補言語に含まれるか確認
    if (candidateLanguages.includes(detectedLanguage)) {
      return detectedLanguage;
    }

    // "none" または候補にない場合はnull
    return null;
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
 * @param japaneseQuery - 日本語クエリ
 * @param targetLanguage - ターゲット言語コード（例: 'en', 'es', 'pt', 'zh'）
 * @returns 提案される単語のリスト（3-5個）
 */
export async function generateSuggestions(
  japaneseQuery: string,
  targetLanguage: string = 'en'
): Promise<Array<{ lemma: string; pos: string[]; shortSenseJa: string[]; confidence: number; usageHint: string; nuance?: number }>> {
  const modelConfig = selectModel();

  // 多言語対応プロンプト生成
  const prompt = createSuggestionsPrompt(japaneseQuery, targetLanguage);

  try {
    const result = await generateSuggestionsArray<{ lemma: string; pos: string[]; shortSenseJa: string[]; confidence: number; usageHint: string; nuance?: number }>(prompt, modelConfig);

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
 * 日本語からターゲット言語の単語を提案（高速版・基本情報のみ）
 *
 * usageHintを含まず、0.5-1秒で返却
 *
 * @param japaneseQuery - 日本語クエリ
 * @param targetLanguage - ターゲット言語コード（例: 'en', 'es', 'pt', 'zh'）
 * @returns 提案される単語のリスト（基本情報のみ）
 */
export async function generateSuggestionsFast(
  japaneseQuery: string,
  targetLanguage: string = 'en'
): Promise<Array<{ lemma: string; pos: string[]; shortSenseJa: string[]; confidence: number; nuance?: number }>> {
  const modelConfig = selectModel();

  // 性別が必要な言語かチェック
  const genderLanguages = ['es', 'pt', 'fr', 'de', 'it', 'ru', 'ar', 'hi'];
  const needsGender = genderLanguages.includes(targetLanguage);
  const genderField = needsGender ? ', "gender": "m/f/n（名詞のみ）"' : '';

  // 基本情報のみのプロンプト（usageHintなし、ニュアンスあり、shortSenseJaは配列）
  const prompt = `日本語"${japaneseQuery}"に対応する${targetLanguage === 'en' ? '英' : targetLanguage}単語を3~5個、以下のJSON配列構造で生成：

[
  {"lemma": "単語1", "pos": ["品詞"], "shortSenseJa": ["意味1", "意味2", "意味3"], "confidence": 関連性スコア0-1, "nuance": ニュアンススコア0-100${genderField}},
  {"lemma": "単語2", "pos": ["品詞"], "shortSenseJa": ["意味1", "意味2", "意味3"], "confidence": スコア, "nuance": ニュアンススコア${genderField}}
]

要件:
- 必ず3個以上の候補を返すこと
- shortSenseJaは各単語に対して3つの日本語の意味を配列で返すこと（各10文字以内）
- 意味は使用頻度が高い順に並べる
- 関連性の高い順にソート
- confidenceは最も関連性が高いものを1.0とする
- nuanceは単語のフォーマル度を示すスコア（0=非常にカジュアル・スラング, 30=カジュアル, 50=中立的, 70=フォーマル, 100=非常にフォーマル・学術的）`;

  try {
    const result = await generateSuggestionsArrayFast<{ lemma: string; pos: string[]; shortSenseJa: string[]; confidence: number; nuance?: number }>(prompt, modelConfig);

    if (!Array.isArray(result.data)) {
      logger.error('[generateSuggestionsFast] Result is not array:', typeof result.data);
      return [];
    }

    if (result.data.length === 0) {
      logger.warn('[generateSuggestionsFast] Empty array returned');
      return [];
    }

    logger.info(`[generateSuggestionsFast] Received ${result.data.length} ${targetLanguage} suggestions (fast) for "${japaneseQuery}", tokens: ${result.tokensUsed}`);
    // NOTE: トークン数は返り値に含めない（この関数はサジェストのみを返す）
    return result.data;
  } catch (error) {
    logger.error('[generateSuggestionsFast] Error:', error);
    return [];
  }
}

/**
 * 既存の候補にusageHintを追加（並列生成・高速版）
 *
 * 各単語を並列で生成し、完成次第コールバックを呼ぶ
 *
 * @param lemmas - 単語のリスト
 * @param japaneseQuery - 元の日本語クエリ
 * @param onHintGenerated - 各ヒント生成完了時のコールバック
 * @returns 全てのusageHintの配列
 */
export async function addUsageHintsParallel(
  lemmas: string[],
  japaneseQuery: string,
  onHintGenerated?: (hint: { lemma: string; usageHint: string }) => void
): Promise<Array<{ lemma: string; usageHint: string }>> {
  try {
    logger.info(`[addUsageHintsParallel] Starting parallel generation for: ${lemmas.join(', ')}`);

    // 各単語を並列で生成
    const hintPromises = lemmas.map(async (lemma) => {
      const hint = await generateUsageHint(lemma, japaneseQuery);

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
 * @param japaneseQuery - 元の日本語クエリ
 * @returns usageHintの配列
 * @deprecated addUsageHintsParallel を使用してください
 */
export async function addUsageHints(
  lemmas: string[],
  japaneseQuery: string
): Promise<Array<{ lemma: string; usageHint: string }>> {
  try {
    logger.info(`[addUsageHints] Generating hints for: ${lemmas.join(', ')}`);
    const hints = await generateUsageHints(lemmas, japaneseQuery);
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
 * 単語の詳細情報を2段階で生成（超高速版）
 *
 * ステージ1: 基本情報（headword + senses）を0.2~0.3秒で取得 → 即表示
 * ステージ2: 詳細情報（metrics + examples）を並行生成 → 後から追加
 *
 * 体感速度が10倍以上向上！
 *
 * 注意：辞書データは常に同じ構造（詳細度の概念なし）
 *
 * @param word - 検索する単語
 * @param targetLanguage - ターゲット言語コード（例: 'en', 'es', 'pt', 'zh'）
 * @param detailLevel - AI返答の詳細度レベル（'concise' | 'detailed'）
 * @param onProgress - 進捗コールバック（0-100、部分データ付き）
 * @returns 単語の詳細情報
 */
export async function generateWordDetailTwoStage(
  word: string,
  targetLanguage: string = 'en',
  nativeLanguage: string = 'ja',
  detailLevel: 'concise' | 'detailed' = 'concise',
  onProgress?: (progress: number, partialData?: Partial<WordDetailResponse>) => void
): Promise<{ data: WordDetailResponse; tokensUsed: number }> {
  const modelConfig = selectModel();

  logger.info(`[WordDetail 2-Stage] Starting two-stage generation for: ${word} (${targetLanguage})`);

  try {
    let totalTokens = 0;

    // ステージ1: 基本情報を超高速取得（0.2~0.3秒）
    const basicPrompt = createBasicInfoPrompt(word, targetLanguage, nativeLanguage);
    const basicPromise = generateBasicInfo<Partial<WordDetailResponse>>(basicPrompt, modelConfig);

    // ステージ2: 詳細情報を並行生成（2.5秒）
    const detailPrompt = createDictionaryPrompt(word, targetLanguage, nativeLanguage);
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
    const basicResult = await basicPromise;
    totalTokens += basicResult.tokensUsed;
    logger.info('[WordDetail 2-Stage] Basic info received, tokens:', basicResult.tokensUsed);
    if (onProgress) {
      onProgress(30, basicResult.data); // ヘッダー + 意味だけ表示
    }

    // 詳細情報を待つ（2.5秒）
    const fullResult = await detailPromise;
    totalTokens += fullResult.tokensUsed;
    logger.info('[WordDetail 2-Stage] Full data received, tokens:', fullResult.tokensUsed);

    if (!fullResult.data.headword || !fullResult.data.headword.lemma) {
      throw new Error(`「${word}」の生成に失敗しました。`);
    }

    if (onProgress) {
      onProgress(100, fullResult.data); // メトリクス + 例文を追加
    }

    logger.info(`[WordDetail 2-Stage] Total tokens used: ${totalTokens}`);
    return {
      data: fullResult.data,
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
 * 単語のヒント（特徴・ニュアンス）を生成
 *
 * 2-3行のテキストで、その単語の特徴やニュアンスを説明します。
 *
 * @param word - 単語
 * @param targetLanguage - ターゲット言語コード（例: 'en', 'es', 'pt', 'zh'）
 * @param definitions - 単語の意味リスト
 * @returns ヒントテキスト（2-3行）
 */
export async function generateWordHint(
  word: string,
  targetLanguage: string = 'en',
  definitions: string[] = []
): Promise<string> {
  const modelConfig = selectModel();

  const definitionsText = definitions.length > 0
    ? `\n意味: ${definitions.join('、')}`
    : '';

  const prompt = `${targetLanguage === 'en' ? '英' : targetLanguage}単語「${word}」について、日本語で2〜3行の簡潔なヒントを生成してください。${definitionsText}

以下の内容を含めてください：
- どのような場面で使われるか（日常会話・アカデミック・ビジネスなど）
- 特徴的なニュアンスや使い方
- 類似語との違いがあれば簡単に

例：
「日常・アカデミック両方で使える基礎語です。主にスタディーという意味がありこういった使い方ができます。」

重要：
- 2〜3行で簡潔に
- 自然で読みやすい日本語
- ヒントのテキストのみを返す（説明文は不要）`;

  try {
    const result = await generateText(prompt, modelConfig);

    // テキストのクリーンアップ
    const cleanedHint = result
      .trim()
      .replace(/^["']|["']$/g, '') // 前後の引用符を削除
      .replace(/^\s*ヒント[：:]\s*/i, '') // 「ヒント：」などのプレフィックスを削除
      .trim();

    logger.info(`[WordHint] Generated hint for "${word}": ${cleanedHint.substring(0, 50)}...`);
    return cleanedHint;
  } catch (error) {
    logger.error('[WordHint] Error generating hint:', error);
    return '';
  }
}
