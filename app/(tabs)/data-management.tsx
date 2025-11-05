import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ThemedView } from '@/components/themed-view';
import { UnifiedHeaderBar } from '@/components/ui/unified-header-bar';
import { useThemeColor } from '@/hooks/use-theme-color';
import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

// Icons
function UploadCloudIcon({ size = 24, color = '#00AA69' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M16 16l-4-4-4 4m4-4v9"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function DownloadCloudIcon({ size = 24, color = '#00AA69' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8 17l4 4 4-4m-4-5v9"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M20.88 18.09A5 5 0 0018 9h-1.26A8 8 0 103 16.29"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function TrashIcon({ size = 24, color = '#FF4444' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function DatabaseIcon({ size = 24, color = '#686868' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2C6.5 2 2 3.79 2 6v12c0 2.21 4.5 4 10 4s10-1.79 10-4V6c0-2.21-4.5-4-10-4z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M2 12c0 2.21 4.5 4 10 4s10-1.79 10-4M2 18c0 2.21 4.5 4 10 4s10-1.79 10-4"
        stroke={color}
        strokeWidth={2}
      />
    </Svg>
  );
}

export default function DataManagementScreen() {
  const pageBackground = useThemeColor({}, 'pageBackground');
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const handleBackup = () => {
    Alert.alert(
      'バックアップ',
      '学習データをバックアップしますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'バックアップ',
          onPress: async () => {
            setIsBackingUp(true);
            // TODO: バックアップ処理を実装
            setTimeout(() => {
              setIsBackingUp(false);
              Alert.alert('完了', 'バックアップが完了しました');
            }, 2000);
          },
        },
      ]
    );
  };

  const handleRestore = () => {
    Alert.alert(
      'データの復元',
      'バックアップから学習データを復元しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '復元',
          onPress: async () => {
            setIsRestoring(true);
            // TODO: 復元処理を実装
            setTimeout(() => {
              setIsRestoring(false);
              Alert.alert('完了', 'データの復元が完了しました');
            }, 2000);
          },
        },
      ]
    );
  };

  const handleClearCache = () => {
    Alert.alert(
      'キャッシュの削除',
      '一時ファイルとキャッシュを削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: () => {
            // TODO: キャッシュ削除処理を実装
            Alert.alert('完了', 'キャッシュを削除しました');
          },
        },
      ]
    );
  };

  const handleClearAllData = () => {
    Alert.alert(
      '全データの削除',
      'すべての学習データを削除しますか？この操作は取り消せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              '確認',
              '本当にすべてのデータを削除しますか？',
              [
                { text: 'キャンセル', style: 'cancel' },
                {
                  text: '削除',
                  style: 'destructive',
                  onPress: () => {
                    // TODO: 全データ削除処理を実装
                    Alert.alert('完了', 'すべてのデータを削除しました');
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: pageBackground }]}>
      <StatusBar style="auto" />

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <UnifiedHeaderBar
            pageType="other"
            title="データ管理"
            onBackPress={() => router.back()}
          />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Storage Info */}
          <View style={styles.storageCard}>
            <DatabaseIcon size={32} color="#00AA69" />
            <Text style={styles.storageTitle}>データ使用量</Text>
            <Text style={styles.storageSize}>42.5 MB</Text>
            <Text style={styles.storageDetails}>
              単語: 234個 | ブックマーク: 45個 | 履歴: 189個
            </Text>
          </View>

          {/* Backup & Restore */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>バックアップと復元</Text>

            <TouchableOpacity
              style={styles.actionItem}
              onPress={handleBackup}
              disabled={isBackingUp}
            >
              <View style={styles.actionInfo}>
                <UploadCloudIcon size={24} color="#00AA69" />
                <View style={styles.actionText}>
                  <Text style={styles.actionLabel}>
                    {isBackingUp ? 'バックアップ中...' : 'バックアップ'}
                  </Text>
                  <Text style={styles.actionDescription}>
                    学習データをクラウドに保存
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionItem}
              onPress={handleRestore}
              disabled={isRestoring}
            >
              <View style={styles.actionInfo}>
                <DownloadCloudIcon size={24} color="#00AA69" />
                <View style={styles.actionText}>
                  <Text style={styles.actionLabel}>
                    {isRestoring ? '復元中...' : 'データの復元'}
                  </Text>
                  <Text style={styles.actionDescription}>
                    バックアップからデータを復元
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* Danger Zone */}
          <View style={[styles.section, styles.dangerSection]}>
            <Text style={[styles.sectionTitle, styles.dangerTitle]}>危険な操作</Text>

            <TouchableOpacity style={styles.actionItem} onPress={handleClearCache}>
              <View style={styles.actionInfo}>
                <TrashIcon size={24} color="#FF4444" />
                <View style={styles.actionText}>
                  <Text style={styles.actionLabel}>キャッシュを削除</Text>
                  <Text style={styles.actionDescription}>
                    一時ファイルとキャッシュを削除
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionItem, styles.dangerItem]}
              onPress={handleClearAllData}
            >
              <View style={styles.actionInfo}>
                <TrashIcon size={24} color="#FF4444" />
                <View style={styles.actionText}>
                  <Text style={[styles.actionLabel, styles.dangerText]}>
                    全データを削除
                  </Text>
                  <Text style={styles.actionDescription}>
                    すべての学習データを削除（復元不可）
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingTop: 62,
  },
  headerContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  storageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  storageTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginTop: 12,
    marginBottom: 8,
  },
  storageSize: {
    fontSize: 32,
    fontWeight: '700',
    color: '#00AA69',
    marginBottom: 8,
  },
  storageDetails: {
    fontSize: 14,
    color: '#686868',
    textAlign: 'center',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#686868',
    marginBottom: 12,
    paddingHorizontal: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actionItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  actionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionText: {
    flex: 1,
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
    color: '#686868',
  },
  dangerSection: {
    marginBottom: 40,
  },
  dangerTitle: {
    color: '#FF4444',
  },
  dangerItem: {
    borderColor: '#FFE5E5',
    backgroundColor: '#FFF8F8',
  },
  dangerText: {
    color: '#FF4444',
  },
});
