import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/utils/logger';

const IMAGE_TRANSLATION_KEY = '@lingooo:image_translation_temp';

export interface ImageTranslationData {
  extractedText: string;
  translatedText: string;
  detectedLanguage: string;
  targetLanguage: string;
  timestamp: number;
}

/**
 * Save image translation result temporarily
 * This is used to pass large text data between screens without URL param limitations
 */
export async function saveImageTranslationData(data: Omit<ImageTranslationData, 'timestamp'>): Promise<void> {
  try {
    const dataWithTimestamp: ImageTranslationData = {
      ...data,
      timestamp: Date.now(),
    };

    await AsyncStorage.setItem(IMAGE_TRANSLATION_KEY, JSON.stringify(dataWithTimestamp));
    logger.info('[ImageTranslationStorage] Saved translation data', {
      extractedLength: data.extractedText.length,
      translatedLength: data.translatedText.length,
    });
  } catch (error) {
    logger.error('[ImageTranslationStorage] Failed to save', error);
    throw error;
  }
}

/**
 * Retrieve and clear image translation data
 * Data is automatically cleared after retrieval to avoid stale data
 */
export async function getAndClearImageTranslationData(): Promise<ImageTranslationData | null> {
  try {
    const jsonData = await AsyncStorage.getItem(IMAGE_TRANSLATION_KEY);

    if (!jsonData) {
      return null;
    }

    const data: ImageTranslationData = JSON.parse(jsonData);

    // Clear after reading to avoid reusing stale data
    await AsyncStorage.removeItem(IMAGE_TRANSLATION_KEY);

    // Check if data is too old (older than 5 minutes)
    const AGE_LIMIT = 5 * 60 * 1000; // 5 minutes
    if (Date.now() - data.timestamp > AGE_LIMIT) {
      logger.warn('[ImageTranslationStorage] Data expired, ignoring', {
        age: Date.now() - data.timestamp,
      });
      return null;
    }

    logger.info('[ImageTranslationStorage] Retrieved translation data', {
      extractedLength: data.extractedText.length,
      translatedLength: data.translatedText.length,
    });

    return data;
  } catch (error) {
    logger.error('[ImageTranslationStorage] Failed to retrieve', error);
    return null;
  }
}

/**
 * Clear image translation data manually
 */
export async function clearImageTranslationData(): Promise<void> {
  try {
    await AsyncStorage.removeItem(IMAGE_TRANSLATION_KEY);
    logger.info('[ImageTranslationStorage] Cleared translation data');
  } catch (error) {
    logger.error('[ImageTranslationStorage] Failed to clear', error);
  }
}
