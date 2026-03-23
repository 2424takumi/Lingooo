import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

interface TooltipBubbleProps {
  title: string;
  description: string;
  position: 'above' | 'below';
  targetRect: { x: number; y: number; width: number; height: number };
  onSkip: () => void;
  showSkip?: boolean;
  padding?: number;
}

export default function TooltipBubble({
  title,
  description,
  position,
  targetRect,
  onSkip,
  showSkip = true,
  padding = 8,
}: TooltipBubbleProps) {
  const { t } = useTranslation();

  const tooltipTop = position === 'above'
    ? targetRect.y - padding - 16 // 16px gap above spotlight
    : targetRect.y + targetRect.height + padding + 16; // 16px gap below spotlight

  return (
    <View
      style={[
        styles.container,
        position === 'above'
          ? { bottom: undefined, top: tooltipTop }
          : { top: tooltipTop },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.bubble}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
        {showSkip && (
          <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
            <Text style={styles.skipText}>{t('tutorial.skip')}</Text>
          </TouchableOpacity>
        )}
      </View>
      {/* Arrow */}
      <View
        style={[
          styles.arrow,
          position === 'above'
            ? styles.arrowDown
            : styles.arrowUp,
          { left: Math.min(Math.max(targetRect.x + targetRect.width / 2 - 8, 32), 320) },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 1002,
  },
  bubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 6,
  },
  description: {
    fontSize: 15,
    color: '#555555',
    lineHeight: 22,
    marginBottom: 8,
  },
  skipButton: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  skipText: {
    fontSize: 14,
    color: '#999999',
    fontWeight: '500',
  },
  arrow: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  arrowDown: {
    bottom: -8,
    borderTopWidth: 8,
    borderTopColor: '#FFFFFF',
  },
  arrowUp: {
    top: -8,
    borderBottomWidth: 8,
    borderBottomColor: '#FFFFFF',
  },
});
