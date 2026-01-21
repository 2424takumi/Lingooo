import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Svg, { Path } from 'react-native-svg';

interface TutorialCompletionToastProps {
  visible: boolean;
  onComplete: () => void;
}

function SparklesIcon({ size = 20, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3L13.09 7.26L17 9L13.09 10.74L12 15L10.91 10.74L7 9L10.91 7.26L12 3Z"
        fill={color}
      />
      <Path d="M5 3v4M3 5h4M6 19v2M5 20h2M17 19v2M16 20h2" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
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

export function TutorialCompletionToast({ visible, onComplete }: TutorialCompletionToastProps) {
  const { t } = useTranslation();
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [currentStep, setCurrentStep] = useState(1); // 1 or 2
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  console.log('[TutorialCompletionToast] Render - visible:', visible);

  useEffect(() => {
    console.log('[TutorialCompletionToast] useEffect triggered - visible:', visible);
    if (visible) {
      console.log('[TutorialCompletionToast] Starting animation for step 1');
      // Reset to step 1
      setCurrentStep(1);

      // Show first message (scale up + fade in)
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 65,
          friction: 10,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();

      // After 2 seconds, transition to step 2
      timeoutRef.current = setTimeout(() => {
        setCurrentStep(2);

        // After another 2 seconds, complete
        timeoutRef.current = setTimeout(() => {
          // Hide animation (scale down + fade out)
          Animated.parallel([
            Animated.timing(scale, {
              toValue: 0.8,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start(() => {
            onComplete();
          });
        }, 2000);
      }, 2000);
    } else {
      // Hide immediately when visible becomes false
      scale.setValue(0.8);
      opacity.setValue(0);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [visible]);

  if (!visible) {
    console.log('[TutorialCompletionToast] Not rendering - visible is false');
    return null;
  }

  const message = currentStep === 1
    ? t('tutorialCompletion.step1')
    : t('tutorialCompletion.step2');

  console.log('[TutorialCompletionToast] Rendering with message:', message, 'currentStep:', currentStep);

  const Icon = currentStep === 1 ? CheckCircleIcon : SparklesIcon;

  return (
    <View style={styles.container}>
      <Animated.View
        pointerEvents="box-none"
        style={{
          opacity,
          transform: [{ scale }],
        }}
      >
        <View style={styles.content}>
          <Icon size={40} color="#FFFFFF" />
          <Text style={styles.message}>{message}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  content: {
    backgroundColor: '#43A047',
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 28,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 16,
    maxWidth: 340,
    minWidth: 300,
  },
  message: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
});
