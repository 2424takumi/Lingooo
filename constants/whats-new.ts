// バージョンごとの更新内容を定義
// 新バージョンリリース時はここにエントリを追加するだけ
// i18nキーは `whatsNew.versions.{version}.items.{index}` の形式

export interface WhatsNewVersion {
  version: string;
  itemCount: number; // i18nキーの数
}

// 新しいバージョンを上に追加
export const WHATS_NEW_VERSIONS: WhatsNewVersion[] = [
  {
    version: '1.0.6',
    itemCount: 1,
  },
];

// 最新バージョンの更新内容があるか確認
export function getWhatsNewForVersion(version: string): WhatsNewVersion | undefined {
  return WHATS_NEW_VERSIONS.find(v => v.version === version);
}
