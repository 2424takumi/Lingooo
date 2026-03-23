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

// 学習言語ごとのデモコンテンツ（学習言語→日本語の翻訳例文）
export const TUTORIAL_DEMO_CONTENT: Record<string, TutorialDemoContent> = {
  en: {
    sourceLang: 'en',
    targetLang: 'ja',
    original: 'The weather was absolutely gorgeous, so we decided to take a stroll through the park.',
    translated: '天気がとても素晴らしかったので、公園を散歩することにしました。',
    highlightWord: 'gorgeous',
  },
  pt: {
    sourceLang: 'pt',
    targetLang: 'ja',
    original: 'O tempo estava absolutamente lindo, então decidimos dar um passeio pelo parque.',
    translated: '天気がとても素晴らしかったので、公園を散歩することにしました。',
    highlightWord: 'lindo',
  },
  fr: {
    sourceLang: 'fr',
    targetLang: 'ja',
    original: 'Le temps était absolument magnifique, alors nous avons décidé de faire une promenade dans le parc.',
    translated: '天気がとても素晴らしかったので、公園を散歩することにしました。',
    highlightWord: 'magnifique',
  },
  es: {
    sourceLang: 'es',
    targetLang: 'ja',
    original: 'El tiempo estaba absolutamente precioso, así que decidimos dar un paseo por el parque.',
    translated: '天気がとても素晴らしかったので、公園を散歩することにしました。',
    highlightWord: 'precioso',
  },
  zh: {
    sourceLang: 'zh',
    targetLang: 'ja',
    original: '天气非常好，所以我们决定在公园里散步。',
    translated: '天気がとても素晴らしかったので、公園を散歩することにしました。',
    highlightWord: '散步',
  },
  ko: {
    sourceLang: 'ko',
    targetLang: 'ja',
    original: '날씨가 정말 아름다워서 공원을 산책하기로 했습니다.',
    translated: '天気がとても素晴らしかったので、公園を散歩することにしました。',
    highlightWord: '아름다워서',
  },
  vi: {
    sourceLang: 'vi',
    targetLang: 'ja',
    original: 'Thời tiết thật tuyệt vời nên chúng tôi quyết định đi dạo trong công viên.',
    translated: '天気がとても素晴らしかったので、公園を散歩することにしました。',
    highlightWord: 'tuyệt vời',
  },
  id: {
    sourceLang: 'id',
    targetLang: 'ja',
    original: 'Cuacanya sangat indah, jadi kami memutuskan untuk berjalan-jalan di taman.',
    translated: '天気がとても素晴らしかったので、公園を散歩することにしました。',
    highlightWord: 'indah',
  },
};

// デフォルト学習言語のbaseCodeからデモコンテンツを取得（フォールバック: 英語）
export function getDemoContent(learningLanguageBaseCode: string): TutorialDemoContent {
  return TUTORIAL_DEMO_CONTENT[learningLanguageBaseCode] || TUTORIAL_DEMO_CONTENT['en'];
}
