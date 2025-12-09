
import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { QuestionTag } from '@/components/ui/question-tag';
import type { QuestionTag as QuestionTagType } from '@/constants/question-tags';
import type { ChatSectionMode } from '../chat-section';

function PlusIcon({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 5v14M5 12h14"
        stroke="#FFFFFF"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

interface ChatSuggestionTagsProps {
  mode: ChatSectionMode;
  scope?: string;
  selectedText?: { text: string; isSingleWord: boolean } | null;
  activeFollowUpPair: any; // Using any for now to avoid circular deps or complex type extraction
  showInputInWordMode: boolean;
  combinedQuestions: string[];
  contextQuestionTags: QuestionTagType[];
  questionMap: Map<string, string>;
  onQuickQuestion?: (question: string | QuestionTagType) => void;
  onOpenCustomQuestionModal: () => void;
  onOpenChat: () => void;
}

export function ChatSuggestionTags({
  mode,
  scope,
  selectedText,
  activeFollowUpPair,
  showInputInWordMode,
  combinedQuestions,
  contextQuestionTags,
  questionMap,
  onQuickQuestion,
  onOpenCustomQuestionModal,
  onOpenChat,
}: ChatSuggestionTagsProps) {

  // Don't show tags if in follow-up mode, or if text is selected in default/search/word modes (unless in specific word mode state)
  // This logic matches the original condition: !activeFollowUpPair && (!selectedText || (mode === 'word' && showInputInWordMode))
  // But wait, there is a second block for "text mode && selectedText".
  // Let's replicate the structure.

  const showStandardTags = !activeFollowUpPair && (!selectedText || (mode === 'word' && showInputInWordMode));
  const showTextModeTags = mode === 'text' && selectedText && !activeFollowUpPair;

  if (!showStandardTags && !showTextModeTags) {
    return null;
  }

  return (
    <>
      {showStandardTags && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[
            styles.questionScrollView,
            scope === 'translate' && styles.questionScrollViewTranslate
          ]}
          contentContainerStyle={styles.questionList}
        >
          {/* Plus button for adding custom questions - textモードまたはtranslate scopeでは非表示 */}
          {mode !== 'text' && scope !== 'translate' && (
            <TouchableOpacity
              style={styles.plusButton}
              onPress={onOpenCustomQuestionModal}
            >
              <PlusIcon size={20} />
            </TouchableOpacity>
          )}

          {combinedQuestions.map((label, index) => {
            // translate scope、search scope、word scope、またはtextモードの場合はiconも表示
            const tag = (scope === 'translate' || scope === 'search' || scope === 'word' || mode === 'text')
              ? contextQuestionTags.find(t => t.label === label)
              : undefined;

            return (
              <QuestionTag
                key={`${label}-${index}`}
                label={label}
                icon={tag?.icon}
                onPress={() => {
                  onOpenChat();
                  // questionTagの場合はタグオブジェクトを、それ以外は質問文を送信
                  if (tag) {
                    onQuickQuestion?.(tag);
                  } else {
                    const actualQuestion = questionMap.get(label) || label;
                    onQuickQuestion?.(actualQuestion);
                  }
                }}
              />
            );
          })}
        </ScrollView>
      )}

      {/* textモードかつselectedTextがある場合の質問タグ */}
      {showTextModeTags && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[
            styles.questionScrollView,
            scope === 'translate' && styles.questionScrollViewTranslate
          ]}
          contentContainerStyle={styles.questionList}
        >
          {contextQuestionTags.map((tag, index) => (
            <QuestionTag
              key={`${tag.id}-${index}`}
              label={tag.label}
              icon={tag.icon}
              onPress={() => {
                onOpenChat();
                onQuickQuestion?.(tag);
              }}
            />
          ))}
        </ScrollView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  questionScrollView: {
    maxHeight: 32,
    marginBottom: 4, // gap: 6との合計で10pxの間隔を維持
  },
  questionScrollViewTranslate: {
    marginBottom: 4, // translate scopeでも同じ間隔
  },
  questionList: {
    paddingHorizontal: 0,
    gap: 8,
    alignItems: 'center',
  },
  plusButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
});
