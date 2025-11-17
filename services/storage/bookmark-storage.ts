import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ChatBookmark, BookmarkFolder } from '@/types/bookmark';
import { logger } from '@/utils/logger';

// Re-export types for convenience
export type { ChatBookmark, BookmarkFolder };

const BOOKMARKS_KEY = '@lingooo_chat_bookmarks';
const FOLDERS_KEY = '@lingooo_bookmark_folders';

/**
 * Load all chat bookmarks from storage
 */
export async function loadBookmarks(): Promise<ChatBookmark[]> {
  try {
    const saved = await AsyncStorage.getItem(BOOKMARKS_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
    return [];
  } catch (error) {
    logger.error('Failed to load bookmarks:', error);
    return [];
  }
}

/**
 * Save bookmarks to storage
 */
export async function saveBookmarks(bookmarks: ChatBookmark[]): Promise<void> {
  try {
    await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
  } catch (error) {
    logger.error('Failed to save bookmarks:', error);
    throw error;
  }
}

/**
 * Add a new bookmark
 */
export async function addBookmark(bookmark: Omit<ChatBookmark, 'id' | 'timestamp'>): Promise<ChatBookmark> {
  const bookmarks = await loadBookmarks();

  const newBookmark: ChatBookmark = {
    ...bookmark,
    id: `bookmark_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    timestamp: Date.now(),
  };

  bookmarks.unshift(newBookmark); // Add to beginning
  await saveBookmarks(bookmarks);

  return newBookmark;
}

/**
 * Remove a bookmark by ID
 */
export async function removeBookmark(bookmarkId: string): Promise<void> {
  const bookmarks = await loadBookmarks();
  const filtered = bookmarks.filter(b => b.id !== bookmarkId);
  await saveBookmarks(filtered);
}

/**
 * Check if a QA pair is bookmarked
 */
export async function isBookmarked(question: string, answer: string): Promise<boolean> {
  const bookmarks = await loadBookmarks();
  return bookmarks.some(b => b.question === question && b.answer === answer);
}

/**
 * Find bookmark by question and answer
 */
export async function findBookmark(question: string, answer: string): Promise<ChatBookmark | null> {
  const bookmarks = await loadBookmarks();
  return bookmarks.find(b => b.question === question && b.answer === answer) || null;
}

/**
 * Load all bookmark folders
 */
export async function loadFolders(): Promise<BookmarkFolder[]> {
  try {
    const saved = await AsyncStorage.getItem(FOLDERS_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
    return [];
  } catch (error) {
    logger.error('Failed to load folders:', error);
    return [];
  }
}

/**
 * Save folders to storage
 */
export async function saveFolders(folders: BookmarkFolder[]): Promise<void> {
  try {
    await AsyncStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
  } catch (error) {
    logger.error('Failed to save folders:', error);
    throw error;
  }
}

/**
 * Add a new folder
 */
export async function addFolder(name: string): Promise<BookmarkFolder> {
  const folders = await loadFolders();

  const newFolder: BookmarkFolder = {
    id: `folder_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    name,
    createdAt: Date.now(),
  };

  folders.push(newFolder);
  await saveFolders(folders);

  return newFolder;
}

/**
 * Remove a folder by ID
 */
export async function removeFolder(folderId: string): Promise<void> {
  const folders = await loadFolders();
  const filtered = folders.filter(f => f.id !== folderId);
  await saveFolders(filtered);

  // Remove folder reference from bookmarks
  const bookmarks = await loadBookmarks();
  const updated = bookmarks.map(b => {
    if (b.folder === folderId) {
      const { folder, ...rest } = b;
      return rest as ChatBookmark;
    }
    return b;
  });
  await saveBookmarks(updated);
}

/**
 * Update bookmark's folder
 */
export async function updateBookmarkFolder(bookmarkId: string, folderId?: string): Promise<void> {
  const bookmarks = await loadBookmarks();
  const updated = bookmarks.map(b => {
    if (b.id === bookmarkId) {
      return { ...b, folder: folderId };
    }
    return b;
  });
  await saveBookmarks(updated);
}

/**
 * Update folder name
 */
export async function updateFolderName(folderId: string, newName: string): Promise<void> {
  const folders = await loadFolders();
  const updated = folders.map(f => {
    if (f.id === folderId) {
      return { ...f, name: newName };
    }
    return f;
  });
  await saveFolders(updated);
}
