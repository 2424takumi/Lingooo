/**
 * Translation Configuration Constants
 *
 * Centralized configuration for translation features to avoid magic numbers
 * and improve maintainability.
 */

export const TRANSLATION_CONFIG = {
  /**
   * Number of paragraphs to translate in parallel
   * Value: 3
   * Rationale: Balanced for Gemini API rate limits and optimal user experience.
   * - Too low (1-2): Slower translation display
   * - Too high (4+): Risk of hitting rate limits, increased memory usage
   */
  PARALLEL_LIMIT: 3,

  /**
   * Character threshold for short text simple splitting
   * Value: 50
   * Rationale: Very short texts (≤50 chars) can use simple newline-based splitting
   * without AI, reducing API calls and improving response time.
   */
  SHORT_TEXT_THRESHOLD: 50,

  /**
   * Language detection timeout in milliseconds
   * Value: 5000 (5 seconds)
   * Rationale: Allow enough time for AI detection while preventing indefinite waiting.
   * Falls back to original language if detection times out.
   */
  LANGUAGE_DETECTION_TIMEOUT: 5000,
} as const;
