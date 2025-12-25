import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';
import Svg, { Path } from 'react-native-svg';

interface BookmarkToastProps {
  visible: boolean;
  onAddToFolder?: () => void;
  onDismiss: () => void;
  showFolderButton?: boolean; // プレミアム機能：フォルダに追加ボタンを表示するか
}

function CheckCircleIcon({ size = 20, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22 11.08V12a10 10 0 11-5.93-9.14"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M22 4L12 14.01l-3-3"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function BookmarkToast({ visible, onAddToFolder, onDismiss, showFolderButton = true }: BookmarkToastProps) {
  const translateY = useRef(new Animated.Value(100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (visible) {
      // Show animation
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 10,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto dismiss after 3 seconds
      timeoutRef.current = setTimeout(() => {
        handleDismiss();
      }, 3000);
    } else {
      // Hide animation
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 100,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [visible]);

  const handleDismiss = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  const handleAddToFolder = () => {
    handleDismiss();
    // Small delay to let the toast animation finish before opening modal
    setTimeout(() => {
      onAddToFolder?.();
    }, 250);
  };

  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.container,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.leftSection}>
          <CheckCircleIcon size={20} color="#FFFFFF" />
          <Text style={styles.message}>ブックマークしました</Text>
        </View>
        {showFolderButton && onAddToFolder && (
          <TouchableOpacity
            onPress={handleAddToFolder}
            style={styles.button}
            hitSlop={8}
          >
            <Text style={styles.buttonText}>フォルダに追加</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  content: {
    backgroundColor: '#2C2C2C',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  message: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  button: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
