import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useThemeColor } from '@/hooks/use-theme-color';

interface PosTagProps {
  label: string;
  gender?: 'm' | 'f' | 'n' | 'mf';
}

const GENDER_THEME_KEYS = {
  'm': 'genderMasculine',
  'f': 'genderFeminine',
  'n': 'genderNeuter',
  'mf': 'genderNeuter',
} as const;

export function PosTag({ label, gender }: PosTagProps) {
  const { t } = useTranslation();
  const bgColor = useThemeColor({}, 'posTagBackground');
  const textColor = useThemeColor({}, 'posTagText');
  const genderBg = gender ? useThemeColor({}, GENDER_THEME_KEYS[gender]) : undefined;

  // 品詞はAPIから母国語で返されるのでそのまま表示。英語で来た場合はi18nでフォールバック
  const posKey = label.toLowerCase().trim();
  const translatedLabel = t(`pos.${posKey}`, label);

  const isNoun = label.toLowerCase().includes('noun') || label.includes('名詞');

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <Text style={[styles.text, { color: textColor }]}>{translatedLabel}</Text>
      {isNoun && gender && (
        <View style={[styles.genderBox, { backgroundColor: genderBg }]}>
          <Text style={[styles.genderText, { color: textColor }]}>{t(`gender.${gender}`)}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingTop: 5,
    paddingBottom: 6,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    minHeight: 24,
  },
  text: {
    fontSize: 14,
    lineHeight: 16,
    fontWeight: '400',
    textAlign: 'center',
    includeFontPadding: false,
  },
  genderBox: {
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  genderText: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '500',
    textAlign: 'center',
    includeFontPadding: false,
  },
});
