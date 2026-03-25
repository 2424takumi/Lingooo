import { View, StyleSheet, Text } from 'react-native';
import { SelectableText } from './selectable-text';
import { useThemeColor } from '@/hooks/use-theme-color';

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
  const bgColor = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'borderLight');
  const textColor = useThemeColor({}, 'text');

  // ストリーミング中はstreamingTextを表示
  const displayText = isStreaming ? streamingText : hint;

  if (!displayText && !isStreaming) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: bgColor, borderColor }]}>
      {isStreaming ? (
        // ストリーミング中はテキストのみ表示
        <Text style={[styles.hintText, { color: textColor }]}>{streamingText}</Text>
      ) : (
        // 完成後は選択可能テキストとして表示
        <SelectableText
          text={hint}
          style={{ ...styles.hintText, color: textColor }}
          onSelectionChange={onTextSelected}
          onSelectionCleared={onSelectionCleared}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  hintText: {
    fontSize: 17,
    lineHeight: 25,
    letterSpacing: 0.5,
    flex: 1,
  },
});
