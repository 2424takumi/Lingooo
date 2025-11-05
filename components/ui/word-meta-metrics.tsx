import { View, StyleSheet } from 'react-native';
import { FrequencyBar } from './frequency-bar';

interface WordMetaMetricsProps {
  frequency: number; // 0-100
  difficulty: number; // 0-100
  nuance: number; // 0-100 (0=casual, 50=normal, 100=formal)
}

export function WordMetaMetrics({ frequency, difficulty, nuance }: WordMetaMetricsProps) {
  return (
    <View style={styles.container}>
      <FrequencyBar
        title="使用頻度"
        value={frequency}
        leftLabel="めずらしい"
        rightLabel="よく使う"
        type="frequency"
      />
      <FrequencyBar
        title="難易度"
        value={difficulty}
        leftLabel="かんたん"
        rightLabel="むずかしい"
        type="difficulty"
      />
      <FrequencyBar
        title="ニュアンス"
        value={nuance}
        leftLabel="カジュアル"
        centerLabel="ノーマル"
        rightLabel="フォーマル"
        type="nuance"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FAFCFB',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
});
