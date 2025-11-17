import { StyleSheet, Text, TouchableOpacity, View, Animated, Platform } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as Clipboard from 'expo-clipboard';
import * as Speech from 'expo-speech';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { logger } from '@/utils/logger';
import { useLearningLanguages } from '@/contexts/learning-languages-context';
import { SPEECH_LANGUAGE_MAP, LANGUAGE_NAME_MAP } from '@/constants/languages';
import { formatMarkdownText } from '@/utils/text-formatter';
import { showTextSelectionMenu } from './text-selection-menu';
import type { TextSelection } from '@/types/selection';
import { SelectableText } from './selectable-text';

interface TranslateCardProps {
  originalText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  isTranslating?: boolean;
}

function SpeakerIcon({ size = 20, color = '#686868' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CopyIcon({ size = 20, color = '#686868' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8 4v12a2 2 0 002 2h8a2 2 0 002-2V7.242a2 2 0 00-.602-1.43L16.083 2.57A2 2 0 0014.685 2H10a2 2 0 00-2 2z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M16 18v2a2 2 0 01-2 2H6a2 2 0 01-2-2V9a2 2 0 012-2h2"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function TranslateCard({
  originalText,
  translatedText,
  sourceLang,
  targetLang,
  isTranslating = false,
}: TranslateCardProps) {
  const router = useRouter();
  const { nativeLanguage, currentLanguage } = useLearningLanguages();
  const [isPlayingOriginal, setIsPlayingOriginal] = useState(false);
  const [isPlayingTranslated, setIsPlayingTranslated] = useState(false);
  const [isOriginalExpanded, setIsOriginalExpanded] = useState(false);
  const [showExpandButton, setShowExpandButton] = useState(false);
  const [hasCheckedLines, setHasCheckedLines] = useState(false);

  // クリップボード監視用
  const lastClipboardRef = useRef<string>('');
  const clipboardCheckInterval = useRef<NodeJS.Timeout | null>(null);
  const originalTextRef = useRef<string>(originalText);
  const translatedTextRef = useRef<string>(translatedText);
  const mountTimeRef = useRef<number>(Date.now());

  // アニメーション用の値
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  // 母国語かどうかを判定
  const isOriginalNative = sourceLang === nativeLanguage.code;
  const isTranslatedNative = targetLang === nativeLanguage.code;

  // refを最新の値で更新
  useEffect(() => {
    originalTextRef.current = originalText;
    translatedTextRef.current = translatedText;
  }, [originalText, translatedText]);

  // 翻訳文が変更されたらフェードインアニメーション
  useEffect(() => {
    if (translatedText && !isTranslating) {
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [translatedText, isTranslating]);

  // 原文が変更されたら展開状態をリセット
  useEffect(() => {
    setIsOriginalExpanded(false);
    setShowExpandButton(false);
    setHasCheckedLines(false);
  }, [originalText]);

  // 翻訳中のシマーアニメーション
  useEffect(() => {
    if (isTranslating) {
      shimmerAnim.setValue(0);
      const animation = Animated.loop(
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        })
      );
      animation.start();
      return () => animation.stop();
    }
  }, [isTranslating]); // shimmerAnimはRefなので依存配列から削除

  // 言語名を取得
  const sourceLanguageName = LANGUAGE_NAME_MAP[sourceLang] || sourceLang;
  const targetLanguageName = LANGUAGE_NAME_MAP[targetLang] || targetLang;

  const handlePlayOriginal = async () => {
    try {
      const isSpeaking = await Speech.isSpeakingAsync();
      if (isSpeaking) {
        await Speech.stop();
        setIsPlayingOriginal(false);
        setIsPlayingTranslated(false);
        return;
      }

      const speechLanguage = SPEECH_LANGUAGE_MAP[sourceLang] || 'en-US';
      setIsPlayingOriginal(true);

      Speech.speak(originalText, {
        language: speechLanguage,
        pitch: 1.0,
        rate: 0.75,
        onDone: () => {
          setIsPlayingOriginal(false);
        },
        onError: (error) => {
          logger.error('[TranslateCard] Speech error:', error);
          setIsPlayingOriginal(false);
        },
      });
    } catch (error) {
      logger.error('[TranslateCard] Failed to play original:', error);
      setIsPlayingOriginal(false);
    }
  };

  const handlePlayTranslated = async () => {
    try {
      const isSpeaking = await Speech.isSpeakingAsync();
      if (isSpeaking) {
        await Speech.stop();
        setIsPlayingOriginal(false);
        setIsPlayingTranslated(false);
        return;
      }

      const speechLanguage = SPEECH_LANGUAGE_MAP[targetLang] || 'ja-JP';
      setIsPlayingTranslated(true);

      Speech.speak(translatedText, {
        language: speechLanguage,
        pitch: 1.0,
        rate: 0.75,
        onDone: () => {
          setIsPlayingTranslated(false);
        },
        onError: (error) => {
          logger.error('[TranslateCard] Speech error:', error);
          setIsPlayingTranslated(false);
        },
      });
    } catch (error) {
      logger.error('[TranslateCard] Failed to play translated:', error);
      setIsPlayingTranslated(false);
    }
  };

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(translatedText);
      logger.info('[TranslateCard] Translation copied to clipboard');
      // TODO: トースト通知を表示
    } catch (error) {
      logger.error('[TranslateCard] Failed to copy:', error);
    }
  };

  // クリップボード監視（選択されたテキストを検出）
  useEffect(() => {
    // 初期クリップボード内容を取得（これは無視する）
    // また、originalTextとtranslatedTextもブラックリストに追加
    const initClipboard = async () => {
      try {
        const initialClip = await Clipboard.getStringAsync();
        lastClipboardRef.current = initialClip;

        // 原文と翻訳文全体もクリップボードとして無視
        // （検索画面でコピーされた内容が遷移後に検出されるのを防ぐ）
        if (initialClip === originalText || initialClip === translatedText) {
          logger.info('[TranslateCard] Ignoring original/translated text in clipboard');
        }
      } catch (error) {
        logger.error('[TranslateCard] Failed to get initial clipboard:', error);
      }
    };

    initClipboard();

    const checkClipboard = async () => {
      try {
        // マウント後2秒間はチェックをスキップ（画面遷移直後の誤検知を防ぐ）
        const timeSinceMount = Date.now() - mountTimeRef.current;
        if (timeSinceMount < 2000) {
          return;
        }

        const clipText = await Clipboard.getStringAsync();
        const lastClip = lastClipboardRef.current;

        // 新しいクリップボード内容かチェック
        if (clipText && clipText !== lastClip && clipText.length > 0) {
          // 原文または翻訳文に含まれているかチェック
          const currentOriginal = originalTextRef.current;
          const currentTranslated = translatedTextRef.current;

          // クリップボードが原文または翻訳文全体と完全一致する場合は無視
          // （検索画面からコピーされたテキストが遷移後に検出されるのを防ぐ）
          if (clipText === currentOriginal || clipText === currentTranslated) {
            lastClipboardRef.current = clipText;
            return;
          }

          const isFromOriginal = currentOriginal.includes(clipText);
          const isFromTranslated = currentTranslated.includes(clipText);

          if (isFromOriginal || isFromTranslated) {
            lastClipboardRef.current = clipText;

            logger.info('[TranslateCard] Showing selection menu for:', clipText.substring(0, 30));

            // 選択メニューを表示
            const selection: TextSelection = {
              text: clipText,
              type: isFromOriginal ? 'original' : 'translated',
            };

            showTextSelectionMenu({
              selection,
              onAsk: handleAskAboutSelection,
              onLookup: handleLookupSelection,
            });
          }
        }
      } catch (error) {
        logger.error('[TranslateCard] Clipboard check error:', error);
      }
    };

    // 500msごとにクリップボードをチェック
    clipboardCheckInterval.current = setInterval(checkClipboard, 500);

    return () => {
      if (clipboardCheckInterval.current) {
        clearInterval(clipboardCheckInterval.current);
        clipboardCheckInterval.current = null;
      }
    };
  }, []); // 空の依存配列で1回だけ実行

  // 選択テキストについて質問
  const handleAskAboutSelection = (text: string, type: 'original' | 'translated') => {
    router.push({
      pathname: '/(tabs)/chat',
      params: {
        context: JSON.stringify({
          originalText,
          translatedText,
          sourceLang,
          targetLang,
          selectedText: text,
          selectedType: type,
        }),
        scope: 'translate',
        identifier: `${sourceLang}-${targetLang}`,
      },
    });
  };

  // 選択テキストを辞書/翻訳で調べる
  const handleLookupSelection = (text: string, type: 'original' | 'translated') => {
    router.push({
      pathname: '/(tabs)/word-detail',
      params: {
        word: text,
        targetLanguage: currentLanguage.code,
      },
    });
  };

  return (
    <View style={styles.wrapper}>
      {/* Label - Outside of card */}
      <Text style={styles.label}>
        {isTranslating ? `${targetLanguageName}に翻訳しています` : `${targetLanguageName}に翻訳しました`}
      </Text>

      {/* Card */}
      <View style={styles.container}>
        {/* Original Text Section */}
        <View style={styles.originalTextSection}>
          {Platform.OS === 'ios' ? (
            <SelectableText
              text={originalText}
              style={styles.originalText}
            />
          ) : (
            <Text
              selectable={true}
              selectionColor="#007AFF"
              suppressHighlighting={false}
              style={styles.originalText}
              numberOfLines={!hasCheckedLines ? undefined : (isOriginalExpanded ? undefined : 3)}
              onTextLayout={(e) => {
                const lines = e.nativeEvent.lines;
                if (!hasCheckedLines && lines && lines.length > 3) {
                  setShowExpandButton(true);
                  setHasCheckedLines(true);
                }
              }}
            >
              {originalText}
            </Text>
          )}

          {/* Action row with speaker icon and expand button */}
          <View style={styles.originalActionsRow}>
            {!isOriginalNative && (
              <TouchableOpacity onPress={handlePlayOriginal} style={styles.speakerButton}>
                <SpeakerIcon size={18} color={isPlayingOriginal ? '#111111' : '#686868'} />
              </TouchableOpacity>
            )}

            {showExpandButton && (
              <TouchableOpacity
                onPress={() => setIsOriginalExpanded(!isOriginalExpanded)}
                style={styles.expandButton}
              >
                <Text style={styles.expandButtonText}>
                  {isOriginalExpanded ? '折りたたむ' : 'もっと見る'}
                </Text>
                <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                  <Path
                    d={isOriginalExpanded ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"}
                    stroke="#686868"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Translated Text (like answer container) */}
        <View style={styles.translatedTextContainer}>
          {isTranslating ? (
            <View style={styles.loadingContainer}>
              {/* Shimmer skeleton bars */}
              <View style={styles.shimmerContainer}>
                {[0, 1, 2].map((index) => {
                  const shimmerTranslate = shimmerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-300, 300],
                  });

                  return (
                    <View key={index} style={styles.shimmerBarWrapper}>
                      <View style={[styles.shimmerBar, { width: index === 2 ? '60%' : '100%' }]}>
                        <Animated.View
                          style={[
                            styles.shimmerOverlay,
                            {
                              transform: [{ translateX: shimmerTranslate }],
                            },
                          ]}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : (
            <Animated.View style={{ opacity: fadeAnim, gap: 16 }}>
              {Platform.OS === 'ios' ? (
                <SelectableText
                  text={formatMarkdownText(translatedText)}
                  style={styles.translatedText}
                />
              ) : (
                <Text
                  selectable={true}
                  selectionColor="#007AFF"
                  suppressHighlighting={false}
                  style={styles.translatedText}
                >
                  {formatMarkdownText(translatedText)}
                </Text>
              )}
              <View style={styles.translatedActions}>
                {!isTranslatedNative && (
                  <TouchableOpacity onPress={handlePlayTranslated} style={styles.actionButton}>
                    <SpeakerIcon size={18} color={isPlayingTranslated ? '#111111' : '#686868'} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={handleCopy} style={styles.actionButton}>
                  <CopyIcon size={18} color="#686868" />
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    color: '#ACACAC',
    fontWeight: '600',
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  container: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    backgroundColor: '#F8F8F8',
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 12,
  },
  originalTextSection: {
    gap: 12,
  },
  originalText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#686868',
    fontWeight: '400',
    letterSpacing: 0.3,
  },
  originalActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  speakerButton: {
    padding: 2,
  },
  translatedTextContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginHorizontal: -8,
    marginBottom: -10,
  },
  translatedText: {
    fontSize: 14,
    lineHeight: 24,
    color: '#000000',
    fontWeight: '400',
    letterSpacing: 0.3,
  },
  translatedActions: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  actionButton: {
    padding: 2,
  },
  loadingContainer: {
    flexDirection: 'column',
  },
  shimmerContainer: {
    gap: 10,
  },
  shimmerBarWrapper: {
    width: '100%',
    height: 16,
  },
  shimmerBar: {
    height: 16,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  shimmerOverlay: {
    width: 100,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 2,
    marginLeft: 'auto',
  },
  expandButtonText: {
    fontSize: 12,
    lineHeight: 16,
    color: '#686868',
    fontWeight: '500',
  },
});
