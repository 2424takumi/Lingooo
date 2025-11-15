import { View, Text, StyleSheet } from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';

interface ExampleCardProps {
  english: string;
  japanese: string;
}

export function ExampleCard({ english, japanese }: ExampleCardProps) {
  const cardBackground = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'border');
  const primaryText = useThemeColor({}, 'text');
  const secondaryText = useThemeColor({}, 'icon');
  const accent = useThemeColor({}, 'primary');

  return (
    <View style={[styles.container, { backgroundColor: 'transparent', borderColor: 'transparent' }]}>
      <Text selectable selectionColor={accent} style={[styles.english, { color: primaryText }]}>
        {english}
      </Text>
      <Text selectable selectionColor={accent} style={[styles.japanese, { color: secondaryText }]}>
        {japanese}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 0,
    gap: 4,
  },
  english: {
    fontSize: 18,
    fontWeight: '500',
    lineHeight: 24,
  },
  japanese: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    letterSpacing: 0.5,
  },
});
