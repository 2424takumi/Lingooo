/**
 * i18n 多言語化設定
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ja from './locales/ja.json';
import en from './locales/en.json';
import pt from './locales/pt.json';

i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v4', // React Native対応
    resources: {
      ja: { translation: ja },
      en: { translation: en },
      pt: { translation: pt },
    },
    lng: 'ja', // デフォルト言語
    fallbackLng: 'ja',
    interpolation: {
      escapeValue: false, // React already does escaping
    },
  });

export default i18n;
