import { Modal, StyleSheet, Text, TouchableOpacity, View, Dimensions } from 'react-native';
import { useState } from 'react';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { useTranslation } from 'react-i18next';

interface OnboardingModalProps {
  visible: boolean;
  onComplete: () => void;
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

// Illustration for Step 1: Translation
function TranslationIllustration() {
  return (
    <View style={styles.illustrationContainer}>
      <View style={styles.mockCard}>
        <Text style={styles.mockSourceText}>I need this by Friday.</Text>
        <View style={styles.mockDivider} />
        <Text style={styles.mockTargetText}>金曜日までにこれが必要です。</Text>
      </View>
      <Text style={styles.illustrationCaption}>
        翻訳は完了。でも…
      </Text>
    </View>
  );
}

// Illustration for Step 2: Tone Analysis
function ToneIllustration() {
  return (
    <View style={styles.illustrationContainer}>
      <View style={styles.mockCard}>
        <Text style={styles.mockSourceText}>I need this by Friday.</Text>
        <View style={styles.mockDivider} />
        <View style={styles.tonePreview}>
          <Text style={styles.toneLabel}>やや急ぎ・丁寧</Text>
          <View style={styles.toneDots}>
            {[1, 2, 3, 4, 5].map((level) => (
              <View
                key={level}
                style={[styles.toneDot, level <= 4 && styles.toneDotActive]}
              />
            ))}
          </View>
        </View>
        <Text style={styles.mockTargetText}>金曜日までにこれが必要です。</Text>
      </View>
    </View>
  );
}

// Illustration for Step 3: Tap to Understand
function TapIllustration() {
  return (
    <View style={styles.illustrationContainer}>
      <View style={styles.mockCard}>
        <View style={styles.tapTextContainer}>
          <Text style={styles.mockSourceText}>I need </Text>
          <View style={styles.highlightedWord}>
            <Text style={[styles.mockSourceText, styles.highlightedWordText]}>this</Text>
          </View>
          <Text style={styles.mockSourceText}> by Friday.</Text>
        </View>
        <View style={styles.mockDivider} />
        <View style={styles.miniWordCard}>
          <Text style={styles.miniWordCardHeadword}>これ・この</Text>
          <View style={styles.miniPosTag}>
            <Text style={styles.miniPosTagText}>代名詞</Text>
          </View>
          <Text style={styles.miniWordCardNuance}>
            この文脈では直前に議論した案件を指しています
          </Text>
        </View>
      </View>
    </View>
  );
}

export function OnboardingModal({ visible, onComplete }: OnboardingModalProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);

  const steps = [
    {
      illustration: <TranslationIllustration />,
      title: t('onboarding.step1Title'),
      description: t('onboarding.step1Description'),
    },
    {
      illustration: <ToneIllustration />,
      title: t('onboarding.step2Title'),
      description: t('onboarding.step2Description'),
    },
    {
      illustration: <TapIllustration />,
      title: t('onboarding.step3Title'),
      description: t('onboarding.step3Description'),
    },
  ];

  const currentStep = steps[step];
  const isLastStep = step === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setStep(prev => prev + 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => {}}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Skip button */}
          {!isLastStep && (
            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
              <Text style={styles.skipButtonText}>{t('onboarding.skip')}</Text>
            </TouchableOpacity>
          )}

          {/* Step dots */}
          <StepDots currentStep={step} totalSteps={steps.length} />

          {/* Illustration */}
          {currentStep.illustration}

          {/* Text content */}
          <Text style={styles.title}>{currentStep.title}</Text>
          <Text style={styles.description}>{currentStep.description}</Text>

          {/* Button */}
          <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
            <Text style={styles.primaryButtonText}>
              {isLastStep ? t('onboarding.start') : t('common.next')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    paddingTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 15,
  },
  skipButton: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  skipButtonText: {
    fontSize: 14,
    color: '#888888',
    fontWeight: '500',
  },
  stepDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
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
  illustrationContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  mockCard: {
    width: '100%',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
  },
  mockSourceText: {
    fontSize: 15,
    color: '#242424',
    lineHeight: 22,
  },
  mockDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 10,
  },
  mockTargetText: {
    fontSize: 15,
    color: '#242424',
    lineHeight: 22,
  },
  illustrationCaption: {
    fontSize: 13,
    color: '#888888',
    marginTop: 8,
    fontWeight: '500',
  },
  tonePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  toneLabel: {
    fontSize: 12,
    color: '#888888',
    fontWeight: '500',
  },
  toneDots: {
    flexDirection: 'row',
    gap: 3,
  },
  toneDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E0E0E0',
  },
  toneDotActive: {
    backgroundColor: '#888888',
  },
  tapTextContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  highlightedWord: {
    backgroundColor: '#D4EDFF',
    borderRadius: 4,
    paddingHorizontal: 2,
  },
  highlightedWordText: {
    color: '#0066CC',
    fontWeight: '600',
  },
  miniWordCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    gap: 4,
  },
  miniWordCardHeadword: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  miniPosTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  miniPosTagText: {
    fontSize: 11,
    color: '#666666',
  },
  miniWordCardNuance: {
    fontSize: 13,
    color: '#444444',
    lineHeight: 18,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#686868',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  primaryButton: {
    paddingVertical: 14,
    borderRadius: 12,
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
