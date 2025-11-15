import { View, Text, StyleSheet } from 'react-native';

interface DefinitionListProps {
  definitions: string[];
}

export function DefinitionList({ definitions }: DefinitionListProps) {
  return (
    <View style={styles.container}>
      {definitions.map((definition, index) => (
        <Text
          key={index}
          selectable
          selectionColor="#111111"
          style={styles.definition}
        >
          <Text style={styles.bullet}>・</Text>
          {definition}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 2,
  },
  definition: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    lineHeight: 27,
    letterSpacing: 0.5,
  },
  bullet: {
    color: '#111111',
  },
});
