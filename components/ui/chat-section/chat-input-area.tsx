
import React, { forwardRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { CloseIcon, CornerDownRightIcon, ExpandIcon, SendIcon, ShrinkIcon } from './icons';

interface ChatInputAreaProps {
  inputText: string;
  setInputText: (text: string) => void;
  isInputFocused: boolean;
  setIsInputFocused: (focused: boolean) => void;
  isOpen: boolean;
  activeFollowUpPair: any; // Type simplification
  onEnterFollowUpMode: (id: string, question: string) => void;
  dynamicPlaceholder: string;
  placeholderColor?: string;
  isStreaming: boolean;
  isSubmitting: boolean;
  handleActionButtonPress: () => void;
  inputAnimatedStyle: StyleProp<ViewStyle>;
  inputBackground: string;
}

export const ChatInputArea = forwardRef<TextInput, ChatInputAreaProps>(
  (
    {
      inputText,
      setInputText,
      isInputFocused,
      setIsInputFocused,
      isOpen,
      activeFollowUpPair,
      onEnterFollowUpMode,
      dynamicPlaceholder,
      placeholderColor = '#ACACAC',
      isStreaming,
      isSubmitting,
      handleActionButtonPress,
      inputAnimatedStyle,
      inputBackground,
    },
    ref
  ) => {
    return (
      <>
        {/* Follow-up Context View */}
        {activeFollowUpPair && (
          <View style={styles.followUpContextContainer}>
            <View style={styles.followUpContextContent}>
              <CornerDownRightIcon size={18} color="#CECECE" />
              <Text style={styles.followUpContextLabel} numberOfLines={1}>
                {activeFollowUpPair.q}
              </Text>
              <TouchableOpacity
                style={styles.followUpContextCloseButton}
                onPress={() => onEnterFollowUpMode(activeFollowUpPair.id, activeFollowUpPair.q)}
                hitSlop={8}
              >
                <CloseIcon size={18} color="#CECECE" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* White Container: Input + Action Button (1 row) */}
        <Animated.View
          style={[
            styles.whiteContainer,
            { backgroundColor: inputBackground },
            inputAnimatedStyle,
          ]}
        >
          <View style={styles.inputRow}>
            {/* Text Input */}
            <View style={styles.inputWrapper}>
              <TextInput
                ref={ref}
                style={[
                  styles.input,
                  {
                    lineHeight: 20, // default
                    paddingTop: 10,
                    paddingBottom: 10,
                  },
                ]}
                placeholder={
                  activeFollowUpPair
                    ? 'この回答に追加で質問をする...'
                    : dynamicPlaceholder
                }
                placeholderTextColor={placeholderColor}
                value={inputText}
                onChangeText={setInputText}
                onFocus={() => {
                  setIsInputFocused(true);
                }}
                onBlur={() => {
                  setIsInputFocused(false);
                }}
                editable={!isStreaming}
                multiline
                textAlignVertical="top"
                scrollEnabled={false}
                selectionColor="#242424"
                selectTextOnFocus={false}
                contextMenuHidden={false}
              />
            </View>

            {/* Action Button */}
            <TouchableOpacity
              style={[
                styles.button,
                (isStreaming || isSubmitting) && styles.buttonDisabled,
              ]}
              onPress={handleActionButtonPress}
              disabled={isStreaming || isSubmitting}
            >
              {isInputFocused && inputText.trim().length > 0 ? (
                <SendIcon size={20} />
              ) : isOpen ? (
                <ShrinkIcon size={22} />
              ) : (
                <ExpandIcon size={18} />
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </>
    );
  }
);

ChatInputArea.displayName = 'ChatInputArea';

const styles = StyleSheet.create({
  whiteContainer: {
    borderRadius: 24,
    padding: 6,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    minHeight: 44,
  },
  inputWrapper: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 8,
    marginLeft: 8,
  },
  input: {
    fontSize: 16,
    color: '#000000',
    padding: 0,
    margin: 0,
    maxHeight: 120, // Increase max height
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#242424',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  followUpContextContainer: {
    paddingHorizontal: 8,
    marginBottom: 0,
  },
  followUpContextContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 4,
    gap: 8,
  },
  followUpContextLabel: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  followUpContextCloseButton: {
    padding: 4,
    marginRight: 0,
  },
});
