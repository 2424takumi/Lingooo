import type { NuanceType } from '@/components/ui/nuance-tag';

/**
 * ニュアンススコア（0-100）をニュアンスタイプに変換
 *
 * @param score - ニュアンススコア (0=casual, 50=neutral, 100=formal)
 * @returns ニュアンスタイプ
 */
export function getNuanceType(score: number | undefined): NuanceType | undefined {
  if (score === undefined) {
    return undefined;
  }

  if (score <= 20) {
    return 'slang';
  } else if (score <= 40) {
    return 'casual';
  } else if (score <= 60) {
    return 'neutral';
  } else if (score <= 80) {
    return 'formal';
  } else {
    return 'academic';
  }
}
