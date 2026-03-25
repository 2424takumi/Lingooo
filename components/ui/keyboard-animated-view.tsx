/**
 * キーボードと同期してスムーズに移動するビュー
 *
 * KeyboardAvoidingViewの代替。reanimatedのuseAnimatedKeyboardを使い、
 * iOSのキーボードアニメーションとフレーム単位で同期する。
 * Androidでは従来のKeyboardAvoidingViewにフォールバック。
 */

import React from 'react';
import { Platform, KeyboardAvoidingView, type ViewStyle, type StyleProp } from 'react-native';
import Animated, {
  useAnimatedKeyboard,
  useAnimatedStyle,
} from 'react-native-reanimated';

interface KeyboardAnimatedViewProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

function IOSKeyboardAnimatedView({ children, style }: KeyboardAnimatedViewProps) {
  const keyboard = useAnimatedKeyboard();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -keyboard.height.value }],
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
