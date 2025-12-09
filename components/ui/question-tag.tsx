import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';

interface QuestionTagProps {
  label: string;
  icon?: string;
  onPress?: () => void;
}

export function QuestionTag({ label, icon, onPress }: QuestionTagProps) {
  const backgroundColor = useThemeColor({}, 'questionTagBackground');
  const textColor = useThemeColor({}, 'questionTagText');

  return (
    <TouchableOpacity onPress={onPress}>
      <View style={[styles.container, { backgroundColor }]}>
        {icon && <Text style={styles.icon}>{icon}</Text>}
        <Text style={[styles.text, { color: textColor }]}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 12,
    height: 32,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  icon: {
    fontSize: 14,
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 1.5,
  },
});
