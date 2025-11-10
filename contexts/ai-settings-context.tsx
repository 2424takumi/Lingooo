/**
 * AI設定管理コンテキスト
 *
 * AI返答の詳細度などの設定を管理
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { AIDetailLevel, CustomQuestion } from '@/types/settings';
import {
  getAIDetailLevel,
  setAIDetailLevel as saveAIDetailLevel,
  getCustomQuestions,
  addCustomQuestion as saveCustomQuestion,
  removeCustomQuestion as deleteCustomQuestion,
} from '@/services/storage/settings-storage';
import { logger } from '@/utils/logger';

interface AISettingsContextType {
  // AI返答設定
  aiDetailLevel: AIDetailLevel;
  setAIDetailLevel: (level: AIDetailLevel) => Promise<void>;

  // カスタム質問
  customQuestions: CustomQuestion[];
  addCustomQuestion: (title: string, question: string) => Promise<void>;
  removeCustomQuestion: (title: string) => Promise<void>;

  // 読み込み状態
  isLoading: boolean;
}

const AISettingsContext = createContext<AISettingsContextType | undefined>(undefined);

interface AISettingsProviderProps {
  children: ReactNode;
}

export function AISettingsProvider({ children }: AISettingsProviderProps) {
  const [aiDetailLevel, setAIDetailLevelState] = useState<AIDetailLevel>('concise');
  const [customQuestions, setCustomQuestionsState] = useState<CustomQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 初期化：設定を読み込む
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);

      // 各設定を並列で読み込み
      const [detailLevel, questions] = await Promise.all([
        getAIDetailLevel(),
        getCustomQuestions(),
      ]);

      setAIDetailLevelState(detailLevel);
      setCustomQuestionsState(questions);

      logger.info('[AISettings] Settings loaded:', {
        aiDetailLevel: detailLevel,
        customQuestionsCount: questions.length,
      });
    } catch (error) {
      logger.error('[AISettings] Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setAIDetailLevel = async (level: AIDetailLevel) => {
    try {
      await saveAIDetailLevel(level);
      setAIDetailLevelState(level);
      logger.info('[AISettings] AI detail level updated:', level);
    } catch (error) {
      logger.error('[AISettings] Failed to update AI detail level:', error);
      throw error;
    }
  };

  const addCustomQuestion = async (title: string, question: string) => {
    try {
      await saveCustomQuestion(title, question);
      const updatedQuestions = await getCustomQuestions();
      setCustomQuestionsState(updatedQuestions);
      logger.info('[AISettings] Custom question added:', { title, question });
    } catch (error) {
      logger.error('[AISettings] Failed to add custom question:', error);
      throw error;
    }
  };

  const removeCustomQuestion = async (title: string) => {
    try {
      await deleteCustomQuestion(title);
      const updatedQuestions = await getCustomQuestions();
      setCustomQuestionsState(updatedQuestions);
      logger.info('[AISettings] Custom question removed:', title);
    } catch (error) {
      logger.error('[AISettings] Failed to remove custom question:', error);
      throw error;
    }
  };

  return (
    <AISettingsContext.Provider
      value={{
        aiDetailLevel,
        setAIDetailLevel,
        customQuestions,
        addCustomQuestion,
        removeCustomQuestion,
        isLoading,
      }}
    >
      {children}
    </AISettingsContext.Provider>
  );
}

/**
 * AI設定コンテキストを使用するフック
 */
export function useAISettings() {
  const context = useContext(AISettingsContext);

  if (context === undefined) {
    throw new Error('useAISettings must be used within AISettingsProvider');
  }

  return context;
}
