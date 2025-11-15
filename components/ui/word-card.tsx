import { View, Text, StyleSheet } from 'react-native';
import { PosTag } from './pos-tag';
import { Shimmer } from './shimmer';
import { NuanceTag, type NuanceType } from './nuance-tag';
import { useThemeColor } from '@/hooks/use-theme-color';

interface WordCardProps {
  word: string;
  posTags: string[];
  gender?: 'm' | 'f' | 'n' | 'mf';
  definitions: string[];
  description: string;
  nuance?: NuanceType;
}

export function WordCard({ word, posTags, gender, definitions, description, nuance }: WordCardProps) {
  const cardBackground = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'border');
  const primaryText = useThemeColor({}, 'text');
  const secondaryText = useThemeColor({}, 'icon');
  const accent = useThemeColor({}, 'primary');

  return (
    <View style={[styles.container, { backgroundColor: cardBackground, borderColor }]}>

      <View style={styles.headerSection}>
        <View style={styles.wordAndPosContainer}>
          <Text selectable selectionColor={accent} style={[styles.word, { color: primaryText }]}>
            {word}
          </Text>
          <View style={styles.posTagList}>
            {posTags.map((tag, index) => (
              <PosTag key={index} label={tag} gender={gender} />
            ))}
          </View>
        </View>
        {nuance && <NuanceTag type={nuance} />}
      </View>

      <View style={styles.contentSection}>
        <View style={styles.definitionList}>
          {definitions.map((def, index) => (
            <Text
              key={index}
              selectable
              selectionColor={accent}
              style={[styles.definition, { color: primaryText }]}
            >
              {def}
            </Text>
          ))}
        </View>

        {description ? (
          <Text selectable selectionColor={accent} style={[styles.description, { color: secondaryText }]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 8,
    width: '100%',
    minHeight: 120,
    paddingVertical: 16,
    paddingHorizontal: 18,
    gap: 16,
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
  },
  wordAndPosContainer: {
    flex: 1,
    gap: 4,
  },
  word: {
    fontSize: 28,
    fontWeight: '400',
    lineHeight: 34,
    includeFontPadding: false,
  },
  posTagList: {
    flexDirection: 'row',
    gap: 5,
    flexWrap: 'wrap',
  },
  contentSection: {
    gap: 4,
  },
  definitionList: {
    gap: 0,
  },
  definition: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 20,
    includeFontPadding: false,
  },
  description: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    includeFontPadding: false,
  },
  descriptionShimmerContainer: {
    gap: 4,
    justifyContent: 'flex-start',
  },
  descriptionShimmer: {
    marginBottom: 4,
  },
});
