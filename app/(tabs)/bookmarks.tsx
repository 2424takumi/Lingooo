import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert, RefreshControl, Pressable, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Clipboard from 'expo-clipboard';
import { ThemedView } from '@/components/themed-view';
import { UnifiedHeaderBar } from '@/components/ui/unified-header-bar';
import { QACard } from '@/components/ui/qa-card';
import { SubscriptionBottomSheet } from '@/components/ui/subscription-bottom-sheet';
import { useThemeColor } from '@/hooks/use-theme-color';
import { loadBookmarks, removeBookmark, loadFolders, addFolder, updateBookmarkFolder, removeFolder, updateFolderName, type ChatBookmark, type BookmarkFolder } from '@/services/storage/bookmark-storage';
import { CopyIcon } from '@/components/icons/copy-icon';
import Svg, { Path } from 'react-native-svg';
import { logger } from '@/utils/logger';
import { useLearningLanguages } from '@/contexts/learning-languages-context';
import { useSubscription } from '@/contexts/subscription-context';
import { detectLang, resolveLanguageCode } from '@/services/utils/language-detect';

// Icons
function StarIcon({ size = 16 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, backgroundColor: '#FFE44D', borderRadius: size / 2, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none">
        <Path
          d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
          fill="#FFFFFF"
        />
      </Svg>
    </View>
  );
}

