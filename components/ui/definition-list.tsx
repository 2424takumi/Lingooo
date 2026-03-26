import { View, Text, StyleSheet } from 'react-native';
import { useEffect } from 'react';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, Easing } from 'react-native-reanimated';
import { SelectableText } from './selectable-text';
import { useThemeColor } from '@/hooks/use-theme-color';

interface DefinitionListProps {
  definitions: string[];
  onTextSelected?: (text: string) => void;
  onSelectionCleared?: () => void;
}

function DefinitionItem({ definition, index, textColor, onTextSelected, onSelectionCleared }: {
  definition: string;
  index: number;
  textColor: string;
  onTextSelected?: (text: string) => void;
  onSelectionCleared?: () => void;
}) {
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(-8);

  useEffect(() => {
    opacity.value = withDelay(index * 80, withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) }));
    translateX.value = withDelay(index * 80, withTiming(0, { duration: 300, easing: Easing.out(Easing.ease) }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Animated.View style={[styles.definitionRow, animatedStyle]}>
      <Text style={[styles.bullet, { color: textColor }]}>・</Text>
      <SelectableText
        text={definition}
        style={{ ...styles.definition, color: textColor }}
        onSelectionChange={onTextSelected}
        onSelectionCleared={onSelectionCleared}
      />
    </Animated.View>
  );
}

export function DefinitionList({ definitions, onTextSelected, onSelectionCleared }: DefinitionListProps) {
  const textColor = useThemeColor({}, 'text');
  const textTertiaryColor = useThemeColor({}, 'textTertiary');

  return (
    <View style={styles.container}>
      {definitions.map((definition, index) => (
        <DefinitionItem
          key={index}
          definition={definition}
          index={index}
          textColor={textColor}
          onTextSelected={onTextSelected}
          onSelectionCleared={onSelectionCleared}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 2,
  },
  definitionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bullet: {
    fontSize: 19,
    fontWeight: '500',
    lineHeight: 28,
    marginTop: 5,
  },
  definition: {
    flex: 1,
    fontSize: 19,
    fontWeight: '500',
    lineHeight: 28,
    letterSpacing: 0.3,
  },
});
