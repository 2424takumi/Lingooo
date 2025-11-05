import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { PosTag } from './pos-tag';

interface WordCardProps {
  word: string;
  posTags: string[];
  definitions: string[];
  description: string;
}

export function WordCard({ word, posTags, definitions, description }: WordCardProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.word}>{word}</Text>

      <View style={styles.posTagList}>
        {posTags.map((tag, index) => (
          <PosTag key={index} label={tag} />
        ))}
      </View>

      <View style={styles.definitionList}>
        {definitions.map((def, index) => (
          <Text key={index} style={styles.definition}>
            {def}
          </Text>
        ))}
      </View>

      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FAFCFB',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    borderRadius: 8,
    width: 150,
    height: 189,
    padding: 12,
    paddingHorizontal: 14,
    gap: 8,
  },
  word: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
  },
  posTagList: {
    flexDirection: 'row',
    gap: 5,
    flexWrap: 'wrap',
  },
  definitionList: {
    gap: 0,
  },
  definition: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
    lineHeight: 18,
  },
  description: {
    fontSize: 12,
    fontWeight: '500',
    color: '#000000',
    lineHeight: 16,
    flex: 1,
  },
});
