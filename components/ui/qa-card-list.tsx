import { StyleSheet, View } from 'react-native';

import type { QAPair } from '@/types/chat';
import { QACard } from './qa-card';

interface QACardListProps {
  pairs: QAPair[];
  onRetry?: (question: string) => void;
}

export function QACardList({ pairs, onRetry }: QACardListProps) {
  if (!pairs.length) {
    return null;
  }

  return (
    <View style={styles.container}>
      {pairs.map((pair) => (
        <QACard key={pair.id} pair={pair} onRetry={onRetry} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
});
