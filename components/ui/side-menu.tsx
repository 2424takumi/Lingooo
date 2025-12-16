import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Dimensions,
  ScrollView,
  Platform,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  useSharedValue,
  Easing,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import Svg, { Path } from 'react-native-svg';
import { router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MENU_WIDTH = SCREEN_WIDTH * 0.75; // 75% of screen width

interface SideMenuProps {
  visible: boolean;
  onClose: () => void;
  menuButtonLayout?: { x: number; y: number; width: number; height: number };
}

// Icons
function BookmarkIcon({ size = 24, color = '#242424' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 12 16" fill="none">
      <Path
        d="M11 15L6 11L1 15V3C1 2.46957 1.21071 1.96086 1.58579 1.58579C1.96086 1.21071 2.46957 1 3 1H9C9.53043 1 10.0391 1.21071 10.4142 1.58579C10.7893 1.96086 11 2.46957 11 3V15Z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function MessagePlusIcon({ size = 24, color = '#242424' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <Path
        d="M9 11V9M9 9V7M9 9H7M9 9H11M9.00012 17C7.65126 17 6.34577 16.6252 5.2344 15.9766C5.12472 15.9133 5.06981 15.8816 5.01852 15.8676C4.97113 15.8547 4.92935 15.8502 4.88013 15.8536C4.82732 15.8573 4.77252 15.8755 4.66363 15.9117L2.72156 16.5611L2.71989 16.5619C2.30818 16.6983 2.1019 16.7665 1.96568 16.7188C1.84759 16.6776 1.75398 16.5838 1.70777 16.4657C1.65477 16.3294 1.72412 16.1239 1.86282 15.7128L1.8637 15.7102L2.51346 13.7695L2.51513 13.765C2.55142 13.657 2.5698 13.6023 2.57474 13.5497C2.57945 13.5008 2.57501 13.4587 2.56252 13.4113C2.54917 13.3607 2.51827 13.307 2.45705 13.2004L2.45434 13.1962C1.80571 12.0849 1.43 10.8239 1.43 9.5C1.43 5.35751 4.76365 2 9 2C13.2363 2 16.57 5.35751 16.57 9.5C16.57 13.6425 13.2365 17 9.00012 17Z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CloseIcon({ size = 24, color = '#242424' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 6L6 18M6 6L18 18"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  isLast?: boolean;
}

function MenuItem({ icon, label, onPress }: MenuItemProps) {
  return (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      activeOpacity={0.6}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.menuItemContent}>
        <View style={styles.iconContainer}>{icon}</View>
        <Text style={styles.menuItemText}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
}

export function SideMenu({ visible, onClose }: SideMenuProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const translateX = useSharedValue(-MENU_WIDTH);
  const overlayOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Slide in from left
      translateX.value = withTiming(0, {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      });
      overlayOpacity.value = withTiming(1, {
        duration: 300,
      });
    } else {
      // Slide out to left
      translateX.value = withTiming(-MENU_WIDTH, {
        duration: 250,
        easing: Easing.in(Easing.cubic),
      });
      overlayOpacity.value = withTiming(0, {
        duration: 250,
      });
    }
  }, [visible]);

  const menuAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const overlayAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: overlayOpacity.value,
    };
  });

  const handleNavigation = (path: Href) => {
    onClose();
    // Small delay to allow close animation to start
    setTimeout(() => {
      router.push(path);
    }, 100);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      {/* Overlay */}
      <Pressable style={styles.modalContainer} onPress={onClose}>
        <Animated.View style={[styles.overlay, overlayAnimatedStyle]} />
      </Pressable>

      {/* Side Menu Panel */}
      <Animated.View
        style={[
          styles.menuPanel,
          menuAnimatedStyle,
          {
            paddingTop: insets.top > 0 ? insets.top : 20,
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('menu.title')}</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Close menu"
          >
            <CloseIcon size={24} color="#242424" />
          </TouchableOpacity>
        </View>

        {/* Menu Items */}
        <ScrollView
          style={styles.menuContent}
          contentContainerStyle={styles.menuContentContainer}
          showsVerticalScrollIndicator={false}
        >
          <MenuItem
            icon={<BookmarkIcon size={24} color="#242424" />}
            label={t('menu.bookmarks')}
            onPress={() => handleNavigation('/bookmarks')}
          />
          <MenuItem
            icon={<MessagePlusIcon size={24} color="#242424" />}
            label={t('menu.customQuestions')}
            onPress={() => handleNavigation('/custom-questions')}
          />
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  menuPanel: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: MENU_WIDTH,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111111',
  },
  closeButton: {
    padding: 4,
  },
  menuContent: {
    flex: 1,
  },
  menuContentContainer: {
    paddingTop: 8,
  },
  menuItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111111',
  },
});
