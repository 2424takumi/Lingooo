/**
 * AIモデル選択ロジック（シンプル版）
 *
 * 現状はGeminiのみ使用。将来的に他のプロバイダーが必要になれば拡張可能。
 */

export type AIProvider = 'gemini' | 'groq' | 'claude';

export interface ModelConfig {
  provider: AIProvider;
  model: string;
  maxTokens: number;
  temperature: number;
}

/**
 * AIモデル設定を取得（現在はGemini固定）
 */
export function selectModel(): ModelConfig {
  return {
    provider: 'gemini',
    model: 'gemini-2.0-flash-exp',
    maxTokens: 1200,
    temperature: 0.3,
  };
}

/**
 * モデルの表示名を取得
 */
export function getModelDisplayName(config: ModelConfig): string {
  return 'Gemini Flash 2.0 Exp';
}
