/**
 * i18n 多言語化設定
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import ja from './locales/ja.json';
import en from './locales/en.json';
import pt from './locales/pt.json';

/**
 * デバイスのロケールを取得し、サポートされている言語コードを返す
 * サポート言語: ja, en, pt
 * それ以外の言語の場合は英語(en)を返す
 */
function getDeviceLanguage(): string {
  try {
    const locales = Localization.getLocales();
    if (locales && locales.length > 0) {
      const deviceLang = locales[0].languageCode;
      console.log('[i18n] Device language detected:', deviceLang);

      // サポートされている言語のみ
      const supportedLanguages = ['ja', 'en', 'pt'];
      if (supportedLanguages.includes(deviceLang || '')) {
        return deviceLang || 'en';
      }

      // サポートされていない言語の場合は英語をデフォルトに
      console.log('[i18n] Unsupported language, defaulting to English');
      return 'en';
    }
  } catch (error) {
    console.warn('[i18n] Failed to get device locale:', error);
  }
  return 'en';
}

const deviceLanguage = getDeviceLanguage();

i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v4', // React Native対応
    resources: {
      ja: { translation: ja },
      en: { translation: en },
      pt: { translation: pt },
    },
    lng: deviceLanguage, // デバイスの言語をデフォルトに
    fallbackLng: 'en', // フォールバックは英語
    interpolation: {
      escapeValue: false, // React already does escaping
    },
  });

export default i18n;
