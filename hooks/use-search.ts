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
  resolveMixedLanguage,
} from '@/services/utils/language-detect';
import { searchJaToEn, getWordDetail } from '@/services/api/search';
import { useLearningLanguages } from '@/contexts/learning-languages-context';
import type { SearchError } from '@/types/search';

export function useSearch() {
  const router = useRouter();
  const { currentLanguage } = useLearningLanguages();
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
      const resolvedLang = resolveMixedLanguage(detectedLang);

      // 4. 検索分岐
      if (resolvedLang === 'ja') {
        // 日本語検索 → SearchPage（タブで選択された言語で翻訳）
        await searchAndNavigateToJp(normalizedQuery);
      } else {
        // 単語検索 → WordDetailPage（タブで選択された言語の単語として扱う）
        await searchAndNavigateToWord(normalizedQuery, currentLanguage.code);
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
