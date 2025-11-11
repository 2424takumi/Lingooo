import { Gesture } from 'react-native-gesture-handler';
import { router } from 'expo-router';
import { runOnJS } from 'react-native-reanimated';
import { useRef } from 'react';

/**
 * Hook that enables swipe-back gesture on a screen
 * Returns a pan gesture that can be attached to GestureDetector
 *
 * The gesture only activates when swiping from the left edge of the screen (first 50px)
 * and requires a significant rightward swipe (>100px translation or >500 velocity)
 * This ensures it won't interfere with vertical scrolling or other gestures
 *
 * Usage:
 * ```tsx
 * import { GestureDetector } from 'react-native-gesture-handler';
 * import { useSwipeBack } from '@/hooks/use-swipe-back';
 *
 * function MyScreen() {
 *   const swipeGesture = useSwipeBack();
 *
 *   return (
 *     <GestureDetector gesture={swipeGesture}>
 *       <View style={{ flex: 1 }}>...</View>
 *     </GestureDetector>
 *   );
 * }
 * ```
 */
export function useSwipeBack() {
  const startXRef = useRef(0);

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    }
  };

  const swipeGesture = Gesture.Pan()
    .activeOffsetX(50)   // Only activate when swiping right by 50px
    .failOffsetX(-5)     // Fail if swiping left
    .maxPointers(1)      // Only single finger
    .enableTrackpadTwoFingerGesture(false)
    .onStart((event) => {
      startXRef.current = event.absoluteX;
    })
    .onEnd((event) => {
      // Only process if started from left edge
      if (startXRef.current > 50) {
        return;
      }

      // Detect right swipe
      const isRightSwipe = event.translationX > 100;
      const isFastSwipe = event.velocityX > 500;

      if (isRightSwipe || isFastSwipe) {
        runOnJS(handleGoBack)();
      }
    });

  return swipeGesture;
}
