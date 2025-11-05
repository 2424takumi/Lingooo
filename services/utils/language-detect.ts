/**
 * 言語判定ユーティリティ
 *
 * 入力されたテキストの言語を判定します。
 * 仕様: docs/lingooo_search_spec.md セクション2.2参照
 */

export type Language = 'ja' | 'zh' | 'alphabet' | 'mixed';

/**
 * テキストの言語を判定（多言語対応版）
 *
 * @param text - 判定対象のテキスト
 * @returns 'ja' (日本語) | 'zh' (中国語) | 'alphabet' (アルファベット) | 'mixed' (混在)
 *
 * @example
 * detectLang('こんにちは') // => 'ja'
 * detectLang('你好') // => 'zh'
 * detectLang('hello') // => 'alphabet'
 * detectLang('hola') // => 'alphabet'
 */
export function detectLang(text: string): Language {
  if (!text || text.trim().length === 0) {
    return 'alphabet'; // デフォルト
  }

  const trimmedText = text.trim();

  // ひらがな: \u3040-\u309F
  // カタカナ: \u30A0-\u30FF
  const hiraganaKatakanaRegex = /[\u3040-\u309F\u30A0-\u30FF]/;

  // 漢字: \u4E00-\u9FAF
  const kanjiRegex = /[\u4E00-\u9FAF]/;

  // アルファベット（スペース、ハイフン、アポストロフィを許可）
  const alphabetRegex = /^[a-zA-Z\s'\-]+$/;

  const hasHiraganaKatakana = hiraganaKatakanaRegex.test(trimmedText);
  const hasKanji = kanjiRegex.test(trimmedText);
  const isAlphabetOnly = alphabetRegex.test(trimmedText);

  // ひらがな/カタカナを含む → 日本語
  if (hasHiraganaKatakana) {
    return 'ja';
  }

  // 漢字のみ → 中国語（日本語のひらがな/カタカナを含まない）
  if (hasKanji && !hasHiraganaKatakana) {
    return 'zh';
  }

  // アルファベットのみ → 言語不明（英語/スペイン語/ポルトガル語等）
  if (isAlphabetOnly) {
    return 'alphabet';
  }

  // 混在の場合
  return 'mixed';
}

/**
 * テキストを正規化（前処理）
 *
 * @param text - 正規化対象のテキスト
 * @returns 正規化されたテキスト
 *
 * @example
 * normalizeQuery('  Study  ') // => 'study'
 * normalizeQuery('HELLO　WORLD') // => 'hello world'
 */
export function normalizeQuery(text: string): string {
  return text
    .trim() // 前後の空白除去
    .toLowerCase() // 小文字化
    .replace(/\s+/g, ' ') // 連続する空白を1つに
    .replace(/　/g, ' '); // 全角スペースを半角に
}

/**
 * 入力の検証
 *
 * @param text - 検証対象のテキスト
 * @returns { valid: boolean, error?: string }
 */
export function validateSearchInput(text: string): { valid: boolean; error?: string } {
  if (!text || text.trim().length === 0) {
    return {
      valid: false,
      error: '単語を入力してください',
    };
  }

  const trimmedText = text.trim();

  if (trimmedText.length > 128) {
    return {
      valid: false,
      error: '入力は128文字以内にしてください',
    };
  }

  // 記号のみの入力をチェック
  const symbolOnlyRegex = /^[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+$/;
  if (symbolOnlyRegex.test(trimmedText)) {
    return {
      valid: false,
      error: '有効な単語を入力してください',
    };
  }

  return { valid: true };
}

/**
 * 検出された言語タイプから実際の言語コードを決定
 *
 * @param detectedLang - detectLangの結果
 * @param currentLanguageCode - 現在選択中の言語コード（アルファベットの場合のフォールバック）
 * @returns ISO 639-1言語コード ('ja', 'zh', 'en', 'es', 'pt'等)
 *
 * @example
 * resolveLanguageCode('ja', 'en') // => 'ja'
 * resolveLanguageCode('zh', 'en') // => 'zh'
 * resolveLanguageCode('alphabet', 'es') // => 'es'（タブで選択中の言語）
 */
export function resolveLanguageCode(detectedLang: Language, currentLanguageCode: string): string {
  if (detectedLang === 'ja') {
    return 'ja';
  }

  if (detectedLang === 'zh') {
    return 'zh';
  }

  // alphabet or mixed → 選択中の言語を使う
  return currentLanguageCode;
}
