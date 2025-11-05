/**
 * 学習中言語管理コンテキスト
 *
 * 学習中の言語（複数）とデフォルト言語（単一）を分けて管理
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AVAILABLE_LANGUAGES, Language } from '@/types/language';
import { logger } from '@/utils/logger';

const LEARNING_LANGUAGES_KEY = '@lingooo_learning_languages';
const DEFAULT_LANGUAGE_KEY = '@lingooo_default_language';
const CURRENT_LANGUAGE_KEY = '@lingooo_current_language';

interface LearningLanguagesContextType {
  learningLanguages: Language[];
  defaultLanguage: Language;
  currentLanguage: Language;
  addLearningLanguage: (languageId: string) => Promise<void>;
  removeLearningLanguage: (languageId: string) => Promise<void>;
  setDefaultLanguage: (languageId: string) => Promise<void>;
  setCurrentLanguage: (languageId: string) => Promise<void>;
  isLearning: (languageId: string) => boolean;
}

const LearningLanguagesContext = createContext<LearningLanguagesContextType | undefined>(
  undefined
);

interface LearningLanguagesProviderProps {
  children: ReactNode;
}

export function LearningLanguagesProvider({ children }: LearningLanguagesProviderProps) {
  const [learningLanguages, setLearningLanguages] = useState<Language[]>([
    AVAILABLE_LANGUAGES[0], // デフォルトは英語
  ]);
  const [defaultLanguage, setDefaultLanguageState] = useState<Language>(
    AVAILABLE_LANGUAGES[0]
  );
  const [currentLanguage, setCurrentLanguageState] = useState<Language>(
    AVAILABLE_LANGUAGES[0]
  );

  // 初期化
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // 学習中言語を読み込み
      const savedLearningIds = await AsyncStorage.getItem(LEARNING_LANGUAGES_KEY);
      if (savedLearningIds) {
        const ids = JSON.parse(savedLearningIds) as string[];
        const languages = ids
          .map((id) => AVAILABLE_LANGUAGES.find((lang) => lang.id === id))
          .filter((lang): lang is Language => lang !== undefined);
        if (languages.length > 0) {
          setLearningLanguages(languages);
        }
      }

      // デフォルト言語を読み込み
      const savedDefaultId = await AsyncStorage.getItem(DEFAULT_LANGUAGE_KEY);
      if (savedDefaultId) {
        const language = AVAILABLE_LANGUAGES.find((lang) => lang.id === savedDefaultId);
        if (language) {
          setDefaultLanguageState(language);
        }
      }

      // 現在の言語を読み込み
      const savedCurrentId = await AsyncStorage.getItem(CURRENT_LANGUAGE_KEY);
      if (savedCurrentId) {
        const language = AVAILABLE_LANGUAGES.find((lang) => lang.id === savedCurrentId);
        if (language) {
          setCurrentLanguageState(language);
        }
      }
    } catch (error) {
      logger.error('Failed to load language settings:', error);
    }
  };

  const addLearningLanguage = async (languageId: string) => {
    const language = AVAILABLE_LANGUAGES.find((lang) => lang.id === languageId);
    if (!language) return;

    const newLearningLanguages = [...learningLanguages];
    if (!newLearningLanguages.find((lang) => lang.id === languageId)) {
      newLearningLanguages.push(language);
      setLearningLanguages(newLearningLanguages);

      try {
        const ids = newLearningLanguages.map((lang) => lang.id);
        await AsyncStorage.setItem(LEARNING_LANGUAGES_KEY, JSON.stringify(ids));
      } catch (error) {
        logger.error('Failed to save learning languages:', error);
      }
    }
  };

  const removeLearningLanguage = async (languageId: string) => {
    // 最後の1つは削除できない
    if (learningLanguages.length <= 1) return;

    const newLearningLanguages = learningLanguages.filter((lang) => lang.id !== languageId);
    setLearningLanguages(newLearningLanguages);

    // 削除した言語が現在の言語だった場合、最初の言語に切り替え
    if (currentLanguage.id === languageId) {
      setCurrentLanguageState(newLearningLanguages[0]);
      try {
        await AsyncStorage.setItem(CURRENT_LANGUAGE_KEY, newLearningLanguages[0].id);
      } catch (error) {
        logger.error('Failed to save current language:', error);
      }
    }

    try {
      const ids = newLearningLanguages.map((lang) => lang.id);
      await AsyncStorage.setItem(LEARNING_LANGUAGES_KEY, JSON.stringify(ids));
    } catch (error) {
      logger.error('Failed to save learning languages:', error);
    }
  };

  const setDefaultLanguage = async (languageId: string) => {
    const language = AVAILABLE_LANGUAGES.find((lang) => lang.id === languageId);
    if (!language) return;

    setDefaultLanguageState(language);

    try {
      await AsyncStorage.setItem(DEFAULT_LANGUAGE_KEY, languageId);
    } catch (error) {
      logger.error('Failed to save default language:', error);
    }
  };

  const setCurrentLanguage = async (languageId: string) => {
    const language = learningLanguages.find((lang) => lang.id === languageId);
    if (!language) return;

    setCurrentLanguageState(language);

    try {
      await AsyncStorage.setItem(CURRENT_LANGUAGE_KEY, languageId);
    } catch (error) {
      logger.error('Failed to save current language:', error);
    }
  };

  const isLearning = (languageId: string): boolean => {
    return learningLanguages.some((lang) => lang.id === languageId);
  };

  return (
    <LearningLanguagesContext.Provider
      value={{
        learningLanguages,
        defaultLanguage,
        currentLanguage,
        addLearningLanguage,
        removeLearningLanguage,
        setDefaultLanguage,
        setCurrentLanguage,
        isLearning,
      }}
    >
      {children}
    </LearningLanguagesContext.Provider>
  );
}

export function useLearningLanguages() {
  const context = useContext(LearningLanguagesContext);
  if (context === undefined) {
    throw new Error('useLearningLanguages must be used within a LearningLanguagesProvider');
  }
  return context;
}
