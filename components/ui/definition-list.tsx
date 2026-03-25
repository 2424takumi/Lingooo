import { View, Text, StyleSheet } from 'react-native';
import { SelectableText } from './selectable-text';
import { useThemeColor } from '@/hooks/use-theme-color';

interface DefinitionListProps {
  definitions: string[];
  onTextSelected?: (text: string) => void;
  onSelectionCleared?: () => void;
}

export function DefinitionList({ definitions, onTextSelected, onSelectionCleared }: DefinitionListProps) {
  const textColor = useThemeColor({}, 'text');

  return (
    <View style={styles.container}>
      {definitions.map((definition, index) => (
        <View key={index} style={styles.definitionRow}>
          <Text style={[styles.bullet, { color: textColor }]}>・</Text>
          <SelectableText
            text={definition}
            style={{ ...styles.definition, color: textColor }}
            onSelectionChange={onTextSelected}
            onSelectionCleared={onSelectionCleared}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 2,
  },
  definitionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  definition: {
    flex: 1,
    fontSize: 18,
    fontWeight: '500',
    lineHeight: 28,
    letterSpacing: 0.5,
  },
  bullet: {
    fontSize: 18,
    lineHeight: 28,
    marginRight: 4,
    marginTop: 7,
  },
});