function FolderIcon({ size = 18, color = '#686868' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2v11z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function TrashIcon({ size = 18, color = '#686868' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function BookmarkEmptyIcon({ size = 64, color = '#D1D1D1' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function PlusIcon({ size = 24, color = '#111111' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 5v14M5 12h14"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CheckIcon({ size = 20, color = '#111111' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 6L9 17l-5-5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

type TabType = 'all' | 'folders';

interface FolderCardProps {
  folder: BookmarkFolder;
  bookmarkCount: number;
  onPress: () => void;
  onLongPress: () => void;
}

function FolderCard({ folder, bookmarkCount, onPress, onLongPress }: FolderCardProps) {
  const { t } = useTranslation();
  const cardBackground = useThemeColor({ light: '#FAFCFB', dark: '#1C1C1E' }, 'background');
  const borderColor = useThemeColor({ light: '#E5E5EA', dark: '#3A3A3C' }, 'background');
  const titleColor = useThemeColor({ light: '#000000', dark: '#F2F2F2' }, 'text');
  const subtitleColor = useThemeColor({ light: '#686868', dark: '#8E8E93' }, 'icon');

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} style={styles.folderCardPressable}>
      <View style={[styles.folderCard, { backgroundColor: cardBackground, borderColor }]}>
        <View style={styles.folderCardHeader}>
          <FolderIcon size={24} color="#111111" />
          <View style={styles.folderCardInfo}>
            <Text style={[styles.folderCardTitle, { color: titleColor }]} numberOfLines={1} ellipsizeMode="tail">
              {folder.name}
            </Text>
            <View style={styles.folderCardMeta}>
              <Text style={[styles.folderCardCount, { color: subtitleColor }]}>
                {t('bookmarks.bookmarkCount', { count: bookmarkCount })}
              </Text>
              <Text style={[styles.folderCardDate, { color: subtitleColor }]}>
                {formatDate(folder.createdAt)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

interface BookmarkCardProps {
  bookmark: ChatBookmark;
  onDelete: (id: string) => void;
  onAddToFolder: (bookmarkId: string) => void;
  onCardPress?: (bookmark: ChatBookmark) => void;
}

function BookmarkCard({ bookmark, onDelete, onAddToFolder, onCardPress }: BookmarkCardProps) {
  const { t } = useTranslation();
  const labelColor = useThemeColor({ light: '#949494', dark: '#8E8E93' }, 'icon');
  const iconColor = useThemeColor({ light: '#686868', dark: '#8E8E93' }, 'icon');

  // Format date
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return t('bookmarks.today');
    } else if (diffDays === 1) {
      return t('bookmarks.yesterday');
    } else if (diffDays < 7) {
      return t('bookmarks.daysAgo', { days: diffDays });
    } else {
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }
  };

  // Format scope label
  const getScopeLabel = () => {
    return bookmark.identifier || t('bookmarks.general');
  };

  const handleDelete = () => {
    Alert.alert(
      t('bookmarks.deleteBookmark'),
      t('bookmarks.deleteBookmarkConfirm'),
      [
        { text: t('bookmarks.cancel'), style: 'cancel' },
        {
          text: t('bookmarks.delete'),
          style: 'destructive',
          onPress: () => onDelete(bookmark.id),
        },
      ]
    );
  };

  const handleAddToFolder = () => {
    onAddToFolder(bookmark.id);
  };

  const handleCopy = async () => {
    try {
      const textToCopy = `Q: ${bookmark.question}\n\nA: ${bookmark.answer}`;
      await Clipboard.setStringAsync(textToCopy);
      Alert.alert(t('bookmarks.copied'), t('bookmarks.copiedToClipboard'));
    } catch (error) {
      logger.error('Failed to copy:', error);
      Alert.alert(t('bookmarks.error'), t('bookmarks.copyFailed'));
    }
  };

  return (
    <View style={styles.bookmarkCardContainer}>
      {/* Label above card */}
      <View style={styles.labelRow}>
        <Text
          style={[styles.scopeLabel, { color: labelColor }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {getScopeLabel()}
        </Text>

        <View style={styles.labelRightSection}>
          <Text style={[styles.dateLabel, { color: labelColor }]}>{formatDate(bookmark.timestamp)}</Text>

          {/* Action buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t('bookmarks.addToFolder')}
              onPress={handleAddToFolder}
              style={styles.actionButton}
              hitSlop={8}
            >
              <FolderIcon size={18} color={iconColor} />
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t('bookmarks.copy')}
              onPress={handleCopy}
              style={styles.actionButton}
              hitSlop={8}
            >
              <CopyIcon size={18} color={iconColor} />
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t('bookmarks.delete')}
              onPress={handleDelete}
              style={styles.actionButton}
              hitSlop={8}
            >
              <TrashIcon size={18} color="#FF4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* QA Card */}
      <Pressable
        onPress={() => onCardPress?.(bookmark)}
        disabled={!onCardPress || bookmark.scope !== 'word'}
      >
        <QACard
          pair={{
            id: bookmark.id,
            q: bookmark.question,
            a: bookmark.answer,
            status: 'completed',
            followUpQAs: bookmark.followUpQAs,
          }}
          scope={bookmark.scope}
          identifier={bookmark.identifier}
          hideActions={true}
        />
      </Pressable>
    </View>
  );
}

export default function BookmarksScreen() {
  const { t } = useTranslation();
  const pageBackground = useThemeColor({}, 'pageBackground');
  const tabTextColor = useThemeColor({ light: '#686868', dark: '#8E8E93' }, 'icon');
  const activeTabColor = useThemeColor({}, 'primary');
  const { currentLanguage, nativeLanguage } = useLearningLanguages();
  const { isPremium } = useSubscription();

  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [bookmarks, setBookmarks] = useState<ChatBookmark[]>([]);
  const [folders, setFolders] = useState<BookmarkFolder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isFolderSelectModalOpen, setIsFolderSelectModalOpen] = useState(false);
  const [selectedBookmarkId, setSelectedBookmarkId] = useState<string | null>(null);
  const [isFolderMenuOpen, setIsFolderMenuOpen] = useState(false);
  const [isEditFolderModalOpen, setIsEditFolderModalOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<BookmarkFolder | null>(null);
  const [editFolderName, setEditFolderName] = useState('');
  const [isCreatingNewFolder, setIsCreatingNewFolder] = useState(false);
  const [newFolderNameInline, setNewFolderNameInline] = useState('');
  const [isSubscriptionSheetOpen, setIsSubscriptionSheetOpen] = useState(false);

  // Load bookmarks and folders
  const fetchBookmarks = useCallback(async () => {
    try {
      logger.debug('[Bookmarks] Loading bookmarks...');
      const data = await loadBookmarks();
      logger.debug('[Bookmarks] Loaded bookmarks:', data.length, 'items');
      logger.debug('[Bookmarks] Data:', JSON.stringify(data, null, 2));
      setBookmarks(data);
    } catch (error) {
      logger.error('[Bookmarks] Failed to load bookmarks:', error);
      Alert.alert(t('bookmarks.error'), t('bookmarks.loadFailed'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const fetchFolders = useCallback(async () => {
    try {
      logger.debug('[Bookmarks] Loading folders...');
      const data = await loadFolders();
      logger.debug('[Bookmarks] Loaded folders:', data.length, 'items');
      setFolders(data);
    } catch (error) {
      logger.error('[Bookmarks] Failed to load folders:', error);
      Alert.alert(t('bookmarks.error'), t('bookmarks.folderLoadFailed'));
    }
  }, [t]);

  useEffect(() => {
    void fetchBookmarks();
    void fetchFolders();
  }, [fetchBookmarks, fetchFolders]);

  // Handle refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    void fetchBookmarks();
    void fetchFolders();
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    try {
      await removeBookmark(id);
      setBookmarks((prev) => prev.filter((b) => b.id !== id));
    } catch (error) {
      logger.error('Failed to delete bookmark:', error);
      Alert.alert(t('bookmarks.error'), t('bookmarks.deleteFailed'));
    }
  };

  // Handle folder tab press (premium only)
  const handleFolderTabPress = () => {
    if (!isPremium) {
      setIsSubscriptionSheetOpen(true);
      return;
    }
    setActiveTab('folders');
  };

  // Handle create folder
  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name) {
      return;
    }

    try {
      const newFolder = await addFolder(name);
      setFolders(prev => [...prev, newFolder]);
      setNewFolderName('');
      setIsCreateFolderModalOpen(false);
      logger.debug('[Bookmarks] Folder created:', newFolder.id);

      // 選択中のブックマークがある場合、自動的に新しいフォルダに追加
      if (selectedBookmarkId) {
        await updateBookmarkFolder(selectedBookmarkId, newFolder.id);
        setBookmarks(prev => prev.map(b =>
          b.id === selectedBookmarkId ? { ...b, folder: newFolder.id } : b
        ));
        setSelectedBookmarkId(null);
        logger.debug('[Bookmarks] Bookmark automatically added to new folder:', newFolder.id);
      }
    } catch (error) {
      logger.error('[Bookmarks] Failed to create folder:', error);
      Alert.alert(t('bookmarks.error'), t('bookmarks.createFolderFailed'));
    }
  };

  // Handle open folder select modal (premium only)
  const handleOpenFolderSelect = async (bookmarkId: string) => {
    if (!isPremium) {
      Alert.alert(
        t('bookmarks.premiumFeature'),
        t('bookmarks.premiumFolderMessage'),
        [
          { text: t('bookmarks.cancel') },
          { text: t('bookmarks.viewPremium'), onPress: () => setIsSubscriptionSheetOpen(true) },
        ]
      );
      return;
    }

    logger.debug('[Bookmarks] Opening folder select modal for bookmark:', bookmarkId);
    setSelectedBookmarkId(bookmarkId);

    // Reload folders to ensure we have the latest list
    await fetchFolders();
    logger.debug('[Bookmarks] Current folders count:', folders.length);

    setIsFolderSelectModalOpen(true);
  };

  // Handle add bookmark to folder
  const handleAddBookmarkToFolder = async (folderId?: string) => {
    if (!selectedBookmarkId) return;

    try {
      await updateBookmarkFolder(selectedBookmarkId, folderId);
      setBookmarks(prev => prev.map(b =>
        b.id === selectedBookmarkId ? { ...b, folder: folderId } : b
      ));
      setIsFolderSelectModalOpen(false);
      setSelectedBookmarkId(null);
      logger.debug('[Bookmarks] Bookmark added to folder:', folderId);
    } catch (error) {
      logger.error('[Bookmarks] Failed to add bookmark to folder:', error);
      Alert.alert(t('bookmarks.error'), t('bookmarks.addToFolderFailed'));
    }
  };

  // Handle create new folder inline
  const handleCreateNewFolderInline = async () => {
    const name = newFolderNameInline.trim();
    if (!name || !selectedBookmarkId) {
      return;
    }

    try {
      const newFolder = await addFolder(name);
      setFolders(prev => [...prev, newFolder]);
      await updateBookmarkFolder(selectedBookmarkId, newFolder.id);
      setBookmarks(prev => prev.map(b =>
        b.id === selectedBookmarkId ? { ...b, folder: newFolder.id } : b
      ));
      setNewFolderNameInline('');
      setIsCreatingNewFolder(false);
      setIsFolderSelectModalOpen(false);
      setSelectedBookmarkId(null);
      logger.debug('[Bookmarks] New folder created and bookmark added:', newFolder.id);
    } catch (error) {
      logger.error('[Bookmarks] Failed to create folder:', error);
      Alert.alert(t('bookmarks.error'), t('bookmarks.createFolderFailed'));
    }
  };

  // Handle folder long press
  const handleFolderLongPress = (folder: BookmarkFolder) => {
    setSelectedFolder(folder);
    setIsFolderMenuOpen(true);
  };

  // Handle edit folder
  const handleEditFolder = () => {
    if (!selectedFolder) return;
    setEditFolderName(selectedFolder.name);
    setIsFolderMenuOpen(false);
    setIsEditFolderModalOpen(true);
  };

  // Handle update folder name
  const handleUpdateFolderName = async () => {
    if (!selectedFolder || !editFolderName.trim()) return;

    try {
      await updateFolderName(selectedFolder.id, editFolderName.trim());
      setFolders(prev => prev.map(f =>
        f.id === selectedFolder.id ? { ...f, name: editFolderName.trim() } : f
      ));
      setIsEditFolderModalOpen(false);
      setSelectedFolder(null);
      setEditFolderName('');
      logger.debug('[Bookmarks] Folder name updated');
    } catch (error) {
      logger.error('[Bookmarks] Failed to update folder name:', error);
      Alert.alert(t('bookmarks.error'), t('bookmarks.renameFailed'));
    }
  };

  // Handle delete folder
  const handleDeleteFolder = () => {
    if (!selectedFolder) return;

    Alert.alert(
      t('bookmarks.deleteFolder'),
      t('bookmarks.deleteFolderConfirm', { name: selectedFolder.name }),
      [
        { text: t('bookmarks.cancel'), style: 'cancel' },
        {
          text: t('bookmarks.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await removeFolder(selectedFolder.id);
              setFolders(prev => prev.filter(f => f.id !== selectedFolder.id));
              setIsFolderMenuOpen(false);
              setSelectedFolder(null);
              // Refresh bookmarks to update folder references
              void fetchBookmarks();
              logger.debug('[Bookmarks] Folder deleted');
            } catch (error) {
              logger.error('[Bookmarks] Failed to delete folder:', error);
              Alert.alert(t('bookmarks.error'), t('bookmarks.deleteFolderFailed'));
            }
          },
        },
      ]
    );
  };

  // Handle bookmark card press (navigate to word detail or translate page)
  const handleCardPress = useCallback((bookmark: ChatBookmark) => {
    if (bookmark.scope === 'word') {
      logger.debug('[Bookmarks] Navigating to word detail:', bookmark.identifier);
      router.push({
        pathname: '/(tabs)/word-detail',
        params: {
          word: bookmark.identifier,
          targetLanguage: currentLanguage.id,
        },
      });
    } else if (bookmark.scope === 'translate') {
      logger.debug('[Bookmarks] Navigating to translate:', bookmark.identifier);

      // Detect language and determine source/target
      const detectedLang = detectLang(bookmark.identifier);
      const sourceLang = resolveLanguageCode(detectedLang, currentLanguage.id, nativeLanguage.id);
      const targetLang = sourceLang === nativeLanguage.id ? currentLanguage.id : nativeLanguage.id;

      router.push({
        pathname: '/(tabs)/translate',
        params: {
          word: bookmark.identifier,
          sourceLang,
          targetLang,
        },
      });
    }
  }, [currentLanguage.id, nativeLanguage.id]);

  return (
    <>
    <ThemedView style={[styles.container, { backgroundColor: pageBackground }]}>
      <StatusBar style="auto" />

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <UnifiedHeaderBar
            pageType="other"
            title={t('bookmarks.title')}
            onBackPress={() => router.back()}
          />
        </View>

        {/* Tab Bar */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'all' && [styles.activeTab, { borderBottomColor: activeTabColor }],
            ]}
            onPress={() => setActiveTab('all')}
          >
            <Text
              style={[
                styles.tabText,
                { color: tabTextColor },
                activeTab === 'all' && [styles.activeTabText, { color: activeTabColor }],
              ]}
            >
              {t('bookmarks.allTab')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'folders' && [styles.activeTab, { borderBottomColor: activeTabColor }],
            ]}
            onPress={handleFolderTabPress}
          >
            <View style={styles.tabWithIcon}>
              <Text
                style={[
                  styles.tabText,
                  { color: tabTextColor },
                  activeTab === 'folders' && [styles.activeTabText, { color: activeTabColor }],
                ]}
              >
                {t('bookmarks.foldersTab')}
              </Text>
              {!isPremium && <StarIcon size={16} />}
            </View>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {activeTab === 'folders' ? (
          isLoading ? (
            <View style={styles.centerContainer}>
              <Text style={[styles.loadingText, { color: tabTextColor }]}>{t('bookmarks.loading')}</Text>
            </View>
          ) : folders.length > 0 ? (
            <ScrollView
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
              }
            >
              <View style={styles.folderList}>
                {folders.map((folder) => {
                  const folderBookmarkCount = bookmarks.filter(b => b.folder === folder.id).length;
                  return (
                    <FolderCard
                      key={folder.id}
                      folder={folder}
                      bookmarkCount={folderBookmarkCount}
                      onPress={() => {
                        router.push({
                          pathname: '/(tabs)/folder-detail',
                          params: {
                            folderId: folder.id,
                            folderName: folder.name,
                          },
                        });
                      }}
                      onLongPress={() => handleFolderLongPress(folder)}
                    />
                  );
                })}
              </View>

              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  {t('bookmarks.totalFolders', { count: folders.length })}
                </Text>
              </View>
            </ScrollView>
          ) : (
            <View style={styles.emptyContainer}>
              <FolderIcon size={64} color="#D1D1D1" />
              <Text style={styles.emptyTitle}>{t('bookmarks.noFolders')}</Text>
              <Text style={[styles.emptyDescription, { color: tabTextColor }]}>
                {t('bookmarks.noFoldersDescription')}
              </Text>
            </View>
          )
        ) : isLoading ? (
          <View style={styles.centerContainer}>
            <Text style={[styles.loadingText, { color: tabTextColor }]}>{t('bookmarks.loading')}</Text>
          </View>
        ) : bookmarks.length > 0 ? (
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
            }
          >
            <View style={styles.bookmarkList}>
              {bookmarks.map((bookmark) => (
                <BookmarkCard
                  key={bookmark.id}
                  bookmark={bookmark}
                  onDelete={handleDelete}
                  onAddToFolder={handleOpenFolderSelect}
                  onCardPress={handleCardPress}
                />
              ))}
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                {t('bookmarks.totalBookmarks', { count: bookmarks.length })}
              </Text>
            </View>
          </ScrollView>
        ) : (
          <View style={styles.emptyContainer}>
            <BookmarkEmptyIcon size={64} />
            <Text style={styles.emptyTitle}>{t('bookmarks.noBookmarks')}</Text>
            <Text style={[styles.emptyDescription, { color: tabTextColor }]}>
              {t('bookmarks.noBookmarksDescription')}
            </Text>
          </View>
        )}

        {/* Floating Action Button - Only show on folders tab for premium users */}
        {activeTab === 'folders' && isPremium && (
          <TouchableOpacity
            style={styles.fab}
            onPress={() => setIsCreateFolderModalOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t('bookmarks.createFolder')}
          >
            <PlusIcon size={24} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        {/* Create Folder Modal */}
        <Modal
          visible={isCreateFolderModalOpen}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {
            setIsCreateFolderModalOpen(false);
            setNewFolderName('');
          }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoidingView}
          >
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => {
                setIsCreateFolderModalOpen(false);
                setNewFolderName('');
              }}
            >
              <View style={styles.createFolderModalContainer} onStartShouldSetResponder={() => true}>
                <Text style={styles.modalTitle}>{t('bookmarks.newFolder')}</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{t('bookmarks.folderName')}</Text>
                  <TextInput
                    style={styles.folderNameInput}
                    placeholder={t('bookmarks.folderNamePlaceholder')}
                    placeholderTextColor="#ACACAC"
                    value={newFolderName}
                    onChangeText={setNewFolderName}
                    autoFocus
                  />
                </View>

                <View style={styles.modalButtonsRow}>
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={() => {
                      setIsCreateFolderModalOpen(false);
                      setNewFolderName('');
                    }}
                  >
                    <Text style={styles.modalCancelButtonText}>{t('bookmarks.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.modalAddButton,
                      !newFolderName.trim() && styles.modalAddButtonDisabled,
                    ]}
                    onPress={handleCreateFolder}
                    disabled={!newFolderName.trim()}
                  >
                    <Text style={styles.modalAddButtonText}>{t('bookmarks.create')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </Modal>

        {/* Folder Select Modal */}
        <Modal
          visible={isFolderSelectModalOpen}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {
            setIsFolderSelectModalOpen(false);
            setSelectedBookmarkId(null);
            setIsCreatingNewFolder(false);
            setNewFolderNameInline('');
          }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoidingView}
          >
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => {
                setIsFolderSelectModalOpen(false);
                setSelectedBookmarkId(null);
                setIsCreatingNewFolder(false);
                setNewFolderNameInline('');
              }}
            >
              <View style={styles.folderSelectModalContainer} onStartShouldSetResponder={() => true}>
                <Text style={styles.modalTitle}>{t('bookmarks.addToFolderTitle')}</Text>

                <ScrollView style={styles.folderSelectList} showsVerticalScrollIndicator={false}>
                  {/* No folder option */}
                  {!isCreatingNewFolder && (() => {
                    const currentBookmark = bookmarks.find(b => b.id === selectedBookmarkId);
                    const isNoFolder = !currentBookmark?.folder;

                    return (
                      <TouchableOpacity
                        style={[
                          styles.folderSelectItem,
                          isNoFolder && styles.folderSelectItemActive
                        ]}
                        onPress={() => handleAddBookmarkToFolder(undefined)}
                      >
                        <Text style={[styles.folderSelectItemText, { flex: 1 }]}>{t('bookmarks.noFolder')}</Text>
                        {isNoFolder && <CheckIcon size={20} color="#111111" />}
                      </TouchableOpacity>
                    );
                  })()}

                  {/* Existing folders */}
                  {!isCreatingNewFolder && folders.length > 0 && (
                    folders.map((folder) => {
                      const currentBookmark = bookmarks.find(b => b.id === selectedBookmarkId);
                      const isCurrentFolder = currentBookmark?.folder === folder.id;

                      return (
                        <TouchableOpacity
                          key={folder.id}
                          style={[
                            styles.folderSelectItem,
                            isCurrentFolder && styles.folderSelectItemActive
                          ]}
                          onPress={() => handleAddBookmarkToFolder(folder.id)}
                        >
                          <FolderIcon size={20} color="#111111" />
                          <Text style={styles.folderSelectItemText}>{folder.name}</Text>
                          {isCurrentFolder && <CheckIcon size={20} color="#111111" />}
                        </TouchableOpacity>
                      );
                    })
                  )}

                  {!isCreatingNewFolder && folders.length === 0 && (
                    <View style={styles.noFoldersMessage}>
                      <Text style={styles.noFoldersMessageText}>
                        {t('bookmarks.noFoldersYet')}
                      </Text>
                      <Text style={styles.noFoldersMessageSubtext}>
                        {t('bookmarks.noFoldersYetDescription')}
                      </Text>
                    </View>
                  )}

                  {/* Create new folder UI */}
                  {isCreatingNewFolder ? (
                    <View style={styles.createFolderInline}>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>{t('bookmarks.folderName')}</Text>
                        <TextInput
                          style={styles.folderNameInput}
                          placeholder={t('bookmarks.folderNamePlaceholder')}
                          placeholderTextColor="#ACACAC"
                          value={newFolderNameInline}
                          onChangeText={setNewFolderNameInline}
                          autoFocus
                        />
                      </View>
                      <View style={styles.modalButtonsRow}>
                        <TouchableOpacity
                          style={styles.modalCancelButton}
                          onPress={() => {
                            setIsCreatingNewFolder(false);
                            setNewFolderNameInline('');
                          }}
                        >
                          <Text style={styles.modalCancelButtonText}>{t('bookmarks.cancel')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.modalAddButton,
                            !newFolderNameInline.trim() && styles.modalAddButtonDisabled,
                          ]}
                          onPress={handleCreateNewFolderInline}
                          disabled={!newFolderNameInline.trim()}
                        >
                          <Text style={styles.modalAddButtonText}>{t('bookmarks.createAndAdd')}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.folderSelectItem, styles.createFolderItem]}
                      onPress={() => setIsCreatingNewFolder(true)}
                    >
                      <PlusIcon size={20} color="#111111" />
                      <Text style={[styles.folderSelectItemText, styles.createFolderText]}>
                        {t('bookmarks.createNewFolder')}
                      </Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>

                {!isCreatingNewFolder && (
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={() => {
                      setIsFolderSelectModalOpen(false);
                      setSelectedBookmarkId(null);
                    }}
                  >
                    <Text style={styles.modalCancelButtonText}>{t('bookmarks.cancel')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </Modal>

        {/* Folder Menu Modal */}
        <Modal
          visible={isFolderMenuOpen}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {
            setIsFolderMenuOpen(false);
            setSelectedFolder(null);
          }}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => {
              setIsFolderMenuOpen(false);
              setSelectedFolder(null);
            }}
          >
            <View style={styles.folderMenuContainer} onStartShouldSetResponder={() => true}>
              <Text style={styles.folderMenuTitle} numberOfLines={1} ellipsizeMode="tail">
                {selectedFolder?.name}
              </Text>

              <TouchableOpacity
                style={styles.folderMenuItem}
                onPress={handleEditFolder}
              >
                <Text style={styles.folderMenuItemText}>{t('bookmarks.rename')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.folderMenuItem, styles.folderMenuItemDanger]}
                onPress={handleDeleteFolder}
              >
                <Text style={[styles.folderMenuItemText, styles.folderMenuItemTextDanger]}>
                  {t('bookmarks.delete')}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Edit Folder Name Modal */}
        <Modal
          visible={isEditFolderModalOpen}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {
            setIsEditFolderModalOpen(false);
            setSelectedFolder(null);
            setEditFolderName('');
          }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoidingView}
          >
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => {
                setIsEditFolderModalOpen(false);
                setSelectedFolder(null);
                setEditFolderName('');
              }}
            >
              <View style={styles.createFolderModalContainer} onStartShouldSetResponder={() => true}>
                <Text style={styles.modalTitle}>{t('bookmarks.renameFolderTitle')}</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{t('bookmarks.folderName')}</Text>
                  <TextInput
                    style={styles.folderNameInput}
                    placeholder={t('bookmarks.enterFolderName')}
                    placeholderTextColor="#ACACAC"
                    value={editFolderName}
                    onChangeText={setEditFolderName}
                    autoFocus
                  />
                </View>

                <View style={styles.modalButtonsRow}>
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={() => {
                      setIsEditFolderModalOpen(false);
                      setSelectedFolder(null);
                      setEditFolderName('');
                    }}
                  >
                    <Text style={styles.modalCancelButtonText}>{t('bookmarks.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.modalAddButton,
                      !editFolderName.trim() && styles.modalAddButtonDisabled,
                    ]}
                    onPress={handleUpdateFolderName}
                    disabled={!editFolderName.trim()}
                  >
                    <Text style={styles.modalAddButtonText}>{t('bookmarks.save')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </ThemedView>

    {/* Subscription Bottom Sheet - ThemedView外に配置 */}
    <SubscriptionBottomSheet
      visible={isSubscriptionSheetOpen}
      onClose={() => setIsSubscriptionSheetOpen(false)}
    />
  </>
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
    marginBottom: 8,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
  },
  activeTabText: {
    fontWeight: '600',
  },
  tabWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  bookmarkList: {
    gap: 20,
  },
  bookmarkCardContainer: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    gap: 8,
  },
  scopeLabel: {
    fontSize: 13,
    fontWeight: '500',
    flexShrink: 1,
    maxWidth: '60%',
  },
  labelRightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '400',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  footer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#ACACAC',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  folderList: {
    gap: 12,
    paddingBottom: 16,
  },
  folderCardPressable: {
    width: '100%',
  },
  folderCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  folderCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  folderCardInfo: {
    flex: 1,
    gap: 4,
  },
  folderCardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  folderCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  folderCardCount: {
    fontSize: 13,
    fontWeight: '500',
  },
  folderCardDate: {
    fontSize: 12,
    fontWeight: '400',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#111111',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  createFolderModalContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    gap: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A4A4A',
  },
  folderNameInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#000000',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#686868',
  },
  modalAddButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalAddButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  modalAddButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  folderSelectModalContainer: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 15,
  },
  folderSelectList: {
    maxHeight: 300,
  },
  folderSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    marginBottom: 8,
  },
  folderSelectItemActive: {
    backgroundColor: '#F1F1F1',
    borderWidth: 1,
    borderColor: '#111111',
  },
  folderSelectItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    flex: 1,
  },
  createFolderItem: {
    backgroundColor: '#F1F1F1',
    marginTop: 8,
  },
  createFolderText: {
    color: '#111111',
    fontWeight: '600',
  },
  folderMenuContainer: {
    width: '80%',
    maxWidth: 300,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 15,
  },
  folderMenuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    padding: 16,
    paddingBottom: 8,
    textAlign: 'center',
  },
  folderMenuItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  folderMenuItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    textAlign: 'center',
  },
  folderMenuItemDanger: {
    backgroundColor: '#FFEAEA',
  },
  folderMenuItemTextDanger: {
    color: '#CC0000',
    fontWeight: '600',
  },
  noFoldersMessage: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 8,
  },
  noFoldersMessageText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#686868',
    textAlign: 'center',
  },
  noFoldersMessageSubtext: {
    fontSize: 12,
    fontWeight: '400',
    color: '#ACACAC',
    textAlign: 'center',
  },
  createFolderInline: {
    padding: 16,
    gap: 16,
  },
});
