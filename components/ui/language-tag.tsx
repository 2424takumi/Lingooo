import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';

interface LanguageTagProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

export function LanguageTag({ label, selected = true, onPress }: LanguageTagProps) {
  // selected = 現在アクティブなタブ（黒背景・白テキスト / ダークモードでも黒）
  const activeBackground = useThemeColor({}, 'inputBackground');
  const activeTextColor = useThemeColor({}, 'text');
  // unselected = 非アクティブタブ（グレー背景・薄いテキスト）
  const inactiveBackground = useThemeColor({}, 'questionTagBackground');
  const inactiveTextColor = useThemeColor({}, 'questionTagText');

  return (
    <TouchableOpacity onPress={onPress}>
      <View
        style={[
          styles.container,
          {
            backgroundColor: selected ? activeBackground : inactiveBackground,
          },
        ]}
      >
        <Text
          style={[
            styles.text,
            { color: selected ? activeTextColor : inactiveTextColor },
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
