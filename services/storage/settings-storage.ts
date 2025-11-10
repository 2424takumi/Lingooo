/**
 * アプリケーション設定のストレージ管理
 *
 * AsyncStorageを使用して設定を永続化
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppSettings, AIDetailLevel, CustomQuestion } from '@/types/settings';
import { DEFAULT_APP_SETTINGS } from '@/types/settings';
import { logger } from '@/utils/logger';

// ストレージキー
const STORAGE_KEY = '@lingooo_app_settings';
const CUSTOM_QUESTIONS_KEY = '@lingooo_custom_questions';

/**
 * アプリケーション設定を読み込む
 *
 * @returns アプリケーション設定（失敗時はデフォルト設定）
 */
export async function loadAppSettings(): Promise<AppSettings> {
  try {
    const jsonString = await AsyncStorage.getItem(STORAGE_KEY);

    if (!jsonString) {
      logger.info('[SettingsStorage] No saved settings, using defaults');
      return DEFAULT_APP_SETTINGS;
    }

    const settings = JSON.parse(jsonString) as AppSettings;
    logger.info('[SettingsStorage] Settings loaded:', settings);
    return settings;
  } catch (error) {
    logger.error('[SettingsStorage] Failed to load settings:', error);
    return DEFAULT_APP_SETTINGS;
  }
}

/**
 * アプリケーション設定を保存する
 *
 * @param settings - 保存する設定
 */
export async function saveAppSettings(settings: AppSettings): Promise<void> {
  try {
    const jsonString = JSON.stringify(settings);
    await AsyncStorage.setItem(STORAGE_KEY, jsonString);
    logger.info('[SettingsStorage] Settings saved:', settings);
  } catch (error) {
    logger.error('[SettingsStorage] Failed to save settings:', error);
    throw error;
  }
}

/**
 * AI詳細度レベルを取得
 *
 * @returns AI詳細度レベル
 */
export async function getAIDetailLevel(): Promise<AIDetailLevel> {
  try {
    const settings = await loadAppSettings();
    return settings.aiResponse.detailLevel;
  } catch (error) {
    logger.error('[SettingsStorage] Failed to get AI detail level:', error);
    return DEFAULT_APP_SETTINGS.aiResponse.detailLevel;
  }
}

/**
 * AI詳細度レベルを設定
 *
 * @param level - 設定する詳細度レベル
 */
export async function setAIDetailLevel(level: AIDetailLevel): Promise<void> {
  try {
    const settings = await loadAppSettings();
    settings.aiResponse.detailLevel = level;
    await saveAppSettings(settings);
    logger.info('[SettingsStorage] AI detail level updated:', level);
  } catch (error) {
    logger.error('[SettingsStorage] Failed to set AI detail level:', error);
    throw error;
  }
}

/**
 * 通知設定を取得
 */
export async function getNotificationsEnabled(): Promise<boolean> {
  const settings = await loadAppSettings();
  return settings.notifications.enabled;
}

/**
 * 通知設定を保存
 */
export async function setNotificationsEnabled(enabled: boolean): Promise<void> {
  const settings = await loadAppSettings();
  settings.notifications.enabled = enabled;
  await saveAppSettings(settings);
}

/**
 * サウンド設定を取得
 */
export async function getSoundEnabled(): Promise<boolean> {
  const settings = await loadAppSettings();
  return settings.sound.enabled;
}

/**
 * サウンド設定を保存
 */
export async function setSoundEnabled(enabled: boolean): Promise<void> {
  const settings = await loadAppSettings();
  settings.sound.enabled = enabled;
  await saveAppSettings(settings);
}

/**
 * 音声自動再生設定を取得
 */
export async function getAutoPlayAudio(): Promise<boolean> {
  const settings = await loadAppSettings();
  return settings.autoPlayAudio;
}

/**
 * 音声自動再生設定を保存
 */
export async function setAutoPlayAudio(enabled: boolean): Promise<void> {
  const settings = await loadAppSettings();
  settings.autoPlayAudio = enabled;
  await saveAppSettings(settings);
}

/**
 * 全ての設定をリセット（デフォルトに戻す）
 */
export async function resetAppSettings(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
    logger.info('[SettingsStorage] Settings reset to defaults');
  } catch (error) {
    logger.error('[SettingsStorage] Failed to reset settings:', error);
    throw error;
  }
}

/**
 * カスタム質問を取得
 */
export async function getCustomQuestions(): Promise<CustomQuestion[]> {
  try {
    const jsonString = await AsyncStorage.getItem(CUSTOM_QUESTIONS_KEY);
    if (!jsonString) {
      return [];
    }
    const questions = JSON.parse(jsonString) as CustomQuestion[];
    logger.info('[SettingsStorage] Custom questions loaded:', questions.length);
    return questions;
  } catch (error) {
    logger.error('[SettingsStorage] Failed to load custom questions:', error);
    return [];
  }
}

/**
 * カスタム質問を保存
 */
export async function saveCustomQuestions(questions: CustomQuestion[]): Promise<void> {
  try {
    const jsonString = JSON.stringify(questions);
    await AsyncStorage.setItem(CUSTOM_QUESTIONS_KEY, jsonString);
    logger.info('[SettingsStorage] Custom questions saved:', questions.length);
  } catch (error) {
    logger.error('[SettingsStorage] Failed to save custom questions:', error);
    throw error;
  }
}

/**
 * カスタム質問を追加
 */
export async function addCustomQuestion(title: string, question: string): Promise<void> {
  try {
    const questions = await getCustomQuestions();
    // 同じタイトルの質問がないかチェック
    if (!questions.some(q => q.title === title)) {
      questions.push({ title, question });
      await saveCustomQuestions(questions);
      logger.info('[SettingsStorage] Custom question added:', { title, question });
    }
  } catch (error) {
    logger.error('[SettingsStorage] Failed to add custom question:', error);
    throw error;
  }
}

/**
 * カスタム質問を削除
 */
export async function removeCustomQuestion(title: string): Promise<void> {
  try {
    const questions = await getCustomQuestions();
    const filtered = questions.filter(q => q.title !== title);
    await saveCustomQuestions(filtered);
    logger.info('[SettingsStorage] Custom question removed:', title);
  } catch (error) {
    logger.error('[SettingsStorage] Failed to remove custom question:', error);
    throw error;
  }
}
