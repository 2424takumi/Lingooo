/**
 * 言語関連の型定義
 *
 * BCP 47対応: バリアントのある言語は 'en-US', 'pt-BR' 等のコードを使用
 * バリアントのない言語は従来通り 'fr', 'zh' 等のISO 639-1コードを使用
 */

export interface Language {
  id: string;           // 'english-us', 'portuguese-br'
  name: string;         // '英語（アメリカ）'
  nameEn: string;       // 'English (US)'
  flag: string;         // '🇺🇸'
  code: string;         // BCP 47: 'en-US', 'pt-BR' or ISO 639-1: 'fr', 'zh'
  baseCode: string;     // ISO 639-1: 'en', 'pt'
  groupId?: string;     // バリアントグループ: 'english', 'portuguese'
  promptName: string;   // AI用: 'American English', 'Brazilian Portuguese'
  promptHint?: string;  // バリアント固有のAI指示
  tabLabel: string;     // タブ表示用: '🇺🇸 英語', '🇧🇷 ポルトガル語'
}

export const AVAILABLE_LANGUAGES: Language[] = [
  {
    id: 'japanese',
    name: '日本語',
    nameEn: 'Japanese',
    flag: '🇯🇵',
    code: 'ja',
    baseCode: 'ja',
    promptName: 'Japanese',
    tabLabel: '🇯🇵 日本語',
  },
  {
    id: 'english-us',
    name: '英語（アメリカ）',
    nameEn: 'English (US)',
    flag: '🇺🇸',
    code: 'en-US',
    baseCode: 'en',
    groupId: 'english',
    promptName: 'American English',
    promptHint: 'Use American English spelling and vocabulary (e.g., "color" not "colour", "elevator" not "lift", "apartment" not "flat").',
    tabLabel: '🇺🇸 英語',
  },
  {
    id: 'english-gb',
    name: '英語（イギリス）',
    nameEn: 'English (GB)',
    flag: '🇬🇧',
    code: 'en-GB',
    baseCode: 'en',
    groupId: 'english',
    promptName: 'British English',
    promptHint: 'Use British English spelling and vocabulary (e.g., "colour" not "color", "lift" not "elevator", "flat" not "apartment").',
    tabLabel: '🇬🇧 英語',
  },
  {
    id: 'portuguese-br',
    name: 'ポルトガル語（ブラジル）',
    nameEn: 'Portuguese (BR)',
    flag: '🇧🇷',
    code: 'pt-BR',
    baseCode: 'pt',
    groupId: 'portuguese',
    promptName: 'Brazilian Portuguese',
    promptHint: 'Use Brazilian vocabulary and grammar (e.g., "trem" not "comboio", "ônibus" not "autocarro"). Use gerund constructions typical in Brazil. Examples should reflect Brazilian culture and daily life.',
    tabLabel: '🇧🇷 ポルトガル語',
  },
  {
    id: 'portuguese-pt',
    name: 'ポルトガル語（ポルトガル）',
    nameEn: 'Portuguese (PT)',
    flag: '🇵🇹',
    code: 'pt-PT',
    baseCode: 'pt',
    groupId: 'portuguese',
    promptName: 'European Portuguese',
    promptHint: 'Use European Portuguese vocabulary and grammar (e.g., "comboio" not "trem", "autocarro" not "ônibus"). Avoid Brazilian colloquialisms. Examples should reflect Portuguese/European culture.',
    tabLabel: '🇵🇹 ポルトガル語',
  },
  {
    id: 'french',
    name: 'フランス語',
    nameEn: 'French',
    flag: '🇫🇷',
    code: 'fr',
    baseCode: 'fr',
    promptName: 'French',
    tabLabel: '🇫🇷 フランス語',
  },
  {
    id: 'chinese',
    name: '中国語',
    nameEn: 'Chinese',
    flag: '🇨🇳',
    code: 'zh',
    baseCode: 'zh',
    promptName: 'Chinese',
    tabLabel: '🇨🇳 中国語',
  },
  {
    id: 'korean',
    name: '韓国語',
    nameEn: 'Korean',
    flag: '🇰🇷',
    code: 'ko',
    baseCode: 'ko',
    promptName: 'Korean',
    tabLabel: '🇰🇷 韓国語',
  },
  {
    id: 'vietnamese',
    name: 'ベトナム語',
    nameEn: 'Vietnamese',
    flag: '🇻🇳',
    code: 'vi',
    baseCode: 'vi',
    promptName: 'Vietnamese',
    tabLabel: '🇻🇳 ベトナム語',
  },
  {
    id: 'indonesian',
    name: 'インドネシア語',
    nameEn: 'Indonesian',
    flag: '🇮🇩',
    code: 'id',
    baseCode: 'id',
    promptName: 'Indonesian',
    tabLabel: '🇮🇩 インドネシア語',
  },
  {
    id: 'spanish',
    name: 'スペイン語',
    nameEn: 'Spanish',
    flag: '🇪🇸',
    code: 'es',
    baseCode: 'es',
    promptName: 'Spanish',
    tabLabel: '🇪🇸 スペイン語',
  },
];

export type LanguageId = typeof AVAILABLE_LANGUAGES[number]['id'];

/**
 * レガシー言語コードから新BCP 47コードへのマッピング
 * Supabaseに保存された旧コード('pt', 'en')を新コードに変換
 */
export const LEGACY_CODE_MIGRATION: Record<string, string> = {
  pt: 'pt-BR',
  en: 'en-US',
};

/**
 * BCP 47コードからベース言語コード(ISO 639-1)を取得
 * 'pt-BR' → 'pt', 'en-US' → 'en', 'fr' → 'fr'
 */
export function getBaseLanguageCode(code: string): string {
  const lang = AVAILABLE_LANGUAGES.find(l => l.code === code);
  if (lang) return lang.baseCode;
  // フォールバック: ハイフン前の部分を返す
  return code.split('-')[0];
}

/**
 * 言語コードからLanguageオブジェクトを検索
 * 完全一致 → baseCode一致のフォールバック
 */
export function findLanguageByCode(code: string): Language | undefined {
  // 完全一致
  const exact = AVAILABLE_LANGUAGES.find(l => l.code === code);
  if (exact) return exact;

  // レガシーコード変換
  const migratedCode = LEGACY_CODE_MIGRATION[code];
  if (migratedCode) {
    return AVAILABLE_LANGUAGES.find(l => l.code === migratedCode);
  }

  // baseCodeフォールバック（最初に見つかったバリアントを返す）
  return AVAILABLE_LANGUAGES.find(l => l.baseCode === code);
}
