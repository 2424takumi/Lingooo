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
 * 日本語に固定（Japanese-only optimization for initial release）
 * 将来的な多言語展開のため、設定構造は維持
 */
const deviceLanguage = 'ja';

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
