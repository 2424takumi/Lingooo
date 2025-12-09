import { View, StyleSheet, Text } from 'react-native';
import { SelectableText } from './selectable-text';

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
        // ストリーミング中はテキストのみ表示
        <Text style={styles.hintText}>{streamingText}</Text>
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
  hintText: {
    fontSize: 16,
    lineHeight: 25,
    color: '#000000',
    letterSpacing: 0.5,
    flex: 1,
  },
});
