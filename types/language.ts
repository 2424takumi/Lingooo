/**
 * 言語関連の型定義
 */

export interface Language {
  id: string;
  name: string;
  nameEn: string;
  flag: string;
  code: string;
}

export const AVAILABLE_LANGUAGES: Language[] = [
  { id: 'english', name: '英語', nameEn: 'English', flag: '🇺🇸', code: 'en' },
  { id: 'japanese', name: '日本語', nameEn: 'Japanese', flag: '🇯🇵', code: 'ja' },
  { id: 'spanish', name: 'スペイン語', nameEn: 'Spanish', flag: '🇪🇸', code: 'es' },
  { id: 'french', name: 'フランス語', nameEn: 'French', flag: '🇫🇷', code: 'fr' },
  { id: 'german', name: 'ドイツ語', nameEn: 'German', flag: '🇩🇪', code: 'de' },
  { id: 'chinese', name: '中国語', nameEn: 'Chinese', flag: '🇨🇳', code: 'zh' },
  { id: 'korean', name: '韓国語', nameEn: 'Korean', flag: '🇰🇷', code: 'ko' },
  { id: 'italian', name: 'イタリア語', nameEn: 'Italian', flag: '🇮🇹', code: 'it' },
  { id: 'portuguese', name: 'ポルトガル語', nameEn: 'Portuguese', flag: '🇵🇹', code: 'pt' },
  { id: 'russian', name: 'ロシア語', nameEn: 'Russian', flag: '🇷🇺', code: 'ru' },
  { id: 'arabic', name: 'アラビア語', nameEn: 'Arabic', flag: '🇸🇦', code: 'ar' },
  { id: 'hindi', name: 'ヒンディー語', nameEn: 'Hindi', flag: '🇮🇳', code: 'hi' },
];

export type LanguageId = typeof AVAILABLE_LANGUAGES[number]['id'];
