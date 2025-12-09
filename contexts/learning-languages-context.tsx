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
  const { user, loading: authLoading, needsInitialSetup } = useAuth();
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

  // 初期化（userが取得されたら、かつ初期設定が完了していたら実行）
  useEffect(() => {
    if (!authLoading && user && !needsInitialSetup) {
      // 初期設定完了直後の場合、少し待ってからロード（DBへの書き込み完了を待つ）
      const timer = setTimeout(() => {
        loadSettings();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [user, authLoading, needsInitialSetup]);

  const loadSettings = async () => {
    if (!user) return;

    try {
      logger.info('[LearningLanguages] Loading settings for user:', user.id);

      // Supabaseからユーザー設定を読み込み
      const { data, error } = await supabase
        .from('users')
        .select('native_language, default_language, learning_languages')
        .eq('id', user.id)
        .single();

      if (error) {
        // PGRST116: レコードが0件の場合は初期設定前なので静かに処理
        if (error.code !== 'PGRST116') {
          logger.error('Failed to load language settings:', error);
        } else {
          logger.warn('[LearningLanguages] No user record found (PGRST116)');
        }
        return;
      }

      if (data) {
        logger.info('[LearningLanguages] Loaded settings:', data);

        // 母語を設定（データベースには言語コードが保存されている）
        if (data.native_language) {
          const language = AVAILABLE_LANGUAGES.find((lang) => lang.code === data.native_language);
          if (language) {
            logger.info('[LearningLanguages] Setting native language:', language.name);
            setNativeLanguageState(language);
            // UIの言語も設定
            logger.info('[LearningLanguages] Changing i18n language to:', language.code);
            await i18n.changeLanguage(language.code);
            logger.info('[LearningLanguages] i18n language changed successfully to:', language.code);
          }
        }

        // デフォルト言語を設定（データベースには言語コードが保存されている）
        if (data.default_language) {
          const language = AVAILABLE_LANGUAGES.find((lang) => lang.code === data.default_language);
          if (language) {
            logger.info('[LearningLanguages] Setting default language:', language.name);
            setDefaultLanguageState(language);
            setCurrentLanguageState(language); // 初期表示用
          }
        }

        // 学習中の言語を設定（データベースには言語コードが保存されている）
        if (data.learning_languages && Array.isArray(data.learning_languages)) {
          const languages = data.learning_languages
            .map((code: string) => AVAILABLE_LANGUAGES.find((lang) => lang.code === code))
            .filter((lang): lang is Language => lang !== undefined);
          if (languages.length > 0) {
            logger.info('[LearningLanguages] Setting learning languages:', languages.map(l => l.name));
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

    // すでに学習中の言語の場合は何もしない
    if (learningLanguages.find((lang) => lang.id === languageId)) {
      return;
    }

    const newLearningLanguages = [...learningLanguages, language];
    setLearningLanguages(newLearningLanguages);

    try {
      // データベースには言語コードを保存
      const codes = newLearningLanguages.map((lang) => lang.code);
      const { error } = await supabase
        .from('users')
        .update({ learning_languages: codes })
        .eq('id', user.id);

      if (error) {
        logger.error('Failed to save learning languages:', error);
      }
    } catch (error) {
      logger.error('Failed to save learning languages:', error);
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
      // データベースには言語コードを保存
      const codes = newLearningLanguages.map((lang) => lang.code);
      const { error } = await supabase
        .from('users')
        .update({ learning_languages: codes })
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
      // データベースには言語コードを保存
      const { error } = await supabase
        .from('users')
        .update({ default_language: language.code })
        .eq('id', user.id);

      if (error) {
        logger.error('Failed to save default language:', error);
      }
    } catch (error) {
      logger.error('Failed to save default language:', error);
    }
  };

  const setCurrentLanguage = async (languageIdOrCode: string) => {
    // まず学習言語リストから検索（IDまたはコードで）
    let language = learningLanguages.find(
      (lang) => lang.id === languageIdOrCode || lang.code === languageIdOrCode
    );

    // 学習言語リストにない場合は、全言語から検索（翻訳時の一時表示用）
    if (!language) {
      language = AVAILABLE_LANGUAGES.find(
        (lang) => lang.id === languageIdOrCode || lang.code === languageIdOrCode
      );
    }

    if (!language) {
      logger.warn('[LearningLanguages] Language not found:', languageIdOrCode);
      return;
    }

    // 現在の言語は一時的な選択なのでローカル状態のみ
    logger.info('[LearningLanguages] Setting current language:', languageIdOrCode, '->', language.name);
    setCurrentLanguageState(language);
  };

  const setNativeLanguage = async (languageId: string) => {
    if (!user) return;

    const language = AVAILABLE_LANGUAGES.find((lang) => lang.id === languageId);
    if (!language) return;

    logger.info('[LearningLanguages] setNativeLanguage called with:', languageId, '->', language.name);
    setNativeLanguageState(language);

    // UIの言語も変更
    logger.info('[LearningLanguages] Changing i18n language to:', language.code);
    await i18n.changeLanguage(language.code);
    logger.info('[LearningLanguages] i18n language changed successfully to:', language.code);

    try {
      // データベースには言語コードを保存
      const { error } = await supabase
        .from('users')
        .update({ native_language: language.code })
        .eq('id', user.id);

      if (error) {
        logger.error('Failed to save native language:', error);
      } else {
        logger.info('[LearningLanguages] Native language saved to Supabase:', language.code);
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
