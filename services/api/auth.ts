import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';
import { Platform } from 'react-native';
import * as Application from 'expo-application';

/**
 * Get the current Supabase access token
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  } catch (error) {
    logger.error('[Auth] Failed to get auth token:', error);
    return null;
  }
}

let cachedDeviceId: string | null = null;

/**
 * Get device ID (iOS IDFV / Android ID)
 * Cached after first call since device ID doesn't change during app lifecycle.
 */
export async function getDeviceId(): Promise<string | null> {
  if (cachedDeviceId) {
    return cachedDeviceId;
  }

  try {
    if (Platform.OS === 'ios') {
      cachedDeviceId = await Application.getIosIdForVendorAsync();
    } else if (Platform.OS === 'android') {
      cachedDeviceId = Application.getAndroidId();
    }
    logger.debug('[Auth] Device ID obtained:', cachedDeviceId?.substring(0, 8) + '...');
    return cachedDeviceId;
  } catch (error) {
    logger.warn('[Auth] Failed to get device ID:', error);
    return null;
  }
}
