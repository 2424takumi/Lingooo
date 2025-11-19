# チャットセクション スペーシング設定

このドキュメントは、ChatSection コンポーネントの完璧なスペーシング設定を記録します。

## 📍 ファイル位置
`/components/ui/chat-section.tsx`

## ✅ 完璧な設定（変更しないこと）

### 閉じている時のスペーシング

#### Container
```typescript
containerClosed: {
  marginBottom: 4,
  paddingTop: 8,      // ← 変更しない
  paddingBottom: 10,
}
```

#### Bottom Section（動的設定）
```typescript
// JSX内で動的に設定
<View style={[
  styles.bottomSection,
  {
    paddingTop: isOpen ? 8 : 4,  // ← 閉じている時: 4px
  },
  // ...
]}>
```

**合計の上側スペース（閉じている時）**: 8 + 4 = **12px**

### 開いている時のスペーシング

#### Container
```typescript
containerOpen: {
  paddingTop: 8,      // ← 変更しない
  paddingBottom: 10,
  marginBottom: 4,
}
```

#### Bottom Section（動的設定）
```typescript
// JSX内で動的に設定
<View style={[
  styles.bottomSection,
  {
    paddingTop: isOpen ? 8 : 4,  // ← 開いている時: 8px
  },
  // ...
]}>
```

**合計の上側スペース（開いている時）**: 8 + 8 = **16px**

### カスタム質問タグとテキストインプットの間隔

```typescript
bottomSection: {
  flexShrink: 0,
  paddingTop: 8,
  flexDirection: 'column',
  alignItems: 'stretch',
  gap: 6,  // ← 変更しない（質問タグとテキストインプットの間隔）
}
```

**質問タグとテキストインプットの間隔**: **6px**（常に固定）

## 🎯 設定の意図

1. **閉じている時（12px）**: カスタム質問タグが全体の枠に近く表示され、コンパクトな印象
2. **開いている時（16px）**: QAカード表示エリアと質問タグの間に適切なスペースを確保
3. **質問タグとテキストインプット（6px）**: 常に一定の間隔を保ち、視覚的な一貫性を維持

## ⚠️ 注意事項

- `containerClosed`と`containerOpen`の`paddingTop`は変更しないこと
- `bottomSection`の`paddingTop`は動的に設定されているため、StyleSheet内の値（8px）を変更しないこと
- `gap`の値（6px）は変更しないこと
- 変更が必要な場合は、必ずこのドキュメントを更新すること

## 📝 変更履歴

### 2025-01-18
- 初回設定: 閉じている時の上側スペースを半分に（16px → 12px）
- 動的な`paddingTop`設定を実装（閉じている時: 4px、開いている時: 8px）
- この設定が完璧であると確認
