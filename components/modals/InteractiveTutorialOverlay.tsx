import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Svg, { Path } from 'react-native-svg';
import type { TutorialStep } from '@/hooks/use-tutorial-state';

function CloseIcon({ size = 20, color = '#666666' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 6L6 18M6 6l12 12"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

interface InteractiveTutorialOverlayProps {
  currentStep: TutorialStep;
  onSkip: () => void;
}

export function InteractiveTutorialOverlay({
  currentStep,
  onSkip,
}: InteractiveTutorialOverlayProps) {
  const { t } = useTranslation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  // ステップが変わるたびにアニメーション
  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(20);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentStep]);

  if (currentStep === 'completed') {
    return null;
  }

  // ステップごとの位置を決定
  const getTooltipPosition = () => {
    switch (currentStep) {
      case 1:
        return { top: 330, alignSelf: 'center' as const };
      case 2:
        return { bottom: 300, alignSelf: 'center' as const };
      case 3:
        return { bottom: 150, alignSelf: 'center' as const };
      default:
        return { bottom: 140, alignSelf: 'center' as const };
    }
  };

  const tooltipPosition = getTooltipPosition();

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* スキップボタン */}
      <TouchableOpacity
        style={styles.skipButton}
        onPress={onSkip}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        pointerEvents="auto"
      >
        <CloseIcon size={24} color="#FFFFFF" />
        <Text style={styles.skipText}>{t('tutorial.skip')}</Text>
      </TouchableOpacity>

      {/* ツールチップ */}
      <Animated.View
        style={[
          styles.tooltip,
          tooltipPosition,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
        pointerEvents="auto"
      >
        {/* 矢印（ステップに応じて上下を変える） */}
        {currentStep === 1 && (
          <View style={styles.arrowUpOnTop}>
            <Svg width={20} height={10} viewBox="0 0 20 10">
              <Path d="M10 0L20 10H0L10 0Z" fill="#111111" />
            </Svg>
          </View>
        )}

        <View style={styles.tooltipContent}>
          <Text style={styles.tooltipTitle}>
            {t(`tutorial.step${currentStep}.title`)}
          </Text>
          <Text style={styles.tooltipDescription}>
            {t(`tutorial.step${currentStep}.description`)}
          </Text>
        </View>

        {currentStep === 2 && (
          <View style={styles.arrowDown}>
            <Svg width={20} height={10} viewBox="0 0 20 10">
              <Path d="M10 10L0 0H20L10 10Z" fill="#111111" />
            </Svg>
          </View>
        )}
        {currentStep === 3 && (
          <View style={styles.arrowDown}>
            <Svg width={20} height={10} viewBox="0 0 20 10">
              <Path d="M10 10L0 0H20L10 10Z" fill="#111111" />
            </Svg>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    zIndex: 10000,
  },
  skipText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  tooltip: {
    position: 'absolute',
    width: 280,
    zIndex: 9999,
  },
  tooltipContent: {
    backgroundColor: '#111111',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  tooltipTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  tooltipDescription: {
    fontSize: 14,
    fontWeight: '400',
    color: '#CCCCCC',
    lineHeight: 20,
    textAlign: 'center',
  },
  arrowDown: {
    alignSelf: 'center',
    marginTop: -1,
  },
  arrowUp: {
    alignSelf: 'center',
    marginBottom: -1,
  },
  arrowUpOnTop: {
    alignSelf: 'center',
    marginBottom: -1,
  },
});
