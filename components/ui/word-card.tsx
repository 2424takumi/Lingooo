import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { PosTag } from './pos-tag';
import { Shimmer } from './shimmer';

interface WordCardProps {
  word: string;
  posTags: string[];
  gender?: 'm' | 'f' | 'n' | 'mf';
  definitions: string[];
  description: string;
}

export function WordCard({ word, posTags, gender, definitions, description }: WordCardProps) {
  return (
    <View style={styles.container}>
      <Text selectable selectionColor="#00AA69" style={styles.word}>
        {word}
      </Text>

      <View style={styles.posTagList}>
        {posTags.map((tag, index) => (
          <PosTag key={index} label={tag} gender={gender} />
        ))}
      </View>

      <View style={styles.definitionList}>
        {definitions.map((def, index) => (
          <Text
            key={index}
            selectable
            selectionColor="#00AA69"
            style={styles.definition}
          >
            {def}
          </Text>
        ))}
      </View>

      {description ? (
        <Text selectable selectionColor="#00AA69" style={styles.description}>
          {description}
        </Text>
      ) : (
        <View style={styles.descriptionShimmerContainer}>
          <Shimmer width="90%" height={14} borderRadius={4} style={styles.descriptionShimmer} />
          <Shimmer width="85%" height={14} borderRadius={4} style={styles.descriptionShimmer} />
          <Shimmer width="80%" height={14} borderRadius={4} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FAFCFB',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    borderRadius: 8,
    width: '100%',
    minHeight: 120,
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
  descriptionShimmerContainer: {
    flex: 1,
    gap: 4,
    justifyContent: 'flex-start',
  },
  descriptionShimmer: {
    marginBottom: 4,
  },
});
