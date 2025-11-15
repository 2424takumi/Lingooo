import { View, Text, StyleSheet } from 'react-native';

interface WordHintProps {
  hint: string;
}

export function WordHint({ hint }: WordHintProps) {
  if (!hint) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.hintText}>{hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8F8F8',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  hintText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#000000',
    letterSpacing: 0.5,
  },
});
