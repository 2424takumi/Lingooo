/**
 * 言語判定ユーティリティ
 *
 * 入力されたテキストの言語を判定します。
 * 仕様: docs/lingooo_search_spec.md セクション2.2参照
 */

export type Language = 'ja' | 'en' | 'mixed';

/**
 * テキストの言語を判定
 *
 * @param text - 判定対象のテキスト
 * @returns 'ja' (日本語) | 'en' (英語) | 'mixed' (混在)
 *
 * @example
 * detectLang('勉強') // => 'ja'
 * detectLang('study') // => 'en'
 * detectLang('study 勉強') // => 'mixed'
 */
export function detectLang(text: string): Language {
  if (!text || text.trim().length === 0) {
    return 'en'; // デフォルトは英語
  }

  const trimmedText = text.trim();

  // 日本語文字の正規表現
  // ひらがな: \u3040-\u309F
  // カタカナ: \u30A0-\u30FF
  // 漢字: \u4E00-\u9FAF
  const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;

  // 英語文字のみの正規表現（スペース、ハイフン、アポストロフィを許可）
  const englishOnlyRegex = /^[a-zA-Z\s'\-]+$/;

  const hasJapanese = japaneseRegex.test(trimmedText);
  const isEnglishOnly = englishOnlyRegex.test(trimmedText);

  if (hasJapanese && !isEnglishOnly) {
    return 'ja';
  }

  if (isEnglishOnly && !hasJapanese) {
    return 'en';
  }

  // 日本語と英語が混在している場合
  if (hasJapanese && /[a-zA-Z]/.test(trimmedText)) {
    return 'mixed';
  }

  // どちらでもない場合（数字のみ、記号のみなど）
  return 'en'; // デフォルト
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
 * 混在入力の処理方針を決定
 *
 * 仕様: 日本語を含む場合は日本語検索として扱う
 *
 * @param lang - detectLangの結果
 * @returns 'ja' | 'en'
 */
export function resolveMixedLanguage(lang: Language): 'ja' | 'en' {
  if (lang === 'mixed') {
    // 混在の場合は日本語検索として扱う
    return 'ja';
  }
  return lang;
}
