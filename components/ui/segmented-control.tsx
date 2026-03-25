import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';

interface SegmentedControlProps {
  segments: string[];
  selectedIndex: number;
  onIndexChange: (index: number) => void;
}

export function SegmentedControl({ segments, selectedIndex, onIndexChange }: SegmentedControlProps) {
  const backgroundColor = useThemeColor({}, 'segmentedBackground');
  const selectedBackground = useThemeColor({}, 'segmentedActiveBackground');
  const textColor = useThemeColor({}, 'text');

  return (
    <View style={styles.container}>
      <View style={[styles.segmentedControl, { backgroundColor }]}>
        {segments.map((segment, index) => (
          <TouchableOpacity
            key={segment}
            style={[
              styles.segmentButton,
              selectedIndex === index && [styles.segmentButtonSelected, { backgroundColor: selectedBackground }],
            ]}
            onPress={() => onIndexChange(index)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.segmentButtonText,
                { color: textColor },
                selectedIndex === index && styles.segmentButtonTextSelected,
              ]}
            >
              {segment}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 100,
    padding: 3,
    width: 260,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentButtonSelected: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 2,
  },
  segmentButtonText: {
    fontSize: 15,
    fontWeight: '400',
    letterSpacing: 1.0,
  },
  segmentButtonTextSelected: {
    fontWeight: '500',
  },
});
