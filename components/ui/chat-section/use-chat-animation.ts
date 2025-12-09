
import { useRef, useEffect } from 'react';
import { Animated } from 'react-native';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import type { ChatSectionMode } from '../chat-section';

interface UseChatAnimationProps {
  isOpen: boolean;
  mode: ChatSectionMode;
  showInputInWordMode: boolean;
  calculatedMaxHeight: number;
}

export function useChatAnimation({
  isOpen,
  mode,
  showInputInWordMode,
  calculatedMaxHeight,
}: UseChatAnimationProps) {
  // Opening/Closing Animation Values (Standard Animated)
  const animatedHeight = useRef(new Animated.Value(0)).current;
  const animatedOpacity = useRef(new Animated.Value(0)).current;

  // Mode Transition Animation Values (Reanimated)
  const inputOpacity = useSharedValue(1);
  const inputScale = useSharedValue(1);
  const wordCardOpacity = useSharedValue(0);
  const wordCardScale = useSharedValue(0.85);

  // Handle Opening/Closing Animation
  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.spring(animatedHeight, {
          toValue: calculatedMaxHeight,
          useNativeDriver: false, // Layout property needs JS driver
          friction: 9,
          tension: 50,
        }),
        Animated.timing(animatedOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(animatedHeight, {
          toValue: 0,
          duration: 250,
          useNativeDriver: false,
        }),
        Animated.timing(animatedOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [isOpen, calculatedMaxHeight]);

  // Handle Mode Switching Animation (Word vs Input)
  useEffect(() => {
    if (mode === 'word' && !showInputInWordMode) {
      // Switch TO Word Card
      inputOpacity.value = withTiming(0.3, { duration: 250, easing: Easing.out(Easing.ease) });
      inputScale.value = withTiming(0.95, { duration: 250, easing: Easing.out(Easing.ease) });

      setTimeout(() => {
        wordCardOpacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) });
        wordCardScale.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) });
      }, 50);
    } else {
      // Switch TO Input
      inputOpacity.value = withTiming(1, { duration: 200, easing: Easing.in(Easing.ease) });
      inputScale.value = withTiming(1, { duration: 200, easing: Easing.in(Easing.ease) });

      wordCardOpacity.value = withTiming(0, { duration: 150, easing: Easing.in(Easing.ease) });
      wordCardScale.value = withTiming(0.85, { duration: 150, easing: Easing.in(Easing.ease) });
    }
  }, [mode, showInputInWordMode]);

  // Reanimated Styles
  const inputAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: inputOpacity.value,
      transform: [{ scale: inputScale.value }],
    };
  });

  const wordCardAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: wordCardOpacity.value,
      transform: [{ scale: wordCardScale.value }],
    };
  });

  return {
    animatedHeight,
    animatedOpacity,
    inputAnimatedStyle,
    wordCardAnimatedStyle,
  };
}
