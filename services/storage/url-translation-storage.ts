import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/utils/logger';

const URL_TRANSLATION_KEY = '@lingooo:url_translation_temp';

export interface UrlTranslationData {
  extractedText: string;
  title: string;
  sourceUrl: string;
  truncated: boolean;
  timestamp: number;
}

/**
 * Save URL translation data temporarily
 * Used to pass large text data between screens without URL param limitations
 */
export async function saveUrlTranslationData(data: Omit<UrlTranslationData, 'timestamp'>): Promise<void> {
  try {
    const dataWithTimestamp: UrlTranslationData = {
      ...data,
      timestamp: Date.now(),
    };

    await AsyncStorage.setItem(URL_TRANSLATION_KEY, JSON.stringify(dataWithTimestamp));
    logger.info('[UrlTranslationStorage] Saved translation data', {
      extractedLength: data.extractedText.length,
      title: data.title,
    });
  } catch (error) {
    logger.error('[UrlTranslationStorage] Failed to save', error);
    throw error;
  }
}

/**
 * Retrieve and clear URL translation data
 * Data is automatically cleared after retrieval to avoid stale data
 */
export async function getAndClearUrlTranslationData(): Promise<UrlTranslationData | null> {
  try {
    const jsonData = await AsyncStorage.getItem(URL_TRANSLATION_KEY);

    if (!jsonData) {
      return null;
    }

    const data: UrlTranslationData = JSON.parse(jsonData);

    // Clear after reading
    await AsyncStorage.removeItem(URL_TRANSLATION_KEY);

    // Check if data is too old (5 minutes)
    const AGE_LIMIT = 5 * 60 * 1000;
    if (Date.now() - data.timestamp > AGE_LIMIT) {
      logger.warn('[UrlTranslationStorage] Data expired, ignoring', {
        age: Date.now() - data.timestamp,
      });
      return null;
    }

    logger.info('[UrlTranslationStorage] Retrieved translation data', {
      extractedLength: data.extractedText.length,
      title: data.title,
    });

    return data;
  } catch (error) {
    logger.error('[UrlTranslationStorage] Failed to retrieve', error);
    return null;
  }
}
