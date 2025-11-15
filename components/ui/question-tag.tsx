import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';

interface QuestionTagProps {
  label: string;
  onPress?: () => void;
}

export function QuestionTag({ label, onPress }: QuestionTagProps) {
  const backgroundColor = useThemeColor({}, 'questionTagBackground');
  const textColor = useThemeColor({}, 'questionTagText');

  return (
    <TouchableOpacity onPress={onPress}>
      <View style={[styles.container, { backgroundColor }]}>
        <Text style={[styles.text, { color: textColor }]}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    height: 28,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 1.5,
  },
});
