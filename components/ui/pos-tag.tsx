import { View, Text, StyleSheet } from 'react-native';

interface PosTagProps {
  label: string;
}

export function PosTag({ label }: PosTagProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#EBEBEB',
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    height: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 12,
    color: '#000000',
    fontWeight: '400',
    textAlign: 'center',
  },
});
