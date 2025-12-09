/**
 * 多言語対応プロンプト生成
 *
 * 学習言語に応じて適切なプロンプトを動的に生成
 *
 * 注意：辞書データには詳細度の概念はなく、常に同じ構造を返す
 * （detailLevel機能は2025-12-06に削除されました）
 */

import { fetchPromptWithFallback } from './langfuse-client';

/**
 * 言語名マッピング（日本語表記）
 */
const LANGUAGE_NAMES_JA: Record<string, string> = {
  ja: '日本語',
  en: '英語',
  pt: 'ポルトガル語',
  fr: 'フランス語',
  zh: '中国語',
  ko: '韓国語',
  vi: 'ベトナム語',
  id: 'インドネシア語',
  es: 'スペイン語',
};

/**
 * 言語名マッピング（英語表記）
 */
const LANGUAGE_NAMES_EN: Record<string, string> = {
  ja: 'Japanese',
  en: 'English',
  pt: 'Portuguese',
  fr: 'French',
  zh: 'Chinese',
  ko: 'Korean',
  vi: 'Vietnamese',
  id: 'Indonesian',
  es: 'Spanish',
  de: 'German',
  it: 'Italian',
  ru: 'Russian',
  ar: 'Arabic',
  hi: 'Hindi',
};

/**
 * 言語コードから日本語名を取得
 */
function getLanguageNameJa(languageCode: string | undefined): string {
  if (!languageCode) {
    console.warn('[PromptGenerator] languageCode is undefined, defaulting to "en"');
    return '英語';
  }
  return LANGUAGE_NAMES_JA[languageCode] || languageCode.toUpperCase();
}

/**
 * 言語コードから英語名を取得
 */
export function getLanguageNameEn(languageCode: string | undefined): string {
  if (!languageCode) {
    console.warn('[PromptGenerator] languageCode is undefined, defaulting to "en"');
    return 'English';
  }
  return LANGUAGE_NAMES_EN[languageCode] || languageCode.toUpperCase();
}

/**
 * 名詞に性別がある言語かチェック
 */
function hasGrammaticalGender(languageCode: string): boolean {
  const genderLanguages = ['es', 'pt', 'fr'];
  return genderLanguages.includes(languageCode);
}

/**
 * 基本情報専用プロンプト（headword + senses のみ）
 *
 * 超高速表示用：0.2~0.3秒で返却
 */
export async function createBasicInfoPrompt(word: string, targetLanguage: string = 'en', nativeLanguage: string = 'ja'): Promise<string> {
  const targetLanguageName = getLanguageNameEn(targetLanguage);
  const nativeLanguageName = getLanguageNameEn(nativeLanguage);
  const needsGender = hasGrammaticalGender(targetLanguage);
  const genderField = needsGender ? ', "gender": "m or f or n or mf (for nouns only)"' : '';

  const fallback = `Generate basic information for the {{targetLanguageName}} word "{{word}}" in the following JSON structure with minimal tokens:

{
  "headword": {"lemma": "{{word}}", "lang": "{{targetLanguage}}", "pos": ["part of speech (English, e.g., verb, noun)"]{{genderField}}},
  "senses": [{"id": "1", "glossShort": "concise {{nativeLanguageName}} meaning (within 10 chars)"}, {"id": "2", "glossShort": "meaning 2"}]
}

Requirements:
- 2-3 senses only, main meanings (each within 10 chars)
- {{nativeLanguageName}} explanations should be concise and clear
- Minimal information only for ultra-fast response`;

  return await fetchPromptWithFallback(
    'dictionary-basic',
    fallback,
    {
      word,
      targetLanguage,
      langName: targetLanguageName,
      nativeLanguage,
      nativeLangName: nativeLanguageName,
      genderField,
    }
  );
}

/**
 * 追加詳細情報専用プロンプト（hint + metrics + examples のみ）
 *
 * 2段階生成のStage 2で使用：基本情報（headword + senses）は既に取得済みのため、
 * 追加の詳細情報のみを生成してトークンを40-50%削減
 *
 * @param word - 検索する単語
 * @param targetLanguage - ターゲット言語コード
 * @param nativeLanguage - 母国語コード
 */
export async function createAdditionalDetailsPrompt(
  word: string,
  targetLanguage: string = 'en',
  nativeLanguage: string = 'ja'
): Promise<string> {
  const targetLanguageName = getLanguageNameEn(targetLanguage);
  const nativeLanguageName = getLanguageNameEn(nativeLanguage);

  console.log('[createAdditionalDetailsPrompt] Parameters:', {
    word,
    targetLanguage,
    targetLanguageName,
    nativeLanguage,
    nativeLanguageName,
  });

  const fallback = `You are a bilingual dictionary engine that generates high-quality example sentences for language learners.

For the {{targetLanguageName}} word "{{word}}", generate ONLY example sentences with translations.

Output JSON format:
{
  "examples": [
    {"textSrc": "natural {{targetLanguageName}} example sentence", "textDst": "natural {{nativeLanguageName}} translation"},
    {"textSrc": "{{targetLanguageName}} example 2", "textDst": "{{nativeLanguageName}} translation 2"},
    {"textSrc": "{{targetLanguageName}} example 3", "textDst": "{{nativeLanguageName}} translation 3"},
    {"textSrc": "{{targetLanguageName}} example 4", "textDst": "{{nativeLanguageName}} translation 4"}
  ]
}

Requirements:
- Generate ONLY the "examples" array (do NOT include hint or metrics)
- Provide EXACTLY 4 practical and natural {{targetLanguageName}} example sentences
- Each example must have BOTH textSrc ({{targetLanguageName}} sentence) and textDst ({{nativeLanguageName}} translation)
- IMPORTANT: Keep sentences concise - textSrc should be 8-12 words, textDst should be 15-25 characters
- Examples should demonstrate different usage contexts and sentence patterns
- Translations should be natural and appropriate for the context (use appropriate formality level for each sentence)
- Keep translations clear and contextually accurate`;

  const prompt = await fetchPromptWithFallback(
    'dictionary-additional',
    fallback,
    {
      word,
      targetLanguage,
      targetLanguageName,
      nativeLanguage,
      nativeLanguageName,
    }
  );

  // Log the first 500 characters of the generated prompt to verify variables are replaced
  console.log('[createAdditionalDetailsPrompt] Generated prompt preview:', prompt.substring(0, 500));
  console.log('[createAdditionalDetailsPrompt] Checking for unreplaced variables:', {
    hasNativeLanguageName: prompt.includes('{{nativeLanguageName}}'),
    hasTargetLanguageName: prompt.includes('{{targetLanguageName}}'),
    actualNativeLanguage: nativeLanguageName,
  });

  return prompt;
}

