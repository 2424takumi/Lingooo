import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import Animated, { useAnimatedStyle, withSpring, useSharedValue } from 'react-native-reanimated';
import { useEffect } from 'react';
import Svg, { Path } from 'react-native-svg';
import { router, type Href } from 'expo-router';

interface SideMenuProps {
  visible: boolean;
  onClose: () => void;
  menuButtonLayout?: { x: number; y: number; width: number; height: number };
}

// Icons
function BookmarkIcon({ size = 16, color = '#242424' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 12 16" fill="none">
      <Path
        d="M11 15L6 11L1 15V3C1 2.46957 1.21071 1.96086 1.58579 1.58579C1.96086 1.21071 2.46957 1 3 1H9C9.53043 1 10.0391 1.21071 10.4142 1.58579C10.7893 1.96086 11 2.46957 11 3V15Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function MessagePlusIcon({ size = 22, color = '#242424' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <Path
        d="M9 11V9M9 9V7M9 9H7M9 9H11M9.00012 17C7.65126 17 6.34577 16.6252 5.2344 15.9766C5.12472 15.9133 5.06981 15.8816 5.01852 15.8676C4.97113 15.8547 4.92935 15.8502 4.88013 15.8536C4.82732 15.8573 4.77252 15.8755 4.66363 15.9117L2.72156 16.5611L2.71989 16.5619C2.30818 16.6983 2.1019 16.7665 1.96568 16.7188C1.84759 16.6776 1.75398 16.5838 1.70777 16.4657C1.65477 16.3294 1.72412 16.1239 1.86282 15.7128L1.8637 15.7102L2.51346 13.7695L2.51513 13.765C2.55142 13.657 2.5698 13.6023 2.57474 13.5497C2.57945 13.5008 2.57501 13.4587 2.56252 13.4113C2.54917 13.3607 2.51827 13.307 2.45705 13.2004L2.45434 13.1962C1.80571 12.0849 1.43 10.8239 1.43 9.5C1.43 5.35751 4.76365 2 9 2C13.2363 2 16.57 5.35751 16.57 9.5C16.57 13.6425 13.2365 17 9.00012 17Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function SideMenu({ visible, onClose, menuButtonLayout }: SideMenuProps) {
  const item1Opacity = useSharedValue(0);
  const item1TranslateY = useSharedValue(-10);
  const item2Opacity = useSharedValue(0);
  const item2TranslateY = useSharedValue(-10);

  useEffect(() => {
    if (visible) {
      // シンプルなフェードインアニメーション
      item1Opacity.value = withSpring(1, { damping: 20, stiffness: 200 });
      item1TranslateY.value = withSpring(0, { damping: 20, stiffness: 200 });

      // 2つ目のアイテム（ごく短い遅延）
      setTimeout(() => {
        item2Opacity.value = withSpring(1, { damping: 20, stiffness: 200 });
        item2TranslateY.value = withSpring(0, { damping: 20, stiffness: 200 });
      }, 40);
    } else {
      item1Opacity.value = 0;
      item1TranslateY.value = -10;
      item2Opacity.value = 0;
      item2TranslateY.value = -10;
    }
  }, [visible]);

  const item1AnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: item1Opacity.value,
      transform: [{ translateY: item1TranslateY.value }],
    };
  });

  const item2AnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: item2Opacity.value,
      transform: [{ translateY: item2TranslateY.value }],
    };
  });

  const handleNavigation = (path: Href) => {
    onClose();
    router.push(path);
  };

  if (!visible) return null;

  // ハンバーガーボタンの下に配置するための位置計算
  const menuTop = menuButtonLayout ? menuButtonLayout.y + menuButtonLayout.height + 10 : 96;
  const menuLeft = menuButtonLayout ? menuButtonLayout.x - 4 : 7;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={[styles.menuContainer, { top: menuTop, left: menuLeft }]}>
          {/* ブックマーク */}
          <Animated.View style={item1AnimatedStyle}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleNavigation('/bookmarks')}
              activeOpacity={0.7}
            >
              <View style={styles.iconButton}>
                <BookmarkIcon size={20} color="#242424" />
              </View>
              <Text style={styles.menuText}>ブックマーク</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* カスタム質問 */}
          <Animated.View style={item2AnimatedStyle}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleNavigation('/custom-questions')}
              activeOpacity={0.7}
            >
              <View style={styles.iconButton}>
                <View style={{ transform: [{ translateX: 0.5 }, { translateY: -1 }] }}>
                  <MessagePlusIcon size={24} color="#242424" />
                </View>
              </View>
              <Text style={styles.menuText}>カスタム質問</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  menuContainer: {
    position: 'absolute',
    paddingVertical: 0,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
    paddingRight: 18,
    paddingVertical: 4,
  },
  iconButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  menuText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
