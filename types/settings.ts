/**
 * アプリケーション設定の型定義
 */

/**
 * AI返答の詳細度レベル
 */
export type AIDetailLevel = 'concise' | 'detailed';

/**
 * カスタム質問
 */
export interface CustomQuestion {
  /**
   * タグに表示されるタイトル（短い）
   */
  title: string;

  /**
   * 実際に送信される質問文
   */
  question: string;
}

/**
 * AI返答設定
 */
export interface AIResponseSettings {
  /**
   * 詳細度レベル
   * - 'concise': 簡潔な返答（デフォルト）
   * - 'detailed': 詳細な返答（語源、追加例文、ニュアンスの詳細など）
   */
  detailLevel: AIDetailLevel;
}

/**
 * アプリケーション設定
 */
export interface AppSettings {
  /**
   * AI返答の設定
   */
  aiResponse: AIResponseSettings;

  /**
   * 通知設定
   */
  notifications: {
    enabled: boolean;
  };

  /**
   * サウンド設定
   */
  sound: {
    enabled: boolean;
  };

  /**
   * 音声自動再生設定
   */
  autoPlayAudio: boolean;
}

/**
 * デフォルト設定
 */
export const DEFAULT_APP_SETTINGS: AppSettings = {
  aiResponse: {
    detailLevel: 'concise',
  },
  notifications: {
    enabled: true,
  },
  sound: {
    enabled: true,
  },
  autoPlayAudio: false,
};
