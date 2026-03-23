export type TutorialStep = 0 | 1 | 2 | 3;

export const TUTORIAL_STEPS = {
  SELECT_WORD: 0 as TutorialStep,
  VIEW_CARD: 1 as TutorialStep,
  ASK_QUESTION: 2 as TutorialStep,
  COMPLETE: 3 as TutorialStep,
};

export type TutorialEvent =
  | 'TEXT_SELECTED'
  | 'CARD_ACTION_TAPPED'
  | 'QUESTION_TAG_TAPPED'
  | 'NAVIGATED_AWAY';

export interface TutorialDemoContent {
  sourceLang: string;
  targetLang: string;
  original: string;
  translated: string;
  highlightWord: string;
}

// 母語ごとのデモコンテンツ
export const TUTORIAL_DEMO_CONTENT: Record<string, TutorialDemoContent> = {
  ja: {
    sourceLang: 'en',
    targetLang: 'ja',
    original: 'The weather was absolutely gorgeous, so we decided to take a stroll through the park.',
    translated: '天気がとても素晴らしかったので、公園を散歩することにしました。',
    highlightWord: 'gorgeous',
  },
  en: {
    sourceLang: 'ja',
    targetLang: 'en',
    original: '天気がとても素晴らしかったので、公園を散歩することにしました。',
    translated: 'The weather was absolutely gorgeous, so we decided to take a stroll through the park.',
    highlightWord: 'gorgeous',
  },
  pt: {
    sourceLang: 'en',
    targetLang: 'pt',
    original: 'The weather was absolutely gorgeous, so we decided to take a stroll through the park.',
    translated: 'O tempo estava absolutamente lindo, então decidimos dar um passeio pelo parque.',
    highlightWord: 'gorgeous',
  },
  ko: {
    sourceLang: 'en',
    targetLang: 'ko',
    original: 'The weather was absolutely gorgeous, so we decided to take a stroll through the park.',
    translated: '날씨가 정말 아름다워서 공원을 산책하기로 했습니다.',
    highlightWord: 'gorgeous',
  },
  zh: {
    sourceLang: 'en',
    targetLang: 'zh',
    original: 'The weather was absolutely gorgeous, so we decided to take a stroll through the park.',
    translated: '天气非常好，所以我们决定在公园里散步。',
    highlightWord: 'gorgeous',
  },
};

// 母語コードからデモコンテンツを取得（フォールバック付き）
export function getDemoContent(nativeLanguageCode: string): TutorialDemoContent {
  return TUTORIAL_DEMO_CONTENT[nativeLanguageCode] || TUTORIAL_DEMO_CONTENT['ja'];
}
