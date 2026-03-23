import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SpotlightOverlayProps {
  targetRect: { x: number; y: number; width: number; height: number } | null;
  padding?: number;
  borderRadius?: number;
  opacity?: number;
}

/**
 * 4分割のダークオーバーレイ（中央透過）
 * - 暗い4領域: pointerEvents="auto"（タップブロック）
 * - 親View: pointerEvents="box-none"（透過領域のタッチを通す）
 */
export default function SpotlightOverlay({
  targetRect,
  padding = 8,
  borderRadius = 12,
  opacity = 0.7,
}: SpotlightOverlayProps) {
  if (!targetRect) return null;

  const left = Math.max(0, targetRect.x - padding);
  const top = Math.max(0, targetRect.y - padding);
  const width = targetRect.width + padding * 2;
  const height = targetRect.height + padding * 2;
  const right = left + width;
  const bottom = top + height;

  const darkColor = `rgba(0, 0, 0, ${opacity})`;

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Top dark region */}
      <View
        style={[styles.dark, { top: 0, left: 0, right: 0, height: top, backgroundColor: darkColor }]}
        pointerEvents="auto"
      />
      {/* Left dark region */}
      <View
        style={[styles.dark, { top, left: 0, width: left, height, backgroundColor: darkColor }]}
        pointerEvents="auto"
      />
      {/* Right dark region */}
      <View
        style={[styles.dark, { top, left: right, right: 0, height, backgroundColor: darkColor }]}
        pointerEvents="auto"
      />
      {/* Bottom dark region */}
      <View
        style={[styles.dark, { top: bottom, left: 0, right: 0, bottom: 0, backgroundColor: darkColor }]}
        pointerEvents="auto"
      />
      {/* Spotlight border (transparent center with rounded border) */}
      <View
        style={[
          styles.spotlightBorder,
          {
            top: top - 2,
            left: left - 2,
            width: width + 4,
            height: height + 4,
            borderRadius: borderRadius + 2,
          },
        ]}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5001,
  },
  dark: {
    position: 'absolute',
  },
  spotlightBorder: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
});
