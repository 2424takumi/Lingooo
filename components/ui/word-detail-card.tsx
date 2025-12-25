/**
 * WordDetailCard Component
 * 単語選択時にChatSection内に表示される単語詳細カード（Figmaデザイン準拠）
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated from 'react-native-reanimated';
import { Shimmer } from './shimmer';

export interface WordDetail {
  headword: string;
  reading?: string;
  meanings: string[];
  partOfSpeech: string[];
  nuance?: string;
  isBookmarked?: boolean;
}

interface WordDetailCardProps {
  word: WordDetail;
  onBookmarkToggle?: () => void;
  onViewDetails?: () => void;
  onClose?: () => void;
  onAskQuestion?: () => void;
  isLoading?: boolean;
  animatedStyle?: ViewStyle; // アニメーションスタイル
}

function StarIcon({ filled = false, size = 24 }: { filled?: boolean; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
        stroke="#FFFFFF"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={filled ? "#FFFFFF" : "none"}
      />
    </Svg>
  );
}

function ArrowRightIcon({ size = 24, color = '#242424' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 12h14M12 5l7 7-7 7"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CloseIcon({ size = 18, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 6L6 18M6 6l12 12"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function MessageCircleIcon({ size = 24, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function WordDetailCard({
  word,
  onBookmarkToggle,
  onViewDetails,
  onClose,
  onAskQuestion,
  isLoading = false,
  animatedStyle,
}: WordDetailCardProps) {
  return (
    <Animated.View
      style={[styles.container, animatedStyle]}
      pointerEvents="auto"
    >
      {/* 白い内側カード */}
      <View style={styles.innerCard}>
        {/* ヘッダー: 見出し語/キーワード + 品詞タグ + 閉じるボタン */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {isLoading ? (
              <Shimmer width="60%" height={22} borderRadius={4} />
            ) : word.reading ? (
              <Text style={styles.keyword}>{word.reading}</Text>
            ) : (
              <Text style={styles.headword}>
                {word.headword}
              </Text>
            )}
            {/* 品詞タグ */}
            {isLoading ? (
              <View style={styles.posTagsContainer}>
                <Shimmer width={60} height={24} borderRadius={12} />
                <Shimmer width={70} height={24} borderRadius={12} />
              </View>
            ) : word.partOfSpeech.length > 0 ? (
              <View style={styles.posTagsContainer}>
                {word.partOfSpeech.map((pos, index) => (
                  <View key={index} style={styles.posTag}>
                    <Text style={styles.posTagText}>{pos}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <View style={styles.closeButtonInner}>
              <CloseIcon size={18} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </View>

        {/* ニュアンス（品詞タグの下に直接表示） */}
        {isLoading ? (
          <View style={styles.nuanceContainer}>
            <Shimmer width="95%" height={22} borderRadius={4} style={{ marginBottom: 4 }} />
            <Shimmer width="90%" height={22} borderRadius={4} />
          </View>
        ) : word.nuance ? (
          <View style={styles.nuanceContainer}>
            <Text style={styles.nuanceText}>{word.nuance}</Text>
          </View>
        ) : null}
      </View>

      {/* 下部: 質問ボタン + もっと詳しくボタン */}
      <View style={styles.footer}>
        {onAskQuestion && (
          <TouchableOpacity
            onPress={onAskQuestion}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MessageCircleIcon size={24} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        {onViewDetails && (
          <TouchableOpacity
            style={styles.detailsButton}
            onPress={onViewDetails}
          >
            <Text style={styles.detailsButtonText}>もっと詳しく</Text>
            <ArrowRightIcon size={20} color="#242424" />
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    gap: 8,
  },
  innerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 16,
    gap: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'column',
    gap: 4,
  },
  headword: {
    fontSize: 20,
    fontWeight: '400',
    color: '#000000',
    lineHeight: 20,
    marginTop: 2,
    marginLeft: 4,
  },
  keyword: {
    fontSize: 20,
    fontWeight: '400',
    color: '#000000',
    lineHeight: 20,
    marginTop: 2,
    marginLeft: 4,
  },
  closeButton: {
    marginLeft: 10,
  },
  closeButtonInner: {
    backgroundColor: '#242424',
    borderRadius: 11,
    width: 34,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  posTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    height: 26,
    marginTop: 0,
    marginLeft: 0,
  },
  posTag: {
    backgroundColor: '#F8F8F8',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  posTagText: {
    fontSize: 12,
    fontWeight: '400',
    color: '#000000',
    lineHeight: 18,
  },
  nuanceContainer: {
    gap: 7,
    marginTop: 8,
  },
  nuanceText: {
    fontSize: 16,
    fontWeight: '510',
    color: '#242424',
    lineHeight: 24,
    letterSpacing: 0.3,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    backgroundColor: '#FFFFFF',
    borderRadius: 19,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 6,
  },
  detailsButtonText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#242424',
    lineHeight: 22,
    letterSpacing: 0.5,
    marginRight: -2,
  },
});
