import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { BookmarkFolder } from '@/services/storage/bookmark-storage';

interface FolderSelectModalProps {
  visible: boolean;
  folders: BookmarkFolder[];
  onSelectFolder: (folderId?: string) => void;
  onCreateNew: () => void;
  onClose: () => void;
}

function FolderIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2v11z"
        stroke="#111111"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function PlusIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 5v14M5 12h14"
        stroke="#111111"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function FolderSelectModal({
  visible,
  folders,
  onSelectFolder,
  onCreateNew,
  onClose,
}: FolderSelectModalProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.folderSelectModalContainer} onStartShouldSetResponder={() => true}>
          <Text style={styles.modalTitle}>フォルダに追加</Text>

          <ScrollView style={styles.folderSelectList} showsVerticalScrollIndicator={false}>
            {/* No folder option - only show if folders exist */}
            {folders.length > 0 && (
              <TouchableOpacity
                style={styles.folderSelectItem}
                onPress={() => onSelectFolder(undefined)}
              >
                <Text style={styles.folderSelectItemText}>フォルダなし</Text>
              </TouchableOpacity>
            )}

            {/* Existing folders */}
            {folders.map((folder) => (
              <TouchableOpacity
                key={folder.id}
                style={styles.folderSelectItem}
                onPress={() => onSelectFolder(folder.id)}
              >
                <FolderIcon />
                <Text style={styles.folderSelectItemText}>{folder.name}</Text>
              </TouchableOpacity>
            ))}

            {/* Create new folder button */}
            <TouchableOpacity
              style={styles.createFolderButton}
              onPress={onCreateNew}
            >
              <PlusIcon />
              <Text style={styles.createFolderButtonText}>新しくフォルダを作る</Text>
            </TouchableOpacity>
          </ScrollView>

          <TouchableOpacity
            style={styles.modalCancelButton}
            onPress={onClose}
          >
            <Text style={styles.modalCancelButtonText}>キャンセル</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
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
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
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
  folderSelectItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    flex: 1,
  },
  modalCancelButton: {
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
  createFolderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#111111',
    borderStyle: 'dashed',
  },
  createFolderButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111111',
    flex: 1,
  },
});
