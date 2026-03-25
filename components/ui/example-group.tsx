import { View, Text, StyleSheet } from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';

interface ExampleGroupProps {
  english: string;
  japanese: string;
}

export function ExampleGroup({ english, japanese }: ExampleGroupProps) {
  const textColor = useThemeColor({}, 'text');
  const secondaryColor = useThemeColor({}, 'textSecondary');

  return (
    <View style={styles.container}>
      <View style={[styles.bullet, { backgroundColor: textColor }]} />
      <View style={styles.textContainer}>
        <Text style={[styles.english, { color: textColor }]}>{english}</Text>
        <Text style={[styles.japanese, { color: secondaryColor }]}>{japanese}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 20,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 10,
  },
  textContainer: {
    flex: 1,
    gap: 6,
  },
  english: {
    fontSize: 20,
    fontWeight: '500',
    lineHeight: 26,
    letterSpacing: 0.5,
  },
  japanese: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 20,
    letterSpacing: 0.5,
  },
});
