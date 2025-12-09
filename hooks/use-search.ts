/**
 * 検索フック
 *
 * 検索ロジックとページ遷移を管理
 */

import { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  detectLang,
  normalizeQuery,
  validateSearchInput,
  resolveLanguageCode,
} from '@/services/utils/language-detect';
import { searchJaToEn, getWordDetail, getWordDetailStream } from '@/services/api/search';
import { prefetchWordDetail } from '@/services/cache/word-detail-cache';
import { getCachedLanguage, setCachedLanguage } from '@/services/cache/language-detection-cache';
import { useLearningLanguages } from '@/contexts/learning-languages-context';
import { detectWordLanguage } from '@/services/ai/dictionary-generator';
import { useSubscription } from '@/contexts/subscription-context';
import { useAuth } from '@/contexts/auth-context';
import { addSearchHistory } from '@/services/storage/search-history-storage';
import { languageDetectionEvents } from '@/services/events/language-detection-events';
import type { SearchError } from '@/types/search';
import { logger } from '@/utils/logger';
import { isSentence } from '@/utils/text-detector';
import { getMaxTextLength } from '@/constants/validation';

export function useSearch() {
  const router = useRouter();
  const { currentLanguage, nativeLanguage, learningLanguages } = useLearningLanguages();
  const { isPremium } = useSubscription();
  const { needsInitialSetup } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTextLengthModal, setShowTextLengthModal] = useState(false);

  /**
   * 検索を実行してページ遷移
   *
   * @param query - 検索クエリ
   * @returns 検索が成功したかどうか
   */
  const handleSearch = async (query: string): Promise<boolean> => {
    // 1. 入力検証
    const validation = validateSearchInput(query);
    if (!validation.valid) {
      setError(validation.error || '入力エラー');
      return false;
    }

    // 質問回数制限はバックエンドで実施
    // バックエンドが429を返した場合、該当ページでエラーハンドリングを行う

    setError(null);
    setIsLoading(true);

    try {
      // 2. 正規化
      const normalizedQuery = normalizeQuery(query);

      // 2.5. 文章検出 - 文章の場合は翻訳モードとして遷移
      if (isSentence(normalizedQuery)) {
        logger.info('[Search] Detected sentence, navigating to translate mode');

        // 文字数制限チェック（初期設定中は警告を表示しない）
        const maxLength = getMaxTextLength(isPremium);
        if (normalizedQuery.length > maxLength) {
          if (!needsInitialSetup) {
            setShowTextLengthModal(true);
          }
          return false;
        }

        await searchAndNavigateToTranslate(normalizedQuery);
        return true;
      }

      // 3. 言語判定
      const detectedLang = detectLang(normalizedQuery);

      // 4. 言語コードに変換
      const learningLanguageCodes = learningLanguages.map(lang => lang.code);
      let targetLang: string;
      let usedCache = false;
      let detectionMethod = 'rule-based detection';

      // アルファベット言語のリスト
      const alphabetLanguages = ['en', 'pt', 'es', 'fr', 'de', 'it'];

      // 4.1. AI判定が必要なケース
      // - mixed（混在テキスト）
      // - alphabet かつ ネイティブ言語もアルファベット言語（例：ポルトガル語母語で英語を学習中）
      const needsAiDetection =
        detectedLang === 'mixed' ||
        (detectedLang === 'alphabet' && alphabetLanguages.includes(nativeLanguage.code));

      if (needsAiDetection) {
        logger.info('[Search] AI detection needed:', {
          detectedLang,
          nativeLanguage: nativeLanguage.code,
          reason: detectedLang === 'mixed' ? 'mixed text' : 'alphabet + alphabet native',
        });

        try {
          // まずキャッシュをチェック
          const cachedLang = await getCachedLanguage(normalizedQuery);

          if (cachedLang) {
            // キャッシュヒット
            targetLang = cachedLang;
            usedCache = true;
            detectionMethod = 'AI detection (cached)';
            logger.info('[Search] Using cached language:', {
              word: normalizedQuery,
              language: cachedLang,
            });
          } else {
            // キャッシュミス → AI判定実行
            const aiResult = await detectWordLanguage(
              normalizedQuery,
              [nativeLanguage.code, ...learningLanguageCodes]
            );

            if (aiResult && aiResult.language) {
              targetLang = aiResult.language;
              detectionMethod = 'AI detection (fresh)';

              // 結果をキャッシュに保存
              await setCachedLanguage(
                normalizedQuery,
                aiResult.language,
                aiResult.confidence || 0,
                aiResult.provider
              );

              logger.info('[Search] AI detected language:', {
                language: aiResult.language,
                confidence: aiResult.confidence,
                provider: aiResult.provider,
              });
            } else {
              // AI判定失敗時はタブ選択を信頼
              logger.warn('[Search] AI detection failed, using current tab');
              targetLang = currentLanguage.code;
              detectionMethod = 'fallback to tab';
            }
          }
        } catch (error) {
          // エラー時もタブ選択を信頼
          logger.error('[Search] AI detection error, using current tab:', error);
          targetLang = currentLanguage.code;
          detectionMethod = 'fallback to tab (error)';
        }
      } else {
        // 4.2. それ以外（ja, kanji-only, alphabetでネイティブが非alphabet）は従来のロジック
        // 単一言語の単語はタブ選択を優先
        targetLang = resolveLanguageCode(
          detectedLang,
          currentLanguage.code,
          nativeLanguage.code,
          learningLanguageCodes
        );
        detectionMethod = 'rule-based detection';
      }

      // 判定理由をログ出力（デバッグ用）
      const willNavigateTo = targetLang === nativeLanguage.code ? 'suggestion page' : 'word-detail page';

      logger.info('[Search] Language detection result:', {
        query: normalizedQuery,
        detectedLang,
        targetLang,
        method: detectionMethod,
        cached: usedCache,
        navigation: willNavigateTo,
        currentTab: currentLanguage.code,
        nativeLanguage: nativeLanguage.code,
        learningLanguages: learningLanguageCodes,
      });

      // 5. 検索分岐
      if (targetLang === nativeLanguage.code) {
        // 母語を検出 → 母語→学習言語への訳語候補を表示（タブに関係なく）
        logger.info('[Search] Native language detected → showing translations');
        await searchAndNavigateToJp(normalizedQuery);
      } else {
        // 非母語検索 → WordDetailPage（検出された言語の辞書検索）
        logger.info('[Search] Foreign language detected → showing word detail');
        await searchAndNavigateToWord(normalizedQuery, targetLang);
      }

      // 6. 検索履歴に保存
      try {
        // 母語→学習言語の翻訳検索の場合は、学習言語で保存
        const historyLanguage = (targetLang === nativeLanguage.code)
          ? currentLanguage.code
          : targetLang;

        // searchTypeを判定
        const searchType: 'word' | 'phrase' | 'translation' =
          normalizedQuery.length > 50 ? 'translation' :
          normalizedQuery.includes(' ') ? 'phrase' : 'word';

        await addSearchHistory(normalizedQuery, historyLanguage, undefined, undefined, searchType);
        logger.info('[Search] Added to history:', {
          query: normalizedQuery,
          language: historyLanguage,
          searchType,
        });
      } catch (historyError) {
        // 履歴保存に失敗しても検索は成功とみなす
        logger.error('[Search] Failed to save search history:', historyError);
      }

      // 質問回数のインクリメントはバックエンドが自動的に実行する
      // /api/chat エンドポイントが trackQuestionCount() を呼び出す

      return true;
    } catch (err) {
      const searchError = err as SearchError;
      setError(searchError.message || '検索中にエラーが発生しました');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 日本語検索して候補ページに遷移（即座に遷移、ページ上でストリーミング表示）
   */
  const searchAndNavigateToJp = async (query: string) => {
    logger.info('[Search] 🔍 Navigating to search page:', query);
    // データ取得を待たずに即座にページ遷移
    // ページ上でAPI呼び出しとストリーミング表示が開始される
    router.push({
      pathname: '/(tabs)/search',
      params: {
        query,
        // resultsパラメータなし = ページ上でAPI呼び出し
      },
    });
  };

  /**
   * 単語検索して詳細ページに遷移（即座に遷移、ページ上でストリーミング生成）
   *
   * @param word - 検索する単語
   * @param targetLanguage - ターゲット言語コード（タブで選択された言語）
   */
  const searchAndNavigateToWord = async (word: string, targetLanguage: string) => {
    logger.info('[Search] 🔍 Navigating to word-detail:', word, targetLanguage);

    // 🚀 バックグラウンドでプリフェッチを開始（ページ遷移前）
    logger.info('[Search] 🚀 Starting prefetch for:', word);

    // プリフェッチを開始（非同期）
    const prefetchPromise = prefetchWordDetail(word, (onProgress) =>
      getWordDetailStream(word, targetLanguage, nativeLanguage.code, 'concise', onProgress)
    );

    // プリフェッチが確実に開始されるように、わずかな遅延を入れる（体感速度への影響は最小限）
    // これにより、ページ遷移時にはプリフェッチが既に進行中となる
    await new Promise(resolve => setTimeout(resolve, 50));

    // ページ遷移（プリフェッチは継続中）
    router.push({
      pathname: '/(tabs)/word-detail',
      params: {
        word,
        targetLanguage, // タブで選択された言語を渡す
        // dataパラメータなし = ページ上でAPI呼び出し
      },
    });
  };

  /**
   * 文章を翻訳モードで表示（即座に遷移、ページ上で翻訳表示）
   *
   * @param text - 翻訳する文章
   */
  const searchAndNavigateToTranslate = async (text: string) => {
    // 言語を判定
    const detectedLang = detectLang(text);

    // 翻訳の場合は、単語検索と異なるロジックを使用
    // - 日本語（ひらがな・カタカナ含む）→ 確実に日本語
    // - 漢字のみ → 日本語または中国語（母語を優先）
    // - アルファベット → 現在選択中の言語タブとしてページ遷移、バックグラウンドでAI判定
    let sourceLang: string;
    let needsAiDetection = false;

    if (detectedLang === 'ja') {
      sourceLang = 'ja';
    } else if (detectedLang === 'kanji-only') {
      sourceLang = nativeLanguage.code; // 母語を優先
    } else {
      // alphabet or mixed の場合、現在選択中の言語を初期値として即座にページ遷移
      // AI検出で正確な言語を判定後、必要に応じて自動切り替え
      sourceLang = currentLanguage.code;
      needsAiDetection = true;
    }

    // 翻訳先言語を決定（ソース言語が母語なら学習言語、それ以外なら母語）
    const targetLang = sourceLang === nativeLanguage.code ? currentLanguage.code : nativeLanguage.code;

    // 即座にページ遷移（AI検出を待たない）
    router.push({
      pathname: '/(tabs)/translate',
      params: {
        word: text,
        sourceLang,
        targetLang,
        needsAiDetection: needsAiDetection ? 'true' : 'false', // AI検出が必要かをページに伝える
      },
    });

    // バックグラウンドでAI検出を開始（ページ遷移後も継続）
    if (needsAiDetection) {
      logger.info('[Search] Starting background AI language detection for:', text.substring(0, 50));
      // 非同期で実行（awaitしない）
      detectWordLanguage(text.trim(), [
        'en', 'pt', 'es', 'fr', 'de', 'it', 'zh', 'ko', 'vi', 'id'
      ]).then((result) => {
        if (result && result.language) {
          logger.info('[Search] Background AI detected language:', {
            language: result.language,
            confidence: result.confidence,
            provider: result.provider,
          });

          // イベントを発火して翻訳ページに通知
          languageDetectionEvents.emit({
            text: text.trim(),
            language: result.language,
            confidence: result.confidence,
            provider: result.provider,
            timestamp: Date.now(),
          });
        }
      }).catch((error) => {
        logger.error('[Search] Background AI detection failed:', error);
      });
    }
  };

  /**
   * エラーをクリア
   */
  const clearError = () => {
    setError(null);
  };

  return {
    handleSearch,
    isLoading,
    error,
    clearError,
    showTextLengthModal,
    setShowTextLengthModal,
  };
}
