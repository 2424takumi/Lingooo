/**
 * 多言語対応プロンプト生成
 *
 * 学習言語に応じて適切なプロンプトを動的に生成
 *
 * 注意：detailLevel（詳細度）はチャット機能のAI返答にのみ適用
 * 辞書データには詳細度の概念はなく、常に同じ構造を返す
 */

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
export function createBasicInfoPrompt(word: string, targetLanguage: string = 'en', nativeLanguage: string = 'ja'): string {
  const langName = getLanguageNameJa(targetLanguage);
  const nativeLangName = getLanguageNameJa(nativeLanguage);

  return `${langName}の単語"${word}"の基本情報を以下のJSON構造で最小限のトークンで生成：

{
  "headword": {"lemma": "${word}", "lang": "${targetLanguage}", "pos": ["品詞（英語、例: verb, noun）"]},
  "senses": [{"id": "1", "glossShort": "簡潔な${nativeLangName}の意味（10文字以内）"}, {"id": "2", "glossShort": "意味2"}]
}

要件:
- sensesは2-3個、主要な意味のみ（各10文字以内）
- ${nativeLangName}の説明は簡潔で分かりやすく
- 超高速レスポンス用のため最小限の情報のみ`;
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
  const langName = getLanguageNameJa(targetLanguage);
  const nativeLangName = getLanguageNameJa(nativeLanguage);
  const needsGender = hasGrammaticalGender(targetLanguage);
  const genderField = needsGender ? ', "gender": "m または f または n または mf（名詞の場合のみ）"' : '';

  return `${langName}の単語"${word}"の辞書情報を以下のJSON構造で生成してください：

{
  "headword": {"lemma": "${word}", "lang": "${targetLanguage}", "pos": ["品詞（英語、例: verb, noun）"]${genderField}},
  "senses": [{"id": "1", "glossShort": "簡潔な${nativeLangName}の意味（10文字以内）"}, {"id": "2", "glossShort": "意味2"}],
  "hint": {"text": "${nativeLangName}で2〜3文の簡潔な説明（使用場面・ニュアンス・類似語との違いなど、学習に最も重要な特徴2点）"},
  "metrics": {"frequency": 頻出度0-100, "difficulty": 難易度0-100, "nuance": ニュアンスの強さ0-100},
  "examples": [
    {"textSrc": "自然な${langName}の例文", "textDst": "自然な${nativeLangName}訳"},
    {"textSrc": "${langName}例文2", "textDst": "${nativeLangName}訳2"},
    {"textSrc": "${langName}例文3", "textDst": "${nativeLangName}訳3"}
  ]
}

要件:
- この順序（headword → senses → hint → metrics → examples）で必ず生成
- hintは${nativeLangName}で2〜3文、学習に最も重要な2つの特徴（使用場面・ニュアンス・文法・類似語との違いなど）
- sensesは2-3個、主要な意味のみ（各10文字以内）
- 例文は3-5個、実用的で自然な${langName}の文
- metricsは実際の使用頻度を反映
- ${nativeLangName}の説明は自然で分かりやすく`;
}

/**
 * 日本語からターゲット言語への単語サジェストプロンプトを生成
 */
export function createSuggestionsPrompt(japaneseQuery: string, targetLanguage: string = 'en'): string {
  const langName = getLanguageNameJa(targetLanguage);
  const needsGender = hasGrammaticalGender(targetLanguage);
  const genderExample = needsGender ? ',\n    "gender": "m または f または n（名詞の場合のみ）"' : '';

  return `日本語"${japaneseQuery}"に対応する${langName}の単語を3~5個、以下のJSON配列構造で生成：

[
  {
    "lemma": "${langName}単語1",
    "pos": ["品詞（英語）"],
    "shortSenseJa": "簡潔な日本語の意味（10文字以内）",
    "confidence": 関連性スコア0-1,
    "usageHint": "この単語の使い方や特徴を1文で（20文字以内）",
    "nuance": ニュアンススコア0-100${genderExample}
  },
  {
    "lemma": "${langName}単語2",
    "pos": ["品詞"],
    "shortSenseJa": "意味2",
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
