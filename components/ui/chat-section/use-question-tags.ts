
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { logger } from '@/utils/logger';
import { QuestionTag } from '@/constants/question-tags';
import type { ChatSectionMode } from '../chat-section';

interface UseQuestionTagsProps {
  mode: ChatSectionMode;
  scope?: string;
  selectedText?: { text: string; isSingleWord: boolean } | null;
  customQuestions: Array<{ title: string; question: string }>;
  questions: string[];
  followUps: string[];
}

export function useQuestionTags({
  mode,
  scope,
  selectedText,
  customQuestions,
  questions,
  followUps,
}: UseQuestionTagsProps) {
  const { t } = useTranslation();

  // 翻訳済みタグリストの生成
  const {
    translateTags,
    translateTextSelectionTags,
    wordTags,
    searchTags
  } = useMemo(() => {
    const translateTags: QuestionTag[] = [
      {
        id: 'text-nuance',
        label: t('questionTags.textNuance.label'),
        icon: '💡',
        prompt: t('questionTags.textNuance.prompt'),
        description: '言葉のニュアンスや微妙な意味の違いを解説',
        promptId: 'text-nuance-prompt',
        isCustom: false,
      },
      {
        id: 'summary',
        label: t('questionTags.summary.label'),
        icon: '📝',
        prompt: t('questionTags.summary.prompt'),
        description: '文章の要点をまとめて表示',
        promptId: 'custom-question-prompt',
        isCustom: true,
      },
      {
        id: 'grammar-check',
        label: t('questionTags.grammarCheck.label'),
        icon: '✏️',
        prompt: t('questionTags.grammarCheck.prompt'),
        description: '文法ミスや改善提案を提示',
        promptId: 'custom-question-prompt',
        isCustom: true,
      },
      {
        id: 'paraphrase',
        label: t('questionTags.paraphrase.label'),
        icon: '🔄',
        prompt: t('questionTags.paraphrase.prompt'),
        description: '別の表現方法を提案',
        promptId: 'text-paraphrase-prompt',
        isCustom: false,
      },
    ];

    const translateTextSelectionTags: QuestionTag[] = [
      {
        id: 'grammar-explain',
        label: t('questionTags.grammarExplain.label'),
        icon: '📖',
        prompt: t('questionTags.grammarExplain.prompt'),
        description: '文法構造を詳しく解説',
        promptId: 'text-grammar-prompt',
        isCustom: false,
      },
      {
        id: 'meaning',
        label: t('questionTags.meaning.label'),
        icon: '💬',
        prompt: t('questionTags.meaning.prompt'),
        description: '文章の意味を詳しく説明',
        promptId: 'text-meaning-prompt',
        isCustom: false,
      },
      {
        id: 'text-nuance',
        label: t('questionTags.textNuance.label'),
        icon: '💡',
        prompt: t('questionTags.textNuance.prompt'),
        description: '言葉のニュアンスや微妙な意味の違いを解説',
        promptId: 'text-nuance-prompt',
        isCustom: false,
      },
      {
        id: 'paraphrase',
        label: t('questionTags.paraphrase.label'),
        icon: '🔄',
        prompt: t('questionTags.paraphrase.prompt'),
        description: '別の表現方法を提案',
        promptId: 'text-paraphrase-prompt',
        isCustom: false,
      },
    ];

    const wordTags: QuestionTag[] = [
      {
        id: 'nuance',
        label: t('questionTags.wordNuance.label'),
        icon: '💡',
        prompt: t('questionTags.wordNuance.prompt'),
        description: '単語のニュアンスや語感を説明',
        promptId: 'word-nuance-prompt',
        isCustom: false,
      },
      {
        id: 'etymology',
        label: t('questionTags.etymology.label'),
        icon: '📚',
        prompt: t('questionTags.etymology.prompt'),
        description: '語源や歴史的背景を解説',
        promptId: 'word-etymology-prompt',
        isCustom: false,
      },
      {
        id: 'synonyms',
        label: t('questionTags.synonyms.label'),
        icon: '🔄',
        prompt: t('questionTags.synonyms.prompt'),
        description: '似た意味の単語を紹介',
        promptId: 'word-synonyms-prompt',
        isCustom: false,
      },
    ];

    const searchTags: QuestionTag[] = [
      {
        id: 'difference',
        label: t('questionTags.difference.label'),
        icon: '🔍',
        prompt: t('questionTags.difference.prompt'),
        description: '単語の意味、ニュアンス、使い分けの違いを説明',
        promptId: 'search-difference-prompt',
        isCustom: false,
      },
      {
        id: 'usage-context',
        label: t('questionTags.usageContext.label'),
        icon: '📍',
        prompt: t('questionTags.usageContext.prompt'),
        description: '使用場面の違いを説明',
        promptId: 'search-usage-prompt',
        isCustom: false,
      },
    ];

    return { translateTags, translateTextSelectionTags, wordTags, searchTags };
  }, [t]);

  // scope に応じて適切な質問タグを取得するヘルパー
  const getTagsByScope = (scope?: string): QuestionTag[] => {
    switch (scope) {
      case 'translate':
        return translateTags;
      case 'word':
        return wordTags;
      case 'search':
      case 'jpSearch':
        return searchTags;
      default:
        return wordTags;
    }
  };

  // 質問タグの取得（モードに応じて異なるタグを表示）
  const contextQuestionTags = useMemo(() => {
    logger.debug('[UseQuestionTags] Question tags logic', { mode, scope, selectedText: selectedText?.text });

    // wordモードの場合は常に単語用タグを使用（scopeに関係なく）
    if (mode === 'word') {
      return wordTags;
    }
    // textモードかつtranslate scopeで文章が選択されている場合は専用のタグを使用
    if (mode === 'text' && scope === 'translate' && selectedText) {
      return translateTextSelectionTags;
    }
    // translate scopeの場合は常に翻訳用タグを使用（defaultモードでも）
    if (scope === 'translate') {
      return translateTags;
    }
    // search scopeの場合
    if (scope === 'search') {
      return searchTags;
    }
    // word scopeの場合
    if (scope === 'word') {
      return wordTags;
    }
    // textモード時のみgetTagsByScopeを使用
    if (mode === 'text' && scope) {
      return getTagsByScope(scope);
    }
    return [];
  }, [mode, scope, selectedText, translateTags, translateTextSelectionTags, wordTags, searchTags]);

  const combinedQuestions = useMemo(() => {
    // translate, search, word scope, または textモードの場合は翻訳済みタグを使用
    if ((['translate', 'search', 'word'].includes(scope || '') || mode === 'text') && contextQuestionTags.length > 0) {
      return contextQuestionTags.map(tag => tag.label);
    }
    // それ以外（defaultモード）は従来のシステム
    return [...customQuestions.map(cq => cq.title), ...questions];
  }, [mode, scope, contextQuestionTags, customQuestions, questions]);

  // タイトルと実際の質問文のマッピングを作成
  const questionMap = useMemo(() => {
    const map = new Map<string, string>();

    // 新しい質問タグのマッピング追加
    if (mode === 'text' || ['translate', 'search', 'word'].includes(scope || '')) {
      contextQuestionTags.forEach(tag => {
        map.set(tag.label, tag.prompt);
      });
    }

    // カスタム質問のマッピング
    customQuestions.forEach(cq => {
      map.set(cq.title, cq.question);
    });

    // デフォルト質問のマッピング（従来互換）
    // 注意: legacyなquestionsプロパティが日本語固定の場合はここが問題になる可能性があるが、
    // 現状は既存動作を維持する。
    map.set('ニュアンス', 'この単語の持つニュアンスについて詳しく教えてください');
    map.set('語源', 'この単語の語源や由来を教えてください');
    map.set('例文', 'この単語を使った自然な例文をいくつか教えてください');

    questions.forEach(q => {
      if (!map.has(q)) map.set(q, q);
    });
    followUps.forEach(q => {
      if (!map.has(q)) map.set(q, q);
    });
    return map;
  }, [mode, scope, contextQuestionTags, customQuestions, questions, followUps]);

  return {
    contextQuestionTags,
    combinedQuestions,
    questionMap,
  };
}
