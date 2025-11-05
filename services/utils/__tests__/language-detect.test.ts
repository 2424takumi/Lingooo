/**
 * 言語判定ユーティリティのテスト
 */

import {
  detectLang,
  normalizeQuery,
  validateSearchInput,
  resolveMixedLanguage,
} from '../language-detect';

describe('detectLang', () => {
  describe('日本語判定', () => {
    it('ひらがなを日本語と判定', () => {
      expect(detectLang('べんきょう')).toBe('ja');
    });

    it('カタカナを日本語と判定', () => {
      expect(detectLang('ベンキョウ')).toBe('ja');
    });

    it('漢字を日本語と判定', () => {
      expect(detectLang('勉強')).toBe('ja');
    });

    it('日本語の混在を日本語と判定', () => {
      expect(detectLang('勉強する')).toBe('ja');
      expect(detectLang('研究者')).toBe('ja');
    });
  });

  describe('英語判定', () => {
    it('英語のみを英語と判定', () => {
      expect(detectLang('study')).toBe('en');
      expect(detectLang('STUDY')).toBe('en');
      expect(detectLang('Study')).toBe('en');
    });

    it('複数単語を英語と判定', () => {
      expect(detectLang('study hard')).toBe('en');
      expect(detectLang('study abroad')).toBe('en');
    });

    it('ハイフン付き単語を英語と判定', () => {
      expect(detectLang('self-study')).toBe('en');
    });

    it('アポストロフィ付き単語を英語と判定', () => {
      expect(detectLang("it's")).toBe('en');
    });
  });

  describe('混在判定', () => {
    it('日本語と英語の混在をmixedと判定', () => {
      expect(detectLang('study 勉強')).toBe('mixed');
      expect(detectLang('勉強 study')).toBe('mixed');
    });
  });

  describe('エッジケース', () => {
    it('空文字は英語と判定（デフォルト）', () => {
      expect(detectLang('')).toBe('en');
      expect(detectLang('   ')).toBe('en');
    });

    it('数字のみは英語と判定', () => {
      expect(detectLang('123')).toBe('en');
    });

    it('記号のみは英語と判定', () => {
      expect(detectLang('!!!')).toBe('en');
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

describe('resolveMixedLanguage', () => {
  it('mixedを日本語として解決', () => {
    expect(resolveMixedLanguage('mixed')).toBe('ja');
  });

  it('jaはそのまま返す', () => {
    expect(resolveMixedLanguage('ja')).toBe('ja');
  });

  it('enはそのまま返す', () => {
    expect(resolveMixedLanguage('en')).toBe('en');
  });
});
