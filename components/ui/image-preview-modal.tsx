import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Text,
  Image,
  ActivityIndicator,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { translateImage, uriToBase64, getMimeTypeFromUri, resizeImageIfNeeded } from '../../services/api/image-translate';
import { saveImageTranslationData } from '../../services/storage/image-translation-storage';
import { useRouter } from 'expo-router';
import { ScanningOverlay } from './scanning-overlay';
import { parseQuotaError } from '../../utils/quota-error';
import { QuotaExceededModal } from './quota-exceeded-modal';
import { useSubscription } from '../../contexts/subscription-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type TranslateStatus = 'idle' | 'resizing' | 'extracting' | 'translating' | 'error' | 'noText';

export interface ImagePreviewModalProps {
  visible: boolean;
  imageUri: string | null;
  mimeType?: string;
  onClose: () => void;
  targetLanguage: string;
  sourceLanguage?: string;
  nativeLanguage?: string;
}

export function ImagePreviewModal({
  visible,
  imageUri,
  mimeType,
  onClose,
  targetLanguage,
  sourceLanguage,
  nativeLanguage,
}: ImagePreviewModalProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { isPremium } = useSubscription();
  const [translateStatus, setTranslateStatus] = useState<TranslateStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isQuotaModalVisible, setIsQuotaModalVisible] = useState(false);
  const [quotaErrorType, setQuotaErrorType] = useState<'image_translation' | undefined>();
  const progressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!visible) {
      setTranslateStatus('idle');
      setErrorMessage(null);
      if (progressTimerRef.current) {
        clearTimeout(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    }
  }, [visible]);

  const isTranslating = translateStatus === 'resizing' || translateStatus === 'extracting' || translateStatus === 'translating';

  const getStatusText = (): string => {
    switch (translateStatus) {
      case 'resizing':
        return t('imageTranslate.resizing', '画像を処理中...');
      case 'extracting':
        return t('imageTranslate.extracting', 'テキストを読み取り中...');
      case 'translating':
        return t('imageTranslate.translatingStatus', '翻訳中...');
      default:
        return t('imageTranslate.translating', '翻訳中...');
    }
  };

  const handleTranslate = async () => {
    if (!imageUri) return;

    setTranslateStatus('resizing');
    setErrorMessage(null);

    try {
      // Step 1: Resize image
      const { uri: resizedUri } = await resizeImageIfNeeded(imageUri);

      // Step 2: Convert to base64
      setTranslateStatus('extracting');
      const base64Data = await uriToBase64(resizedUri);
      const detectedMimeType = mimeType || getMimeTypeFromUri(imageUri);

      // Step 3: Progress timer - switch to "translating" after 2.5 seconds
      progressTimerRef.current = setTimeout(() => {
        setTranslateStatus('translating');
      }, 2500);

      console.log('[ImagePreviewModal] Translating image:', {
        mimeType: detectedMimeType,
        targetLanguage,
        sourceLanguage,
        nativeLanguage,
      });

      // Step 4: Call API
      const result = await translateImage({
        imageData: base64Data,
        mimeType: detectedMimeType,
        targetLang: targetLanguage,
        sourceLang: sourceLanguage,
        nativeLanguage,
      });

      if (progressTimerRef.current) {
        clearTimeout(progressTimerRef.current);
        progressTimerRef.current = null;
      }

      // Check if no text was found
      if (result.noTextFound || !result.extractedText) {
        setTranslateStatus('noText');
        return;
      }

      console.log('[ImagePreviewModal] Translation result:', {
        extractedLength: result.extractedText.length,
        translatedLength: result.translatedText.length,
        detectedLanguage: result.detectedLanguage,
      });

      // Save to AsyncStorage
      await saveImageTranslationData({
        extractedText: result.extractedText,
        translatedText: result.translatedText,
        detectedLanguage: result.detectedLanguage,
        targetLanguage: result.targetLanguage,
      });

      // Close modal and navigate
      onClose();
      router.push({
        pathname: '/(tabs)/translate',
        params: { fromImageTranslation: 'true' },
      });
    } catch (error: any) {
      console.error('[ImagePreviewModal] Translation error:', error);
      if (progressTimerRef.current) {
        clearTimeout(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      const quotaError = parseQuotaError(error);
      if (quotaError.isQuotaError) {
        setQuotaErrorType(quotaError.quotaType as 'image_translation' | undefined);
        setIsQuotaModalVisible(true);
      }
      setTranslateStatus('error');
      setErrorMessage(quotaError.isQuotaError ? quotaError.userFriendlyMessage : (error.message || t('imageTranslate.errorMessage', '画像の翻訳に失敗しました')));
    }
  };

  if (!imageUri) return null;

  return (
    <>
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {t('imageTranslate.preview', '画像プレビュー')}
          </Text>
          <View style={styles.closeButton} />
        </View>

        {/* Image Preview */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: imageUri }}
              style={styles.image}
              resizeMode="contain"
            />
            {isTranslating && <ScanningOverlay />}
          </View>

          {/* Status Messages */}
          {translateStatus === 'noText' && (
            <View style={styles.statusContainer}>
              <Ionicons name="document-text-outline" size={32} color="#999" />
              <Text style={styles.noTextMessage}>
                {t('imageTranslate.noTextFound', '画像にテキストが見つかりませんでした')}
              </Text>
              <Text style={styles.noTextHint}>
                {t('imageTranslate.noTextHint', 'テキストが含まれている画像を選択してください')}
              </Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => setTranslateStatus('idle')}
              >
                <Text style={styles.retryButtonText}>
                  {t('common.ok', 'OK')}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {translateStatus === 'error' && (
            <View style={styles.statusContainer}>
              <Ionicons name="alert-circle-outline" size={32} color="#FF3B30" />
              <Text style={styles.errorMessage}>
                {errorMessage}
              </Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={handleTranslate}
              >
                <Ionicons name="refresh" size={18} color="#007AFF" />
                <Text style={styles.retryButtonText}>
                  {t('imageTranslate.retry', 'もう一度試す')}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {translateStatus === 'idle' && (
            <View style={styles.instructionsContainer}>
              <Text style={styles.instructionsText}>
                {t(
                  'imageTranslate.instructions',
                  '画像からテキストを抽出して翻訳します。\n「翻訳」ボタンをタップしてください。'
                )}
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Footer with Translate Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.translateButton,
              (isTranslating || translateStatus === 'noText') && styles.translateButtonDisabled,
            ]}
            onPress={handleTranslate}
            disabled={isTranslating || translateStatus === 'noText'}
          >
            {isTranslating ? (
              <View style={styles.translateButtonContent}>
                <ActivityIndicator size="small" color="#FFF" />
                <Text style={styles.translateButtonText}>
                  {getStatusText()}
                </Text>
              </View>
            ) : (
              <Text style={styles.translateButtonText}>
                {translateStatus === 'error'
                  ? t('imageTranslate.retry', 'もう一度試す')
                  : t('imageTranslate.translate', '翻訳')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>

    <QuotaExceededModal
      visible={isQuotaModalVisible}
      onClose={() => setIsQuotaModalVisible(false)}
      remainingQuestions={0}
      isPremium={isPremium}
      quotaType={quotaErrorType}
    />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  scrollContent: {
    flexGrow: 1,
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    overflow: 'hidden',
  },
  image: {
    width: SCREEN_WIDTH - 32,
    height: SCREEN_HEIGHT * 0.6 - 32,
  },
  instructionsContainer: {
    padding: 20,
  },
  instructionsText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#666',
    textAlign: 'center',
  },
  statusContainer: {
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  noTextMessage: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  noTextHint: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 15,
    color: '#333',
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
    marginTop: 4,
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  translateButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  translateButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  translateButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  translateButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
});
