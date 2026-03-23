import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { TutorialStep, TutorialEvent, TUTORIAL_STEPS } from '@/constants/tutorial';
import {
  isTutorialCompleted,
  setTutorialCompleted,
  resetTutorial,
  saveTutorialStep,
  getSavedTutorialStep,
} from '@/services/storage/tutorial-storage';
import { logger } from '@/utils/logger';

interface TargetRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TutorialContextType {
  isActive: boolean;
  currentStep: TutorialStep;
  targetRect: TargetRect | null;
  setTargetRect: (rect: TargetRect | null) => void;
  reportEvent: (event: TutorialEvent) => void;
  startTutorial: () => void;
  skipTutorial: () => void;
  dismissTutorial: () => void;
  resetAndRestart: () => Promise<void>;
  shouldStartTutorial: boolean;
  setShouldStartTutorial: (value: boolean) => void;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

interface TutorialProviderProps {
  children: ReactNode;
}

export function TutorialProvider({ children }: TutorialProviderProps) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState<TutorialStep>(TUTORIAL_STEPS.SELECT_WORD);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [shouldStartTutorial, setShouldStartTutorial] = useState(false);

  // 起動時に中断状態を復帰
  useEffect(() => {
    (async () => {
      const completed = await isTutorialCompleted();
      if (!completed) {
        const savedStep = await getSavedTutorialStep();
        if (savedStep > 0 && savedStep < TUTORIAL_STEPS.COMPLETE) {
          setCurrentStep(savedStep as TutorialStep);
        }
      }
    })();
  }, []);

  const startTutorial = useCallback(() => {
    logger.info('[Tutorial] Starting tutorial');
    setCurrentStep(TUTORIAL_STEPS.SELECT_WORD);
    setTargetRect(null);
    setIsActive(true);
    setShouldStartTutorial(false);
  }, []);

  const completeTutorial = useCallback(async () => {
    logger.info('[Tutorial] Tutorial completed');
    setCurrentStep(TUTORIAL_STEPS.COMPLETE);
    await setTutorialCompleted();
    // ボタンタップでdismissTutorialを呼ぶまで表示し続ける
  }, []);

  const dismissTutorial = useCallback(() => {
    logger.info('[Tutorial] Tutorial dismissed');
    setIsActive(false);
    setTargetRect(null);
  }, []);

  const skipTutorial = useCallback(async () => {
    logger.info('[Tutorial] Tutorial skipped');
    setIsActive(false);
    setTargetRect(null);
    await setTutorialCompleted();
  }, []);

  const reportEvent = useCallback((event: TutorialEvent) => {
    if (!isActive) return;

    logger.info('[Tutorial] Event reported:', event, 'at step:', currentStep);

    switch (event) {
      case 'TEXT_SELECTED':
        if (currentStep === TUTORIAL_STEPS.SELECT_WORD) {
          setCurrentStep(TUTORIAL_STEPS.VIEW_CARD);
          saveTutorialStep(TUTORIAL_STEPS.VIEW_CARD);
        }
        break;
      case 'CARD_ACTION_TAPPED':
        if (currentStep === TUTORIAL_STEPS.VIEW_CARD) {
          setCurrentStep(TUTORIAL_STEPS.ASK_QUESTION);
          saveTutorialStep(TUTORIAL_STEPS.ASK_QUESTION);
        }
        break;
      case 'QUESTION_TAG_TAPPED':
        if (currentStep === TUTORIAL_STEPS.ASK_QUESTION) {
          // オーバーレイを先に消してAI応答を見せる
          setTargetRect(null);
          // 数秒後に完了モーダルを表示
          setTimeout(() => {
            completeTutorial();
          }, 3500);
        }
        break;
      case 'NAVIGATED_AWAY':
        // 辞書に遷移した場合は即完了
        completeTutorial();
        break;
    }
  }, [isActive, currentStep, completeTutorial]);

  const resetAndRestart = useCallback(async () => {
    await resetTutorial();
    setCurrentStep(TUTORIAL_STEPS.SELECT_WORD);
    setTargetRect(null);
    setShouldStartTutorial(true);
    logger.info('[Tutorial] Tutorial reset, ready to restart');
  }, []);

  return (
    <TutorialContext.Provider
      value={{
        isActive,
        currentStep,
        targetRect,
        setTargetRect,
        reportEvent,
        startTutorial,
        skipTutorial,
        dismissTutorial,
        resetAndRestart,
        shouldStartTutorial,
        setShouldStartTutorial,
      }}
    >
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorialContext() {
  const context = useContext(TutorialContext);
  if (context === undefined) {
    throw new Error('useTutorialContext must be used within TutorialProvider');
  }
  return context;
}
