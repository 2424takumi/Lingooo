import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { SubscriptionProvider, useSubscription } from '@/contexts/subscription-context';
import { LearningLanguagesProvider, useLearningLanguages } from '@/contexts/learning-languages-context';
import { ChatProvider } from '@/contexts/chat-context';
import { AISettingsProvider } from '@/contexts/ai-settings-context';
import { TutorialProvider, useTutorial } from '@/contexts/tutorial-context';
import { ErrorBoundary } from '@/components/error-boundary';
import { InitialLanguageSetupModal } from '@/components/modals/InitialLanguageSetupModal';
import { InteractiveTutorialOverlay } from '@/components/modals/InteractiveTutorialOverlay';
import { QuotaExceededModal } from '@/components/ui/quota-exceeded-modal';
import { SubscriptionBottomSheet } from '@/components/ui/subscription-bottom-sheet';
import { startKeepalive, stopKeepalive } from '@/services/keepalive/backend-keepalive';
import { clearPromptCache } from '@/services/ai/langfuse-client';
import { useClipboardSearch } from '@/hooks/use-clipboard-search';
import { useSearch } from '@/hooks/use-search';
import { MAX_TEXT_LENGTH_FREE, MAX_TEXT_LENGTH_PREMIUM } from '@/constants/validation';
import { generateWordDetailWithHintStreaming } from '@/services/ai/dictionary-generator';
import { logger } from '@/utils/logger';
import '@/i18n'; // i18nを初期化

export const unstable_settings = {
  anchor: '(tabs)',
};

function TutorialTrigger() {
  const { t } = useTranslation();
  const { needsInteractiveTutorial } = useAuth();
  const { nativeLanguage, currentLanguage } = useLearningLanguages();
  const { tutorialState, startTutorial, skipTutorial } = useTutorial();
  const [hasTriggered, setHasTriggered] = useState(false);

  useEffect(() => {
    logger.debug('[RootLayout TutorialTrigger] State check:', {
      needsInteractiveTutorial,
      hasTriggered,
      isActive: tutorialState.isActive,
      isCompleted: tutorialState.isCompleted,
    });

    // チュートリアルが必要で、まだトリガーされていない場合
    if (needsInteractiveTutorial && !hasTriggered && !tutorialState.isActive && !tutorialState.isCompleted) {
      logger.info('[RootLayout] Triggering interactive tutorial');
      setHasTriggered(true);

      // サンプルテキストで翻訳ページに遷移
      const sampleText = t('tutorial.sampleText');
      const sourceLang = 'en';
      const targetLang = nativeLanguage.code;

      // AsyncStorage読み込み完了を待ってからチュートリアル開始 + 遷移
      setTimeout(() => {
        logger.info('[RootLayout] Starting tutorial after delay');
        startTutorial();
        logger.info('[RootLayout] Tutorial started via startTutorial()');

        // チュートリアル開始直後に遷移
        router.push({
          pathname: '/(tabs)/translate',
          params: {
            initialText: sampleText,
            sourceLang,
            targetLang,
            needsAiDetection: 'false', // サンプルテキストは言語がわかっているのでAI検出不要
          },
        });
      }, 800); // AsyncStorageの読み込みを確実に完了させてからstartTutorial()を呼ぶ
    }
  }, [needsInteractiveTutorial, hasTriggered, tutorialState.isActive, tutorialState.isCompleted, t, nativeLanguage.code, startTutorial]);

  // チュートリアルオーバーレイを表示
  if (tutorialState.isActive) {
    return (
      <InteractiveTutorialOverlay
        currentStep={tutorialState.currentStep}
        onSkip={async () => {
          await skipTutorial();
        }}
      />
    );
  }

  return null;
}

function ClipboardMonitor() {
  const { isPremium } = useSubscription();
  const { handleSearch } = useSearch();
  const { needsInitialSetup } = useAuth();
  const { tutorialState } = useTutorial();
  const [showTextLengthModal, setShowTextLengthModal] = useState(false);
  const [subscriptionVisible, setSubscriptionVisible] = useState(false);

  // アプリ全体でクリップボード監視（1回だけ）
  // 初期設定中とチュートリアル中は無効化（モーダルやチュートリアルの邪魔にならないように）
  useClipboardSearch({
    enabled: !needsInitialSetup && !tutorialState.isActive,
    onPaste: async (text: string) => {
      // 文字数制限チェック（無料プランのみ）
      const maxLength = isPremium ? MAX_TEXT_LENGTH_PREMIUM : MAX_TEXT_LENGTH_FREE;
      if (!isPremium && text.length > MAX_TEXT_LENGTH_FREE) {
        setShowTextLengthModal(true);
        return; // 検索を実行しない
      }

      // 検索を実行（適切な画面に自動遷移）
      await handleSearch(text);
    },
  });

  return (
    <>
      <QuotaExceededModal
        visible={showTextLengthModal}
        onClose={() => setShowTextLengthModal(false)}
        remainingQuestions={0}
        isPremium={isPremium}
        quotaType="text_length"
        onUpgradePress={() => {
          setShowTextLengthModal(false);
          setSubscriptionVisible(true);
        }}
      />

      <SubscriptionBottomSheet
        visible={subscriptionVisible}
        onClose={() => setSubscriptionVisible(false)}
      />
    </>
  );
}

function AppContent() {
  const colorScheme = useColorScheme();
  const { needsInitialSetup, completeInitialSetup } = useAuth();

  return (
    <>
      <SubscriptionProvider>
        <AISettingsProvider>
          <LearningLanguagesProvider>
            <TutorialProvider>
              <ChatProvider>
                {/* チュートリアルトリガー */}
                <TutorialTrigger />

              {/* クリップボード監視（アプリ全体で1回だけ） */}
              <ClipboardMonitor />

              <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                <Stack>
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
                </Stack>
                <StatusBar style="auto" />
              </ThemeProvider>
            </ChatProvider>
          </TutorialProvider>
          </LearningLanguagesProvider>
        </AISettingsProvider>
      </SubscriptionProvider>

      {/* 初期言語設定モーダル */}
      <InitialLanguageSetupModal
        visible={needsInitialSetup}
        onComplete={completeInitialSetup}
      />
    </>
  );
}

export default function RootLayout() {
  // バックエンドのKeepaliveを開始（Renderのスリープ防止）
  useEffect(() => {
    // 即座にウォームアップを実行（startKeepalive内で自動的に/warmupを呼び出す）
    // これによりLangfuseプロンプト、Gemini API、Groq APIをウォームアップ
    startKeepalive();

    // TEMPORARY: Clear mobile-side Langfuse prompt cache on app start
    // Remove this after confirming the fix works
    clearPromptCache('dictionary-additional').then(() => {
      console.log('[RootLayout] Cleared dictionary-additional cache');
    });

    // クリーンアップ時に停止
    return () => {
      stopKeepalive();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
