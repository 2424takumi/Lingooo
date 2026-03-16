/**
 * プロンプトユーティリティ
 *
 * コード内のフォールバックプロンプトを直接使用し、
 * テンプレート変数（Mustache形式）を展開する。
 */

/**
 * プロンプトテンプレートに変数を適用して返す（同期関数）
 *
 * @param _name - プロンプト名（ログ用、未使用）
 * @param fallbackPrompt - プロンプトテンプレート
 * @param variables - 変数オブジェクト
 * @returns コンパイル済みプロンプト文字列
 */
export function fetchPromptWithFallback(
  _name: string,
  fallbackPrompt: string,
  variables?: Record<string, any>
): string {
  return compilePrompt(fallbackPrompt, variables || {});
}

/**
 * プロンプトテンプレートに変数を適用
 * Mustache-style syntax: {{variable}}
 */
function compilePrompt(template: string, variables: Record<string, any>): string {
  let compiled = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    compiled = compiled.replace(regex, String(value));
  }
  return compiled;
}

/**
 * プロンプトキャッシュをクリア（互換性のため残す、no-op）
 */
export async function clearPromptCache(_name?: string): Promise<void> {
  // プロンプトキャッシュは不要になったため何もしない
}
