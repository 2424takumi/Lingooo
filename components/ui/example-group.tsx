import { View, Text, StyleSheet } from 'react-native';

interface ExampleGroupProps {
  english: string;
  japanese: string;
}

export function ExampleGroup({ english, japanese }: ExampleGroupProps) {
  return (
    <View style={styles.container}>
      <View style={styles.bullet} />
      <View style={styles.textContainer}>
        <Text style={styles.english}>{english}</Text>
        <Text style={styles.japanese}>{japanese}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 20,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00AA69',
    marginTop: 10,
  },
  textContainer: {
    flex: 1,
    gap: 6,
  },
  english: {
    fontSize: 20,
    fontWeight: '500',
    color: '#000000',
    lineHeight: 26,
    letterSpacing: 0.5,
  },
  japanese: {
    fontSize: 15,
    fontWeight: '400',
    color: '#686868',
    lineHeight: 20,
    letterSpacing: 0.5,
  },
});
