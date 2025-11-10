/**
 * 言語判定ユーティリティのテスト
 */

import {
  detectLang,
  normalizeQuery,
  validateSearchInput,
  resolveLanguageCode,
} from '../language-detect';

describe('detectLang', () => {
  describe('日本語判定', () => {
    it('ひらがなを日本語と判定', () => {
      expect(detectLang('べんきょう')).toBe('ja');
    });

    it('カタカナを日本語と判定', () => {
      expect(detectLang('ベンキョウ')).toBe('ja');
    });

    it('漢字のみはkanji-onlyと判定', () => {
      expect(detectLang('勉強')).toBe('kanji-only');
    });

    it('ひらがな/カタカナを含む混在は日本語と判定', () => {
      expect(detectLang('勉強する')).toBe('ja');
      expect(detectLang('研究者')).toBe('ja');
    });
  });

  describe('アルファベット判定', () => {
    it('アルファベットのみをalphabetと判定', () => {
      expect(detectLang('study')).toBe('alphabet');
      expect(detectLang('STUDY')).toBe('alphabet');
      expect(detectLang('Study')).toBe('alphabet');
    });

    it('複数単語をalphabetと判定', () => {
      expect(detectLang('study hard')).toBe('alphabet');
      expect(detectLang('study abroad')).toBe('alphabet');
    });

    it('ハイフン付き単語をalphabetと判定', () => {
      expect(detectLang('self-study')).toBe('alphabet');
    });

    it('アポストロフィ付き単語をalphabetと判定', () => {
      expect(detectLang("it's")).toBe('alphabet');
    });
  });

  describe('混在判定', () => {
    it('日本語と英語の混在をmixedと判定', () => {
      expect(detectLang('study 勉強')).toBe('mixed');
      expect(detectLang('勉強 study')).toBe('mixed');
    });
  });

  describe('エッジケース', () => {
    it('空文字はalphabetと判定（デフォルト）', () => {
      expect(detectLang('')).toBe('alphabet');
      expect(detectLang('   ')).toBe('alphabet');
    });

    it('数字のみはmixedと判定', () => {
      expect(detectLang('123')).toBe('mixed');
    });

    it('記号のみはmixedと判定', () => {
      expect(detectLang('!!!')).toBe('mixed');
    });
  });
});

describe('normalizeQuery', () => {
  it('前後の空白を除去', () => {
    expect(normalizeQuery('  study  ')).toBe('study');
  });

  it('大文字を小文字に変換', () => {
    expect(normalizeQuery('STUDY')).toBe('study');
    expect(normalizeQuery('Study')).toBe('study');
  });

  it('連続する空白を1つに', () => {
    expect(normalizeQuery('study   hard')).toBe('study hard');
  });

  it('全角スペースを半角に変換', () => {
    expect(normalizeQuery('study　hard')).toBe('study hard');
  });

  it('複合処理', () => {
    expect(normalizeQuery('  STUDY　 HARD  ')).toBe('study hard');
  });
});

describe('validateSearchInput', () => {
  it('有効な入力を承認', () => {
    expect(validateSearchInput('study')).toEqual({ valid: true });
    expect(validateSearchInput('勉強')).toEqual({ valid: true });
  });

  it('空文字を拒否', () => {
    const result = validateSearchInput('');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('単語を入力してください');
  });

  it('空白のみを拒否', () => {
    const result = validateSearchInput('   ');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('単語を入力してください');
  });

  it('128文字超過を拒否', () => {
    const longText = 'a'.repeat(129);
    const result = validateSearchInput(longText);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('入力は128文字以内にしてください');
  });

  it('記号のみを拒否', () => {
    const result = validateSearchInput('!!!');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('有効な単語を入力してください');
  });
});

describe('resolveLanguageCode', () => {
  it('日本語はjaを返す', () => {
    expect(resolveLanguageCode('ja', 'en', 'ja')).toBe('ja');
  });

  it('kanji-onlyは選択中の言語がzhならzhを返す', () => {
    expect(resolveLanguageCode('kanji-only', 'zh', 'ja')).toBe('zh');
  });

  it('kanji-onlyは選択中の言語がzh以外なら母語(ja)を返す', () => {
    expect(resolveLanguageCode('kanji-only', 'en', 'ja')).toBe('ja');
    expect(resolveLanguageCode('kanji-only', 'es', 'ja')).toBe('ja');
  });

  it('alphabetは選択中の言語を返す', () => {
    expect(resolveLanguageCode('alphabet', 'en', 'ja')).toBe('en');
    expect(resolveLanguageCode('alphabet', 'es', 'ja')).toBe('es');
    expect(resolveLanguageCode('alphabet', 'pt', 'ja')).toBe('pt');
  });

  it('mixedは選択中の言語を返す', () => {
    expect(resolveLanguageCode('mixed', 'en', 'ja')).toBe('en');
    expect(resolveLanguageCode('mixed', 'fr', 'ja')).toBe('fr');
  });
});
