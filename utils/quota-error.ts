/**
 * Quota Error Utilities
 * Parses and identifies quota/limit errors from backend responses
 */

export interface QuotaErrorInfo {
  isQuotaError: boolean;
  quotaType?: 'translation_tokens' | 'question_count' | 'text_length';
  message: string;
  userFriendlyMessage: string;
}

/**
 * Parse error to detect quota limit errors
 *
 * Backend returns HTTP 429 with:
 * - error: "Translation token limit exceeded" or "Question count limit exceeded"
 * - message: Japanese user-friendly message
 */
export function parseQuotaError(error: unknown): QuotaErrorInfo {
  // Default non-quota error
  const defaultError: QuotaErrorInfo = {
    isQuotaError: false,
    message: error instanceof Error ? error.message : '不明なエラー',
    userFriendlyMessage: 'エラーが発生しました',
  };

  if (!(error instanceof Error)) {
    return defaultError;
  }

  const errorMessage = error.message.toLowerCase();

  // Text length limit (check first for specificity)
  if (
    errorMessage.includes('text too long') ||
    errorMessage.includes('翻訳テキストは') ||
    errorMessage.includes('文字以内である必要があります')
  ) {
    return {
      isQuotaError: true,
      quotaType: 'text_length',
      message: error.message,
      userFriendlyMessage: '翻訳できる文字数の上限に達しました',
    };
  }

  // Question count limit (check first for specificity)
  if (
    errorMessage.includes('question count limit') ||
    errorMessage.includes('question limit') ||
    errorMessage.includes('質問回数上限')
  ) {
    return {
      isQuotaError: true,
      quotaType: 'question_count',
      message: error.message,
      userFriendlyMessage: '今月の質問回数上限に達しました',
    };
  }

  // Translation token limit
  if (
    errorMessage.includes('translation token limit') ||
    errorMessage.includes('翻訳トークン上限')
  ) {
    return {
      isQuotaError: true,
      quotaType: 'translation_tokens',
      message: error.message,
      userFriendlyMessage: '今月の翻訳トークン上限に達しました',
    };
  }

  // Check for HTTP 429 status code (Too Many Requests)
  // This is a fallback when we can't determine the specific quota type
  if (errorMessage.includes('http 429') || errorMessage.includes('429:')) {
    return {
      isQuotaError: true,
      quotaType: 'translation_tokens', // Default assumption for generic 429
      message: error.message,
      userFriendlyMessage: '今月の利用上限に達しました',
    };
  }

  // Generic quota exceeded (HTTP 429)
  if (errorMessage.includes('quota exceeded') || errorMessage.includes('上限に達しました')) {
    return {
      isQuotaError: true,
      message: error.message,
      userFriendlyMessage: '利用上限に達しました',
    };
  }

  return defaultError;
}
