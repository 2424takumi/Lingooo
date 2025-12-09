import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

interface PosTagProps {
  label: string;
  gender?: 'm' | 'f' | 'n' | 'mf';
}

const GENDER_COLORS = {
  'm': '#E4E4E4', // 少し濃い青
  'f': '#FFD6E8', // 薄い赤
  'n': '#E8E8E8', // 薄いグレー
  'mf': '#E8E8E8', // 薄いグレー
};

export function PosTag({ label, gender }: PosTagProps) {
  const { t } = useTranslation();

  // 品詞を小文字に変換してi18nキーとして使用
  const posKey = label.toLowerCase().trim();
  const translatedLabel = t(`pos.${posKey}`, label); // フォールバック：元の値

  const isNoun = label.toLowerCase().includes('noun') || translatedLabel.toLowerCase().includes('noun');

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{translatedLabel}</Text>
      {isNoun && gender && (
        <View style={[styles.genderBox, { backgroundColor: GENDER_COLORS[gender] }]}>
          <Text style={styles.genderText}>{t(`gender.${gender}`)}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#EDEDED',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    minHeight: 20,
  },
  text: {
    fontSize: 14,
    lineHeight: 14,
    color: '#000000',
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
    color: '#000000',
    fontWeight: '500',
    textAlign: 'center',
    includeFontPadding: false,
  },
});
