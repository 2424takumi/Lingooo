import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/utils/logger';

const TUTORIAL_STORAGE_KEY = '@lingooo_interactive_tutorial_completed';
const TRIAL_OFFERED_KEY = '@lingooo_trial_offered_on_onboarding';

export type TutorialStep = 1 | 2 | 3 | 'completed';

interface TutorialState {
  isActive: boolean;
  currentStep: TutorialStep;
  isCompleted: boolean;
  trialOffered: boolean;
}

interface UseTutorialStateReturn {
  tutorialState: TutorialState;
  startTutorial: () => void;
  nextStep: () => void;
  skipTutorial: () => Promise<void>;
  completeTutorial: () => Promise<void>;
  markTrialOffered: () => Promise<void>;
}

export function useTutorialState(): UseTutorialStateReturn {
  const [tutorialState, setTutorialState] = useState<TutorialState>({
    isActive: false,
    currentStep: 1,
    isCompleted: false,
    trialOffered: false,
  });
  const [isLoaded, setIsLoaded] = useState(false);

  // AsyncStorageから完了状態をロード
  useEffect(() => {
    async function loadTutorialState() {
      try {
        const [completed, trialOffered] = await Promise.all([
          AsyncStorage.getItem(TUTORIAL_STORAGE_KEY),
          AsyncStorage.getItem(TRIAL_OFFERED_KEY),
        ]);

        // isActiveは現在の状態を保持（startTutorial()で設定された値を上書きしない）
        setTutorialState((prev) => ({
          ...prev,
          isCompleted: completed === 'true',
          trialOffered: trialOffered === 'true',
          // isActiveとcurrentStepは保持
        }));

        logger.debug('[useTutorialState] Loaded tutorial state:', {
          isCompleted: completed === 'true',
          trialOffered: trialOffered === 'true',
        });
        setIsLoaded(true);
      } catch (error) {
        logger.error('[useTutorialState] Failed to load tutorial state:', error);
        setIsLoaded(true); // エラーでも読み込み完了とする
      }
    }

    loadTutorialState();
  }, []);

  const startTutorial = () => {
    logger.info('[useTutorialState] Starting tutorial');
    setTutorialState((prev) => {
      const newState = {
        ...prev, // 既存のisCompletedとtrialOfferedを保持
        isActive: true,
        currentStep: 1 as TutorialStep,
      };
      logger.info('[useTutorialState] New tutorial state:', newState);
      return newState;
    });
  };

  const nextStep = () => {
    setTutorialState((prev) => {
      const nextStep: TutorialStep =
        prev.currentStep === 1 ? 2 :
        prev.currentStep === 2 ? 3 :
        'completed';

      logger.debug('[useTutorialState] Moving to next step:', {
        from: prev.currentStep,
        to: nextStep,
      });

      return {
        ...prev,
        currentStep: nextStep,
        isActive: nextStep !== 'completed',
      };
    });
  };

  const skipTutorial = async () => {
    logger.info('[useTutorialState] Tutorial skipped');
    try {
      await AsyncStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
      setTutorialState({
        isActive: false,
        currentStep: 'completed',
        isCompleted: true,
        trialOffered: false,
      });
    } catch (error) {
      logger.error('[useTutorialState] Failed to save skip state:', error);
    }
  };

  const completeTutorial = async () => {
    logger.info('[useTutorialState] Tutorial completed');
    try {
      await AsyncStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
      setTutorialState((prev) => ({
        ...prev,
        isActive: false,
        currentStep: 'completed',
        isCompleted: true,
      }));
    } catch (error) {
      logger.error('[useTutorialState] Failed to save completion state:', error);
    }
  };

  const markTrialOffered = async () => {
    logger.info('[useTutorialState] Trial offered marked');
    try {
      await AsyncStorage.setItem(TRIAL_OFFERED_KEY, 'true');
      setTutorialState((prev) => ({
        ...prev,
        trialOffered: true,
      }));
    } catch (error) {
      logger.error('[useTutorialState] Failed to mark trial offered:', error);
    }
  };

  return {
    tutorialState,
    startTutorial,
    nextStep,
    skipTutorial,
    completeTutorial,
    markTrialOffered,
  };
}
