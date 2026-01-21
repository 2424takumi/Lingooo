import { createContext, useContext, ReactNode } from 'react';
import { useTutorialState } from '@/hooks/use-tutorial-state';
import type { TutorialStep } from '@/hooks/use-tutorial-state';

interface TutorialContextType {
  tutorialState: {
    isActive: boolean;
    currentStep: TutorialStep;
    isCompleted: boolean;
    trialOffered: boolean;
  };
  startTutorial: () => void;
  nextStep: () => void;
  skipTutorial: () => Promise<void>;
  completeTutorial: () => Promise<void>;
  markTrialOffered: () => Promise<void>;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

export function TutorialProvider({ children }: { children: ReactNode }) {
  const tutorialHook = useTutorialState();

  return (
    <TutorialContext.Provider value={tutorialHook}>
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (context === undefined) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
}
