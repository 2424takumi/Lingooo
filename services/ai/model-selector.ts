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
    model: 'gemini-2.5-flash-lite', // 最高速: Flash-Liteは最速で最もコスト効率が良い
    maxTokens: 1024, // 最適化: 実際の出力サイズに合わせて削減
    temperature: 0.1, // 最適化: より速く、より一貫性のある出力
  };
}

/**
 * モデルの表示名を取得
 */
export function getModelDisplayName(config: ModelConfig): string {
  return 'Gemini Flash 2.5 Lite';
}
