import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert, TextInput, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ThemedView } from '@/components/themed-view';
import { UnifiedHeaderBar } from '@/components/ui/unified-header-bar';
import { useThemeColor } from '@/hooks/use-theme-color';
import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useAISettings } from '@/contexts/ai-settings-context';
import type { CustomQuestion } from '@/types/settings';

// Icons
function PlusIcon({ size = 24, color = '#111111' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 5v14m-7-7h14"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function EditIcon({ size = 20, color = '#111111' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function TrashIcon({ size = 20, color = '#FF4444' }: { size?: number; color?: string }) {
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

export default function CustomQuestionsScreen() {
  const pageBackground = useThemeColor({}, 'pageBackground');
  const { customQuestions, addCustomQuestion, removeCustomQuestion } = useAISettings();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<CustomQuestion | null>(null);
  const [titleInput, setTitleInput] = useState('');
  const [questionInput, setQuestionInput] = useState('');

  const handleAddNew = () => {
    setEditingQuestion(null);
    setTitleInput('');
    setQuestionInput('');
    setIsModalOpen(true);
  };

  const handleEdit = (question: CustomQuestion) => {
    setEditingQuestion(question);
    setTitleInput(question.title);
    setQuestionInput(question.question);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    const title = titleInput.trim();
    const question = questionInput.trim();

    if (!title || !question) {
      Alert.alert('エラー', 'タイトルと質問文を入力してください');
      return;
    }

    try {
      if (editingQuestion) {
        // 編集の場合：古いものを削除して新しいものを追加
        await removeCustomQuestion(editingQuestion.title);
        await addCustomQuestion(title, question);
      } else {
        // 新規追加
        await addCustomQuestion(title, question);
      }
      setIsModalOpen(false);
      setTitleInput('');
      setQuestionInput('');
      setEditingQuestion(null);
    } catch (error) {
      Alert.alert('エラー', 'カスタム質問の保存に失敗しました');
    }
  };

  const handleDelete = (question: CustomQuestion) => {
    Alert.alert(
      'カスタム質問を削除',
      `「${question.title}」を削除しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            await removeCustomQuestion(question.title);
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
            title="カスタム質問"
            onBackPress={() => router.back()}
          />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Description */}
          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionText}>
              よく使う質問を登録しておくと、質問タグに表示されワンタップで質問できます。
            </Text>
          </View>

          {/* Custom Questions List */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>登録済みの質問</Text>
              <Text style={styles.questionCount}>{customQuestions.length}件</Text>
            </View>

            {customQuestions.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>まだカスタム質問が登録されていません</Text>
                <Text style={styles.emptySubText}>下の「新しい質問を追加」ボタンから追加できます</Text>
              </View>
            ) : (
              <View style={styles.questionsList}>
                {customQuestions.map((question, index) => (
                  <View key={`${question.title}-${index}`} style={styles.questionItem}>
                    <View style={styles.questionInfo}>
                      <Text style={styles.questionTitle}>{question.title}</Text>
                      <Text style={styles.questionText} numberOfLines={2}>
                        {question.question}
                      </Text>
                    </View>
                    <View style={styles.questionActions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleEdit(question)}
                      >
                        <EditIcon size={20} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleDelete(question)}
                      >
                        <TrashIcon size={20} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Add Button */}
          <TouchableOpacity style={styles.addButton} onPress={handleAddNew}>
            <PlusIcon size={24} color="#FFFFFF" />
            <Text style={styles.addButtonText}>新しい質問を追加</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Edit/Add Modal */}
      <Modal
        visible={isModalOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => {
              setIsModalOpen(false);
              setTitleInput('');
              setQuestionInput('');
              setEditingQuestion(null);
            }}
          >
            <ScrollView
              contentContainerStyle={styles.scrollViewContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalContainer} onStartShouldSetResponder={() => true}>
                <Text style={styles.modalTitle}>
                  {editingQuestion ? 'カスタム質問を編集' : 'カスタム質問を追加'}
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>タイトル（タグに表示）</Text>
                  <TextInput
                    style={styles.titleInput}
                    placeholder="例: 例文"
                    placeholderTextColor="#ACACAC"
                    value={titleInput}
                    onChangeText={setTitleInput}
                    autoFocus
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>質問文</Text>
                  <TextInput
                    style={styles.questionTextInput}
                    placeholder="例: この単語の例文を3つ教えて"
                    placeholderTextColor="#ACACAC"
                    value={questionInput}
                    onChangeText={setQuestionInput}
                    multiline
                  />
                </View>

                <View style={styles.modalButtonsRow}>
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={() => {
                      setIsModalOpen(false);
                      setTitleInput('');
                      setQuestionInput('');
                      setEditingQuestion(null);
                    }}
                  >
                    <Text style={styles.modalCancelButtonText}>キャンセル</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.modalSaveButton,
                      (!titleInput.trim() || !questionInput.trim()) && styles.modalSaveButtonDisabled,
                    ]}
                    onPress={handleSave}
                    disabled={!titleInput.trim() || !questionInput.trim()}
                  >
                    <Text style={styles.modalSaveButtonText}>
                      {editingQuestion ? '保存' : '追加'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
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
    marginBottom: 12,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  descriptionContainer: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  descriptionText: {
    fontSize: 14,
    color: '#2C2C2C',
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  questionCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#686868',
  },
  questionsList: {
    gap: 12,
  },
  questionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  questionInfo: {
    flex: 1,
    marginRight: 12,
  },
  questionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 6,
  },
  questionText: {
    fontSize: 14,
    color: '#686868',
    lineHeight: 20,
  },
  questionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#686868',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111111',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 40,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  modalContainer: {
    width: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A4A4A',
  },
  titleInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#000000',
  },
  questionTextInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#000000',
    minHeight: 100,
    textAlignVertical: 'top',
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
  modalSaveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  modalSaveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
