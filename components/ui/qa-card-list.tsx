import { StyleSheet, View } from 'react-native';

import type { QAPair } from '@/types/chat';
import { QACard } from './qa-card';

interface QACardListProps {
  pairs: QAPair[];
  onRetry?: (question: string) => void;
  scope?: string;
  identifier?: string;
  onLastCardLayout?: (y: number) => void;
  onBookmarkAdded?: (bookmarkId: string) => void;
  onFollowUpQuestion?: (pairId: string, question: string) => Promise<void>;
  onEnterFollowUpMode?: (pairId: string, question: string) => void;
  activeFollowUpPairId?: string;
}

export function QACardList({ pairs, onRetry, scope, identifier, onLastCardLayout, onBookmarkAdded, onFollowUpQuestion, onEnterFollowUpMode, activeFollowUpPairId }: QACardListProps) {
  if (!pairs.length) {
    return null;
  }

  return (
    <View style={styles.container}>
      {pairs.map((pair, index) => {
        const isLastCard = index === pairs.length - 1;

        return (
          <View
            key={pair.id}
            onLayout={isLastCard ? (event) => {
              const { y } = event.nativeEvent.layout;
              onLastCardLayout?.(y);
            } : undefined}
          >
            <QACard
              pair={pair}
              onRetry={onRetry}
              scope={scope}
              identifier={identifier}
              onBookmarkAdded={onBookmarkAdded}
              onFollowUpQuestion={onFollowUpQuestion ? (question) => onFollowUpQuestion(pair.id, question) : undefined}
              onEnterFollowUpMode={onEnterFollowUpMode}
              isFollowUpActive={activeFollowUpPairId === pair.id}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
});
