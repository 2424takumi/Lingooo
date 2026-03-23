/**
 * 学習中言語管理コンテキスト
 *
 * 学習中の言語（複数）とデフォルト言語（単一）を分けて管理
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AVAILABLE_LANGUAGES, Language, LEGACY_CODE_MIGRATION, findLanguageByCode } from '@/types/language';
import { logger } from '@/utils/logger';
import { useAuth } from './auth-context';
import { supabase } from '@/lib/supabase';
import i18n from '@/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';

const VARIANT_MIGRATION_KEY = '@lingooo_variant_migration_done';

interface LearningLanguagesContextType {
  learningLanguages: Language[];
  defaultLanguage: Language;
  currentLanguage: Language;
  nativeLanguage: Language;
  needsVariantMigration: boolean;
  addLearningLanguage: (languageId: string) => Promise<void>;
  removeLearningLanguage: (languageId: string) => Promise<void>;
  setDefaultLanguage: (languageId: string) => Promise<void>;
  setCurrentLanguage: (languageIdOrCode: string) => Promise<void>;
  setNativeLanguage: (languageId: string) => Promise<void>;
  isLearning: (languageId: string) => boolean;
  completeVariantMigration: (selections: Record<string, string>) => Promise<void>;
}

const LearningLanguagesContext = createContext<LearningLanguagesContextType | undefined>(
  undefined
);

interface LearningLanguagesProviderProps {
  children: ReactNode;
}

/**
 * レガシー言語コードを新コードに変換
 * 'pt' → 'pt-BR', 'en' → 'en-US'
 */
function migrateLanguageCode(code: string): string {
  return LEGACY_CODE_MIGRATION[code] || code;
}

/**
 * 言語コードからLanguageオブジェクトを解決
 * レガシーコード('pt', 'en')にも対応
 */
function resolveLanguage(code: string): Language | undefined {
  return findLanguageByCode(code);
}

