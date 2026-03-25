import { View, Text, StyleSheet } from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';

interface GenderTagProps {
  gender: 'm' | 'f' | 'n' | 'mf';
}

const GENDER_LABELS = {
  'm': '男',
  'f': '女',
  'n': '中',
  'mf': '男/女',
};

const GENDER_THEME_KEYS = {
  'm': 'genderMasculine',
  'f': 'genderFeminine',
  'n': 'genderNeuter',
  'mf': 'genderNeuter',
} as const;

export function GenderTag({ gender }: GenderTagProps) {
  const label = GENDER_LABELS[gender];
  const backgroundColor = useThemeColor({}, GENDER_THEME_KEYS[gender]);
  const textColor = useThemeColor({}, 'posTagText');

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Text style={[styles.text, { color: textColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingTop: 2.5,
    paddingBottom: 4.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '400',
    textAlign: 'center',
    includeFontPadding: false,
  },
});
