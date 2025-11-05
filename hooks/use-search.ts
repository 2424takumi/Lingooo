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
import type { SearchError } from '@/types/search';

export function useSearch() {
  const router = useRouter();
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
        // 日本語検索 → JpSearchPage
        await searchAndNavigateToJp(normalizedQuery);
      } else {
        // 英語検索 → WordDetailPage
        await searchAndNavigateToEn(normalizedQuery);
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
   * 日本語検索して候補ページに遷移
   */
  const searchAndNavigateToJp = async (query: string) => {
    const result = await searchJaToEn(query);

    if (result.items.length === 0) {
      const errorMsg = `「${query}」に該当する単語が見つかりませんでした`;
      setError(errorMsg);
      throw new Error(errorMsg);
    }

    // JpSearchPageに遷移
    router.push({
      pathname: '/(tabs)/search',
      params: {
        query,
        results: JSON.stringify(result.items),
      },
    });
  };

  /**
   * 英語検索して詳細ページに遷移（即座に遷移、ページ上でストリーミング生成）
   */
  const searchAndNavigateToEn = async (word: string) => {
    // データ取得を待たずに即座にページ遷移
    // ページ上でストリーミング生成が開始される
    router.push({
      pathname: '/(tabs)/word-detail',
      params: {
        word,
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
