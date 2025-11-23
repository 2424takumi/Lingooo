import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  InputAccessoryView,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface KeyboardToolbarProps {
  nativeID: string;
  onDone?: () => void;
}

function ChevronDownIcon({ size = 24, color = '#242424' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 9l6 6 6-6"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * キーボード上部に表示される閉じるアイコンのツールバー
 * iOS: InputAccessoryViewを使用
 * Android: react-native-keyboard-accessoryが必要
 */
export function KeyboardToolbar({ nativeID, onDone }: KeyboardToolbarProps) {
  // iOSの場合のみInputAccessoryViewを使用
  if (Platform.OS === 'ios') {
    return (
      <InputAccessoryView nativeID={nativeID} backgroundColor="#F7F7F7">
        <View style={styles.toolbar}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onDone}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <ChevronDownIcon size={24} color="#666666" />
          </TouchableOpacity>
        </View>
      </InputAccessoryView>
    );
  }

  // Androidでは何も返さない（親コンポーネントでreact-native-keyboard-accessoryを使用）
  return null;
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F7F7F7',
    borderTopWidth: 0.5,
    borderTopColor: '#D0D0D0',
  },
  closeButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
