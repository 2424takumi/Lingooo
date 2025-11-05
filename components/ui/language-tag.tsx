import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface LanguageTagProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

export function LanguageTag({ label, selected = true, onPress }: LanguageTagProps) {
  return (
    <TouchableOpacity onPress={onPress}>
      <View style={[styles.container, selected && styles.selected]}>
        <Text style={[styles.text, selected && styles.selectedText]}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 24,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selected: {
    backgroundColor: '#00AA69',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
    textAlign: 'center',
  },
  selectedText: {
    color: '#FFFFFF',
  },
});
