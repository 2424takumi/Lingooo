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
  { id: 'japanese', name: '日本語', nameEn: 'Japanese', flag: '🇯🇵', code: 'ja' },
  { id: 'english', name: '英語', nameEn: 'English', flag: '🇺🇸', code: 'en' },
  { id: 'portuguese', name: 'ポルトガル語', nameEn: 'Portuguese', flag: '🇧🇷', code: 'pt' },
  { id: 'french', name: 'フランス語', nameEn: 'French', flag: '🇫🇷', code: 'fr' },
  { id: 'chinese', name: '中国語', nameEn: 'Chinese', flag: '🇨🇳', code: 'zh' },
  { id: 'korean', name: '韓国語', nameEn: 'Korean', flag: '🇰🇷', code: 'ko' },
  { id: 'vietnamese', name: 'ベトナム語', nameEn: 'Vietnamese', flag: '🇻🇳', code: 'vi' },
  { id: 'indonesian', name: 'インドネシア語', nameEn: 'Indonesian', flag: '🇮🇩', code: 'id' },
  { id: 'spanish', name: 'スペイン語', nameEn: 'Spanish', flag: '🇪🇸', code: 'es' },
];

export type LanguageId = typeof AVAILABLE_LANGUAGES[number]['id'];
