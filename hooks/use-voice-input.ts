import { useState, useCallback, useEffect } from 'react';
import Constants from 'expo-constants';

interface UseVoiceInputOptions {
  onResult?: (text: string) => void;
  onError?: (error: string) => void;
}

export type VoiceInputState = 'idle' | 'listening' | 'processing';

// Expo Goかどうかを判定
const isExpoGo = Constants.appOwnership === 'expo';

// 動的にモジュールをインポート
let ExpoSpeechRecognitionModule: any = null;
let useSpeechRecognitionEvent: any = null;

if (!isExpoGo) {
  try {
    const module = require('expo-speech-recognition');
    ExpoSpeechRecognitionModule = module.ExpoSpeechRecognitionModule;
    useSpeechRecognitionEvent = module.useSpeechRecognitionEvent;
  } catch (error) {
    console.log('[useVoiceInput] Speech recognition module not available');
  }
}

export function useVoiceInput({ onResult, onError }: UseVoiceInputOptions = {}) {
  const [state, setState] = useState<VoiceInputState>('idle');
  const [transcript, setTranscript] = useState('');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isSupported, setIsSupported] = useState(!isExpoGo && ExpoSpeechRecognitionModule !== null);

  // パーミッションチェック
  useEffect(() => {
    if (isSupported) {
      checkPermissions();
    }
  }, [isSupported]);

  const checkPermissions = async () => {
    if (!isSupported || !ExpoSpeechRecognitionModule) return;

    try {
      const { status } = await ExpoSpeechRecognitionModule.getPermissionsAsync();
      setHasPermission(status === 'granted');
    } catch (error) {
      console.error('[useVoiceInput] Permission check failed:', error);
      setHasPermission(false);
    }
  };

  const requestPermissions = async () => {
    if (!isSupported || !ExpoSpeechRecognitionModule) return false;

    try {
      const { status } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      setHasPermission(status === 'granted');
      return status === 'granted';
    } catch (error) {
      console.error('[useVoiceInput] Permission request failed:', error);
      setHasPermission(false);
      return false;
    }
  };

  // 音声認識イベントハンドラー（Expo Goでない場合のみ）
  if (isSupported && useSpeechRecognitionEvent) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useSpeechRecognitionEvent('result', (event: any) => {
      const transcriptText = event.results[0]?.transcript || '';
      setTranscript(transcriptText);
    });

    // eslint-disable-next-line react-hooks/rules-of-hooks
    useSpeechRecognitionEvent('end', () => {
      setState('idle');
      if (transcript) {
        onResult?.(transcript);
        setTranscript('');
      }
    });

    // eslint-disable-next-line react-hooks/rules-of-hooks
    useSpeechRecognitionEvent('error', (event: any) => {
      setState('idle');
      console.error('[useVoiceInput] Recognition error:', event.error);
      onError?.(event.error || '音声認識に失敗しました');
    });
  }

  const startListening = useCallback(async () => {
    if (!isSupported || !ExpoSpeechRecognitionModule) {
      onError?.('音声認識機能は開発ビルドでのみ利用可能です');
      return;
    }

    try {
      // パーミッションチェック
      if (hasPermission === null) {
        await checkPermissions();
      }

      if (hasPermission === false) {
        const granted = await requestPermissions();
        if (!granted) {
          onError?.('マイクの権限が必要です');
          return;
        }
      }

      setState('listening');
      setTranscript('');

      // 音声認識開始
      ExpoSpeechRecognitionModule.start({
        lang: 'ja-JP', // デフォルトは日本語
        interimResults: true,
        maxAlternatives: 1,
        continuous: false,
        requiresOnDeviceRecognition: false,
        addsPunctuation: false,
      });
    } catch (error) {
      console.error('[useVoiceInput] Start listening failed:', error);
      setState('idle');
      onError?.('音声認識の開始に失敗しました');
    }
  }, [hasPermission, onError, isSupported]);

  const stopListening = useCallback(() => {
    if (!isSupported || !ExpoSpeechRecognitionModule) return;

    try {
      ExpoSpeechRecognitionModule.stop();
      setState('processing');
    } catch (error) {
      console.error('[useVoiceInput] Stop listening failed:', error);
      setState('idle');
    }
  }, [isSupported]);

  const cancel = useCallback(() => {
    if (!isSupported || !ExpoSpeechRecognitionModule) return;

    try {
      ExpoSpeechRecognitionModule.abort();
      setState('idle');
      setTranscript('');
    } catch (error) {
      console.error('[useVoiceInput] Cancel failed:', error);
    }
  }, [isSupported]);

  return {
    state,
    transcript,
    hasPermission,
    isSupported,
    startListening,
    stopListening,
    cancel,
    requestPermissions,
  };
}
