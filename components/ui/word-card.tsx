import { View, Text, StyleSheet } from 'react-native';
import { PosTag } from './pos-tag';
import { Shimmer } from './shimmer';
import { NuanceTag, type NuanceType } from './nuance-tag';
import { SelectableText } from './selectable-text';
import { useThemeColor } from '@/hooks/use-theme-color';

interface WordCardProps {
  word: string;
  posTags: string[];
  gender?: 'm' | 'f' | 'n' | 'mf';
  definitions: string[];
  description: string;
  nuance?: NuanceType;
  onTextSelected?: (text: string) => void;
  onSelectionCleared?: () => void;
}

export function WordCard({ word, posTags, gender, definitions, description, nuance, onTextSelected, onSelectionCleared }: WordCardProps) {
  const cardBackground = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'border');
  const primaryText = useThemeColor({}, 'text');
  const secondaryText = useThemeColor({}, 'icon');
  const accent = useThemeColor({}, 'primary');

  // 配列であることを保証（後方互換性のため）
  const definitionsArray = Array.isArray(definitions) ? definitions : [definitions].filter(Boolean);

  return (
    <View style={[styles.container, { backgroundColor: cardBackground, borderColor }]}>

      <View style={styles.headerSection}>
        <View style={styles.wordAndPosContainer}>
          <SelectableText
            text={word}
            style={[styles.word, { color: primaryText }] as any}
            onSelectionChange={onTextSelected}
            onSelectionCleared={onSelectionCleared}
          />
          <View style={styles.posTagList}>
            {posTags.map((tag, index) => (
              <PosTag key={index} label={tag} gender={gender} />
            ))}
          </View>
        </View>
        {nuance && <NuanceTag type={nuance} />}
      </View>

      <View style={styles.contentSection}>
        <SelectableText
          text={definitionsArray.join('、')}
          style={[styles.definition, { color: primaryText }] as any}
          onSelectionChange={onTextSelected}
          onSelectionCleared={onSelectionCleared}
        />

        {description ? (
          <SelectableText
            text={description}
            style={[styles.description, { color: secondaryText }] as any}
            onSelectionChange={onTextSelected}
            onSelectionCleared={onSelectionCleared}
          />
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
