/**
 * Language constants
 * アプリ全体で使用される言語関連の定数
 */

/**
 * 言語コードから音声言語コードへのマッピング
 * Speech Synthesis API用
 */
export const SPEECH_LANGUAGE_MAP: Record<string, string> = {
  en: 'en-US',
  ja: 'ja-JP',
  es: 'es-ES',
  pt: 'pt-BR',
  zh: 'zh-CN',
  fr: 'fr-FR',
  de: 'de-DE',
  ko: 'ko-KR',
  it: 'it-IT',
  ru: 'ru-RU',
  ar: 'ar-SA',
  hi: 'hi-IN',
};

/**
 * 言語コードから表示名（日本語）へのマッピング
 */
export const LANGUAGE_NAME_MAP: Record<string, string> = {
  en: '英語',
  ja: '日本語',
  es: 'スペイン語',
  pt: 'ポルトガル語',
  zh: '中国語',
  fr: 'フランス語',
  de: 'ドイツ語',
  ko: '韓国語',
  it: 'イタリア語',
  ru: 'ロシア語',
  ar: 'アラビア語',
  hi: 'ヒンディー語',
};

/**
 * サポートされている言語コードの配列
 */
export const SUPPORTED_LANGUAGES = Object.keys(LANGUAGE_NAME_MAP);
