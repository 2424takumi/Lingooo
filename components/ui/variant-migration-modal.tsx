/**
 * バリアント選択モーダル
 *
 * 既存ユーザーの初回起動時に、言語バリアント（ブラジルPT vs ポルトガルPT等）を選択するモーダル
 * 複数バリアントの選択が可能（両方の違いを学びたいユーザー向け）
 */

import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { useState } from 'react';
import { AVAILABLE_LANGUAGES, Language } from '@/types/language';
import { useThemeColor } from '@/hooks/use-theme-color';

interface VariantGroup {
  groupId: string;
  groupName: string;
  variants: Language[];
  defaultVariantId: string;
}

interface VariantMigrationModalProps {
  visible: boolean;
  languagesToMigrate: Language[];
  onComplete: (selections: Record<string, string[]>) => void;
}

/**
 * レガシーコードを持つ言語のバリアントグループを取得
 */
function getVariantGroups(languagesToMigrate: Language[]): VariantGroup[] {
  const groups: VariantGroup[] = [];
  const seenGroups = new Set<string>();

  for (const lang of languagesToMigrate) {
    if (!lang.groupId || seenGroups.has(lang.groupId)) continue;
    seenGroups.add(lang.groupId);

    const variants = AVAILABLE_LANGUAGES.filter(l => l.groupId === lang.groupId);
    if (variants.length <= 1) continue;

    // デフォルトは現在のフラグに基づいた選択
    const defaultVariantId = lang.id;

    // グループ名を決定
    const groupName = lang.groupId === 'english' ? '英語' :
      lang.groupId === 'portuguese' ? 'ポルトガル語' :
      lang.groupId;

    groups.push({
      groupId: lang.groupId,
      groupName,
      variants,
      defaultVariantId,
    });
  }

  return groups;
}

export function VariantMigrationModal({
  visible,
  languagesToMigrate,
  onComplete,
}: VariantMigrationModalProps) {
  const variantGroups = getVariantGroups(languagesToMigrate);

  const modalOverlayColor = useThemeColor({}, 'modalOverlay');
  const modalBackgroundColor = useThemeColor({}, 'modalBackground');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const textTertiaryColor = useThemeColor({}, 'textTertiary');
  const cardBackgroundColor = useThemeColor({}, 'cardBackground');
  const successBackgroundColor = useThemeColor({}, 'successBackground');
  const accentColor = useThemeColor({}, 'accent');
  const textOnPrimaryColor = useThemeColor({}, 'textOnPrimary');

  // 各グループのデフォルト選択を初期化（デフォルトは1つ選択済み）
  const initialSelections: Record<string, string[]> = {};
  for (const group of variantGroups) {
    initialSelections[group.groupId] = [group.defaultVariantId];
  }
  const [selections, setSelections] = useState<Record<string, string[]>>(initialSelections);

  const handleToggle = (groupId: string, variantId: string) => {
    setSelections(prev => {
      const current = prev[groupId] || [];
      const isSelected = current.includes(variantId);

      if (isSelected) {
        // 最低1つは選択が必要
        if (current.length <= 1) return prev;
        return { ...prev, [groupId]: current.filter(id => id !== variantId) };
      } else {
        return { ...prev, [groupId]: [...current, variantId] };
      }
    });
  };

  const handleComplete = () => {
    onComplete(selections);
  };

  if (variantGroups.length === 0) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {}}
    >
      <View style={[styles.overlay, { backgroundColor: modalOverlayColor }]}>
        <View style={[styles.container, { backgroundColor: modalBackgroundColor }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={[styles.title, { color: textColor }]}>言語のバリアントを選択</Text>
            <Text style={[styles.description, { color: textSecondaryColor }]}>
              学習中の言語にバリアントが追加されました。{'\n'}
              学びたいバリアントを選択してください。{'\n'}
              両方選択することもできます。
            </Text>

            {variantGroups.map((group) => (
              <View key={group.groupId} style={styles.groupContainer}>
                <Text style={[styles.groupTitle, { color: textTertiaryColor }]}>{group.groupName}</Text>
                {group.variants.map((variant) => {
                  const isSelected = (selections[group.groupId] || []).includes(variant.id);
                  return (
                    <TouchableOpacity
                      key={variant.id}
                      style={[
                        styles.variantItem,
                        { backgroundColor: cardBackgroundColor },
                        isSelected && styles.variantItemSelected,
                        isSelected && { backgroundColor: successBackgroundColor, borderColor: accentColor },
                      ]}
                      onPress={() => handleToggle(group.groupId, variant.id)}
                    >
                      <Text style={styles.variantFlag}>{variant.flag}</Text>
                      <Text style={[
                        styles.variantName,
                        { color: textColor },
                        isSelected && { fontWeight: '600', color: accentColor },
                      ]}>
                        {variant.name}
                      </Text>
                      {isSelected && <Text style={[styles.checkmark, { color: accentColor }]}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity style={[styles.button, { backgroundColor: accentColor }]} onPress={handleComplete}>
            <Text style={[styles.buttonText, { color: textOnPrimaryColor }]}>決定</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  container: {
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 20,
    width: '100%',
    maxHeight: '80%',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  groupContainer: {
    marginBottom: 20,
  },
  groupTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  variantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 6,
    gap: 12,
  },
  variantItemSelected: {
    borderWidth: 1.5,
  },
  variantFlag: {
    fontSize: 24,
  },
  variantName: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  checkmark: {
    fontSize: 18,
    fontWeight: '600',
  },
  button: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
