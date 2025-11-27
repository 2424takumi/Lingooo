import { View, Text, StyleSheet } from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';
import { SelectableText } from './selectable-text';

interface ExampleCardProps {
  english: string;
  japanese: string;
  onTextSelected?: (text: string) => void;
  onSelectionCleared?: () => void;
}

export function ExampleCard({ english, japanese, onTextSelected, onSelectionCleared }: ExampleCardProps) {
  const cardBackground = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'border');
  const primaryText = useThemeColor({}, 'text');
  const secondaryText = useThemeColor({}, 'icon');
  const accent = useThemeColor({}, 'primary');

  return (
    <View style={[styles.container, { backgroundColor: 'transparent', borderColor: 'transparent' }]}>
      <SelectableText
        text={english}
        style={[styles.english, { color: primaryText }] as any}
        onSelectionChange={onTextSelected}
        onSelectionCleared={onSelectionCleared}
      />
      <SelectableText
        text={japanese}
        style={[styles.japanese, { color: secondaryText }] as any}
        onSelectionChange={onTextSelected}
        onSelectionCleared={onSelectionCleared}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 0,
    gap: 4,
  },
  english: {
    fontSize: 18,
    fontWeight: '500',
    lineHeight: 24,
  },
  japanese: {
    fontSize: 14,
    fontWeight: '300',
    lineHeight: 20,
    letterSpacing: 0.5,
  },
});
