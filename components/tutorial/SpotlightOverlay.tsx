import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SpotlightOverlayProps {
  targetRect: { x: number; y: number; width: number; height: number } | null;
  padding?: number;
  borderRadius?: number;
  opacity?: number;
}

/**
 * SVGベースのダークオーバーレイ（角丸の穴あき・見た目のみ）
 * タッチブロックはInteractiveTutorialOverlayで管理
 */
export default function SpotlightOverlay({
  targetRect,
  padding = 8,
  borderRadius = 12,
  opacity = 0.7,
}: SpotlightOverlayProps) {
  if (!targetRect) return null;

  const x = Math.max(0, targetRect.x - padding);
  const y = Math.max(0, targetRect.y - padding);
  const w = targetRect.width + padding * 2;
  const h = targetRect.height + padding * 2;
  const r = borderRadius;

  // SVGパス: 全画面の矩形 + 角丸の穴（evenoddで反転）
  const fullScreen = `M0,0 H${SCREEN_WIDTH} V${SCREEN_HEIGHT} H0 Z`;
  const roundedHole = [
    `M${x + r},${y}`,
    `H${x + w - r}`,
    `A${r},${r} 0 0 1 ${x + w},${y + r}`,
    `V${y + h - r}`,
    `A${r},${r} 0 0 1 ${x + w - r},${y + h}`,
    `H${x + r}`,
    `A${r},${r} 0 0 1 ${x},${y + h - r}`,
    `V${y + r}`,
    `A${r},${r} 0 0 1 ${x + r},${y}`,
    'Z',
  ].join(' ');

  // ボーダー用パス
  const bx = x - 2;
  const by = y - 2;
  const bw = w + 4;
  const bh = h + 4;
  const br = r + 2;
  const borderPath = [
    `M${bx + br},${by}`,
    `H${bx + bw - br}`,
    `A${br},${br} 0 0 1 ${bx + bw},${by + br}`,
    `V${by + bh - br}`,
    `A${br},${br} 0 0 1 ${bx + bw - br},${by + bh}`,
    `H${bx + br}`,
    `A${br},${br} 0 0 1 ${bx},${by + bh - br}`,
    `V${by + br}`,
    `A${br},${br} 0 0 1 ${bx + br},${by}`,
    'Z',
  ].join(' ');

  return (
    <View style={styles.container} pointerEvents="none">
      <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT}>
        <Path
          d={`${fullScreen} ${roundedHole}`}
          fill={`rgba(0, 0, 0, ${opacity})`}
          fillRule="evenodd"
        />
        <Path
          d={borderPath}
          fill="none"
          stroke="rgba(255, 255, 255, 0.6)"
          strokeWidth={2}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
});
