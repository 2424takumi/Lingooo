import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface ScanningOverlayProps {
  /**
   * Duration for one direction of movement (up-to-down or down-to-up) in milliseconds
   * Default: 2500ms
   */
  duration?: number;
  /**
   * Height of the scanning line/gradient band in pixels
   * Default: 30px
   */
  scanLineHeight?: number;
  /**
   * Blur amount (simulated with gradient opacity)
   * Default: 0.6
   */
  blurOpacity?: number;
}

/**
 * ScanningOverlay
 *
 * Displays an animated white blurred light that moves up and down over an image,
 * creating a scanning effect during OCR/translation processing.
 *
 * Features:
 * - White gradient with blur effect (white → transparent)
 * - Smooth up-down-up reciprocating motion
 * - Uses native driver for optimal performance
 * - Loops indefinitely until component unmounts
 *
 * Usage:
 * <View style={styles.imageContainer}>
 *   <Image source={{ uri: imageUri }} />
 *   {isProcessing && <ScanningOverlay />}
 * </View>
 */
export function ScanningOverlay({
  duration = 2500,
  scanLineHeight = 30,
  blurOpacity = 0.6,
}: ScanningOverlayProps) {
  const { height: screenHeight } = Dimensions.get('window');
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Create reciprocating animation: top → bottom → top
    const animation = Animated.loop(
      Animated.sequence([
        // Move from top to bottom
        Animated.timing(translateY, {
          toValue: screenHeight,
          duration,
          useNativeDriver: true,
        }),
        // Move from bottom back to top
        Animated.timing(translateY, {
          toValue: 0,
          duration,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [duration, screenHeight, translateY]);

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View
        style={[
          styles.scanLineContainer,
          {
            height: scanLineHeight,
            transform: [{ translateY }],
          },
        ]}
      >
        <LinearGradient
          colors={[
            `rgba(255, 255, 255, 0)`,
            `rgba(255, 255, 255, ${blurOpacity})`,
            `rgba(255, 255, 255, ${blurOpacity})`,
            `rgba(255, 255, 255, 0)`,
          ]}
          locations={[0, 0.3, 0.7, 1]}
          style={styles.gradient}
        />
        {/* Additional blur effect layer */}
        <LinearGradient
          colors={[
            `rgba(255, 255, 255, 0)`,
            `rgba(255, 255, 255, ${blurOpacity * 0.5})`,
            `rgba(255, 255, 255, 0)`,
          ]}
          locations={[0, 0.5, 1]}
          style={[styles.gradient, styles.blurLayer]}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  scanLineContainer: {
    width: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  gradient: {
    flex: 1,
    width: '100%',
  },
  blurLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
