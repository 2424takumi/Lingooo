/**
 * Markdown記法をシンプルなテキストフォーマットに変換
 * 選択可能なテキストとして表示するため、装飾は最小限に
 */

/**
 * Markdown記法を含むテキストを整形
 *
 * @param text - Markdown記法を含むテキスト
 * @returns フォーマットされたプレーンテキスト
 *
 * @example
 * formatMarkdownText("# 見出し\n- リスト1\n- リスト2")
 * // => "\n見出し\n\n  • リスト1\n  • リスト2"
 */
export function formatMarkdownText(text: string): string {
  if (!text) return '';

  return text
    .split('\n')
    .map(line => {
      const trimmed = line.trim();

      // 見出し1 (# )
      if (trimmed.startsWith('# ')) {
        return '\n' + trimmed.substring(2) + '\n';
      }

      // 見出し2 (## )
      if (trimmed.startsWith('## ')) {
        return '\n' + trimmed.substring(3) + '\n';
      }

      // リスト項目 (- または *)
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        return '  • ' + trimmed.substring(2);
      }

      // 太字記号を削除 (**text**)
      if (trimmed.includes('**')) {
        return trimmed.replace(/\*\*(.+?)\*\*/g, '$1');
      }

      // イタリック記号を削除 (*text*)
      if (trimmed.includes('*')) {
        return trimmed.replace(/\*(.+?)\*/g, '$1');
      }

      // 通常のテキスト
      return line;
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n'); // 3つ以上の連続改行を2つに
}

/**
 * テキストが単語か複数語かを判定
 *
 * @param text - 判定対象のテキスト
 * @returns true: 単語, false: 複数語
 */
export function isSingleWord(text: string): boolean {
  const trimmed = text.trim();
  const words = trimmed.split(/\s+/);
  return words.length === 1 && words[0].length > 0;
}
