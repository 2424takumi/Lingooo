import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import Animated, { useAnimatedStyle, withTiming, useSharedValue } from 'react-native-reanimated';
import { useEffect } from 'react';
import Svg, { Path } from 'react-native-svg';
import { router, type Href } from 'expo-router';

interface SideMenuProps {
  visible: boolean;
  onClose: () => void;
}

// Icons
function SettingsIcon({ size = 24, color = '#000000' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 15a3 3 0 100-6 3 3 0 000 6z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function BookmarkIcon({ size = 24, color = '#000000' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function HistoryIcon({ size = 24, color = '#000000' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M1 4v6h6M23 20v-6h-6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function HelpIcon({ size = 24, color = '#000000' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 17h.01"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function InfoIcon({ size = 24, color = '#000000' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 16v-4M12 8h.01"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CrownIcon({ size = 24, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2 5l5 5 5-7 5 7 5-5v14H2V5z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function SideMenu({ visible, onClose }: SideMenuProps) {
  const translateX = useSharedValue(-300);

  useEffect(() => {
    translateX.value = withTiming(visible ? 0 : -300, {
      duration: 50,
    });
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const handleNavigation = (path: Href) => {
    onClose();
    router.push(path);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <Animated.View style={[styles.menuContainer, animatedStyle]}>
          <TouchableOpacity activeOpacity={1}>
            {/* App Name */}
            <View style={styles.header}>
              <Text style={styles.appName}>Lingooo</Text>
              <Text style={styles.appTagline}>英語学習をもっと楽しく</Text>
            </View>

            {/* Pro Plan Promotion */}
            <TouchableOpacity style={styles.proSection}>
              <View style={styles.proContent}>
                <CrownIcon size={28} color="#FFFFFF" />
                <View style={styles.proText}>
                  <Text style={styles.proTitle}>Pro版にアップグレード</Text>
                  <Text style={styles.proDescription}>
                    無制限の学習と高度な機能を利用
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Menu Items */}
            <View style={styles.menuList}>
              <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigation('/history')}>
                <HistoryIcon size={24} color="#686868" />
                <Text style={styles.menuText}>学習履歴</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigation('/bookmarks')}>
                <BookmarkIcon size={24} color="#686868" />
                <Text style={styles.menuText}>ブックマーク</Text>
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigation('/settings')}>
                <SettingsIcon size={24} color="#686868" />
                <Text style={styles.menuText}>設定</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigation('/help')}>
                <HelpIcon size={24} color="#686868" />
                <Text style={styles.menuText}>ヘルプ・サポート</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigation('/about')}>
                <InfoIcon size={24} color="#686868" />
                <Text style={styles.menuText}>アプリについて</Text>
              </TouchableOpacity>
            </View>

            {/* Version */}
            <Text style={styles.version}>Version 1.0.0</Text>
          </TouchableOpacity>
        </Animated.View>
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
    left: 6,
    top: 62,
    bottom: 62,
    width: 288,
    backgroundColor: '#FAFCFB',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    borderRadius: 12,
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    marginBottom: 24,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#00AA69',
    marginBottom: 4,
  },
  appTagline: {
    fontSize: 14,
    color: '#686868',
    fontWeight: '500',
  },
  proSection: {
    backgroundColor: '#00AA69',
    borderRadius: 15,
    padding: 16,
    marginBottom: 24,
  },
  proContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  proText: {
    flex: 1,
  },
  proTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  proDescription: {
    fontSize: 13,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  menuList: {
    gap: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  menuText: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#EBEBEB',
    marginVertical: 8,
  },
  version: {
    fontSize: 12,
    color: '#ACACAC',
    textAlign: 'center',
    marginTop: 'auto',
    paddingTop: 20,
  },
});
