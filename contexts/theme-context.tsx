import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_STORAGE_KEY = '@lingooo_theme';

export type ThemePreference = 'light' | 'dark' | 'auto';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
  /** ユーザーが選択したテーマ設定 (light/dark/auto) */
  themePreference: ThemePreference;
  /** 実際に適用されるテーマ (light/dark) */
  resolvedTheme: ResolvedTheme;
  /** テーマ設定を変更 */
  setThemePreference: (preference: ThemePreference) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType>({
  themePreference: 'auto',
  resolvedTheme: 'light',
  setThemePreference: async () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useSystemColorScheme();
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('auto');
  const [isLoaded, setIsLoaded] = useState(false);

  // AsyncStorageからテーマ設定を読み込み
  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((saved) => {
      if (saved === 'light' || saved === 'dark' || saved === 'auto') {
        setThemePreferenceState(saved);
      } else if (saved === 'ライト') {
        // 旧形式からの移行
        setThemePreferenceState('light');
        AsyncStorage.setItem(THEME_STORAGE_KEY, 'light');
      } else if (saved === 'ダーク') {
        setThemePreferenceState('dark');
        AsyncStorage.setItem(THEME_STORAGE_KEY, 'dark');
      } else if (saved === '自動') {
        setThemePreferenceState('auto');
        AsyncStorage.setItem(THEME_STORAGE_KEY, 'auto');
      }
      setIsLoaded(true);
    });
  }, []);

  const resolvedTheme: ResolvedTheme =
    themePreference === 'auto'
      ? (systemColorScheme ?? 'light')
      : themePreference;

  const setThemePreference = useCallback(async (preference: ThemePreference) => {
    setThemePreferenceState(preference);
    await AsyncStorage.setItem(THEME_STORAGE_KEY, preference);
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        themePreference,
        resolvedTheme,
        setThemePreference,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  return useContext(ThemeContext);
}
