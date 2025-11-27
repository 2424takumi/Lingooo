import { View, StyleSheet } from 'react-native';
import { SelectableText } from './selectable-text';

interface WordHintProps {
  hint: string;
  onTextSelected?: (text: string) => void;
  onSelectionCleared?: () => void;
}

export function WordHint({ hint, onTextSelected, onSelectionCleared }: WordHintProps) {
  if (!hint) {
    return null;
  }

  return (
    <View style={styles.container}>
      <SelectableText
        text={hint}
        style={styles.hintText}
        onSelectionChange={onTextSelected}
        onSelectionCleared={onSelectionCleared}
      />
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
    fontSize: 14,
    lineHeight: 22,
    color: '#000000',
    letterSpacing: 0.5,
  },
});
