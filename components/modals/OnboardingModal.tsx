import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Line, G } from 'react-native-svg';
import { useTranslation } from 'react-i18next';

interface OnboardingModalProps {
  visible: boolean;
  onComplete: () => void;
}

// Step 1: Speech bubble with "?" - represents the limits of translation
function QuestionBubbleIcon() {
  return (
    <Svg width={120} height={120} viewBox="0 0 120 120" fill="none">
      {/* Speech bubble */}
      <Path
        d="M20 30C20 22.268 26.268 16 34 16H86C93.732 16 100 22.268 100 30V62C100 69.732 93.732 76 86 76H68L56 90L52 76H34C26.268 76 20 69.732 20 62V30Z"
        stroke="#111111"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Question mark */}
      <Path
        d="M52 38C52 34 54.5 30 60 30C65.5 30 68 34 68 38C68 42 64 43 62 45C60 47 60 49 60 51"
        stroke="#00AA69"
        strokeWidth={3.5}
        strokeLinecap="round"
      />
      <Circle cx={60} cy={59} r={2.5} fill="#00AA69" />
      {/* Small dots around bubble */}
      <Circle cx={106} cy={24} r={3} fill="#E0E0E0" />
      <Circle cx={112} cy={36} r={2} fill="#E0E0E0" />
      <Circle cx={14} cy={68} r={2.5} fill="#E0E0E0" />
    </Svg>
  );
}

// Step 2: Thermometer / mood icon - represents "seeing the atmosphere"
function MoodIcon() {
  return (
    <Svg width={120} height={120} viewBox="0 0 120 120" fill="none">
      {/* Circular face outline */}
      <Circle
        cx={60}
        cy={56}
        r={36}
        stroke="#111111"
        strokeWidth={3}
      />
      {/* Left eye */}
      <Circle cx={47} cy={48} r={3} fill="#111111" />
      {/* Right eye */}
      <Circle cx={73} cy={48} r={3} fill="#111111" />
      {/* Gentle smile */}
      <Path
        d="M46 62C46 62 52 70 60 70C68 70 74 62 74 62"
        stroke="#111111"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      {/* Aura lines around face */}
      <Path d="M60 12V8" stroke="#00AA69" strokeWidth={2.5} strokeLinecap="round" />
      <Path d="M88 24L92 20" stroke="#00AA69" strokeWidth={2.5} strokeLinecap="round" />
      <Path d="M100 52H104" stroke="#00AA69" strokeWidth={2.5} strokeLinecap="round" />
      <Path d="M88 84L92 88" stroke="#00AA69" strokeWidth={2.5} strokeLinecap="round" />
      <Path d="M32 24L28 20" stroke="#00AA69" strokeWidth={2.5} strokeLinecap="round" />
      <Path d="M20 52H16" stroke="#00AA69" strokeWidth={2.5} strokeLinecap="round" />
      <Path d="M32 84L28 88" stroke="#00AA69" strokeWidth={2.5} strokeLinecap="round" />
      {/* Small sparkle */}
      <Path d="M98 10L100 6L102 10L106 12L102 14L100 18L98 14L94 12Z" fill="#00AA69" />
    </Svg>
  );
}

