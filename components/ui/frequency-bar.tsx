import { View, Text, StyleSheet } from 'react-native';
import { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useThemeColor } from '@/hooks/use-theme-color';

interface FrequencyBarProps {
  title: string;
  value: number; // 0-100
  leftLabel: string;
  rightLabel?: string;
  centerLabel?: string;
  type?: 'frequency' | 'difficulty' | 'nuance';
  delay?: number; // Animation delay in ms
}

export function FrequencyBar({
  title,
  value,
  leftLabel,
  rightLabel,
  centerLabel,
  type = 'frequency',
  delay = 0,
}: FrequencyBarProps) {
  const barFillColor = useThemeColor({}, 'barFill');
  const barEmptyColor = useThemeColor({}, 'barEmpty');
  const titleColor = useThemeColor({}, 'text');
  const labelColor = useThemeColor({}, 'textSecondary');

  const animatedWidth = useSharedValue(0);

  useEffect(() => {
    // Animate from 0 to value when component mounts with delay
    setTimeout(() => {
      animatedWidth.value = withTiming(value, {
        duration: 900,
        easing: Easing.out(Easing.quad),
      });
    }, delay);
  }, [value, delay]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: `${animatedWidth.value}%`,
    };
  });

  const animatedDotStyle = useAnimatedStyle(() => {
    return {
      left: `${animatedWidth.value}%`,
    };
  });

  const isNuance = type === 'nuance';

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: titleColor }]}>{title}</Text>
      </View>

      <View style={styles.barContainer}>
        <View style={[styles.barBackground, { backgroundColor: barEmptyColor }]}>
          {!isNuance && (
            <Animated.View
              style={[
                styles.barFill,
                animatedStyle,
                { backgroundColor: barFillColor },
              ]}
            />
          )}
          {isNuance && (
            <Animated.View style={[styles.nuanceIndicator, animatedDotStyle, { backgroundColor: barFillColor }]} />
          )}
        </View>
      </View>

      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: labelColor }]}>{leftLabel}</Text>
        {centerLabel && <Text style={[styles.label, { color: labelColor }]}>{centerLabel}</Text>}
        {rightLabel && <Text style={[styles.label, styles.labelRight, { color: labelColor }]}>{rightLabel}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 52,
  },
  titleRow: {
    paddingHorizontal: 4,
    marginBottom: 6,
  },
  title: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 2,
  },
  barContainer: {
    marginBottom: 2,
  },
  barBackground: {
    height: 10,
    borderRadius: 5,
    position: 'relative',
  },
  barFill: {
    height: '100%',
    borderRadius: 5,
    overflow: 'hidden',
  },
  nuanceIndicator: {
    position: 'absolute',
    top: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    transform: [{ translateX: -6 }],
    zIndex: 10,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 1,
  },
  labelRight: {
    textAlign: 'right',
  },
});
