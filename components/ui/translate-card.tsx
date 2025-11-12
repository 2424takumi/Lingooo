import { StyleSheet, Text, TouchableOpacity, View, Animated } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as Clipboard from 'expo-clipboard';
import * as Speech from 'expo-speech';
import { useState, useEffect, useRef } from 'react';
import { logger } from '@/utils/logger';
import { useLearningLanguages } from '@/contexts/learning-languages-context';
import Markdown from 'react-native-markdown-display';
import { SPEECH_LANGUAGE_MAP, LANGUAGE_NAME_MAP } from '@/constants/languages';

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
  const { nativeLanguage } = useLearningLanguages();
  const [isPlayingOriginal, setIsPlayingOriginal] = useState(false);
  const [isPlayingTranslated, setIsPlayingTranslated] = useState(false);
  const [isOriginalExpanded, setIsOriginalExpanded] = useState(false);
  const [showExpandButton, setShowExpandButton] = useState(false);
  const [hasCheckedLines, setHasCheckedLines] = useState(false);

  // アニメーション用の値
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  // 母国語かどうかを判定
  const isOriginalNative = sourceLang === nativeLanguage.code;
  const isTranslatedNative = targetLang === nativeLanguage.code;

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

  return (
    <View style={styles.wrapper}>
      {/* Label - Outside of card */}
      <Text style={styles.label}>{targetLanguageName}に翻訳しました</Text>

      {/* Card */}
      <View style={styles.container}>
        {/* Original Text Section */}
        <View style={styles.originalTextSection}>
          <Text
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

          {/* Action row with speaker icon and expand button */}
          <View style={styles.originalActionsRow}>
            {!isOriginalNative && (
              <TouchableOpacity onPress={handlePlayOriginal} style={styles.speakerButton}>
                <SpeakerIcon size={18} color={isPlayingOriginal ? '#00AA69' : '#686868'} />
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
              <Markdown style={markdownStyles}>{translatedText}</Markdown>
              <View style={styles.translatedActions}>
                {!isTranslatedNative && (
                  <TouchableOpacity onPress={handlePlayTranslated} style={styles.actionButton}>
                    <SpeakerIcon size={18} color={isPlayingTranslated ? '#00AA69' : '#686868'} />
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

const markdownStyles = StyleSheet.create({
  body: {
    fontSize: 14,
    lineHeight: 24,
    color: '#000000',
    fontWeight: '400',
    letterSpacing: 0.3,
  },
  heading1: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '700',
    color: '#000000',
    marginTop: 8,
    marginBottom: 8,
  },
  heading2: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
    color: '#000000',
    marginTop: 6,
    marginBottom: 6,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 8,
  },
  bullet_list: {
    marginTop: 4,
    marginBottom: 4,
  },
  ordered_list: {
    marginTop: 4,
    marginBottom: 4,
  },
  list_item: {
    marginTop: 2,
    marginBottom: 2,
  },
  bullet_list_icon: {
    fontSize: 14,
    lineHeight: 24,
    marginLeft: 0,
    marginRight: 8,
  },
  strong: {
    fontWeight: '700',
  },
  em: {
    fontStyle: 'italic',
  },
  code_inline: {
    backgroundColor: '#C8E6D1',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
    fontFamily: 'monospace',
  },
  code_block: {
    backgroundColor: '#C8E6D1',
    padding: 8,
    borderRadius: 6,
    marginTop: 4,
    marginBottom: 4,
  },
});

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
    backgroundColor: '#FAFCFB',
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
    backgroundColor: '#E5F3E8',
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
    backgroundColor: '#C8E6D1',
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
  },
  expandButtonText: {
    fontSize: 12,
    lineHeight: 16,
    color: '#686868',
    fontWeight: '500',
  },
});
