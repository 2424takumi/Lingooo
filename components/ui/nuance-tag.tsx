import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useThemeColor } from '@/hooks/use-theme-color';

export type NuanceType = 'casual' | 'formal' | 'neutral' | 'academic' | 'slang';

interface NuanceTagProps {
  type: NuanceType;
}

const NUANCE_THEME_KEYS = {
  casual: 'nuanceCasual',
  formal: 'nuanceFormal',
  neutral: 'nuanceNeutral',
  academic: 'nuanceAcademic',
  slang: 'nuanceSlang',
} as const;

const NUANCE_EMOJIS = {
  casual: '😊',
  formal: '💼',
  neutral: '⚖️',
  academic: '📚',
  slang: '🔥',
};

export function NuanceTag({ type }: NuanceTagProps) {
  const { t } = useTranslation();
  const backgroundColor = useThemeColor({}, NUANCE_THEME_KEYS[type]);
  const textColor = useThemeColor({}, 'nuanceText');

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Text style={[styles.label, { color: textColor }]}>{t(`nuanceTag.${type}`)}</Text>
      <Text style={styles.emoji}>{NUANCE_EMOJIS[type]}</Text>
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
