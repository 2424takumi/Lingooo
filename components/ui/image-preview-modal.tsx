import React, { useState } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Text,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { translateImage, uriToBase64, getMimeTypeFromUri } from '../../services/api/image-translate';
import { saveImageTranslationData } from '../../services/storage/image-translation-storage';
import { useRouter } from 'expo-router';
import { ScanningOverlay } from './scanning-overlay';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface ImagePreviewModalProps {
  visible: boolean;
  imageUri: string | null;
  mimeType?: string;
  onClose: () => void;
  targetLanguage: string;
  sourceLanguage?: string;
}

export function ImagePreviewModal({
  visible,
  imageUri,
  mimeType,
  onClose,
  targetLanguage,
  sourceLanguage,
}: ImagePreviewModalProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [isTranslating, setIsTranslating] = useState(false);

  const handleTranslate = async () => {
    if (!imageUri) return;

    setIsTranslating(true);

    try {
      // Convert image to base64
      const base64Data = await uriToBase64(imageUri);
      const detectedMimeType = mimeType || getMimeTypeFromUri(imageUri);

      console.log('[ImagePreviewModal] Translating image:', {
        mimeType: detectedMimeType,
        targetLanguage,
        sourceLanguage,
      });

      // Call API
      const result = await translateImage({
        imageData: base64Data,
        mimeType: detectedMimeType,
        targetLang: targetLanguage,
        sourceLang: sourceLanguage,
      });

      console.log('[ImagePreviewModal] Translation result:', {
        extractedLength: result.extractedText.length,
        translatedLength: result.translatedText.length,
        detectedLanguage: result.detectedLanguage,
      });

      // Save to AsyncStorage instead of passing via URL params to avoid length limitations
      await saveImageTranslationData({
        extractedText: result.extractedText,
        translatedText: result.translatedText,
        detectedLanguage: result.detectedLanguage,
        targetLanguage: result.targetLanguage,
      });

      // Close modal
      onClose();

      // Navigate to translate page with a flag to load from storage
      router.push({
        pathname: '/(tabs)/translate',
        params: {
          fromImageTranslation: 'true',
        },
      });
    } catch (error: any) {
      console.error('[ImagePreviewModal] Translation error:', error);

      // Show error alert
      Alert.alert(
        t('imageTranslate.errorTitle', '翻訳エラー'),
        error.message || t('imageTranslate.errorMessage', '画像の翻訳に失敗しました'),
        [{ text: t('common.ok', 'OK') }]
      );
    } finally {
      setIsTranslating(false);
    }
  };

  if (!imageUri) return null;

  return (
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

          {/* Instructions */}
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsText}>
              {t(
                'imageTranslate.instructions',
                '画像からテキストを抽出して翻訳します。\n「翻訳」ボタンをタップしてください。'
              )}
            </Text>
          </View>
        </ScrollView>

        {/* Footer with Translate Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.translateButton, isTranslating && styles.translateButtonDisabled]}
            onPress={handleTranslate}
            disabled={isTranslating}
          >
            {isTranslating ? (
              <View style={styles.translateButtonContent}>
                <ActivityIndicator size="small" color="#FFF" />
                <Text style={styles.translateButtonText}>
                  {t('imageTranslate.translating', '翻訳中...')}
                </Text>
              </View>
            ) : (
              <Text style={styles.translateButtonText}>
                {t('imageTranslate.translate', '翻訳')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
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
    overflow: 'hidden', // Prevent scan line from extending outside image area
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
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 34, // Safe area bottom
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
