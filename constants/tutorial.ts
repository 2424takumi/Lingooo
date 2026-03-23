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

// 学習言語ごとの原文とハイライト単語
const DEMO_ORIGINALS: Record<string, { text: string; highlightWord: string }> = {
  en: { text: 'The weather was absolutely gorgeous, so we decided to take a stroll through the park.', highlightWord: 'gorgeous' },
  pt: { text: 'O tempo estava absolutamente lindo, então decidimos dar um passeio pelo parque.', highlightWord: 'lindo' },
  fr: { text: 'Le temps était absolument magnifique, alors nous avons décidé de faire une promenade dans le parc.', highlightWord: 'magnifique' },
  es: { text: 'El tiempo estaba absolutamente precioso, así que decidimos dar un paseo por el parque.', highlightWord: 'precioso' },
  zh: { text: '天气非常好，所以我们决定在公园里散步。', highlightWord: '散步' },
  ko: { text: '날씨가 정말 아름다워서 공원을 산책하기로 했습니다.', highlightWord: '아름다워서' },
  vi: { text: 'Thời tiết thật tuyệt vời nên chúng tôi quyết định đi dạo trong công viên.', highlightWord: 'tuyệt vời' },
  id: { text: 'Cuacanya sangat indah, jadi kami memutuskan untuk berjalan-jalan di taman.', highlightWord: 'indah' },
  ja: { text: '天気がとても素晴らしかったので、公園を散歩することにしました。', highlightWord: '素晴らしかった' },
};

// 母語ごとの翻訳文（同じ意味の文章）
const DEMO_TRANSLATIONS: Record<string, string> = {
  ja: '天気がとても素晴らしかったので、公園を散歩することにしました。',
  en: 'The weather was absolutely gorgeous, so we decided to take a stroll through the park.',
  pt: 'O tempo estava absolutamente lindo, então decidimos dar um passeio pelo parque.',
  fr: 'Le temps était absolument magnifique, alors nous avons décidé de faire une promenade dans le parc.',
  es: 'El tiempo estaba absolutamente precioso, así que decidimos dar un paseo por el parque.',
  zh: '天气非常好，所以我们决定在公园里散步。',
  ko: '날씨가 정말 아름다워서 공원을 산책하기로 했습니다.',
  vi: 'Thời tiết thật tuyệt vời nên chúng tôi quyết định đi dạo trong công viên.',
  id: 'Cuacanya sangat indah, jadi kami memutuskan untuk berjalan-jalan di taman.',
};

// 学習言語と母語からデモコンテンツを生成
export function getDemoContent(learningLangBaseCode: string, nativeLangBaseCode: string): TutorialDemoContent {
  const original = DEMO_ORIGINALS[learningLangBaseCode] || DEMO_ORIGINALS['en'];
  const translated = DEMO_TRANSLATIONS[nativeLangBaseCode] || DEMO_TRANSLATIONS['ja'];

  return {
    sourceLang: learningLangBaseCode,
    targetLang: nativeLangBaseCode,
    original: original.text,
    translated,
    highlightWord: original.highlightWord,
  };
}
