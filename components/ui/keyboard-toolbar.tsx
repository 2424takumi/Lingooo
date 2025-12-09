import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  InputAccessoryView,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { logger } from '@/utils/logger';

interface KeyboardToolbarProps {
  nativeID: string;
  onDone?: () => void;
  isVisible?: boolean;
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
export function KeyboardToolbar({ nativeID, onDone, isVisible = true }: KeyboardToolbarProps) {
  // iOSの場合のみInputAccessoryViewを使用
  if (Platform.OS === 'ios') {
    return (
      <InputAccessoryView nativeID={nativeID} style={{ pointerEvents: 'box-none' }}>
        {isVisible ? (
          <View
            style={styles.toolbar}
            onTouchStart={() => {
              logger.debug('[KeyboardToolbar] Toolbar onTouchStart', { isVisible });
            }}
            onStartShouldSetResponder={() => {
              logger.debug('[KeyboardToolbar] Toolbar onStartShouldSetResponder', { isVisible });
              return false;
            }}
          >
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onDone}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <ChevronDownIcon size={24} color="#666666" />
            </TouchableOpacity>
          </View>
        ) : (
          <View
            style={styles.hiddenToolbar}
            pointerEvents="none"
            onTouchStart={() => {
              logger.debug('[KeyboardToolbar] HiddenToolbar onTouchStart', { isVisible });
            }}
            onStartShouldSetResponder={() => {
              logger.debug('[KeyboardToolbar] HiddenToolbar onStartShouldSetResponder', { isVisible });
              return false;
            }}
          />
        )}
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
    height: 48, // 固定高さ（約12pxの余白 + アイコン36px）
    backgroundColor: '#F7F7F7',
    borderTopWidth: 0.5,
    borderTopColor: '#D0D0D0',
  },
  hiddenToolbar: {
    height: 48, // 常にtoolbarと同じ高さ（位置計算のため）
    backgroundColor: 'transparent', // 透明で視覚的に隠す
    overflow: 'hidden',
  },
  closeButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
