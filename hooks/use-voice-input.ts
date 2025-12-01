import { useState, useCallback, useEffect, useRef } from 'react';
import Constants from 'expo-constants';
import { Audio } from 'expo-av';

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
  const [audioLevel, setAudioLevel] = useState(0);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const audioLevelIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

  // 音声レベル監視の開始
  const startAudioLevelMonitoring = useCallback(async () => {
    try {
      // 録音の準備
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // 録音開始（音声レベル取得のみに使用）
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
        undefined,
        100 // 100msごとに更新
      );

      recordingRef.current = recording;

      // 定期的に音声レベルを取得
      audioLevelIntervalRef.current = setInterval(async () => {
        if (recordingRef.current) {
          try {
            const status = await recordingRef.current.getStatusAsync();
            if (status.isRecording && status.metering !== undefined) {
              // meteringは-160から0の範囲なので、0-1に正規化
              const normalized = Math.max(0, Math.min(1, (status.metering + 160) / 160));
              setAudioLevel(normalized);
            }
          } catch (error) {
            console.error('[useVoiceInput] Audio level error:', error);
          }
        }
      }, 50); // 50msごとに更新（20fps）
    } catch (error) {
      console.error('[useVoiceInput] Start audio monitoring failed:', error);
    }
  }, []);

  // 音声レベル監視の停止
  const stopAudioLevelMonitoring = useCallback(async () => {
    // インターバルをクリア
    if (audioLevelIntervalRef.current) {
      clearInterval(audioLevelIntervalRef.current);
      audioLevelIntervalRef.current = null;
    }

    // 録音を停止
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
        recordingRef.current = null;
      } catch (error) {
        console.error('[useVoiceInput] Stop recording failed:', error);
      }
    }

    // 音声レベルをリセット
    setAudioLevel(0);
  }, []);

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

      // 音声レベル監視を開始
      await startAudioLevelMonitoring();

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
      await stopAudioLevelMonitoring();
      onError?.('音声認識の開始に失敗しました');
    }
  }, [hasPermission, onError, isSupported, startAudioLevelMonitoring, stopAudioLevelMonitoring]);

  const stopListening = useCallback(async () => {
    if (!isSupported || !ExpoSpeechRecognitionModule) return;

    try {
      ExpoSpeechRecognitionModule.stop();
      setState('processing');
      await stopAudioLevelMonitoring();
    } catch (error) {
      console.error('[useVoiceInput] Stop listening failed:', error);
      setState('idle');
      await stopAudioLevelMonitoring();
    }
  }, [isSupported, stopAudioLevelMonitoring]);

  const cancel = useCallback(async () => {
    if (!isSupported || !ExpoSpeechRecognitionModule) return;

    try {
      ExpoSpeechRecognitionModule.abort();
      setState('idle');
      setTranscript('');
      await stopAudioLevelMonitoring();
    } catch (error) {
      console.error('[useVoiceInput] Cancel failed:', error);
      await stopAudioLevelMonitoring();
    }
  }, [isSupported, stopAudioLevelMonitoring]);

  return {
    state,
    transcript,
    hasPermission,
    isSupported,
    audioLevel,
    startListening,
    stopListening,
    cancel,
    requestPermissions,
  };
}
