/**
 * ブックマーク管理フック
 *
 * ブックマーク追加、フォルダ管理、モーダル表示などの共通ロジック
 */

import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { loadFolders, updateBookmarkFolder, addFolder, type BookmarkFolder } from '@/services/storage/bookmark-storage';
import { useSubscription } from '@/contexts/subscription-context';
import { logger } from '@/utils/logger';

interface UseBookmarkManagementOptions {
  /**
   * ログメッセージのプレフィックス（デバッグ用）
   */
  logPrefix?: string;
}

export function useBookmarkManagement(options: UseBookmarkManagementOptions = {}) {
  const { logPrefix = 'BookmarkManagement' } = options;
  const { isPremium } = useSubscription();

  // State
  const [toastVisible, setToastVisible] = useState(false);
  const [selectedBookmarkId, setSelectedBookmarkId] = useState<string | null>(null);
  const [isFolderSelectModalOpen, setIsFolderSelectModalOpen] = useState(false);
  const [folders, setFolders] = useState<BookmarkFolder[]>([]);
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);

  // フォルダを読み込む
  const fetchFolders = async () => {
    try {
      const data = await loadFolders();
      setFolders(data);
    } catch (error) {
      logger.error(`[${logPrefix}] Failed to load folders:`, error);
    }
  };

  // 初回読み込み
  useEffect(() => {
    void fetchFolders();
  }, []);

  // ブックマーク追加時のハンドラー
  const handleBookmarkAdded = (bookmarkId: string) => {
    setSelectedBookmarkId(bookmarkId);
    setToastVisible(true);
  };

  // トースト終了時
  const handleToastDismiss = () => {
    setToastVisible(false);
  };

  // フォルダ選択モーダルを開く（プレミアム限定）
  const handleOpenFolderSelect = () => {
    if (!isPremium) {
      // 無料プランの場合はサブスクリプションモーダルを表示
      setIsSubscriptionModalOpen(true);
      setToastVisible(false);
      return;
    }
    setIsFolderSelectModalOpen(true);
  };

  // フォルダにブックマークを追加
  const handleAddToFolder = async (folderId?: string) => {
    if (!selectedBookmarkId) return;

    try {
      await updateBookmarkFolder(selectedBookmarkId, folderId);
      setIsFolderSelectModalOpen(false);
      setToastVisible(false);
      setSelectedBookmarkId(null);
      logger.debug(`[${logPrefix}] Bookmark added to folder:`, folderId);
    } catch (error) {
      logger.error(`[${logPrefix}] Failed to add bookmark to folder:`, error);
    }
  };

  // 新規フォルダ作成モーダルを開く
  const handleOpenCreateFolderModal = () => {
    setIsFolderSelectModalOpen(false);
    setIsCreateFolderModalOpen(true);
  };

  // 新規フォルダ作成モーダルを閉じる
  const handleCloseCreateFolderModal = () => {
    setIsCreateFolderModalOpen(false);
    setNewFolderName('');
    setSelectedBookmarkId(null);
  };

  // フォルダ選択モーダルを閉じる
  const handleCloseFolderSelectModal = () => {
    setIsFolderSelectModalOpen(false);
    setSelectedBookmarkId(null);
  };

  // 新規フォルダを作成してブックマークを追加
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      Alert.alert('エラー', 'フォルダ名を入力してください');
      return;
    }

    if (!selectedBookmarkId) {
      Alert.alert('エラー', 'ブックマークが選択されていません');
      return;
    }

    try {
      // 1. 新しいフォルダを作成
      const newFolder = await addFolder(newFolderName.trim());
      logger.debug(`[${logPrefix}] Created new folder:`, newFolder.id, newFolder.name);

      // 2. ブックマークを新しいフォルダに追加
      await updateBookmarkFolder(selectedBookmarkId, newFolder.id);
      logger.debug(`[${logPrefix}] Bookmark added to new folder:`, selectedBookmarkId, newFolder.id);

      // 3. フォルダリストを再読み込み
      await fetchFolders();

      // 4. モーダルを閉じてステートをリセット
      setIsCreateFolderModalOpen(false);
      setNewFolderName('');
      setToastVisible(false);
      setSelectedBookmarkId(null);
    } catch (error) {
      logger.error(`[${logPrefix}] Failed to create folder:`, error);
      Alert.alert('エラー', 'フォルダの作成に失敗しました');
    }
  };

  return {
    // State
    toastVisible,
    selectedBookmarkId,
    isFolderSelectModalOpen,
    folders,
    isCreateFolderModalOpen,
    newFolderName,
    isSubscriptionModalOpen,

    // State setters
    setNewFolderName,
    setIsSubscriptionModalOpen,

    // Handlers
    handleBookmarkAdded,
    handleToastDismiss,
    handleOpenFolderSelect,
    handleAddToFolder,
    handleOpenCreateFolderModal,
    handleCreateFolder,
    handleCloseFolderSelectModal,
    handleCloseCreateFolderModal,
  };
}
