import { View, Text, StyleSheet } from 'react-native';
import { SelectableText } from './selectable-text';

interface DefinitionListProps {
  definitions: string[];
  onTextSelected?: (text: string) => void;
  onSelectionCleared?: () => void;
}

export function DefinitionList({ definitions, onTextSelected, onSelectionCleared }: DefinitionListProps) {
  return (
    <View style={styles.container}>
      {definitions.map((definition, index) => (
        <View key={index} style={styles.definitionRow}>
          <Text style={styles.bullet}>・</Text>
          <SelectableText
            text={definition}
            style={styles.definition}
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
    alignItems: 'flex-start',
  },
  definition: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    lineHeight: 27,
    letterSpacing: 0.5,
  },
  bullet: {
    fontSize: 16,
    color: '#111111',
    lineHeight: 27,
    marginRight: 4,
  },
});