export function LearningLanguagesProvider({ children }: LearningLanguagesProviderProps) {
  const { user, loading: authLoading, needsInitialSetup } = useAuth();
  const [learningLanguages, setLearningLanguages] = useState<Language[]>([
    AVAILABLE_LANGUAGES[1], // デフォルトはenglish-us
  ]);
  const [defaultLanguage, setDefaultLanguageState] = useState<Language>(
    AVAILABLE_LANGUAGES[1]
  );
  const [currentLanguage, setCurrentLanguageState] = useState<Language>(
    AVAILABLE_LANGUAGES[1]
  );
  // 日本語に固定（Japanese-only optimization for initial release）
  const JAPANESE_LANGUAGE = AVAILABLE_LANGUAGES.find(lang => lang.code === 'ja')!;
  const [nativeLanguage] = useState<Language>(JAPANESE_LANGUAGE);
  const [needsVariantMigration, setNeedsVariantMigration] = useState(false);

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

        // 母語は日本語に固定（Japanese-only optimization）
        // UIの言語も日本語に固定
        logger.info('[LearningLanguages] Setting i18n language to: ja (Japanese-only mode)');
        await i18n.changeLanguage('ja');

        // デフォルト言語を設定（レガシーコード対応）
        if (data.default_language) {
          const language = resolveLanguage(data.default_language);
          if (language) {
            logger.info('[LearningLanguages] Setting default language:', language.name);
            setDefaultLanguageState(language);
            setCurrentLanguageState(language);
          }
        }

        // 学習中の言語を設定（レガシーコード対応）
        if (data.learning_languages && Array.isArray(data.learning_languages)) {
          const languages = data.learning_languages
            .map((code: string) => resolveLanguage(code))
            .filter((lang): lang is Language => lang !== undefined);
          if (languages.length > 0) {
            logger.info('[LearningLanguages] Setting learning languages:', languages.map(l => l.name));
            setLearningLanguages(languages);
          }

          // バリアント移行チェック: レガシーコードが含まれていて、まだ移行していない場合
          const hasLegacyCodes = data.learning_languages.some(
            (code: string) => code in LEGACY_CODE_MIGRATION
          );
          if (hasLegacyCodes) {
            const migrationDone = await AsyncStorage.getItem(VARIANT_MIGRATION_KEY);
            if (!migrationDone) {
              logger.info('[LearningLanguages] Legacy codes detected, needs variant migration');
              setNeedsVariantMigration(true);
            }
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

    let updatedLanguages: Language[] = [];

    setLearningLanguages(prev => {
      if (prev.find(lang => lang.id === languageId)) {
        updatedLanguages = prev;
        return prev; // すでに学習中
      }
      updatedLanguages = [...prev, language];
      return updatedLanguages;
    });

    // updatedLanguages が変わっていない場合はDB更新不要
    if (updatedLanguages.length === 0) return;

    try {
      const codes = updatedLanguages.map(lang => lang.code);
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

    let updatedLanguages: Language[] = [];

    setLearningLanguages(prev => {
      if (prev.length <= 1) {
        updatedLanguages = prev;
        return prev; // 最低1つは残す
      }
      updatedLanguages = prev.filter(lang => lang.id !== languageId);
      return updatedLanguages;
    });

    // 削除した言語が現在の言語だった場合、最初の言語に切り替え
    if (currentLanguage.id === languageId && updatedLanguages.length > 0) {
      setCurrentLanguageState(updatedLanguages[0]);
    }

    try {
      const codes = updatedLanguages.map(lang => lang.code);
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
      // データベースには言語コード（BCP 47）を保存
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
      language = findLanguageByCode(languageIdOrCode) ||
        AVAILABLE_LANGUAGES.find((lang) => lang.id === languageIdOrCode);
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
    // 日本語に固定（Japanese-only optimization）
    // この関数は互換性のために残すが、何もしない
    logger.info('[LearningLanguages] setNativeLanguage called but disabled (Japanese-only mode)');
    return;
  };

  const isLearning = (languageId: string): boolean => {
    return learningLanguages.some((lang) => lang.id === languageId);
  };

  /**
   * バリアント移行完了処理
   * @param selections - { 'english': 'english-us', 'portuguese': 'portuguese-br' } の形式
   */
  const completeVariantMigration = async (selections: Record<string, string>) => {
    if (!user) return;

    try {
      logger.info('[LearningLanguages] Completing variant migration with selections:', selections);

      // 現在の学習言語リストを更新
      const updatedLanguages = learningLanguages.map(lang => {
        if (lang.groupId && selections[lang.groupId]) {
          const selectedId = selections[lang.groupId];
          const selectedLang = AVAILABLE_LANGUAGES.find(l => l.id === selectedId);
          return selectedLang || lang;
        }
        return lang;
      });

      setLearningLanguages(updatedLanguages);

      // デフォルト言語も更新
      if (defaultLanguage.groupId && selections[defaultLanguage.groupId]) {
        const selectedId = selections[defaultLanguage.groupId];
        const selectedLang = AVAILABLE_LANGUAGES.find(l => l.id === selectedId);
        if (selectedLang) {
          setDefaultLanguageState(selectedLang);
          setCurrentLanguageState(selectedLang);
        }
      }

      // Supabaseに保存
      const codes = updatedLanguages.map(lang => lang.code);
      const defaultCode = updatedLanguages.find(l => {
        if (defaultLanguage.groupId && selections[defaultLanguage.groupId]) {
          return l.id === selections[defaultLanguage.groupId];
        }
        return l.id === defaultLanguage.id;
      })?.code || updatedLanguages[0].code;

      const { error } = await supabase
        .from('users')
        .update({
          learning_languages: codes,
          default_language: defaultCode,
        })
        .eq('id', user.id);

      if (error) {
        logger.error('Failed to save variant migration:', error);
        return;
      }

      // 移行完了フラグを保存
      await AsyncStorage.setItem(VARIANT_MIGRATION_KEY, 'true');
      setNeedsVariantMigration(false);

      logger.info('[LearningLanguages] Variant migration completed successfully');
    } catch (error) {
      logger.error('Failed to complete variant migration:', error);
    }
  };

  return (
    <LearningLanguagesContext.Provider
      value={{
        learningLanguages,
        defaultLanguage,
        currentLanguage,
        nativeLanguage,
        needsVariantMigration,
        addLearningLanguage,
        removeLearningLanguage,
        setDefaultLanguage,
        setCurrentLanguage,
        setNativeLanguage,
        isLearning,
        completeVariantMigration,
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
