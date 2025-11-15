/**
 * テキスト選択関連の型定義
 */

export interface TextSelection {
  text: string;
  type: 'original' | 'translated';
}

export type SelectionAction = 'ask' | 'copy' | 'lookup';

export interface SelectionMenuAction {
  action: SelectionAction;
  selectedText: string;
  selectionType: 'original' | 'translated';
}
