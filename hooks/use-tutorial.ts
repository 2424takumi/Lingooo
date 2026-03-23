import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { View } from 'react-native';
import { useTutorialContext } from '@/contexts/tutorial-context';
import { useLearningLanguages } from '@/contexts/learning-languages-context';
import { getDemoContent, TUTORIAL_STEPS, TutorialDemoContent } from '@/constants/tutorial';
import { generateId } from '@/utils/id';
import { logger } from '@/utils/logger';

interface TranslatedParagraph {
  id: string;
  originalText: string;
  translatedText: string;
  index: number;
  isTranslating?: boolean;
}

interface UseTutorialResult {
  isTutorialActive: boolean;
  currentStep: number;
  demoContent: TutorialDemoContent | null;
  demoParagraphs: TranslatedParagraph[] | null;
  demoTranslationData: { originalText: string; translatedText: string; sourceLang: string; targetLang: string } | null;
  reportTextSelected: () => void;
  reportCardActionTapped: () => void;
  reportQuestionTagTapped: () => void;
  reportNavigatedAway: () => void;
  translatedTextRef: React.RefObject<View | null>;
  chatSectionRef: React.RefObject<View | null>;
  questionTagsRef: React.RefObject<View | null>;
  measureTarget: () => void;
  highlightWordPosition: { x: number; y: number } | null;
}

export function useTutorial(): UseTutorialResult {
  const {
    isActive,
    currentStep,
    targetRect,
    setTargetRect,
    reportEvent,
    startTutorial,
    shouldStartTutorial,
  } = useTutorialContext();
  const { nativeLanguage } = useLearningLanguages();

  const translatedTextRef = useRef<View | null>(null);
  const chatSectionRef = useRef<View | null>(null);
  const questionTagsRef = useRef<View | null>(null);
  const [highlightWordPosition, setHighlightWordPosition] = useState<{ x: number; y: number } | null>(null);

  // デモコンテンツを取得（useMemoで安定化し、毎レンダーの再生成を防ぐ）
  const needsDemo = isActive || shouldStartTutorial;
  const langCode = nativeLanguage?.code || 'ja';

  const demoContent = useMemo(
    () => needsDemo ? getDemoContent(langCode) : null,
    [needsDemo, langCode],
  );

  const demoParagraphs = useMemo(
    () => demoContent
      ? [{ id: generateId(), originalText: demoContent.original, translatedText: demoContent.translated, index: 0 }]
      : null,
    [demoContent],
  );

  const demoTranslationData = useMemo(
    () => demoContent
      ? { originalText: demoContent.original, translatedText: demoContent.translated, sourceLang: demoContent.sourceLang, targetLang: demoContent.targetLang }
      : null,
    [demoContent],
  );

  // shouldStartTutorialフラグが立ったらチュートリアルを開始
  useEffect(() => {
    if (shouldStartTutorial) {
      logger.info('[useTutorial] shouldStartTutorial detected, starting tutorial');
      startTutorial();
    }
  }, [shouldStartTutorial, startTutorial]);

  // ステップに応じてターゲットを計測
  const measureTarget = useCallback(() => {
    if (!isActive) return;

    const refForStep = currentStep === TUTORIAL_STEPS.SELECT_WORD
      ? translatedTextRef
      : currentStep === TUTORIAL_STEPS.VIEW_CARD
        ? chatSectionRef
        : currentStep === TUTORIAL_STEPS.ASK_QUESTION
          ? questionTagsRef
          : null;

    if (refForStep?.current) {
      refForStep.current.measureInWindow((x, y, width, height) => {
        if (width > 0 && height > 0) {
          setTargetRect({ x, y, width, height });

          // Step 0の場合、ハイライト単語の位置を計算（テキストエリアの中央付近）
          if (currentStep === TUTORIAL_STEPS.SELECT_WORD) {
            setHighlightWordPosition({
              x: x + width * 0.6,
              y: y + height * 0.5,
            });
          }
        }
      });
    }
  }, [isActive, currentStep, setTargetRect]);

  // ステップ変更時に計測を実行
  useEffect(() => {
    if (!isActive) return;
    // 少し遅延してレイアウト完了後に計測
    const timer = setTimeout(measureTarget, 300);
    return () => clearTimeout(timer);
  }, [isActive, currentStep, measureTarget]);

  const reportTextSelected = useCallback(() => {
    if (isActive) reportEvent('TEXT_SELECTED');
  }, [isActive, reportEvent]);

  const reportCardActionTapped = useCallback(() => {
    if (isActive) reportEvent('CARD_ACTION_TAPPED');
  }, [isActive, reportEvent]);

  const reportQuestionTagTapped = useCallback(() => {
    if (isActive) reportEvent('QUESTION_TAG_TAPPED');
  }, [isActive, reportEvent]);

  const reportNavigatedAway = useCallback(() => {
    if (isActive) reportEvent('NAVIGATED_AWAY');
  }, [isActive, reportEvent]);

  return {
    isTutorialActive: isActive,
    currentStep,
    demoContent,
    demoParagraphs,
    demoTranslationData,
    reportTextSelected,
    reportCardActionTapped,
    reportQuestionTagTapped,
    reportNavigatedAway,
    translatedTextRef,
    chatSectionRef,
    questionTagsRef,
    measureTarget,
    highlightWordPosition,
  };
}
