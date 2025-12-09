/**
 * アプリケーション設定の型定義
 */

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
 * アプリケーション設定
 */
export interface AppSettings {
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
  notifications: {
    enabled: true,
  },
  sound: {
    enabled: true,
  },
  autoPlayAudio: false,
};
