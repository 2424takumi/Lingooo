import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { getUsageStats, UsageStats } from '@/services/api/usage';

interface QuestionCountData {
  monthly: number;
  limit: number;
}

/**
 * 質問回数を管理するフック
 *
 * バックエンドのRedisを単一のソースとして使用します。
 * フロントエンドはバックエンドAPIから読み取り専用で使用量を取得します。
 * 質問回数のインクリメントはバックエンドの/api/chatエンドポイントが自動的に行います。
 */
export function useQuestionCount() {
  const { user, loading: authLoading, needsInitialSetup } = useAuth();
  const [questionCount, setQuestionCount] = useState<QuestionCountData>({
    monthly: 0,
    limit: 100, // デフォルトは無料プラン
  });
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const lastFetchRef = useRef<number>(0);

  // バックエンドAPIから使用量を取得
  const loadQuestionCount = useCallback(async () => {
    if (!user || needsInitialSetup) {
      setIsLoading(false);
      return;
    }

    // 短時間での重複リクエストを防止（3秒以内）
    const now = Date.now();
    if (now - lastFetchRef.current < 3000) {
      return;
    }
    lastFetchRef.current = now;

    try {
      const stats = await getUsageStats();

      if (stats) {
        setQuestionCount({
          monthly: stats.questionCount.used,
          limit: stats.questionCount.limit,
        });
        setIsPremium(stats.isPremium);
      } else {
        // APIが失敗した場合はデフォルト値を使用
        console.warn('[useQuestionCount] Failed to load from API, using default values');
        setQuestionCount({
          monthly: 0,
          limit: 100,
        });
      }
    } catch (error) {
      console.error('[useQuestionCount] Error loading question count:', error);
      setQuestionCount({
        monthly: 0,
        limit: 100,
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, needsInitialSetup]);

  // 使用量を再取得（チャット後に呼び出す用）
  const refreshQuestionCount = useCallback(async () => {
    // 強制的に再取得
    lastFetchRef.current = 0;
    await loadQuestionCount();
  }, [loadQuestionCount]);

  // 質問可能かチェック
  const canAskQuestion = useCallback(() => {
    return questionCount.monthly < questionCount.limit;
  }, [questionCount.monthly, questionCount.limit]);

  // 残り回数を取得
  const getRemainingQuestions = useCallback(() => {
    return Math.max(0, questionCount.limit - questionCount.monthly);
  }, [questionCount.monthly, questionCount.limit]);

  // 初期ロード（userが取得されたら、かつ初期設定が完了していたら実行）
  useEffect(() => {
    if (!authLoading && user && !needsInitialSetup) {
      loadQuestionCount();
    }
  }, [user, authLoading, needsInitialSetup, loadQuestionCount]);

  return {
    questionCount,
    isPremium,
    isLoading,
    canAskQuestion,
    getRemainingQuestions,
    refreshQuestionCount,
  };
}
