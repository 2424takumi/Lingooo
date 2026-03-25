import { useThemeContext } from '@/contexts/theme-context';

/**
 * ThemeContextから解決済みのテーマを返す。
 * システムの useColorScheme() の代わりにこれを使う。
 */
export function useColorScheme(): 'light' | 'dark' {
  const { resolvedTheme } = useThemeContext();
  return resolvedTheme;
}
