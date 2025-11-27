/**
 * 言語判定イベント
 *
 * AI言語判定の結果を通知するイベントシステム
 */

import { logger } from '@/utils/logger';

export interface LanguageDetectionEvent {
  text: string;
  language: string;
  confidence: number;
  provider: 'groq' | 'gemini';
  timestamp: number;
}

type LanguageDetectionListener = (event: LanguageDetectionEvent) => void;

class LanguageDetectionEventEmitter {
  private listeners: LanguageDetectionListener[] = [];

  /**
   * 言語判定イベントをリッスン
   */
  subscribe(listener: LanguageDetectionListener): () => void {
    this.listeners.push(listener);
    logger.debug('[LanguageDetectionEvents] Listener subscribed, total:', this.listeners.length);

    // Unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
      logger.debug('[LanguageDetectionEvents] Listener unsubscribed, remaining:', this.listeners.length);
    };
  }

  /**
   * 言語判定イベントを発火
   */
  emit(event: LanguageDetectionEvent): void {
    logger.info('[LanguageDetectionEvents] Emitting event:', {
      language: event.language,
      confidence: event.confidence,
      text: event.text.substring(0, 30),
      listeners: this.listeners.length,
    });

    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        logger.error('[LanguageDetectionEvents] Listener error:', error);
      }
    });
  }

  /**
   * すべてのリスナーをクリア
   */
  clear(): void {
    this.listeners = [];
    logger.debug('[LanguageDetectionEvents] All listeners cleared');
  }
}

// Singleton instance
export const languageDetectionEvents = new LanguageDetectionEventEmitter();
