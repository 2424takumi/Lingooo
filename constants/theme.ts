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

    // Subscription
    successBackground: '#E8F5E9',
  },
  dark: {
    // Base
    text: '#F5F5F5',
    textSecondary: '#A0A0A0',
    textTertiary: '#777777',
    textMuted: '#555555',
    textOnDark: '#FFFFFF',
    textOnPrimary: '#050505',
    background: '#050505',
    tint: tintColorDark,
    icon: '#C8C8C8',
    iconMuted: '#555555',
    tabIconDefault: '#666666',
    tabIconSelected: tintColorDark,

    // Lingooo app colors
    primary: '#F5F5F5',
    accent: '#00CC7A',
    pageBackground: '#0B0B0B',
    searchBackground: '#1A1A1A',
    headerBackground: '#0F0F0F',
    inputBackground: '#1A1A1A',
    inputBorder: '#333333',
    textPlaceholder: '#7E7E7E',
    buttonGray: '#F5F5F5',
    buttonDisabled: '#444444',
    cardBackground: '#1A1A1A',
    cardBackgroundElevated: '#222222',
    surfaceBackground: '#1C1C1C',
    border: '#2A2A2A',
    borderLight: '#333333',
    separator: '#222222',
    divider: '#333333',
    buttonText: '#050505',

    // Tags
    tagSelectedBackground: '#F5F5F5',
    tagSelectedText: '#050505',
    tagUnselectedBackground: '#3A3A3A',
    tagUnselectedText: '#9A9A9A',

    // Chat
    chatSectionBackground: '#1C1C1C',
    chatInputBackground: '#0E0E0E',
    chatInputTextBackground: '#2A2A2A',
    questionTagBackground: '#3A3A3A',
    questionTagText: '#F5F5F5',

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
    shimmerBackground: '#2A2A2A',
    shimmerHighlight: '#3A3A3A',

    // Overlay
    overlay: 'rgba(0, 0, 0, 0.7)',
    overlayLight: 'rgba(255, 255, 255, 0.05)',

    // Semantic - POS / Gender tags
    posTagBackground: '#2A2A2A',
    posTagText: '#E0E0E0',
    genderMasculine: '#2A2A2A',
    genderFeminine: '#3D2030',
    genderNeuter: '#2A2A2A',

    // Semantic - Nuance tags
    nuanceCasual: '#1A2E14',
    nuanceFormal: '#2E1A14',
    nuanceNeutral: '#142A2E',
    nuanceAcademic: '#141E2E',
    nuanceSlang: '#2E1424',
    nuanceText: '#E0E0E0',

    // Language tag
    languageTagBackground: '#F5F5F5',
    languageTagText: '#050505',

    // History tag
    historyTagBackground: '#2A2A2A',
    historyTagText: '#E0E0E0',

    // Frequency bar
    barFill: '#F5F5F5',
    barEmpty: '#333333',

    // Modal
    modalBackground: '#1C1C1E',
    modalOverlay: 'rgba(0, 0, 0, 0.7)',

    // Segmented control
    segmentedBackground: '#333333',
    segmentedActiveBackground: '#555555',

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
