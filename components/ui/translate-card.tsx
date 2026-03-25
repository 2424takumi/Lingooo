import { StyleSheet, Text, TouchableOpacity, View, Animated, PanResponder, TouchableWithoutFeedback, LayoutAnimation, Platform, UIManager } from 'react-native';
import Reanimated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Shimmer } from './shimmer';

// Android用LayoutAnimation有効化
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { useRouter } from 'expo-router';
import { logger } from '@/utils/logger';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useLearningLanguages } from '@/contexts/learning-languages-context';
import { SPEECH_LANGUAGE_MAP, LANGUAGE_NAME_MAP } from '@/constants/languages';
import { formatMarkdownText } from '@/utils/text-formatter';
import { useTranslation } from 'react-i18next';
import { SelectableText, SelectionInfo } from './selectable-text';
import type { Paragraph } from '@/services/api/paragraph-splitter';

function RetryIcon({ size = 16, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M1 4v6h6M23 20v-6h-6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

interface TranslateCardProps {
  // 段落配列（単一段落の場合も配列で渡す）
  paragraphs: (Paragraph & { isTranslating?: boolean })[];
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
  onRetryParagraph?: (index: number) => void;
  // 全文表示トグル
  showFullText?: boolean;
  onToggleFullText?: () => void;
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

function CaretIcon({ rotation = 0, size = 24, color = '#686868' }: { rotation?: number; size?: number; color?: string }) {
  return (
    <View style={{ transform: [{ rotate: `${rotation}deg` }] }}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M6 9l6 6 6-6"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

// ミニトグルスイッチ
function MiniToggle({ active = false, onPress, trackColor, activeTrackColor, thumbColor }: { active?: boolean; onPress?: () => void; trackColor?: string; activeTrackColor?: string; thumbColor?: string }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <View style={[miniToggleStyles.track as any, trackColor ? { backgroundColor: trackColor } : undefined, active && miniToggleStyles.trackActive, active && activeTrackColor ? { backgroundColor: activeTrackColor } : undefined]}>
        <View style={[miniToggleStyles.thumb as any, thumbColor ? { backgroundColor: thumbColor } : undefined, active && miniToggleStyles.thumbActive]} />
      </View>
    </TouchableOpacity>
  );
}

const miniToggleStyles = StyleSheet.create({
  track: {
    width: 42,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#D1D1D6',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  trackActive: {
    backgroundColor: '#00AA69',
  },
  thumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
  },
  thumbActive: {
    alignSelf: 'flex-end',
  },
});

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
  onRetryParagraph,
  showFullText = false,
  onToggleFullText,
}: TranslateCardProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { nativeLanguage, currentLanguage } = useLearningLanguages();

  // Theme colors
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const textTertiaryColor = useThemeColor({}, 'textTertiary');
  const textOnDarkColor = useThemeColor({}, 'textOnDark');
  const cardBackgroundElevatedColor = useThemeColor({}, 'cardBackgroundElevated');
  const separatorColor = useThemeColor({}, 'separator');
  const primaryColor = useThemeColor({}, 'primary');
  const accentColor = useThemeColor({}, 'accent');
  const shimmerBgColor = useThemeColor({}, 'shimmerBackground');
  const errorTextColor = useThemeColor({}, 'errorText');
  const segmentedBgColor = useThemeColor({}, 'segmentedBackground');
  const [isPlayingOriginal, setIsPlayingOriginal] = useState(false);
  const [isPlayingTranslated, setIsPlayingTranslated] = useState(false);
  const [isSourceExpanded, setIsSourceExpanded] = useState(false);
  const [isFullTextOriginalExpanded, setIsFullTextOriginalExpanded] = useState(false);

  // 現在の段落を取得
  const currentParagraph = paragraphs[currentIndex] || paragraphs[0];

  // 全文表示モード: 全段落を結合（sparse array対策でfilter(Boolean)を先に適用）
  const validParagraphs = useMemo(() => paragraphs.filter(Boolean), [paragraphs]);
  const fullOriginalText = useMemo(() =>
    validParagraphs.map(p => p.originalText).filter(Boolean).join('\n\n'),
    [validParagraphs]
  );
  const fullTranslatedText = useMemo(() =>
    validParagraphs.map(p => p.translatedText).filter(Boolean).join('\n\n'),
    [validParagraphs]
  );
  const isAnyTranslating = validParagraphs.some(p => p.isTranslating);

  const originalText = showFullText ? fullOriginalText : (currentParagraph?.originalText || '');

  // 長文判定: 120文字超 または 改行が5つ以上
  const isLongText = originalText.length > 120 || originalText.split('\n').length > 5;
  const translatedText = showFullText ? fullTranslatedText : (currentParagraph?.translatedText || '');
  const isParagraphTranslating = showFullText ? isAnyTranslating : (currentParagraph?.isTranslating || false);
  const isParagraphError = translatedText.startsWith('❌');

  // 段落が複数あるかどうか
  const hasMultipleParagraphs = paragraphs.length > 1;

  // 折りたたみが必要: 長文 かつ セクション分割されていない場合のみ
  const shouldCollapse = isLongText && !hasMultipleParagraphs;

  // 全文表示モードが切り替わったらアコーディオンをリセット
  useEffect(() => {
    setIsFullTextOriginalExpanded(false);
  }, [showFullText]);

  // アニメーション用の値
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // 翻訳テキストフェードイン用（Reanimated - fadeAnimとは独立）
  const translatedTextOpacity = useSharedValue(1);
  const translatedTextTranslateY = useSharedValue(0);
  const wasTranslating = useRef(false);

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

  // 原文が変更されたら選択状態をリセット＆折りたたみリセット
  useEffect(() => {
    onSelectionCleared?.();
    setIsSourceExpanded(false);
  }, [originalText]);

  // 翻訳完了時のフェードインアニメーション
  useEffect(() => {
    if (wasTranslating.current && !isParagraphTranslating && translatedText) {
      translatedTextOpacity.value = 0;
      translatedTextTranslateY.value = 6;
      translatedTextOpacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) });
      translatedTextTranslateY.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.ease) });
    }
    wasTranslating.current = isParagraphTranslating;
  }, [isParagraphTranslating, translatedText]);

  // 段落切り替え時にフェードイン値をリセット
  useEffect(() => {
    translatedTextOpacity.value = 1;
    translatedTextTranslateY.value = 0;
  }, [currentIndex]);

  const translatedTextAnimatedStyle = useAnimatedStyle(() => ({
    opacity: translatedTextOpacity.value,
    transform: [{ translateY: translatedTextTranslateY.value }],
  }));

  // 言語名を取得
  const targetLanguageName = LANGUAGE_NAME_MAP[targetLang] || targetLang;

  const handlePlayOriginal = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      logger.info('[TranslateCard] Translation copied to clipboard');
      // TODO: トースト通知を表示
    } catch (error) {
      logger.error('[TranslateCard] Failed to copy:', error);
    }
  };

  // 段落ナビゲーション
  const handlePrevParagraph = () => {
    if (currentIndex > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSelectionCleared?.();
      onIndexChange(currentIndex - 1);
      logger.info('[TranslateCard] Navigate to previous paragraph:', currentIndex - 1);
    }
  };

  const handleNextParagraph = () => {
    if (currentIndex < paragraphs.length - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSelectionCleared?.();
      onIndexChange(currentIndex + 1);
      logger.info('[TranslateCard] Navigate to next paragraph:', currentIndex + 1);
    }
  };

  // 横スワイプジェスチャー（全文表示時は無効）
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        if (showFullText) return false;
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
      <View style={styles.labelRow}>
        <Text style={[styles.label as any, { color: textSecondaryColor }]}>
          {(showFullText && translatedText)
            ? `${targetLanguageName}に翻訳しました`
            : (isParagraphTranslating || isTranslating)
              ? `${targetLanguageName}に翻訳しています`
              : `${targetLanguageName}に翻訳しました`}
        </Text>
        {hasMultipleParagraphs && onToggleFullText && (
          <View style={styles.fullTextToggleRow}>
            <Text style={[styles.fullTextToggleLabel as any, { color: textSecondaryColor }]}>全文</Text>
            <MiniToggle active={showFullText} onPress={onToggleFullText} trackColor={segmentedBgColor} activeTrackColor={accentColor} thumbColor={cardBackgroundElevatedColor} />
          </View>
        )}
      </View>

      {/* Card Container */}
      <TouchableWithoutFeedback onPress={handleCardPress}>
        <View style={[styles.container as any, { backgroundColor: separatorColor }]} {...panResponder.panHandlers}>
        {/* Section Navigation - 段落が複数あり全文表示でない場合のみ表示 */}
        {hasMultipleParagraphs && !showFullText && (
          <View style={styles.sectionNav}>
            <TouchableOpacity
              style={[styles.navButton, currentIndex === 0 && styles.navButtonDisabled]}
              onPress={handlePrevParagraph}
              disabled={currentIndex === 0}
            >
              <CaretIcon rotation={90} size={24} color={textSecondaryColor} />
            </TouchableOpacity>
            <Text style={[styles.sectionLabel as any, { color: textSecondaryColor }]}>
              セクション{currentIndex + 1}/{paragraphs.length}
            </Text>
            <TouchableOpacity
              style={[styles.navButton, currentIndex === paragraphs.length - 1 && styles.navButtonDisabled]}
              onPress={handleNextParagraph}
              disabled={currentIndex === paragraphs.length - 1}
            >
              <CaretIcon rotation={270} size={24} color={textSecondaryColor} />
            </TouchableOpacity>
          </View>
        )}

        {/* Content Container */}
        <Animated.View style={[styles.contentContainer as any, { opacity: fadeAnim }]}>
          {/* Original Text Section (White Background) */}
          <View style={[styles.originalTextCard as any, { backgroundColor: cardBackgroundElevatedColor }]}>
            {paragraphs.length === 0 || !originalText ? (
              // ローディング状態: 段落読み込み中
              <View style={styles.loadingContainer}>
                <Text style={[styles.originalText as any, { color: textTertiaryColor, fontSize: 12, marginBottom: 8 }]}>
                  文章を解析中...
                </Text>
                <View style={styles.shimmerContainer}>
                  <Shimmer width="100%" height={16} borderRadius={4} style={{ backgroundColor: shimmerBgColor } as any} />
                  <Shimmer width="100%" height={16} borderRadius={4} style={{ backgroundColor: shimmerBgColor } as any} />
                  <Shimmer width="70%" height={16} borderRadius={4} style={{ backgroundColor: shimmerBgColor } as any} />
                </View>
              </View>
            ) : (
              <>
                {/* 原文テキスト */}
                {/* 全文表示モード: 3行で折りたたみ */}
                {showFullText && !isFullTextOriginalExpanded ? (
                  <View style={styles.fullTextOriginalPreview}>
                    <SelectableText
                      text={originalText}
                      style={{ ...(styles.originalText as any), color: textColor }}
                      onSelectionChange={handleOriginalSelection}
                      onSelectionChangeWithInfo={handleOriginalSelectionWithInfo}
                      onSelectionCleared={onSelectionCleared}
                      clearSelectionKey={clearSelectionKey}
                    />
                  </View>
                ) : shouldCollapse && !isSourceExpanded ? (
                  <View style={styles.sourcePreviewContainer}>
                    <SelectableText
                      text={originalText}
                      style={{ ...(styles.originalText as any), color: textColor }}
                      onSelectionChange={handleOriginalSelection}
                      onSelectionChangeWithInfo={handleOriginalSelectionWithInfo}
                      onSelectionCleared={onSelectionCleared}
                      clearSelectionKey={clearSelectionKey}
                    />
                  </View>
                ) : (
                  <SelectableText
                    text={originalText}
                    style={{ ...(styles.originalText as any), color: textColor }}
                    onSelectionChange={handleOriginalSelection}
                    onSelectionChangeWithInfo={handleOriginalSelectionWithInfo}
                    onSelectionCleared={onSelectionCleared}
                    clearSelectionKey={clearSelectionKey}
                  />
                )}

                {/* Original Actions */}
                <View style={styles.originalActions}>
                  <View style={styles.originalActionsLeft}>
                    {!isOriginalNative && (
                      <TouchableOpacity onPress={handlePlayOriginal} style={styles.actionButton}>
                        <SpeakerIcon size={20} color={isPlayingOriginal ? textColor : textSecondaryColor} />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={handleCopy} style={styles.actionButton}>
                      <CopyIcon size={20} color={textSecondaryColor} />
                    </TouchableOpacity>
                  </View>
                  {/* 全文表示モードの展開/折りたたみ */}
                  {showFullText && (
                    <TouchableOpacity
                      onPress={() => {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setIsFullTextOriginalExpanded(!isFullTextOriginalExpanded);
                      }}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={[styles.showMoreText as any, { color: textSecondaryColor }]}>
                        {isFullTextOriginalExpanded ? '閉じる' : '全て表示'}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {/* 通常モードの展開/折りたたみ */}
                  {!showFullText && shouldCollapse && (
                    <TouchableOpacity
                      onPress={() => {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setIsSourceExpanded(!isSourceExpanded);
                      }}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={[styles.showMoreText as any, { color: textSecondaryColor }]}>
                        {isSourceExpanded ? '閉じる' : 'もっと見る'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>

          {/* Translated Text Section (No Background) */}
          <View style={styles.translatedTextContainer}>
            {/* 全文表示モード: 翻訳済みテキストがあれば即座に表示（一部翻訳中でも） */}
            {showFullText && translatedText ? (
              <Animated.View style={{ opacity: fadeAnim }}>
                <Reanimated.View style={[{ gap: 8 }, translatedTextAnimatedStyle]}>
                  <SelectableText
                    text={formatMarkdownText(translatedText)}
                    style={{ ...(styles.translatedText as any), color: textColor }}
                    onSelectionChange={handleTranslatedSelection}
                    onSelectionChangeWithInfo={handleTranslatedSelectionWithInfo}
                    onSelectionCleared={onSelectionCleared}
                    clearSelectionKey={clearSelectionKey}
                  />

                  {/* Translated Actions */}
                  <View style={styles.translatedActions}>
                    {!isTranslatedNative && (
                      <TouchableOpacity onPress={handlePlayTranslated} style={styles.actionButton}>
                        <SpeakerIcon size={20} color={isPlayingTranslated ? textColor : textSecondaryColor} />
                      </TouchableOpacity>
                    )}
                  </View>
                </Reanimated.View>
              </Animated.View>
            ) : ((isTranslating || isParagraphTranslating) && !translatedText) ? (
              <View style={styles.loadingContainer}>
                {/* Shimmer skeleton bars */}
                <View style={styles.shimmerContainer}>
                  <Shimmer width="100%" height={16} borderRadius={4} style={{ backgroundColor: shimmerBgColor } as any} />
                  <Shimmer width="100%" height={16} borderRadius={4} style={{ backgroundColor: shimmerBgColor } as any} />
                  <Shimmer width="60%" height={16} borderRadius={4} style={{ backgroundColor: shimmerBgColor } as any} />
                </View>
              </View>
            ) : isParagraphError ? (
              <View style={styles.errorContainer}>
                <Text style={[styles.errorText as any, { color: errorTextColor }]}>{translatedText.replace('❌ ', '')}</Text>
                {onRetryParagraph && (
                  <TouchableOpacity
                    style={[styles.retryButton as any, { backgroundColor: primaryColor }]}
                    onPress={() => onRetryParagraph(currentIndex)}
                  >
                    <RetryIcon size={14} color={textOnDarkColor} />
                    <Text style={[styles.retryButtonText as any, { color: textOnDarkColor }]}>{t('common.retry')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <Animated.View style={{ opacity: fadeAnim }}>
                <Reanimated.View style={[{ gap: 8 }, translatedTextAnimatedStyle]}>
                  <SelectableText
                    text={formatMarkdownText(translatedText)}
                    style={{ ...(styles.translatedText as any), color: textColor }}
                    onSelectionChange={handleTranslatedSelection}
                    onSelectionChangeWithInfo={handleTranslatedSelectionWithInfo}
                    onSelectionCleared={onSelectionCleared}
                    clearSelectionKey={clearSelectionKey}
                  />

                  {/* Translated Actions */}
                  <View style={styles.translatedActions}>
                    {!isTranslatedNative && (
                      <TouchableOpacity onPress={handlePlayTranslated} style={styles.actionButton}>
                        <SpeakerIcon size={20} color={isPlayingTranslated ? textColor : textSecondaryColor} />
                      </TouchableOpacity>
                    )}
                  </View>
                </Reanimated.View>
              </Animated.View>
            )}
          </View>

        </Animated.View>
        </View>
      </TouchableWithoutFeedback>
    </View>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const styles: any = StyleSheet.create({
  wrapper: {
    gap: 2,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    lineHeight: 21,
    color: '#686868',
    fontWeight: '510',
    letterSpacing: 1,
    marginLeft: 0,
  },
  fullTextToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fullTextToggleLabel: {
    fontSize: 12,
    color: '#686868',
    fontWeight: '510',
  },
  fullTextOriginalPreview: {
    maxHeight: 72, // 3行分 (lineHeight 24 × 3)
    overflow: 'hidden',
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
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
    gap: 10,
  },
  sourcePreviewContainer: {
    maxHeight: 120,
    overflow: 'hidden',
  },
  originalText: {
    fontSize: 17,
    lineHeight: 24,
    color: '#1A1A1A',
    fontWeight: '400',
    letterSpacing: 0.5,
  },
  originalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  originalActionsLeft: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  showMoreText: {
    fontSize: 14,
    color: '#686868',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  translatedTextContainer: {
    paddingHorizontal: 9,
    gap: 8,
  },
  translatedText: {
    fontSize: 17,
    lineHeight: 24,
    color: '#1A1A1A',
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
  errorContainer: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#CC0000',
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#111111',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
