/**
 * Quota Exceeded Modal
 *
 * 質問回数制限に達した時に表示するモーダル
 */

import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';
import Svg, { Path } from 'react-native-svg';

function AlertCircleIcon({ size = 64, color = '#FF9800' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 8v4M12 16h.01"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

interface QuotaExceededModalProps {
  visible: boolean;
  onClose: () => void;
  remainingQuestions: number;
  isPremium: boolean;
  onUpgradePress?: () => void;
  quotaType?: 'translation_tokens' | 'question_count' | 'text_length';
}

export function QuotaExceededModal({
  visible,
  onClose,
  remainingQuestions,
  isPremium,
  onUpgradePress,
  quotaType = 'question_count', // Default to question_count for backward compatibility
}: QuotaExceededModalProps) {
  const cardBackground = useThemeColor({ light: '#FFFFFF', dark: '#1C1C1E' }, 'cardBackground');
  const textColor = useThemeColor({}, 'text');
  const subTextColor = useThemeColor({ light: '#666666', dark: '#999999' }, 'icon');

  const handleUpgrade = () => {
    onClose();
    onUpgradePress?.();
  };

  // Calculate days until reset (end of month)
  const getDaysUntilReset = () => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const daysLeft = lastDay.getDate() - now.getDate();
    return daysLeft;
  };

  const daysUntilReset = getDaysUntilReset();

  // Get title and description based on quota type
  const getTitle = () => {
    if (quotaType === 'text_length') {
      return isPremium ? '翻訳文字数の上限に達しました' : '翻訳文字数の上限に達しました';
    }
    if (quotaType === 'translation_tokens') {
      return isPremium ? '本日の翻訳トークンに達しました' : '月間翻訳トークンに達しました';
    }
    return isPremium ? '本日の質問回数に達しました' : '月間質問回数に達しました';
  };

  const getDescription = () => {
    if (quotaType === 'text_length') {
      return isPremium
        ? `一度に翻訳できる文字数は20,000文字までです。\n\nテキストを分割して翻訳してください。`
        : `無料プランでは一度に4,000文字まで翻訳できます。\n\nプレミアムプランにアップグレードすると、20,000文字まで翻訳できます。`;
    }
    if (quotaType === 'translation_tokens') {
      return isPremium
        ? `本日の翻訳トークン制限に達しました。\n明日リセットされます。`
        : `無料プランの月間翻訳トークン制限に達しました。\n\nプレミアムプランにアップグレードすると、より多くの翻訳が可能になります。`;
    }
    return isPremium
      ? `本日の質問回数制限に達しました。\n明日リセットされます。`
      : `無料プランの月間質問回数（100回）に達しました。\n\nプレミアムプランにアップグレードすると、月間1,000回まで質問できます。`;
  };

  const getUpgradeButtonText = () => {
    if (quotaType === 'text_length') {
      return 'もっと長い文章を翻訳したい';
    }
    if (quotaType === 'translation_tokens') {
      return 'もっと翻訳したい';
    }
    return 'もっと質問したい';
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: cardBackground }]}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <AlertCircleIcon size={64} />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: textColor }]}>
            {getTitle()}
          </Text>

          {/* Description */}
          <Text style={[styles.description, { color: subTextColor }]}>
            {getDescription()}
          </Text>

          {/* Reset Info */}
          {!isPremium && quotaType !== 'text_length' && (
            <View style={styles.resetInfo}>
              <Text style={[styles.resetText, { color: subTextColor }]}>
                無料プランは{daysUntilReset}日後にリセットされます
              </Text>
            </View>
          )}

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            {!isPremium && (
              <TouchableOpacity style={styles.upgradeButton} onPress={handleUpgrade}>
                <Text style={styles.upgradeButtonText}>{getUpgradeButtonText()}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.closeButton,
                isPremium && styles.closeButtonPrimary,
              ]}
              onPress={onClose}
            >
              <Text
                style={[
                  styles.closeButtonText,
                  { color: isPremium ? '#FFFFFF' : textColor },
                ]}
              >
                {isPremium ? '閉じる' : 'キャンセル'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 15,
  },
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 20,
  },
  resetInfo: {
    backgroundColor: '#FFF3E0',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  resetText: {
    fontSize: 13,
    fontWeight: '500',
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  upgradeButton: {
    backgroundColor: '#111111',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  closeButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  closeButtonPrimary: {
    backgroundColor: '#111111',
  },
  closeButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
