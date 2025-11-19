# QAカード表示問題のトラブルシューティング

## 問題の概要

翻訳ページ（translate scope）でChatSectionを開閉すると、QAカードが表示されない問題が発生していました。

### 症状
- word-detailページ: QAカードは正常に表示される
- 翻訳ページ: ChatSectionを開いてもQAカードが表示されない
- 翻訳ページ: デバッグテキストを追加すると表示される
- 翻訳ページ: ChatSectionを閉じて開くたびにリセットされる

## 根本原因

ChatSectionコンポーネントのAnimated.Viewで、`animatedHeight`と`animatedOpacity`のアニメーション値が、isOpenの状態変化に対して正しく同期されていませんでした。

### 問題の詳細

```typescript
// 問題があったコード
<Animated.View
  style={{
    height: animatedHeight,
    opacity: animatedOpacity,
    overflow: 'hidden',
  }}
>
  <ScrollView>
    {/* QAカード */}
  </ScrollView>
</Animated.View>
```

**何が起きていたか:**
1. ChatSectionを閉じると、`animatedHeight`と`animatedOpacity`が0にアニメーションする
2. ChatSectionを開くと、useEffectでアニメーションが開始される
3. しかし、翻訳ページでは、アニメーション値がまだ0のままの状態でレンダリングされることがあった
4. その結果、Animated.Viewの高さと透明度が0になり、ScrollView内のQAカードが見えなくなっていた

### なぜword-detailでは問題が起きなかったのか

- word-detailページでは、ChatSectionに`key={chatIdentifier}`が設定されている
- 単語が変わるたびにChatSectionコンポーネント全体が再マウントされる
- そのため、アニメーション値が毎回初期化され、問題が顕在化しにくかった

## 解決方法

Animated.Viewのスタイルで、`isOpen`の状態に応じて確実に表示されるようにしました。

### 修正後のコード

```typescript
// components/ui/chat-section.tsx (Line 495-504)
<Animated.View
  style={{
    height: isOpen ? adjustedMaxHeight : animatedHeight,
    opacity: isOpen ? 1 : animatedOpacity,
    overflow: 'hidden',
  }}
>
  <ScrollView>
    {/* QAカード */}
  </ScrollView>
</Animated.View>
```

### 動作の説明

- **isOpen = true の時**:
  - `height: adjustedMaxHeight` (固定値) → 確実に表示される
  - `opacity: 1` (固定値) → 完全に不透明で表示される

- **isOpen = false の時**:
  - `height: animatedHeight` (アニメーション値) → 閉じるアニメーションが実行される
  - `opacity: animatedOpacity` (アニメーション値) → フェードアウトアニメーションが実行される

### なぜこれで解決したのか

1. **開いている時は常に表示される**: isOpenがtrueの間は、アニメーション値に依存せず固定値を使用するため、アニメーション値の更新タイミングに関係なく確実に表示されます

2. **閉じるアニメーションは正常に動作**: isOpenがfalseになると、アニメーション値を使用して滑らかに閉じるアニメーションが実行されます

3. **状態の同期**: アニメーション値がまだ更新されていなくても、isOpenの状態に基づいて正しく表示されます

## 学んだこと

### React NativeのAnimated APIを使う際の注意点

1. **アニメーション値の更新タイミング**: useEffectでアニメーション値を更新する場合、レンダリングとアニメーション開始の間にタイムラグが発生する可能性がある

2. **状態とアニメーションの同期**: 重要な表示/非表示の制御は、アニメーション値だけに依存せず、状態（isOpen）も併用する

3. **条件分岐での確実性**: 表示状態（isOpen = true）の時は、アニメーション値ではなく確実な固定値を使用することで、レンダリングのタイミング問題を回避できる

### デバッグのポイント

1. **段階的な絞り込み**:
   - Animated.Viewの外にデバッグテキスト → 状態は正常
   - Animated.Viewを固定値に変更 → 表示される
   - → Animated.Viewの動的値が原因と特定

2. **環境依存の問題**:
   - word-detailでは動作、翻訳ページでは動作しない
   - → 使い方の違い（keyの有無など）を調査
   - → コンポーネントの再マウント頻度の違いが影響していた

## 関連ファイル

- `components/ui/chat-section.tsx` (Line 495-504): 修正箇所
- `app/(tabs)/word-detail.tsx` (Line 1119-1140): ChatSectionの使用例

## 修正日時

2025-11-18
