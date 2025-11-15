/**
 * 言語判定ユーティリティ
 *
 * 入力されたテキストの言語を判定します。
 * 仕様: docs/lingooo_search_spec.md セクション2.2参照
 */

import { MAX_TEXT_LENGTH } from '@/constants/validation';

export type Language = 'ja' | 'kanji-only' | 'alphabet' | 'mixed';

/**
 * テキストの言語を判定（多言語対応版）
 *
 * @param text - 判定対象のテキスト
 * @returns 'ja' (日本語) | 'kanji-only' (漢字のみ) | 'alphabet' (アルファベット) | 'mixed' (混在)
 *
 * @example
 * detectLang('こんにちは') // => 'ja'（ひらがな含む）
 * detectLang('法律') // => 'kanji-only'（日本語か中国語か不明）
 * detectLang('你好') // => 'kanji-only'（日本語か中国語か不明）
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
  const hiraganaKatakanaRegex = /[\u3040-\u309F\u30A0-\u30FF]/g;

  // 漢字: \u4E00-\u9FAF
  const kanjiRegex = /[\u4E00-\u9FAF]/g;

  // アルファベット
  const alphabetRegex = /[a-zA-Z]/g;

  // 各文字種の出現回数をカウント
  const hiraganaKatakanaMatches = trimmedText.match(hiraganaKatakanaRegex);
  const kanjiMatches = trimmedText.match(kanjiRegex);
  const alphabetMatches = trimmedText.match(alphabetRegex);

  const hiraganaKatakanaCount = hiraganaKatakanaMatches ? hiraganaKatakanaMatches.length : 0;
  const kanjiCount = kanjiMatches ? kanjiMatches.length : 0;
  const alphabetCount = alphabetMatches ? alphabetMatches.length : 0;

  const japaneseCharCount = hiraganaKatakanaCount + kanjiCount;
  const totalCharCount = japaneseCharCount + alphabetCount;

  // 文字がない場合
  if (totalCharCount === 0) {
    return 'alphabet';
  }

  // 日本語文字の割合を計算
  const japaneseRatio = japaneseCharCount / totalCharCount;

  // 日本語文字が30%以上 → 日本語として判定
  if (japaneseRatio >= 0.3) {
    // ひらがな/カタカナを含む → 日本語として確定
    if (hiraganaKatakanaCount > 0) {
      return 'ja';
    }
    // 漢字のみ → 日本語か中国語か不明
    if (kanjiCount > 0) {
      return 'kanji-only';
    }
  }

  // アルファベットが主体 → アルファベット
  if (alphabetCount > 0 && japaneseRatio < 0.3) {
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

  // 文字数制限
  if (trimmedText.length > MAX_TEXT_LENGTH) {
    return {
      valid: false,
      error: `入力は${MAX_TEXT_LENGTH}文字以内にしてください`,
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
 * @param currentLanguageCode - 現在選択中の言語コード
 * @param nativeLanguageCode - 母語の言語コード
 * @returns ISO 639-1言語コード ('ja', 'zh', 'en', 'es', 'pt'等)
 *
 * @example
 * resolveLanguageCode('ja', 'en', 'ja') // => 'ja'
 * resolveLanguageCode('kanji-only', 'zh', 'ja') // => 'zh'（中国語タブ選択中）
 * resolveLanguageCode('kanji-only', 'en', 'ja') // => 'ja'（母語を使用）
 * resolveLanguageCode('alphabet', 'es', 'ja') // => 'es'（タブで選択中の言語）
 */
export function resolveLanguageCode(
  detectedLang: Language,
  currentLanguageCode: string,
  nativeLanguageCode: string = 'ja'
): string {
  // 日本語として確定（ひらがな/カタカナを含む）
  if (detectedLang === 'ja') {
    return 'ja';
  }

  // 漢字のみ → タブ選択を優先、なければ母語
  if (detectedLang === 'kanji-only') {
    // 中国語タブ選択中 → 中国語辞書
    if (currentLanguageCode === 'zh') {
      return 'zh';
    }
    // それ以外 → 母語（日本語）として扱う
    return nativeLanguageCode;
  }

  // alphabet or mixed → 選択中の言語を使う
  return currentLanguageCode;
}
