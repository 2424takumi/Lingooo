/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#111111';
const tintColorDark = '#f5f5f5';

export const Colors = {
  light: {
    // Base
    text: '#111111',
    textSecondary: '#686868',
    textTertiary: '#999999',
    textMuted: '#ACACAC',
    textOnDark: '#FFFFFF',
    textOnPrimary: '#FFFFFF',
    background: '#FFFFFF',
    tint: tintColorLight,
    icon: '#5A5A5A',
    iconMuted: '#CECECE',
    tabIconDefault: '#C1C1C1',
    tabIconSelected: tintColorLight,

    // Lingooo app colors
    primary: '#1A1A1A',
    accent: '#00AA69',
    pageBackground: '#FFFFFF',
    searchBackground: '#F8F8F8',
    headerBackground: '#FFFFFF',
    inputBackground: '#FFFFFF',
    inputBorder: '#E0E0E0',
    textPlaceholder: '#B9B9B9',
    buttonGray: '#1A1A1A',
    buttonDisabled: '#C0C0C0',
    cardBackground: '#F8F8F8',
    cardBackgroundElevated: '#FFFFFF',
    surfaceBackground: '#1A1A1A',
    border: '#FFFFFF',
    borderLight: '#E0E0E0',
    separator: '#F5F5F5',
    divider: '#D1D1D6',
    buttonText: '#FFFFFF',

    // Tags
    tagSelectedBackground: '#1A1A1A',
    tagSelectedText: '#FFFFFF',
    tagUnselectedBackground: '#F8F8F8',
    tagUnselectedText: '#1A1A1A',

    // Chat
    chatSectionBackground: '#1A1A1A',
    chatInputBackground: '#FFFFFF',
    chatInputTextBackground: '#F0F0F0',
    questionTagBackground: '#323232',
    questionTagText: '#FFFFFF',

    // QA
    qaCardBackground: '#FAFCFB',
    qaAnswerBackground: '#F1F1F1',

    // Status
    errorBackground: '#FFEAEA',
    errorText: '#CC0000',
    warningBackground: '#FFC107',
    warningText: '#1A1A1A',
    successColor: '#4CAF50',
    systemBlue: '#007AFF',

    // Shimmer
    shimmerBackground: '#E0E0E0',
    shimmerHighlight: '#F5F5F5',

    // Overlay
    overlay: 'rgba(0, 0, 0, 0.5)',
    overlayLight: 'rgba(0, 0, 0, 0.05)',

    // Semantic - POS / Gender tags
    posTagBackground: '#EDEDED',
    posTagText: '#000000',
    genderMasculine: '#E4E4E4',
    genderFeminine: '#FFD6E8',
    genderNeuter: '#E8E8E8',

    // Semantic - Nuance tags
    nuanceCasual: '#E5F8D7',
    nuanceFormal: '#F8DED7',
    nuanceNeutral: '#D7E8F8',
    nuanceAcademic: '#D7E5F8',
    nuanceSlang: '#F8D7E5',
    nuanceText: '#1A1A1A',

    // Language tag
    languageTagBackground: '#1A1A1A',
    languageTagText: '#FFFFFF',

    // History tag
    historyTagBackground: '#1A1A1A',
    historyTagText: '#FFFFFF',

    // Frequency bar
    barFill: '#111111',
    barEmpty: '#E0E0E0',

    // Modal
    modalBackground: '#FFFFFF',
    modalOverlay: 'rgba(0, 0, 0, 0.5)',

    // Segmented control
    segmentedBackground: '#D1D1D6',
    segmentedActiveBackground: '#FFFFFF',

    // Hint card
    hintBackground: '#F0FAF5',
    hintTagBackground: '#FFFFFF',

    // Translate card
    translateOriginalText: '#111111',
    translateTranslatedText: '#111111',
    translateCardOuter: '#F5F5F5',
    translateCardInner: '#FFFFFF',

    // Subscription
    successBackground: '#E8F5E9',
  },
  dark: {
    // Base - テキスト階層をはっきりと
    text: '#F0F0F0',
    textSecondary: '#9E9E9E',
    textTertiary: '#6E6E6E',
    textMuted: '#505050',
    textOnDark: '#FFFFFF',
    textOnPrimary: '#000000',
    background: '#000000',
    tint: tintColorDark,
    icon: '#B0B0B0',
    iconMuted: '#505050',
    tabIconDefault: '#606060',
    tabIconSelected: tintColorDark,

    // Lingooo app colors - レイヤーごとに明確な差をつける
    // Layer 0: pageBackground #000000 (最も暗い)
    // Layer 1: cardBackground #1C1C1E (カード・セクション)
    // Layer 2: cardBackgroundElevated #2C2C2E (カード内カード、入力欄)
    // Layer 3: searchBackground #3A3A3C (選択状態、ハイライト)
    primary: '#F0F0F0',
    accent: '#00DD88',
    pageBackground: '#000000',
    searchBackground: '#2C2C2E',
    headerBackground: '#0A0A0A',
    inputBackground: '#000000',
    inputBorder: '#48484A',
    textPlaceholder: '#6E6E6E',
    buttonGray: '#F0F0F0',
    buttonDisabled: '#48484A',
    cardBackground: '#1C1C1E',
    cardBackgroundElevated: '#2C2C2E',
    surfaceBackground: '#1C1C1E',
    border: '#38383A',
    borderLight: '#48484A',
    separator: '#1C1C1E',
    divider: '#38383A',
    buttonText: '#000000',

    // Tags - 選択状態と非選択状態の差を明確に
    tagSelectedBackground: '#F0F0F0',
    tagSelectedText: '#000000',
    tagUnselectedBackground: '#2C2C2E',
    tagUnselectedText: '#9E9E9E',

    // Chat - ボタンと背景のコントラストを確保
    chatSectionBackground: '#1C1C1E',
    chatInputBackground: '#000000',
    chatInputTextBackground: '#2C2C2E',
    questionTagBackground: '#48484A',
    questionTagText: '#F0F0F0',

    // QA
    qaCardBackground: '#1C1C1E',
    qaAnswerBackground: '#2C2C2E',

    // Status
    errorBackground: '#3D1515',
    errorText: '#FF6B6B',
    warningBackground: '#3D3010',
    warningText: '#FFD54F',
    successColor: '#66BB6A',
    systemBlue: '#0A84FF',

    // Shimmer
    shimmerBackground: '#2C2C2E',
    shimmerHighlight: '#3A3A3C',

    // Overlay
    overlay: 'rgba(0, 0, 0, 0.7)',
    overlayLight: 'rgba(255, 255, 255, 0.08)',

    // Semantic - POS / Gender tags
    posTagBackground: '#2C2C2E',
    posTagText: '#D0D0D0',
    genderMasculine: '#2C2C2E',
    genderFeminine: '#3D2030',
    genderNeuter: '#2C2C2E',

    // Semantic - Nuance tags
    nuanceCasual: '#1A2E14',
    nuanceFormal: '#2E1A14',
    nuanceNeutral: '#142A2E',
    nuanceAcademic: '#141E2E',
    nuanceSlang: '#2E1424',
    nuanceText: '#D0D0D0',

    // Language tag
    languageTagBackground: '#F0F0F0',
    languageTagText: '#000000',

    // History tag
    historyTagBackground: '#2C2C2E',
    historyTagText: '#D0D0D0',

    // Frequency bar
    barFill: '#F0F0F0',
    barEmpty: '#38383A',

    // Modal
    modalBackground: '#1C1C1E',
    modalOverlay: 'rgba(0, 0, 0, 0.7)',

    // Segmented control
    segmentedBackground: '#38383A',
    segmentedActiveBackground: '#636366',

    // Hint card
    hintBackground: '#0D2618',
    hintTagBackground: '#2C2C2E',

    // Translate card - 原文と翻訳文を区別
    translateOriginalText: '#B0B0B0',
    translateTranslatedText: '#F0F0F0',
    translateCardOuter: '#1C1C1E',
    translateCardInner: '#000000',

    // Subscription
    successBackground: '#1A2E1A',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
