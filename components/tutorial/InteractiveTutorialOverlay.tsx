import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTutorialContext } from '@/contexts/tutorial-context';
import { TUTORIAL_STEPS } from '@/constants/tutorial';
import SpotlightOverlay from './SpotlightOverlay';
import TooltipBubble from './TooltipBubble';
import PulsingIndicator from './PulsingIndicator';

interface InteractiveTutorialOverlayProps {
  highlightWordPosition?: { x: number; y: number } | null;
}

export default function InteractiveTutorialOverlay({
  highlightWordPosition,
}: InteractiveTutorialOverlayProps) {
  const { t } = useTranslation();
  const { isActive, currentStep, targetRect, skipTutorial } = useTutorialContext();

  if (!isActive) return null;

  // Step 3: 完了メッセージ
  if (currentStep === TUTORIAL_STEPS.COMPLETE) {
    return (
      <View style={styles.completeOverlay} pointerEvents="auto">
        <View style={styles.completeCard}>
          <Text style={styles.completeTitle}>{t('tutorial.completeTitle')}</Text>
          <Text style={styles.completeDescription}>{t('tutorial.completeDescription')}</Text>
        </View>
      </View>
    );
  }

  if (!targetRect) return null;

  const stepConfig = getStepConfig(currentStep, t);
  if (!stepConfig) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      <SpotlightOverlay
        targetRect={targetRect}
        padding={stepConfig.spotlightPadding}
        borderRadius={stepConfig.borderRadius}
      />
      <TooltipBubble
        title={stepConfig.title}
        description={stepConfig.description}
        position={stepConfig.tooltipPosition}
        targetRect={targetRect}
        onSkip={skipTutorial}
        padding={stepConfig.spotlightPadding}
      />
      {currentStep === TUTORIAL_STEPS.SELECT_WORD && highlightWordPosition && (
        <PulsingIndicator
          x={highlightWordPosition.x}
          y={highlightWordPosition.y}
        />
      )}
    </View>
  );
}

function getStepConfig(step: number, t: (key: string) => string) {
  switch (step) {
    case TUTORIAL_STEPS.SELECT_WORD:
      return {
        title: t('tutorial.step1Title'),
        description: t('tutorial.step1Description'),
        tooltipPosition: 'above' as const,
        spotlightPadding: 8,
        borderRadius: 12,
      };
    case TUTORIAL_STEPS.VIEW_CARD:
      return {
        title: t('tutorial.step2Title'),
        description: t('tutorial.step2Description'),
        tooltipPosition: 'above' as const,
        spotlightPadding: 4,
        borderRadius: 16,
      };
    case TUTORIAL_STEPS.ASK_QUESTION:
      return {
        title: t('tutorial.step3Title'),
        description: t('tutorial.step3Description'),
        tooltipPosition: 'above' as const,
        spotlightPadding: 6,
        borderRadius: 20,
      };
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5000,
  },
  completeOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5000,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  completeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 32,
    paddingVertical: 28,
    marginHorizontal: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  completeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#00AA69',
    marginBottom: 10,
  },
  completeDescription: {
    fontSize: 15,
    color: '#555555',
    textAlign: 'center',
    lineHeight: 22,
  },
});
