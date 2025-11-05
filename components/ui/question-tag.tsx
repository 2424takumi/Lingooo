import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface QuestionTagProps {
  label: string;
  onPress?: () => void;
}

export function QuestionTag({ label, onPress }: QuestionTagProps) {
  return (
    <TouchableOpacity onPress={onPress}>
      <View style={styles.container}>
        <Text style={styles.text}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F5F5F5',
    borderRadius: 25,
    height: 30,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    color: '#686868',
    textAlign: 'center',
    letterSpacing: 1,
  },
});
