/**
 * 多言語対応プロンプト生成
 *
 * 学習言語に応じて適切なプロンプトを動的に生成
 */

/**
 * 言語名マッピング（日本語表記）
 */
const LANGUAGE_NAMES_JA: Record<string, string> = {
  en: '英語',
  es: 'スペイン語',
  pt: 'ポルトガル語',
  zh: '中国語',
  fr: 'フランス語',
  de: 'ドイツ語',
  ko: '韓国語',
  it: 'イタリア語',
  ru: 'ロシア語',
  ar: 'アラビア語',
  hi: 'ヒンディー語',
};

/**
 * 言語コードから日本語名を取得
 */
function getLanguageNameJa(languageCode: string): string {
  return LANGUAGE_NAMES_JA[languageCode] || languageCode.toUpperCase();
}

/**
 * 基本情報専用プロンプト（headword + senses のみ）
 *
 * 超高速表示用：0.2~0.3秒で返却
 */
export function createBasicInfoPrompt(word: string, targetLanguage: string = 'en'): string {
  const langName = getLanguageNameJa(targetLanguage);

  return `${langName}の単語"${word}"の基本情報を以下のJSON構造で生成してください：

{
  "headword": {"lemma": "${word}", "lang": "${targetLanguage}", "pos": ["品詞（英語、例: verb, noun）"]},
  "senses": [{"id": "1", "glossShort": "簡潔な日本語の意味（10文字以内）"}, {"id": "2", "glossShort": "意味2"}]
}

要件:
- sensesは2-3個、主要な意味のみ
- 日本語の説明は簡潔で分かりやすく`;
}

/**
 * 辞書プロンプトを生成（段階的レンダリング最適化版）
 *
 * 生成順序：headword → senses → metrics → examples
 * （UIでの表示順と一致させて体感速度を向上）
 */
export function createDictionaryPrompt(word: string, targetLanguage: string = 'en'): string {
  const langName = getLanguageNameJa(targetLanguage);

  return `${langName}の単語"${word}"の辞書情報を以下のJSON構造で生成してください：

{
  "headword": {"lemma": "${word}", "lang": "${targetLanguage}", "pos": ["品詞（英語、例: verb, noun）"]},
  "senses": [{"id": "1", "glossShort": "簡潔な日本語の意味（10文字以内）"}, {"id": "2", "glossShort": "意味2"}],
  "metrics": {"frequency": 頻出度0-100, "difficulty": 難易度0-100, "nuance": ニュアンスの強さ0-100},
  "examples": [
    {"textSrc": "自然な${langName}の例文", "textDst": "自然な日本語訳"},
    {"textSrc": "${langName}例文2", "textDst": "日本語訳2"},
    {"textSrc": "${langName}例文3", "textDst": "日本語訳3"}
  ]
}

要件:
- この順序（headword → senses → metrics → examples）で生成してください
- 例文は3-5個、実用的で自然な文を
- sensesは2-3個、主要な意味のみ
- 日本語の説明は自然で分かりやすく
- metricsは実際の使用頻度を反映
- ${langName}の例文は自然で実用的なものを`;
}

/**
 * 日本語からターゲット言語への単語サジェストプロンプトを生成
 */
export function createSuggestionsPrompt(japaneseQuery: string, targetLanguage: string = 'en'): string {
  const langName = getLanguageNameJa(targetLanguage);

  return `日本語"${japaneseQuery}"に対応する${langName}の単語を3~5個、以下のJSON配列構造で生成：

[
  {
    "lemma": "${langName}単語1",
    "pos": ["品詞（英語）"],
    "shortSenseJa": "簡潔な日本語の意味（10文字以内）",
    "confidence": 関連性スコア0-1,
    "usageHint": "この単語の使い方や特徴を1文で（20文字以内）"
  },
  {
    "lemma": "${langName}単語2",
    "pos": ["品詞"],
    "shortSenseJa": "意味2",
    "confidence": スコア,
    "usageHint": "使い方2"
  }
]

要件:
- 必ず3個以上の候補を返すこと
- 文脈やニュアンスの違いを考慮した候補を選ぶこと
  例（英語の場合）: "あいさつ" → greeting（一般的）, salutation（正式）, hello（カジュアル）, regards（書面）
  例（スペイン語の場合）: "あいさつ" → saludo（一般的）, salutación（正式）, hola（カジュアル）
  例（ポルトガル語の場合）: "あいさつ" → saudação（一般的）, cumprimento（正式）, olá（カジュアル）
  例（中国語の場合）: "あいさつ" → 问候（一般的）, 致意（正式）, 你好（カジュアル）
- 関連性の高い順にソート
- confidenceは最も関連性が高いものを1.0とする
- usageHintは使い分けに役立つ情報を含めること
  例: "一般的。日常会話で最も使う", "フォーマル。書類や式典で", "カジュアル。友達との会話で"`;
}
