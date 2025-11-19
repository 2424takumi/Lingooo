/**
 * Validation constants
 * アプリ全体で使用される検証関連の定数
 */

/**
 * テキスト長の最大値（翻訳・言語検出）
 * プラン別の制限
 */
export const MAX_TEXT_LENGTH_FREE = 4000;
export const MAX_TEXT_LENGTH_PREMIUM = 50000;

/**
 * プランに応じた翻訳文字数制限を取得
 */
export function getMaxTextLength(isPremium: boolean): number {
  return isPremium ? MAX_TEXT_LENGTH_PREMIUM : MAX_TEXT_LENGTH_FREE;
}

/**
 * 後方互換性のため、デフォルトは無料版の制限
 * @deprecated Use getMaxTextLength(isPremium) instead
 */
export const MAX_TEXT_LENGTH = MAX_TEXT_LENGTH_FREE;

/**
 * 検索クエリの最大長
 */
export const MAX_SEARCH_LENGTH = 100;

/**
 * 識別子の最大長（チャット、セッション等）
 */
export const MAX_IDENTIFIER_LENGTH = 100;

/**
 * メッセージコンテンツの最大長（チャット）
 */
export const MAX_MESSAGE_LENGTH = 2000;
