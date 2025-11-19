import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';

interface QuestionCountData {
  monthly: number;
  limit: number;
  lastResetMonth: string;
}

interface PlanLimits {
  free: number;
  plus: number;
}

const PLAN_LIMITS: PlanLimits = {
  free: 100,
  plus: 1000,
};

export function useQuestionCount() {
  const { user, loading: authLoading } = useAuth();
  const [questionCount, setQuestionCount] = useState({
    monthly: 0,
    limit: 100, // デフォルトは無料プラン
  });
  const [plan, setPlan] = useState<'free' | 'plus'>('free');
  const [isLoading, setIsLoading] = useState(true);

  // 現在の月を YYYY-MM 形式で取得
  const getCurrentMonthString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  // Supabaseからデータを読み込む
  const loadQuestionCount = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('monthly_question_count, plan')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Failed to load question count:', error);
        setQuestionCount({
          monthly: 0,
          limit: 100,
        });
      } else if (data) {
        const userPlan = data.plan as 'free' | 'plus';
        setPlan(userPlan);
        setQuestionCount({
          monthly: data.monthly_question_count || 0,
          limit: PLAN_LIMITS[userPlan],
        });
      }
    } catch (error) {
      console.error('Failed to load question count:', error);
      setQuestionCount({
        monthly: 0,
        limit: 100,
      });
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // 質問回数をインクリメント（アトミック操作で競合を回避）
  const incrementQuestionCount = useCallback(async () => {
    if (!user) return false;

    try {
      // アトミックなインクリメントのためにRPC関数を使用
      // Supabaseには直接的なインクリメント構文がないため、
      // 一旦現在の値を取得してからアトミックに更新する
      const { data, error } = await supabase.rpc('increment_question_count', {
        user_id: user.id,
      });

      if (error) {
        // RPC関数が失敗した場合はエラーを返す
        // フォールバックは使用しない（競合状態を避けるため）
        // increment_question_count RPC関数がSupabaseに正しく設定されている必要があります
        console.error('Failed to increment question count (RPC function required):', error);
        console.error('Please ensure the increment_question_count RPC function is created in Supabase');
        return false;
      }

      // RPC成功時は返された新しいカウントを使用
      const newCount = data as number;
      setQuestionCount((prev) => ({
        ...prev,
        monthly: newCount,
      }));
      return true;
    } catch (error) {
      console.error('Failed to increment question count:', error);
      return false;
    }
  }, [user]);

  // 質問可能かチェック
  const canAskQuestion = useCallback(() => {
    return questionCount.monthly < questionCount.limit;
  }, [questionCount.monthly, questionCount.limit]);

  // 残り回数を取得
  const getRemainingQuestions = useCallback(() => {
    return Math.max(0, questionCount.limit - questionCount.monthly);
  }, [questionCount.monthly, questionCount.limit]);

  // リセット（デバッグ用）
  const resetQuestionCount = useCallback(async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({
          monthly_question_count: 0,
          usage_reset_month: getCurrentMonthString(),
        })
        .eq('id', user.id);

      if (error) {
        console.error('Failed to reset question count:', error);
      } else {
        setQuestionCount((prev) => ({
          ...prev,
          monthly: 0,
        }));
      }
    } catch (error) {
      console.error('Failed to reset question count:', error);
    }
  }, [user]);

  // 初期ロード（userが取得されたら実行）
  useEffect(() => {
    if (!authLoading && user) {
      loadQuestionCount();
    }
  }, [user, authLoading, loadQuestionCount]);

  return {
    questionCount,
    plan,
    isLoading,
    incrementQuestionCount,
    canAskQuestion,
    getRemainingQuestions,
    resetQuestionCount,
  };
}
