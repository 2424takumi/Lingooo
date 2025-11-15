import { View, Text, StyleSheet } from 'react-native';

export type NuanceType = 'casual' | 'formal' | 'neutral' | 'academic' | 'slang';

interface NuanceTagProps {
  type: NuanceType;
}

const NUANCE_CONFIG = {
  casual: {
    label: 'カジュアル',
    emoji: '😊',
    backgroundColor: '#E5F8D7',
    textColor: '#242424',
  },
  formal: {
    label: 'フォーマル',
    emoji: '💼',
    backgroundColor: '#F8DED7',
    textColor: '#242424',
  },
  neutral: {
    label: '中立的',
    emoji: '⚖️',
    backgroundColor: '#D7E8F8',
    textColor: '#242424',
  },
  academic: {
    label: '学術的',
    emoji: '📚',
    backgroundColor: '#D7E5F8',
    textColor: '#242424',
  },
  slang: {
    label: 'スラング',
    emoji: '🔥',
    backgroundColor: '#F8D7E5',
    textColor: '#242424',
  },
};

export function NuanceTag({ type }: NuanceTagProps) {
  const config = NUANCE_CONFIG[type];

  return (
    <View style={[styles.container, { backgroundColor: config.backgroundColor }]}>
      <Text style={[styles.label, { color: config.textColor }]}>{config.label}</Text>
      <Text style={styles.emoji}>{config.emoji}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
    textAlign: 'center',
    includeFontPadding: false,
  },
  emoji: {
    fontSize: 12,
    lineHeight: 16,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});
