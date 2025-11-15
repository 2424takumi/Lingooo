/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#111111';
const tintColorDark = '#f5f5f5';

export const Colors = {
  light: {
    text: '#111111',
    background: '#FFFFFF',
    tint: tintColorLight,
    icon: '#5A5A5A',
    tabIconDefault: '#C1C1C1',
    tabIconSelected: tintColorLight,
    // Lingooo app colors
    primary: '#242424',
    pageBackground: '#FFFFFF',
    searchBackground: '#F8F8F8',
    headerBackground: '#FFFFFF',
    inputBackground: '#FFFFFF',
    textPlaceholder: '#B9B9B9',
    buttonGray: '#242424',
    cardBackground: '#F8F8F8',
    surfaceBackground: '#242424',
    border: '#FFFFFF',
    buttonText: '#FFFFFF',
    tagSelectedBackground: '#242424',
    tagSelectedText: '#FFFFFF',
    tagUnselectedBackground: '#F8F8F8',
    tagUnselectedText: '#242424',
    chatSectionBackground: '#242424',
    chatInputBackground: '#FFFFFF',
    questionTagBackground: '#323232',
    questionTagText: '#FFFFFF',
  },
  dark: {
    text: '#F5F5F5',
    background: '#050505',
    tint: tintColorDark,
    icon: '#C8C8C8',
    tabIconDefault: '#666666',
    tabIconSelected: tintColorDark,
    // Lingooo app colors
    primary: '#F5F5F5',
    pageBackground: '#0B0B0B',
    searchBackground: '#111111',
    headerBackground: '#0F0F0F',
    inputBackground: '#0E0E0E',
    textPlaceholder: '#7E7E7E',
    buttonGray: '#F5F5F5',
    cardBackground: '#151515',
    surfaceBackground: '#1C1C1C',
    border: '#2A2A2A',
    buttonText: '#050505',
    tagSelectedBackground: '#F5F5F5',
    tagSelectedText: '#050505',
    tagUnselectedBackground: '#3A3A3A',
    tagUnselectedText: '#9A9A9A',
    chatSectionBackground: '#1C1C1C',
    chatInputBackground: '#0E0E0E',
    questionTagBackground: '#3A3A3A',
    questionTagText: '#F5F5F5',
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
