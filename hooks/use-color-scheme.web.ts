import { useThemeContext } from '@/contexts/theme-context';

/**
 * Web用: ThemeContextから解決済みのテーマを返す。
 */
export function useColorScheme(): 'light' | 'dark' {
  const { resolvedTheme } = useThemeContext();
  return resolvedTheme;
}
