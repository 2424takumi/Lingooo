import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';

interface LanguageTagProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

export function LanguageTag({ label, selected = true, onPress }: LanguageTagProps) {
  const selectedBackground = useThemeColor({}, 'tagUnselectedBackground');
  const selectedTextColor = useThemeColor({}, 'tagUnselectedText');
  const unselectedBackground = '#323232';
  const unselectedTextColor = useThemeColor({}, 'tagSelectedText');

  return (
    <TouchableOpacity onPress={onPress}>
      <View
        style={[
          styles.container,
          {
            backgroundColor: selected ? selectedBackground : unselectedBackground,
          },
        ]}
      >
        <Text
          style={[
            styles.text,
            { color: selected ? selectedTextColor : unselectedTextColor },
          ]}
        >
          {label}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 28,
    paddingHorizontal: 17,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});
