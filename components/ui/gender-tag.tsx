import { View, Text, StyleSheet } from 'react-native';

interface GenderTagProps {
  gender: 'm' | 'f' | 'n' | 'mf';
}

const GENDER_LABELS = {
  'm': '男',
  'f': '女',
  'n': '中',
  'mf': '男/女',
};

const GENDER_COLORS = {
  'm': '#E6E6E6', // 薄い青
  'f': '#FFD6E0', // 薄い赤
  'n': '#E8E8E8', // 薄いグレー（中性）
  'mf': '#E8E8E8', // 薄いグレー（両性）
};

export function GenderTag({ gender }: GenderTagProps) {
  const label = GENDER_LABELS[gender];
  const backgroundColor = GENDER_COLORS[gender];

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Text style={styles.text}>{label}</Text>
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
    color: '#000000',
    fontWeight: '400',
    textAlign: 'center',
    includeFontPadding: false,
  },
});
