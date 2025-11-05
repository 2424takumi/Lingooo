# Lingooo Design System

このドキュメントは、Lingoooアプリの統一されたデザインルールを定義します。

## カラーパレット

### プライマリカラー
- **Primary Green**: `#00AA69` - メインアクション、発音ボタン、アクセント
- **Light Green Background**: `#E5F3E8` - ChatSection背景、検索バー背景
- **Page Background**: `#FAFCFB` - ページ全体の背景、カード背景

### テキストカラー
- **Primary Text**: `#000000` - メインテキスト
- **Secondary Text**: `#686868` - セクションタイトル、説明文
- **Placeholder Text**: `#ACACAC` - 入力フィールドのプレースホルダー
- **White Text**: `#FFFFFF` - ボタン内テキスト

### その他の色
- **Tag Background**: `#EBEBEB` - 品詞タグ、質問タグの背景
- **White**: `#FFFFFF` - 入力フィールド、カード背景
- **Error Red**: `#CC0000` - エラーメッセージ

## タイポグラフィ

### フォントサイズ
- **H1 (大見出し)**: `24px` - 単語表示
- **H2 (見出し)**: `20px` - ページタイトル
- **H3 (小見出し)**: `18px` - セクションタイトル
- **Body (本文)**: `16px` - 通常テキスト、定義文
- **Small (小)**: `14px` - タグ、補助テキスト

### フォントウェイト
- **Bold**: `600` - 見出し、重要なテキスト
- **Medium**: `500` - 本文、定義
- **Regular**: `400` - 通常テキスト

### レターススペーシング
- **Wide**: `4px` - セクションタイトル（例：例文）
- **Standard**: `1px` - 見出し、タグ
- **Normal**: `0.5px` - 本文
- **Tight**: `-0.3px` - 長文テキスト

### 行高（Line Height）
- **Heading**: `22px`
- **Body**: `20px`
- **Long Text**: `26px`

## スペーシング

### パディング
- **Large Container**: `16px` (水平)
- **Medium Container**: `12px` (水平)
- **Small Container**: `8px` (水平)
- **Button Vertical**: `8-11px`
- **Section Vertical**: `10px`

### マージン（Gap）
- **Large Gap**: `24px` - セクション間
- **Medium Gap**: `12px` - コンポーネント間
- **Small Gap**: `8px` - タグ、アイテム間

### ページレイアウト
- **Page Top Padding**: `62px` (ステータスバー考慮)
- **Page Horizontal Padding**: `16px`
- **Page Bottom Padding**: `40px`

## ボーダー半径（Border Radius）

- **Extra Large**: `18px` - メインコンテナ、ChatSection、ヘッダー
- **Large**: `15px` - 入力フィールド、サブコンテナ
- **Medium**: `11px` - ボタン、アクションボタン
- **Small**: `8px` - タグ、小さいボタン
- **Pill**: `25px` - 質問タグ（完全な丸み）

## コンポーネント仕様

### ボタン
- **Primary Button**:
  - 背景: `#00AA69`
  - テキスト: `#FFFFFF`
  - サイズ: `32x32px` - `34x34px`
  - Border Radius: `11px`

- **Secondary Button**:
  - 背景: `#686868`
  - テキスト: `#FFFFFF`
  - サイズ: `34x34px`
  - Border Radius: `11px`

### タグ
- **POS Tag / Question Tag**:
  - 背景: `#EBEBEB`
  - テキスト: `#686868`
  - フォントサイズ: `14px`
  - FontWeight: `600`
  - Padding: `12px (横)`, `4px (縦)`
  - Border Radius: `8px` (POSタグ), `25px` (質問タグ)
  - 高さ: `27px` - `30px`

### 入力フィールド
- **Search Bar / Text Input**:
  - 背景: `#FFFFFF`
  - Border Radius: `15px`
  - Padding: `12px (横)`, `9px (縦)`
  - 高さ: `52px`
  - フォントサイズ: `14px`
  - FontWeight: `600`
  - プレースホルダー: `#ACACAC`

### カード
- **Word Card / Example Card**:
  - 背景: `#FAFCFB`
  - Border: `1px solid #FFFFFF`
  - Border Radius: `18px`
  - Padding: `12-16px`
  - Shadow: なし（フラットデザイン）

### ヘッダー
- **Header Bar**:
  - 背景: `#FAFCFB`
  - Border: `1px solid #FFFFFF`
  - Border Radius: `18px`
  - Padding: `8px (縦)`, `12px (横)`
  - 高さ: `52px` (Home/JpSearch), `88px` (WordDetail)

## アニメーション

### タイミング
- **標準遷移**: `300ms`
- **高速遷移**: `200ms`
- **長い遷移**: `500ms` - `1000ms` (プログレスバーなど)

### イージング
- **デフォルト**: Linear (withTiming)
- **弾むアニメーション**: Spring (withSpring)

## レイアウトパターン

### 浮遊エフェクト
- 背景を透明または半透明にする
- `position: 'absolute'` でオーバーレイ配置
- ChatSectionやモーダルに使用

### 固定要素
- **Fixed Header**: なし（スクロール可能）
- **Fixed Chat**: 画面下部に固定 (`bottom: 0, top: 170`)
- **Fixed Menu**: 画面左側に固定（サイドメニュー）

## アイコン
- **サイズ**: `18px` (小)、`24px` (中)、`28px` (大)
- **Stroke Width**: `2px`
- **スタイル**: Outlined (塗りつぶしなし)
- **カラー**: コンテキストに応じて `#000000`, `#FFFFFF`, `#686868`

## アクセシビリティ

### タッチターゲット
- **最小サイズ**: `44x44px` (iOS推奨)
- **推奨サイズ**: `48x48px` (Android推奨)
- **ボタン**: `34x34px` (小さめだが許容範囲内)

### コントラスト
- テキストと背景のコントラスト比: 最低 4.5:1
- Primary Green (`#00AA69`) on White: ✅ Pass
- Black (`#000000`) on White: ✅ Pass
- Gray (`#686868`) on White: ✅ Pass

## 使用例

### 新しいカードコンポーネントを作成する場合
```typescript
const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FAFCFB',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
});
```

### 新しいボタンを作成する場合
```typescript
const styles = StyleSheet.create({
  button: {
    backgroundColor: '#00AA69',
    borderRadius: 11,
    paddingHorizontal: 16,
    paddingVertical: 8,
    height: 34,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
  },
});
```

## 参考
- デザインファイル: [Figma - Lingooo](https://www.figma.com/design/6sEhmSvv6z5cPWxrN9IoyB/)
- テーマ定義: `/constants/theme.ts`
- コンポーネント: `/components/ui/`
