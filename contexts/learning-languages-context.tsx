/**
 * 学習中言語管理コンテキスト
 *
 * 学習中の言語（複数）とデフォルト言語（単一）を分けて管理
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AVAILABLE_LANGUAGES, Language } from '@/types/language';
import { logger } from '@/utils/logger';
import { useAuth } from './auth-context';
import { supabase } from '@/lib/supabase';
import i18n from '@/i18n';

// AsyncStorageキーは削除（Supabaseに移行）

interface LearningLanguagesContextType {
  learningLanguages: Language[];
  defaultLanguage: Language;
  currentLanguage: Language;
  nativeLanguage: Language;
  addLearningLanguage: (languageId: string) => Promise<void>;
  removeLearningLanguage: (languageId: string) => Promise<void>;
  setDefaultLanguage: (languageId: string) => Promise<void>;
  setCurrentLanguage: (languageId: string) => Promise<void>;
  setNativeLanguage: (languageId: string) => Promise<void>;
  isLearning: (languageId: string) => boolean;
}

const LearningLanguagesContext = createContext<LearningLanguagesContextType | undefined>(
  undefined
);

interface LearningLanguagesProviderProps {
  children: ReactNode;
}

export function LearningLanguagesProvider({ children }: LearningLanguagesProviderProps) {
  const { user, loading: authLoading } = useAuth();
  const [learningLanguages, setLearningLanguages] = useState<Language[]>([
    AVAILABLE_LANGUAGES[0], // デフォルトは英語
  ]);
  const [defaultLanguage, setDefaultLanguageState] = useState<Language>(
    AVAILABLE_LANGUAGES[0]
  );
  const [currentLanguage, setCurrentLanguageState] = useState<Language>(
    AVAILABLE_LANGUAGES[0]
  );
  const [nativeLanguage, setNativeLanguageState] = useState<Language>(
    AVAILABLE_LANGUAGES[1] // デフォルトは日本語
  );

  // 初期化（userが取得されたら実行）
  useEffect(() => {
    if (!authLoading && user) {
      loadSettings();
    }
  }, [user, authLoading]);

  const loadSettings = async () => {
    if (!user) return;

    try {
      // Supabaseからユーザー設定を読み込み
      const { data, error } = await supabase
        .from('users')
        .select('native_language, default_language, learning_languages')
        .eq('id', user.id)
        .single();

      if (error) {
        logger.error('Failed to load language settings:', error);
        return;
      }

      if (data) {
        // 母語を設定
        if (data.native_language) {
          const language = AVAILABLE_LANGUAGES.find((lang) => lang.id === data.native_language);
          if (language) {
            setNativeLanguageState(language);
            // UIの言語も設定
            await i18n.changeLanguage(language.code);
          }
        }

        // デフォルト言語を設定
        if (data.default_language) {
          const language = AVAILABLE_LANGUAGES.find((lang) => lang.id === data.default_language);
          if (language) {
            setDefaultLanguageState(language);
            setCurrentLanguageState(language); // 初期表示用
          }
        }

        // 学習中の言語を設定
        if (data.learning_languages && Array.isArray(data.learning_languages)) {
          const languages = data.learning_languages
            .map((id: string) => AVAILABLE_LANGUAGES.find((lang) => lang.id === id))
            .filter((lang): lang is Language => lang !== undefined);
          if (languages.length > 0) {
            setLearningLanguages(languages);
          }
        }
      }
    } catch (error) {
      logger.error('Failed to load language settings:', error);
    }
  };

  const addLearningLanguage = async (languageId: string) => {
    if (!user) return;

    const language = AVAILABLE_LANGUAGES.find((lang) => lang.id === languageId);
    if (!language) return;

    const newLearningLanguages = [...learningLanguages];
    if (!newLearningLanguages.find((lang) => lang.id === languageId)) {
      newLearningLanguages.push(language);
      setLearningLanguages(newLearningLanguages);

      try {
        const ids = newLearningLanguages.map((lang) => lang.id);
        const { error } = await supabase
          .from('users')
          .update({ learning_languages: ids })
          .eq('id', user.id);

        if (error) {
          logger.error('Failed to save learning languages:', error);
        }
      } catch (error) {
        logger.error('Failed to save learning languages:', error);
      }
    }
  };

  const removeLearningLanguage = async (languageId: string) => {
    if (!user) return;
    // 最後の1つは削除できない
    if (learningLanguages.length <= 1) return;

    const newLearningLanguages = learningLanguages.filter((lang) => lang.id !== languageId);
    setLearningLanguages(newLearningLanguages);

    // 削除した言語が現在の言語だった場合、最初の言語に切り替え
    if (currentLanguage.id === languageId) {
      setCurrentLanguageState(newLearningLanguages[0]);
    }

    try {
      const ids = newLearningLanguages.map((lang) => lang.id);
      const { error } = await supabase
        .from('users')
        .update({ learning_languages: ids })
        .eq('id', user.id);

      if (error) {
        logger.error('Failed to save learning languages:', error);
      }
    } catch (error) {
      logger.error('Failed to save learning languages:', error);
    }
  };

  const setDefaultLanguage = async (languageId: string) => {
    if (!user) return;

    const language = AVAILABLE_LANGUAGES.find((lang) => lang.id === languageId);
    if (!language) return;

    setDefaultLanguageState(language);

    try {
      const { error } = await supabase
        .from('users')
        .update({ default_language: languageId })
        .eq('id', user.id);

      if (error) {
        logger.error('Failed to save default language:', error);
      }
    } catch (error) {
      logger.error('Failed to save default language:', error);
    }
  };

  const setCurrentLanguage = async (languageId: string) => {
    const language = learningLanguages.find((lang) => lang.id === languageId);
    if (!language) return;

    // 現在の言語は一時的な選択なのでローカル状態のみ
    setCurrentLanguageState(language);
  };

  const setNativeLanguage = async (languageId: string) => {
    if (!user) return;

    const language = AVAILABLE_LANGUAGES.find((lang) => lang.id === languageId);
    if (!language) return;

    setNativeLanguageState(language);

    // UIの言語も変更
    await i18n.changeLanguage(language.code);

    try {
      const { error } = await supabase
        .from('users')
        .update({ native_language: languageId })
        .eq('id', user.id);

      if (error) {
        logger.error('Failed to save native language:', error);
      }
    } catch (error) {
      logger.error('Failed to save native language:', error);
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
        nativeLanguage,
        addLearningLanguage,
        removeLearningLanguage,
        setDefaultLanguage,
        setCurrentLanguage,
        setNativeLanguage,
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