// Step 3: Tapping finger with glow - represents "tap to understand deeply"
function TapGlowIcon() {
  return (
    <Svg width={120} height={120} viewBox="0 0 120 120" fill="none">
      {/* Glow circle behind finger */}
      <Circle cx={60} cy={52} r={28} fill="#00AA69" opacity={0.08} />
      <Circle cx={60} cy={52} r={20} fill="#00AA69" opacity={0.12} />
      {/* Finger pointing down */}
      <G>
        {/* Finger tip (pointing) */}
        <Path
          d="M56 28V58C56 60.209 57.791 62 60 62C62.209 62 64 60.209 64 58V28C64 25.791 62.209 24 60 24C57.791 24 56 25.791 56 28Z"
          stroke="#111111"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        {/* Middle finger */}
        <Path
          d="M64 42V66C64 68.209 65.791 70 68 70C70.209 70 72 68.209 72 66V42C72 39.791 70.209 38 68 38C65.791 38 64 39.791 64 42Z"
          stroke="#111111"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        {/* Ring finger */}
        <Path
          d="M72 46V68C72 70.209 73.791 72 76 72C78.209 72 80 70.209 80 68V46C80 43.791 78.209 42 76 42C73.791 42 72 43.791 72 46Z"
          stroke="#111111"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        {/* Thumb */}
        <Path
          d="M56 50H48C45.791 50 44 51.791 44 54C44 56.209 45.791 58 48 58H56"
          stroke="#111111"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        {/* Palm connection */}
        <Path
          d="M56 58V72C56 76.418 59.582 80 64 80H76C78.209 80 80 78.209 80 76V72"
          stroke="#111111"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </G>
      {/* Sparkle lines radiating from tap point */}
      <Line x1={38} y1={30} x2={32} y2={24} stroke="#00AA69" strokeWidth={2.5} strokeLinecap="round" />
      <Line x1={82} y1={30} x2={88} y2={24} stroke="#00AA69" strokeWidth={2.5} strokeLinecap="round" />
      <Line x1={34} y1={52} x2={26} y2={52} stroke="#00AA69" strokeWidth={2.5} strokeLinecap="round" />
      {/* Ripple arcs */}
      <Path d="M46 96C46 96 52 102 60 102C68 102 74 96 74 96" stroke="#00AA69" strokeWidth={2} strokeLinecap="round" opacity={0.5} />
      <Path d="M40 104C40 104 48 112 60 112C72 112 80 104 80 104" stroke="#00AA69" strokeWidth={2} strokeLinecap="round" opacity={0.3} />
    </Svg>
  );
}

// Step indicator dots
function StepDots({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  return (
    <View style={styles.stepDotsContainer}>
      {Array.from({ length: totalSteps }, (_, i) => (
        <View
          key={i}
          style={[styles.stepDot, i === currentStep && styles.stepDotActive]}
        />
      ))}
    </View>
  );
}

export function OnboardingModal({ visible, onComplete }: OnboardingModalProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);

  const steps = [
    {
      icon: <MoodIcon />,
      title: t('onboarding.step1Title'),
      description: t('onboarding.step1Description'),
    },
    {
      icon: <TapGlowIcon />,
      title: t('onboarding.step2Title'),
      description: t('onboarding.step2Description'),
    },
    {
      icon: <QuestionBubbleIcon />,
      title: t('onboarding.step3Title'),
      description: t('onboarding.step3Description'),
    },
  ];

  const currentStep = steps[step];
  const isLastStep = step === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      setStep(0);
      onComplete();
    } else {
      setStep(prev => prev + 1);
    }
  };

  const handleSkip = () => {
    setStep(0);
    onComplete();
  };

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={() => {}}
    >
      <SafeAreaView style={styles.screen}>
        {/* Skip button - top right */}
        {!isLastStep && (
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipButtonText}>{t('onboarding.skip')}</Text>
          </TouchableOpacity>
        )}

        {/* Main content - centered */}
        <View style={styles.content}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            {currentStep.icon}
          </View>

          {/* Title */}
          <Text style={styles.title}>{currentStep.title}</Text>

          {/* Description */}
          <Text style={styles.description}>{currentStep.description}</Text>
        </View>

        {/* Bottom section - dots + button */}
        <View style={styles.bottomSection}>
          <StepDots currentStep={step} totalSteps={steps.length} />

          <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
            <Text style={styles.primaryButtonText}>
              {isLastStep ? t('onboarding.start') : t('common.next')}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  skipButtonText: {
    fontSize: 15,
    color: '#888888',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 40,
  },
  iconContainer: {
    marginBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111111',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 15,
    color: '#686868',
    textAlign: 'center',
    lineHeight: 24,
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    alignItems: 'center',
    gap: 24,
  },
  stepDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
  },
  stepDotActive: {
    backgroundColor: '#111111',
    width: 24,
  },
  primaryButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
