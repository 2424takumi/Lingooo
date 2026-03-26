/**
 * キーボードと同期してスムーズに移動するビュー
 *
 * iOSではKeyboard.addListenerでキーボードの高さとアニメーション時間を取得し、
 * Reanimatedのアニメーションをキーボードと同期させる。
 * useAnimatedKeyboardより遅延が少ない。
 */

import React, { useEffect } from 'react';
import { Platform, Keyboard, KeyboardAvoidingView, type ViewStyle, type StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface KeyboardAnimatedViewProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

function IOSKeyboardAnimatedView({ children, style }: KeyboardAnimatedViewProps) {
  const keyboardHeight = useSharedValue(0);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardWillShow', (e) => {
      // iOSのキーボードアニメーションと同じduration・easingで同期
      keyboardHeight.value = withTiming(e.endCoordinates.height, {
        duration: e.duration || 250,
        easing: Easing.bezier(0.17, 0.59, 0.4, 0.99),
      });
    });

    const hideSub = Keyboard.addListener('keyboardWillHide', (e) => {
      keyboardHeight.value = withTiming(0, {
        duration: e.duration || 200,
        easing: Easing.bezier(0.17, 0.59, 0.4, 0.99),
      });
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -keyboardHeight.value }],
  }));

  return (
    <Animated.View style={[style, animatedStyle]}>
      {children}
    </Animated.View>
  );
}

export function KeyboardAnimatedView({ children, style }: KeyboardAnimatedViewProps) {
  if (Platform.OS === 'ios') {
    return (
      <IOSKeyboardAnimatedView style={style}>
        {children}
      </IOSKeyboardAnimatedView>
    );
  }

  // Android: KeyboardAvoidingViewにフォールバック
  return (
    <KeyboardAvoidingView behavior="height" style={style}>
      {children}
    </KeyboardAvoidingView>
  );
}
