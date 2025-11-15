import { Alert } from 'react-native';
import type { TextSelection } from '@/types/selection';
import { isSingleWord } from '@/utils/text-formatter';

interface TextSelectionMenuProps {
  selection: TextSelection;
  onAsk: (text: string, type: 'original' | 'translated') => void;
  onLookup: (text: string, type: 'original' | 'translated') => void;
  onCopy?: () => void; // オプション（既にコピー済みの場合）
}

/**
 * テキスト選択メニューを表示
 * iOSのAlertを使用して3つのアクション（質問する、コピー、辞書/翻訳）を提供
 */
export function showTextSelectionMenu({
  selection,
  onAsk,
  onLookup,
  onCopy,
}: TextSelectionMenuProps) {
  const { text, type } = selection;
  const displayText = text.length > 30 ? text.substring(0, 30) + '...' : text;
  const isSingle = isSingleWord(text);

  const buttons = [
    {
      text: '💬 質問する',
      onPress: () => onAsk(text, type),
    },
    {
      text: '📋 コピー',
      onPress: onCopy || (() => {}),
      style: onCopy ? 'default' : 'cancel',
    },
    {
      text: isSingle ? '📖 辞書で調べる' : '🔄 翻訳する',
      onPress: () => onLookup(text, type),
    },
    {
      text: 'キャンセル',
      onPress: () => {}, // キャンセルボタンにも onPress を追加
      style: 'cancel' as const,
    },
  ];

  Alert.alert(
    '選択されたテキスト',
    `"${displayText}"`,
    buttons
  );
}
