/**
 * 検索履歴ストレージ（Supabase版）
 *
 * 検索履歴の保存・取得・管理を行う
 */

import type { SearchHistoryItem } from '@/types/search';
import { logger } from '@/utils/logger';
import { supabase } from '@/lib/supabase';

const MAX_HISTORY_ITEMS = 50; // 最大表示件数

/**
 * 検索履歴を全件取得
 */
export async function getSearchHistory(): Promise<SearchHistoryItem[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      logger.warn('[SearchHistoryStorage] No authenticated user');
      return [];
    }

    const { data, error } = await supabase
      .from('search_history')
      .select('id, query, target_language, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(MAX_HISTORY_ITEMS);

    if (error) {
      logger.error('[SearchHistoryStorage] Failed to load search history:', error);
      return [];
    }

    // SearchHistoryItem形式に変換
    return (data || []).map((item) => ({
      id: item.id,
      query: item.query,
      language: item.target_language,
      timestamp: new Date(item.created_at).getTime(),
    }));
  } catch (error) {
    logger.error('[SearchHistoryStorage] Failed to load search history:', error);
    return [];
  }
}

/**
 * 特定の言語の検索履歴を取得
 */
export async function getSearchHistoryByLanguage(language: string): Promise<SearchHistoryItem[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      logger.warn('[SearchHistoryStorage] No authenticated user');
      return [];
    }

    const { data, error } = await supabase
      .from('search_history')
      .select('id, query, target_language, created_at')
      .eq('user_id', user.id)
      .eq('target_language', language)
      .order('created_at', { ascending: false })
      .limit(MAX_HISTORY_ITEMS);

    if (error) {
      logger.error('[SearchHistoryStorage] Failed to load search history:', error);
      return [];
    }

    return (data || []).map((item) => ({
      id: item.id,
      query: item.query,
      language: item.target_language,
      timestamp: new Date(item.created_at).getTime(),
    }));
  } catch (error) {
    logger.error('[SearchHistoryStorage] Failed to load search history by language:', error);
    return [];
  }
}

/**
 * 検索履歴を追加
 * - AI応答とトークン数も一緒に保存
 * - トークン数が提供された場合、ユーザーの monthly_token_usage も更新
 */
export async function addSearchHistory(
  query: string,
  language: string,
  aiResponse?: any,
  tokensUsed?: number
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      logger.warn('[SearchHistoryStorage] No authenticated user');
      return;
    }

    // search_typeを推定（簡易版）
    const searchType = query.length > 50 ? 'translation' : query.includes(' ') ? 'phrase' : 'word';

    // 検索履歴を保存
    const { error: historyError } = await supabase.from('search_history').insert({
      user_id: user.id,
      query,
      target_language: language,
      search_type: searchType,
      ai_response: aiResponse || {},
      tokens_used: tokensUsed || 0,
    });

    if (historyError) {
      logger.error('[SearchHistoryStorage] Failed to add search history:', historyError);
      throw historyError;
    }

    // トークン数が提供された場合、ユーザーのトークン使用量を更新
    if (tokensUsed && tokensUsed > 0) {
      const { data: userData, error: fetchError } = await supabase
        .from('users')
        .select('monthly_token_usage')
        .eq('id', user.id)
        .single();

      if (!fetchError && userData) {
        const newTokenUsage = (userData.monthly_token_usage || 0) + tokensUsed;

        const { error: updateError } = await supabase
          .from('users')
          .update({ monthly_token_usage: newTokenUsage })
          .eq('id', user.id);

        if (updateError) {
          logger.error('[SearchHistoryStorage] Failed to update token usage:', updateError);
        }
      }
    }

    logger.info('[SearchHistoryStorage] Added search history:', {
      query,
      language,
      tokensUsed,
    });
  } catch (error) {
    logger.error('[SearchHistoryStorage] Failed to add search history:', error);
    throw error;
  }
}

/**
 * 検索履歴を全削除
 */
export async function clearSearchHistory(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      logger.warn('[SearchHistoryStorage] No authenticated user');
      return;
    }

    const { error } = await supabase
      .from('search_history')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      logger.error('[SearchHistoryStorage] Failed to clear search history:', error);
      throw error;
    }

    logger.info('[SearchHistoryStorage] Cleared all search history');
  } catch (error) {
    logger.error('[SearchHistoryStorage] Failed to clear search history:', error);
    throw error;
  }
}

/**
 * 特定の履歴アイテムを削除
 */
export async function removeSearchHistoryItem(id: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      logger.warn('[SearchHistoryStorage] No authenticated user');
      return;
    }

    const { error } = await supabase
      .from('search_history')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id); // セキュリティ: 自分の履歴のみ削除可能

    if (error) {
      logger.error('[SearchHistoryStorage] Failed to remove search history item:', error);
      throw error;
    }

    logger.info('[SearchHistoryStorage] Removed search history item:', { id });
  } catch (error) {
    logger.error('[SearchHistoryStorage] Failed to remove search history item:', error);
    throw error;
  }
}
