import { View, StyleSheet, Text } from 'react-native';
import { SelectableText } from './selectable-text';
import { TypingIndicator } from './typing-indicator';

interface WordHintProps {
  hint: string;
  onTextSelected?: (text: string) => void;
  onSelectionCleared?: () => void;
  isStreaming?: boolean;
  streamingText?: string;
}

export function WordHint({
  hint,
  onTextSelected,
  onSelectionCleared,
  isStreaming = false,
  streamingText = '',
}: WordHintProps) {
  // ストリーミング中はstreamingTextを表示
  const displayText = isStreaming ? streamingText : hint;

  if (!displayText && !isStreaming) {
    return null;
  }

  return (
    <View style={styles.container}>
      {isStreaming ? (
        // ストリーミング中はTypingIndicatorと共に表示
        <View style={styles.streamingContainer}>
          <Text style={styles.hintText}>{streamingText}</Text>
          <TypingIndicator />
        </View>
      ) : (
        // 完成後は選択可能テキストとして表示
        <SelectableText
          text={hint}
          style={styles.hintText}
          onSelectionChange={onTextSelected}
          onSelectionCleared={onSelectionCleared}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8F8F8',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  streamingContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  hintText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#000000',
    letterSpacing: 0.5,
    flex: 1,
  },
});
