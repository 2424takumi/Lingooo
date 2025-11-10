import { View, Text, StyleSheet } from 'react-native';
import { translatePosToJa } from '@/utils/pos-translation';

interface PosTagProps {
  label: string;
  gender?: 'm' | 'f' | 'n' | 'mf';
}

const GENDER_LABELS = {
  'm': '男',
  'f': '女',
  'n': '中',
  'mf': '男/女',
};

const GENDER_COLORS = {
  'm': '#C5E3FF', // 少し濃い青
  'f': '#FFD6E8', // 薄い赤
  'n': '#E8E8E8', // 薄いグレー
  'mf': '#E8E8E8', // 薄いグレー
};

export function PosTag({ label, gender }: PosTagProps) {
  const translatedLabel = translatePosToJa(label);
  const isNoun = label.toLowerCase().includes('noun') || translatedLabel.includes('名詞');

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{translatedLabel}</Text>
      {isNoun && gender && (
        <View style={[styles.genderBox, { backgroundColor: GENDER_COLORS[gender] }]}>
          <Text style={styles.genderText}>{GENDER_LABELS[gender]}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#EBEBEB',
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  text: {
    fontSize: 12,
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
