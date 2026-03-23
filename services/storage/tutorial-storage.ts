import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/utils/logger';

const TUTORIAL_COMPLETED_KEY = '@lingooo:interactive_tutorial_completed';
const TUTORIAL_STEP_KEY = '@lingooo:interactive_tutorial_step';

export async function isTutorialCompleted(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(TUTORIAL_COMPLETED_KEY);
    return value === 'true';
  } catch (error) {
    logger.error('[TutorialStorage] Failed to check tutorial status:', error);
    return false;
  }
}

export async function setTutorialCompleted(): Promise<void> {
  try {
    await AsyncStorage.setItem(TUTORIAL_COMPLETED_KEY, 'true');
    await AsyncStorage.removeItem(TUTORIAL_STEP_KEY);
    logger.info('[TutorialStorage] Tutorial marked as completed');
  } catch (error) {
    logger.error('[TutorialStorage] Failed to set tutorial completed:', error);
  }
}

export async function resetTutorial(): Promise<void> {
  try {
    await AsyncStorage.removeItem(TUTORIAL_COMPLETED_KEY);
    await AsyncStorage.removeItem(TUTORIAL_STEP_KEY);
    logger.info('[TutorialStorage] Tutorial reset');
  } catch (error) {
    logger.error('[TutorialStorage] Failed to reset tutorial:', error);
  }
}

export async function saveTutorialStep(step: number): Promise<void> {
  try {
    await AsyncStorage.setItem(TUTORIAL_STEP_KEY, String(step));
  } catch (error) {
    logger.error('[TutorialStorage] Failed to save tutorial step:', error);
  }
}

export async function getSavedTutorialStep(): Promise<number> {
  try {
    const value = await AsyncStorage.getItem(TUTORIAL_STEP_KEY);
    return value ? parseInt(value, 10) : 0;
  } catch (error) {
    logger.error('[TutorialStorage] Failed to get tutorial step:', error);
    return 0;
  }
}
