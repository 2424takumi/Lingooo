import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';

/**
 * Get authorization headers for API requests
 *
 * @returns Headers object with Authorization header if user is authenticated
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.access_token) {
      return {
        Authorization: `Bearer ${session.access_token}`,
      };
    }

    logger.warn('[API Client] No access token available');
    return {};
  } catch (error) {
    logger.error('[API Client] Error getting auth headers:', error);
    return {};
  }
}

/**
 * Make an authenticated API request
 *
 * @param url - The URL to fetch
 * @param options - Fetch options (method, body, etc.)
 * @returns The fetch response
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const authHeaders = await getAuthHeaders();

  const headers = {
    'Content-Type': 'application/json',
    ...authHeaders,
    ...options.headers,
  };

  return fetch(url, {
    ...options,
    headers,
  });
}