/**
 * 辞書プロンプトを生成（段階的レンダリング最適化版）
 *
 * 生成順序：headword → senses → metrics → examples
 * （UIでの表示順と一致させて体感速度を向上）
 *
 * 注意：辞書データは常に同じ構造（詳細度の概念なし）
 * 詳細度はチャット機能のAI返答にのみ適用される
 *
 * @param word - 検索する単語
 * @param targetLanguage - ターゲット言語コード（例: 'en', 'es', 'pt', 'zh'）
 * @param nativeLanguage - 母国語コード（例: 'ja', 'en', 'zh'）
 */
export function createDictionaryPrompt(
  word: string,
  targetLanguage: string = 'en',
  nativeLanguage: string = 'ja'
): string {
  const targetLanguageName = getLanguageNameEn(targetLanguage);
  const nativeLanguageName = getLanguageNameEn(nativeLanguage);
  const needsGender = hasGrammaticalGender(targetLanguage);
  const genderField = needsGender ? ', "gender": "m or f or n or mf (for nouns only)"' : '';

  return `Generate dictionary information for the ${targetLanguageName} word "${word}" in the following JSON structure:

{
  "headword": {"lemma": "${word}", "lang": "${targetLanguage}", "pos": ["part of speech (English, e.g., verb, noun)"]${genderField}},
  "senses": [{"id": "1", "glossShort": "concise ${nativeLanguageName} meaning (within 10 chars)"}, {"id": "2", "glossShort": "meaning 2"}],
  "hint": {"text": "2-3 concise sentences in ${nativeLanguageName} (usage context, nuance, differences from similar words, etc. - 2 most important learning points)"},
  "metrics": {"frequency": frequency 0-100, "difficulty": difficulty 0-100, "nuance": nuance strength 0-100},
  "examples": [
    {"textSrc": "natural ${targetLanguageName} example sentence", "textDst": "natural ${nativeLanguageName} translation"},
    {"textSrc": "${targetLanguageName} example 2", "textDst": "${nativeLanguageName} translation 2"},
    {"textSrc": "${targetLanguageName} example 3", "textDst": "${nativeLanguageName} translation 3"}
  ]
}

Requirements:
- Generate in this order (headword → senses → hint → metrics → examples)
- Hint should be 2-3 sentences in ${nativeLanguageName}, covering 2 most important features (usage context, nuance, grammar, differences from similar words, etc.)
- 2-3 senses only, main meanings (each within 10 chars)
- 3-5 practical and natural ${targetLanguageName} example sentences
- Metrics should reflect actual usage frequency
- ${nativeLanguageName} explanations should be natural and clear`;
}

/**
 * 日本語からターゲット言語への単語サジェストプロンプトを生成
 *
 * @deprecated このプロンプトは使用されていません。
 * 代わりに高速サジェストプロンプト（dictionary-generator.ts の createFastSuggestionsPrompt）と
 * 並列UsageHint生成（backend /api/gemini/generate-usage-hint）を使用してください。
 * Langfuse移行時に削除予定。
 */
export function createSuggestionsPrompt(query: string, targetLanguage: string = 'en'): string {
  const langName = getLanguageNameJa(targetLanguage);
  const needsGender = hasGrammaticalGender(targetLanguage);
  const genderExample = needsGender ? ',\n    "gender": "m または f または n（名詞の場合のみ）"' : '';

  return `日本語"${query}"に対応する${langName}の単語を3~5個、以下のJSON配列構造で生成：

[
  {
    "lemma": "${langName}単語1",
    "pos": ["品詞（英語）"],
    "shortSense": "簡潔な日本語の意味（10文字以内）",
    "confidence": 関連性スコア0-1,
    "usageHint": "この単語の使い方や特徴を1文で（20文字以内）",
    "nuance": ニュアンススコア0-100${genderExample}
  },
  {
    "lemma": "${langName}単語2",
    "pos": ["品詞"],
    "shortSense": "意味2",
    "confidence": スコア,
    "usageHint": "使い方2",
    "nuance": ニュアンススコア${genderExample}
  }
]

要件:
- 必ず3個以上の候補（文脈・ニュアンスの違いを考慮）
- 関連性の高い順にソート、confidenceは最高を1.0
- usageHintは20-30文字で使用場面・特徴を簡潔に（単語名は繰り返さない）
  例: "日常会話向けの基本語", "ビジネス・公式向け", "カジュアルな会話向け", "学術的な専門用語"
- nuanceスコア: 0=カジュアル/スラング, 30=カジュアル, 50=中立, 70=フォーマル, 100=学術的`;
}
