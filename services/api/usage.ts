import { authenticatedFetch } from './client';
import { logger } from '@/utils/logger';

const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export interface UsageStats {
  translationTokens: {
    used: number;
    limit: number;
  };
  questionCount: {
    used: number;
    limit: number;
  };
  isPremium: boolean;
}

/**
 * Get user's usage statistics
 *
 * @returns Usage statistics including translation tokens and question count
 */
export async function getUsageStats(): Promise<UsageStats | null> {
  try {
    if (!API_BASE_URL) {
      logger.error('[Usage API] API_BASE_URL is not configured');
      console.error('[Usage API] API_BASE_URL is not configured');
      return null;
    }

    logger.info('[Usage API] Fetching usage stats from:', `${API_BASE_URL}/api/usage`);
    console.log('[Usage API] Fetching usage stats from:', `${API_BASE_URL}/api/usage`);

    const response = await authenticatedFetch(`${API_BASE_URL}/api/usage`, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('[Usage API] Failed to fetch usage stats:', response.status, errorText);
      console.error('[Usage API] Failed to fetch usage stats:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    logger.info('[Usage API] Usage stats fetched successfully:', data);
    console.log('[Usage API] Usage stats fetched successfully:', data);

    return {
      translationTokens: {
        used: data.translationTokensUsed,
        limit: data.translationTokensLimit,
      },
      questionCount: {
        used: data.questionCountUsed,
        limit: data.questionCountLimit,
      },
      isPremium: data.isPremium,
    };
  } catch (error) {
    logger.error('[Usage API] Error fetching usage stats:', error);
    console.error('[Usage API] Error fetching usage stats:', error);
    return null;
  }
}
