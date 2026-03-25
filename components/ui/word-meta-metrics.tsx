import { View, StyleSheet } from 'react-native';
import { FrequencyBar } from './frequency-bar';
import { useTranslation } from 'react-i18next';
import { useThemeColor } from '@/hooks/use-theme-color';

interface WordMetaMetricsProps {
  frequency: number; // 0-100
  difficulty: number; // 0-100
  nuance: number; // 0-100 (0=casual, 50=normal, 100=formal)
}

export function WordMetaMetrics({ frequency, difficulty, nuance }: WordMetaMetricsProps) {
  const { t } = useTranslation();
  const cardBg = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'border');

  return (
    <View style={[styles.container, { backgroundColor: cardBg, borderColor }]}>
      <FrequencyBar
        title={t('metrics.frequency')}
        value={frequency}
        leftLabel={t('metrics.rare')}
        rightLabel={t('metrics.common')}
        type="frequency"
        delay={0}
      />
      <FrequencyBar
        title={t('metrics.difficulty')}
        value={difficulty}
        leftLabel={t('metrics.easy')}
        rightLabel={t('metrics.hard')}
        type="difficulty"
        delay={80}
      />
      <FrequencyBar
        title={t('metrics.nuance')}
        value={nuance}
        leftLabel={t('metrics.casual')}
        centerLabel={t('metrics.normal')}
        rightLabel={t('metrics.formal')}
        type="nuance"
        delay={160}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
});
