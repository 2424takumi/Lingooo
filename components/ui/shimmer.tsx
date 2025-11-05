/**
 * シマーエフェクト（Skeleton UI）
 *
 * コンテンツ読み込み中に、光が流れるアニメーションを表示
 */

import { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface ShimmerProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export function Shimmer({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style
}: ShimmerProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [animatedValue]);

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-350, 350],
  });

  return (
    <View
      style={[
        styles.container,
        { width, height, borderRadius },
        style
      ]}
    >
      <Animated.View
        style={[
          styles.shimmer,
          {
            transform: [{ translateX }],
          },
        ]}
      >
        <LinearGradient
          colors={['#E8E8E8', '#F5F5F5', '#E8E8E8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        />
      </Animated.View>
    </View>
  );
}

/**
 * 単語ヘッダー用のシマー
 */
export function ShimmerHeader() {
  return (
    <View style={styles.headerShimmer}>
      <Shimmer width={120} height={40} borderRadius={8} />
      <View style={styles.posTagsShimmer}>
        <Shimmer width={60} height={24} borderRadius={12} />
        <Shimmer width={60} height={24} borderRadius={12} />
      </View>
    </View>
  );
}

/**
 * 定義リスト用のシマー
 */
export function ShimmerDefinitions() {
  return (
    <View style={styles.definitionsShimmer}>
      <View style={styles.definitionItem}>
        <Shimmer width={8} height={8} borderRadius={4} style={styles.bullet} />
        <Shimmer width="85%" height={20} />
      </View>
      <View style={styles.definitionItem}>
        <Shimmer width={8} height={8} borderRadius={4} style={styles.bullet} />
        <Shimmer width="80%" height={20} />
      </View>
      <View style={styles.definitionItem}>
        <Shimmer width={8} height={8} borderRadius={4} style={styles.bullet} />
        <Shimmer width="75%" height={20} />
      </View>
    </View>
  );
}

/**
 * メトリクス用のシマー
 */
export function ShimmerMetrics() {
  return (
    <View style={styles.metricsShimmer}>
      <View style={styles.metricItem}>
        <Shimmer width={60} height={12} style={styles.metricLabel} />
        <Shimmer width="100%" height={8} borderRadius={4} />
        <View style={styles.metricLabels}>
          <Shimmer width={50} height={10} />
          <Shimmer width={50} height={10} />
        </View>
      </View>
      <View style={styles.metricItem}>
        <Shimmer width={60} height={12} style={styles.metricLabel} />
        <Shimmer width="100%" height={8} borderRadius={4} />
        <View style={styles.metricLabels}>
          <Shimmer width={50} height={10} />
          <Shimmer width={50} height={10} />
        </View>
      </View>
      <View style={styles.metricItem}>
        <Shimmer width={80} height={12} style={styles.metricLabel} />
        <Shimmer width="100%" height={8} borderRadius={4} />
        <View style={styles.metricLabels}>
          <Shimmer width={60} height={10} />
          <Shimmer width={50} height={10} />
          <Shimmer width={60} height={10} />
        </View>
      </View>
    </View>
  );
}

/**
 * 例文用のシマー
 */
export function ShimmerExamples() {
  return (
    <View style={styles.examplesShimmer}>
      <View style={styles.exampleCard}>
        <Shimmer width="90%" height={18} style={styles.exampleLine} />
        <Shimmer width="85%" height={18} style={styles.exampleLine} />
        <Shimmer width="80%" height={14} />
      </View>
      <View style={styles.exampleCard}>
        <Shimmer width="85%" height={18} style={styles.exampleLine} />
        <Shimmer width="88%" height={18} style={styles.exampleLine} />
        <Shimmer width="75%" height={14} />
      </View>
      <View style={styles.exampleCard}>
        <Shimmer width="92%" height={18} style={styles.exampleLine} />
        <Shimmer width="82%" height={18} style={styles.exampleLine} />
        <Shimmer width="78%" height={14} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#E8E8E8',
    overflow: 'hidden',
  },
  shimmer: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    flex: 1,
    width: 350,
  },
  headerShimmer: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 24,
  },
  posTagsShimmer: {
    flexDirection: 'row',
    gap: 8,
  },
  definitionsShimmer: {
    gap: 8,
  },
  definitionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bullet: {
    flexShrink: 0,
  },
  metricsShimmer: {
    backgroundColor: '#FAFCFB',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  metricItem: {
    gap: 8,
  },
  metricLabel: {
    marginBottom: 4,
  },
  metricLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  examplesShimmer: {
    gap: 12,
  },
  exampleCard: {
    backgroundColor: '#FAFCFB',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  exampleLine: {
    marginBottom: 4,
  },
  shimmerItem: {
    marginBottom: 4,
  },
});
