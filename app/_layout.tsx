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
import { ErrorBoundary } from '@/components/error-boundary';
import { InitialLanguageSetupModal } from '@/components/modals/InitialLanguageSetupModal';
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

function ClipboardMonitor() {
  const { isPremium } = useSubscription();
  const { handleSearch } = useSearch();
  const { needsInitialSetup } = useAuth();
  const [showTextLengthModal, setShowTextLengthModal] = useState(false);
  const [subscriptionVisible, setSubscriptionVisible] = useState(false);

  // アプリ全体でクリップボード監視（1回だけ）
  // 初期設定中は無効化（モーダルの邪魔にならないように）
  useClipboardSearch({
    enabled: !needsInitialSetup,
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
            <ChatProvider>
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
