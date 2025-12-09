import { StyleSheet, Text, TouchableOpacity, View, Animated, PanResponder, TouchableWithoutFeedback } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as Clipboard from 'expo-clipboard';
import * as Speech from 'expo-speech';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { logger } from '@/utils/logger';
import { useLearningLanguages } from '@/contexts/learning-languages-context';
import { SPEECH_LANGUAGE_MAP, LANGUAGE_NAME_MAP } from '@/constants/languages';
import { formatMarkdownText } from '@/utils/text-formatter';
import { SelectableText, SelectionInfo } from './selectable-text';
import type { Paragraph } from '@/services/api/paragraph-splitter';

interface TranslateCardProps {
  // 段落配列（単一段落の場合も配列で渡す）
  paragraphs: Paragraph[];
  // 現在表示中の段落インデックス
  currentIndex: number;
  // 段落変更ハンドラー
  onIndexChange: (index: number) => void;
  sourceLang: string;
  targetLang: string;
  isTranslating?: boolean;
  onTextSelected?: (text: string, type: 'original' | 'translated') => void;
  onTextSelectionWithInfo?: (selectionInfo: SelectionInfo, type: 'original' | 'translated') => void;
  onSelectionCleared?: () => void;
  clearSelectionKey?: number; // 値が変わると選択がクリアされる
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

function CaretIcon({ rotation = 0, size = 24 }: { rotation?: number; size?: number }) {
  return (
    <View style={{ transform: [{ rotate: `${rotation}deg` }] }}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M6 9l6 6 6-6"
          stroke="#686868"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

export function TranslateCard({
  paragraphs,
  currentIndex,
  onIndexChange,
  sourceLang,
  targetLang,
  isTranslating = false,
  onTextSelected,
  onTextSelectionWithInfo,
  onSelectionCleared,
  clearSelectionKey,
}: TranslateCardProps) {
  const router = useRouter();
  const { nativeLanguage, currentLanguage } = useLearningLanguages();
  const [isPlayingOriginal, setIsPlayingOriginal] = useState(false);
  const [isPlayingTranslated, setIsPlayingTranslated] = useState(false);

  // 現在の段落を取得
  const currentParagraph = paragraphs[currentIndex] || paragraphs[0];
  const originalText = currentParagraph?.originalText || '';
  const translatedText = currentParagraph?.translatedText || '';
  const isParagraphTranslating = currentParagraph?.isTranslating || false;

  // 段落が複数あるかどうか
  const hasMultipleParagraphs = paragraphs.length > 1;

  // アニメーション用の値
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  // 母国語かどうかを判定
  const isOriginalNative = sourceLang === nativeLanguage.code;
  const isTranslatedNative = targetLang === nativeLanguage.code;

  // 段落切り替え時のフェードアニメーション
  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [currentIndex]);

  // 翻訳文が変更されたらフェードインアニメーション（段落切り替え時のみ）
  // 翻訳完了時のフェードは削除（カードが消えて見えるため）

  // 原文が変更されたら選択状態をリセット
  useEffect(() => {
    onSelectionCleared?.();
  }, [originalText]);

  // 翻訳中のシマーアニメーション
  useEffect(() => {
    if (isTranslating || isParagraphTranslating) {
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
  }, [isTranslating, isParagraphTranslating]);

  // 言語名を取得
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

  // 段落ナビゲーション
  const handlePrevParagraph = () => {
    if (currentIndex > 0) {
      // セクション移動時は部分選択を解除
      onSelectionCleared?.();
      onIndexChange(currentIndex - 1);
      logger.info('[TranslateCard] Navigate to previous paragraph:', currentIndex - 1);
    }
  };

  const handleNextParagraph = () => {
    if (currentIndex < paragraphs.length - 1) {
      // セクション移動時は部分選択を解除
      onSelectionCleared?.();
      onIndexChange(currentIndex + 1);
      logger.info('[TranslateCard] Navigate to next paragraph:', currentIndex + 1);
    }
  };

  // 横スワイプジェスチャー
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // 横方向のスワイプのみ反応（50px以上）
        return Math.abs(gestureState.dx) > 50 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx > 50) {
          // 右スワイプ: 前の段落へ
          handlePrevParagraph();
        } else if (gestureState.dx < -50) {
          // 左スワイプ: 次の段落へ
          handleNextParagraph();
        }
      },
    })
  ).current;

  // カード全体のタップハンドラー（空白部分のタップで選択を解除）
  const handleCardPress = () => {
    // 選択が存在する場合は解除
    onSelectionCleared?.();
    logger.info('[TranslateCard] Card background tapped, clearing selection');
  };

  // 原文の選択ハンドラー（旧API）
  const handleOriginalSelection = (text: string) => {
    onTextSelected?.(text, 'original');
  };

  // 原文の選択ハンドラー（新API）
  const handleOriginalSelectionWithInfo = (selectionInfo: SelectionInfo) => {
    onTextSelectionWithInfo?.(selectionInfo, 'original');
  };

  // 翻訳文の選択ハンドラー（旧API）
  const handleTranslatedSelection = (text: string) => {
    onTextSelected?.(text, 'translated');
  };

  // 翻訳文の選択ハンドラー（新API）
  const handleTranslatedSelectionWithInfo = (selectionInfo: SelectionInfo) => {
    onTextSelectionWithInfo?.(selectionInfo, 'translated');
  };

  return (
    <View style={styles.wrapper}>
      {/* Label - Outside of card */}
      <Text style={styles.label}>
        {isParagraphTranslating || isTranslating
          ? `${targetLanguageName}に翻訳しています`
          : `${targetLanguageName}に翻訳しました`}
      </Text>

      {/* Card Container */}
      <TouchableWithoutFeedback onPress={handleCardPress}>
        <View style={styles.container} {...panResponder.panHandlers}>
        {/* Section Navigation - 段落が複数ある場合のみ表示 */}
        {hasMultipleParagraphs && (
          <View style={styles.sectionNav}>
            <TouchableOpacity
              style={[styles.navButton, currentIndex === 0 && styles.navButtonDisabled]}
              onPress={handlePrevParagraph}
              disabled={currentIndex === 0}
            >
              <CaretIcon rotation={90} size={24} />
            </TouchableOpacity>
            <Text style={styles.sectionLabel}>
              セクション{currentIndex + 1}/{paragraphs.length}
            </Text>
            <TouchableOpacity
              style={[styles.navButton, currentIndex === paragraphs.length - 1 && styles.navButtonDisabled]}
              onPress={handleNextParagraph}
              disabled={currentIndex === paragraphs.length - 1}
            >
              <CaretIcon rotation={270} size={24} />
            </TouchableOpacity>
          </View>
        )}

        {/* Content Container */}
        <Animated.View style={[styles.contentContainer, { opacity: fadeAnim }]}>
          {/* Original Text Section (White Background) */}
          <View style={styles.originalTextCard}>
            {paragraphs.length === 0 || !originalText ? (
              // ローディング状態: 段落読み込み中
              <View style={styles.loadingContainer}>
                <Text style={[styles.originalText, { color: '#999', fontSize: 12, marginBottom: 8 }]}>
                  文章を解析中...
                </Text>
                <View style={styles.shimmerContainer}>
                  {[...Array(3)].map((_, i) => (
                    <Animated.View
                      key={i}
                      style={[
                        styles.shimmerBarWrapper,
                        {
                          width: i === 2 ? '70%' : '100%',
                        },
                      ]}
                    >
                      <View style={styles.shimmerBar}>
                        <Animated.View
                          style={[
                            styles.shimmerOverlay,
                            {
                              transform: [
                                {
                                  translateX: shimmerAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [-100, 500],
                                  }),
                                },
                              ],
                            },
                          ]}
                        />
                      </View>
                    </Animated.View>
                  ))}
                </View>
              </View>
            ) : (
              <>
                <SelectableText
                  text={originalText}
                  style={styles.originalText}
                  onSelectionChange={handleOriginalSelection}
                  onSelectionChangeWithInfo={handleOriginalSelectionWithInfo}
                  onSelectionCleared={onSelectionCleared}
                  clearSelectionKey={clearSelectionKey}
                />

                {/* Original Actions */}
                <View style={styles.originalActions}>
                  {!isOriginalNative && (
                    <TouchableOpacity onPress={handlePlayOriginal} style={styles.actionButton}>
                      <SpeakerIcon size={20} color={isPlayingOriginal ? '#242424' : '#686868'} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={handleCopy} style={styles.actionButton}>
                    <CopyIcon size={20} color="#686868" />
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>

          {/* Translated Text Section (No Background) */}
          <View style={styles.translatedTextContainer}>
            {(isTranslating || isParagraphTranslating) ? (
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
              <Animated.View style={{ opacity: fadeAnim, gap: 8 }}>
                <SelectableText
                  text={formatMarkdownText(translatedText)}
                  style={styles.translatedText}
                  onSelectionChange={handleTranslatedSelection}
                  onSelectionChangeWithInfo={handleTranslatedSelectionWithInfo}
                  onSelectionCleared={onSelectionCleared}
                  clearSelectionKey={clearSelectionKey}
                />

                {/* Translated Actions */}
                <View style={styles.translatedActions}>
                  {!isTranslatedNative && (
                    <TouchableOpacity onPress={handlePlayTranslated} style={styles.actionButton}>
                      <SpeakerIcon size={20} color={isPlayingTranslated ? '#242424' : '#686868'} />
                    </TouchableOpacity>
                  )}
                </View>
              </Animated.View>
            )}
          </View>
        </Animated.View>
        </View>
      </TouchableWithoutFeedback>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 2,
  },
  label: {
    fontSize: 12,
    lineHeight: 21,
    color: '#686868',
    fontWeight: '510',
    letterSpacing: 1,
    marginLeft: 0,
  },
  container: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingTop: 6,
    paddingBottom: 12,
    paddingHorizontal: 8,
    gap: 6,
  },
  sectionNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  navButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  sectionLabel: {
    fontSize: 12,
    lineHeight: 23,
    color: '#686868',
    fontWeight: '510',
    letterSpacing: 1,
    textAlign: 'center',
  },
  contentContainer: {
    gap: 12,
  },
  originalTextCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 16,
    gap: 10,
  },
  originalText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#242424',
    fontWeight: '400',
    letterSpacing: 0.5,
  },
  originalActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  translatedTextContainer: {
    paddingHorizontal: 9,
    gap: 8,
  },
  translatedText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#242424',
    fontWeight: '400',
    letterSpacing: 0.3,
  },
  translatedActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  actionButton: {
    padding: 0,
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
});
