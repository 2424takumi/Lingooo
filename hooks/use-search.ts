/**
 * 検索フック
 *
 * 検索ロジックとページ遷移を管理
 */

import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';
import {
  detectLang,
  normalizeQuery,
  validateSearchInput,
  resolveLanguageCode,
} from '@/services/utils/language-detect';
import { searchJaToEn, getWordDetail, getWordDetailStream } from '@/services/api/search';
import { prefetchWordDetail } from '@/services/cache/word-detail-cache';
import { useLearningLanguages } from '@/contexts/learning-languages-context';
import { detectWordLanguage } from '@/services/ai/dictionary-generator';
import { useSubscription } from '@/contexts/subscription-context';
import { addSearchHistory } from '@/services/storage/search-history-storage';
import type { SearchError } from '@/types/search';
import { logger } from '@/utils/logger';
import { isSentence } from '@/utils/text-detector';
import { useQuestionCount } from '@/hooks/use-question-count';
import { getMaxTextLength } from '@/constants/validation';

export function useSearch() {
  const router = useRouter();
  const { currentLanguage, nativeLanguage } = useLearningLanguages();
  const { isPremium } = useSubscription();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Supabaseから質問回数とプランを取得
  const { canAskQuestion, incrementQuestionCount, getRemainingQuestions, questionCount } = useQuestionCount();

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

    // 2. 質問回数制限チェック
    if (!canAskQuestion()) {
      const remaining = getRemainingQuestions();
      setError(`本日の質問回数が上限に達しました。明日また${remaining === 0 ? '10回' : remaining + '回'}質問できます。`);
      return false;
    }

    setError(null);
    setIsLoading(true);

    try {
      // 2. 正規化
      const normalizedQuery = normalizeQuery(query);

      // 2.5. 文章検出 - 文章の場合は翻訳モードとして遷移
      if (isSentence(normalizedQuery)) {
        logger.info('[Search] Detected sentence, navigating to translate mode');

        // 文字数制限チェック
        const maxLength = getMaxTextLength(isPremium);
        if (normalizedQuery.length > maxLength) {
          const upgradeText = isPremium
            ? ''
            : '\n\nプレミアムプランなら50,000文字まで翻訳できます。';

          Alert.alert(
            '文字数制限',
            `翻訳は${maxLength.toLocaleString()}文字以内にしてください。${upgradeText}`,
            [
              { text: 'OK' },
              ...(!isPremium ? [{ text: 'プレミアムを見る', onPress: () => router.push('/subscription') }] : []),
            ]
          );
          return false;
        }

        await searchAndNavigateToTranslate(normalizedQuery);
        return true;
      }

      // 3. 言語判定
      const detectedLang = detectLang(normalizedQuery);

      // 4. 言語コードに変換
      // - 漢字のみ: 中国語タブなら中国語、それ以外は母語
      // - アルファベット: タブで選択中の言語
      const targetLang = resolveLanguageCode(detectedLang, currentLanguage.code, nativeLanguage.code);

      // 5. 検索分岐
      if (targetLang === nativeLanguage.code) {
        // 母語（日本語）が検出された場合
        if (currentLanguage.code === nativeLanguage.code) {
          // 選択中の言語も母語（日本語） → 日本語辞書として検索
          await searchAndNavigateToWord(normalizedQuery, targetLang);
        } else {
          // 選択中の言語が他言語 → 訳語候補を表示
          await searchAndNavigateToJp(normalizedQuery);
        }
      } else {
        // 非母語検索 → WordDetailPage（検出された言語の辞書検索）
        await searchAndNavigateToWord(normalizedQuery, targetLang);
      }

      // 6. 検索履歴に保存
      try {
        // 日本語→他言語の翻訳検索の場合は、学習言語で保存
        const historyLanguage = (targetLang === nativeLanguage.code && currentLanguage.code !== nativeLanguage.code)
          ? currentLanguage.code
          : targetLang;
        await addSearchHistory(normalizedQuery, historyLanguage);
      } catch (historyError) {
        // 履歴保存に失敗しても検索は成功とみなす
        logger.error('Failed to save search history:', historyError);
      }

      // 7. 質問回数をインクリメント
      await incrementQuestionCount();

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
      ]).then((aiDetectedLang) => {
        if (aiDetectedLang) {
          logger.info('[Search] Background AI detected language:', aiDetectedLang);
          // 翻訳ページ側でこの結果を使用する（グローバル状態やイベントで通知）
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
  };
}
