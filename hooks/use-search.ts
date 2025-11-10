/**
 * 検索フック
 *
 * 検索ロジックとページ遷移を管理
 */

import { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  detectLang,
  normalizeQuery,
  validateSearchInput,
  resolveLanguageCode,
} from '@/services/utils/language-detect';
import { searchJaToEn, getWordDetail } from '@/services/api/search';
import { useLearningLanguages } from '@/contexts/learning-languages-context';
import { addSearchHistory } from '@/services/storage/search-history-storage';
import type { SearchError } from '@/types/search';
import { logger } from '@/utils/logger';

export function useSearch() {
  const router = useRouter();
  const { currentLanguage, nativeLanguage } = useLearningLanguages();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 検索を実行してページ遷移
   *
   * @param query - 検索クエリ
   * @returns 検索が成功したかどうか
   */
  const handleSearch = async (query: string): Promise<boolean> => {
    // 1. 入力検証
    const validation = validateSearchInput(query);
    if (!validation.valid) {
      setError(validation.error || '入力エラー');
      return false;
    }

    setError(null);
    setIsLoading(true);

    try {
      // 2. 正規化
      const normalizedQuery = normalizeQuery(query);

      // 3. 言語判定
      const detectedLang = detectLang(normalizedQuery);

      // 4. 言語コードに変換
      // - 漢字のみ: 中国語タブなら中国語、それ以外は母語
      // - アルファベット: タブで選択中の言語
      const targetLang = resolveLanguageCode(detectedLang, currentLanguage.code, nativeLanguage.code);

      // 5. 検索分岐
      if (targetLang === nativeLanguage.code) {
        // 母語（日本語）が検出された場合
        if (currentLanguage.code === nativeLanguage.code) {
          // 選択中の言語も母語（日本語） → 日本語辞書として検索
          await searchAndNavigateToWord(normalizedQuery, targetLang);
        } else {
          // 選択中の言語が他言語 → 訳語候補を表示
          await searchAndNavigateToJp(normalizedQuery);
        }
      } else {
        // 非母語検索 → WordDetailPage（検出された言語の辞書検索）
        await searchAndNavigateToWord(normalizedQuery, targetLang);
      }

      // 6. 検索履歴に保存
      try {
        // 日本語→他言語の翻訳検索の場合は、学習言語で保存
        const historyLanguage = (targetLang === nativeLanguage.code && currentLanguage.code !== nativeLanguage.code)
          ? currentLanguage.code
          : targetLang;
        await addSearchHistory(normalizedQuery, historyLanguage);
      } catch (historyError) {
        // 履歴保存に失敗しても検索は成功とみなす
        logger.error('Failed to save search history:', historyError);
      }

      return true;
    } catch (err) {
      const searchError = err as SearchError;
      setError(searchError.message || '検索中にエラーが発生しました');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 日本語検索して候補ページに遷移（即座に遷移、ページ上でストリーミング表示）
   */
  const searchAndNavigateToJp = async (query: string) => {
    // データ取得を待たずに即座にページ遷移
    // ページ上でAPI呼び出しとストリーミング表示が開始される
    router.push({
      pathname: '/(tabs)/search',
      params: {
        query,
        // resultsパラメータなし = ページ上でAPI呼び出し
      },
    });
  };

  /**
   * 単語検索して詳細ページに遷移（即座に遷移、ページ上でストリーミング生成）
   *
   * @param word - 検索する単語
   * @param targetLanguage - ターゲット言語コード（タブで選択された言語）
   */
  const searchAndNavigateToWord = async (word: string, targetLanguage: string) => {
    // データ取得を待たずに即座にページ遷移
    // ページ上でストリーミング生成が開始される
    router.push({
      pathname: '/(tabs)/word-detail',
      params: {
        word,
        targetLanguage, // タブで選択された言語を渡す
        // dataパラメータなし = ページ上でAPI呼び出し
      },
    });
  };

  /**
   * エラーをクリア
   */
  const clearError = () => {
    setError(null);
  };

  return {
    handleSearch,
    isLoading,
    error,
    clearError,
  };
}
