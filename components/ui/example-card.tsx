import { View, Text, StyleSheet } from 'react-native';

interface ExampleCardProps {
  english: string;
  japanese: string;
}

export function ExampleCard({ english, japanese }: ExampleCardProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.english}>{english}</Text>
      <Text style={styles.japanese}>{japanese}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FAFCFB',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  english: {
    fontSize: 18,
    fontWeight: '500',
    color: '#000000',
    lineHeight: 24,
  },
  japanese: {
    fontSize: 14,
    fontWeight: '400',
    color: '#686868',
    lineHeight: 20,
    letterSpacing: 0.5,
  },
});
