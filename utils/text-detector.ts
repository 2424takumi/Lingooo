/**
 * 入力されたテキストが単語か文章かを判定する
 */
export function isSentence(text: string): boolean {
  if (!text || !text.trim()) {
    return false;
  }

  const trimmed = text.trim();

  // スペースまたは句読点が含まれているかチェック
  const hasSpaces = /\s/.test(trimmed);
  const hasPunctuation = /[.,!?;:、。！？；：]/.test(trimmed);

  // 単語数をカウント
  const wordCount = trimmed.split(/\s+/).filter(word => word.length > 0).length;

  // 以下のいずれかに該当する場合は文章と判定
  // 1. 複数の単語がある（2語以上）
  // 2. 句読点が含まれている
  // 3. 20文字以上（日本語の場合は短い文でも文章として扱う）
  if (wordCount >= 2) {
    return true;
  }

  if (hasPunctuation) {
    return true;
  }

  if (trimmed.length >= 20) {
    return true;
  }

  return false;
}

/**
 * テキストが単語かどうかを判定する
 */
export function isWord(text: string): boolean {
  return !isSentence(text);
}
