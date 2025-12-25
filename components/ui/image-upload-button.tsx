import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Alert, Platform, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

export interface ImageUploadButtonProps {
  onImageSelected: (result: {
    uri: string;
    mimeType: string;
    fileName?: string;
  }) => void;
  onError?: (error: string) => void;
}

export function ImageUploadButton({ onImageSelected, onError }: ImageUploadButtonProps) {
  const { t } = useTranslation();
  const [isSelecting, setIsSelecting] = useState(false);

  const requestPermissions = async (): Promise<boolean> => {
    if (Platform.OS !== 'web') {
      // カメラのパーミッション
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      if (cameraPermission.status !== 'granted') {
        Alert.alert(
          t('permissions.camera.title', 'カメラへのアクセス'),
          t('permissions.camera.message', 'カメラを使用するには権限が必要です')
        );
        return false;
      }

      // フォトライブラリのパーミッション
      const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (mediaPermission.status !== 'granted') {
        Alert.alert(
          t('permissions.media.title', 'フォトライブラリへのアクセス'),
          t('permissions.media.message', '写真を選択するには権限が必要です')
        );
        return false;
      }
    }

    return true;
  };

  const handleTakePhoto = async () => {
    setIsSelecting(true);
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        setIsSelecting(false);
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: 'images' as any,
        allowsEditing: false,
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        onImageSelected({
          uri: asset.uri,
          mimeType: asset.mimeType || 'image/jpeg',
          fileName: asset.fileName,
        });
      }
    } catch (error: any) {
      console.error('[ImageUploadButton] Error taking photo:', error);
      onError?.(t('imageUpload.cameraError', 'カメラの起動に失敗しました'));
    } finally {
      setIsSelecting(false);
    }
  };

  const handlePickImage = async () => {
    setIsSelecting(true);
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        setIsSelecting(false);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images' as any,
        allowsEditing: false,
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        onImageSelected({
          uri: asset.uri,
          mimeType: asset.mimeType || 'image/jpeg',
          fileName: asset.fileName,
        });
      }
    } catch (error: any) {
      console.error('[ImageUploadButton] Error picking image:', error);
      onError?.(t('imageUpload.pickError', '画像の選択に失敗しました'));
    } finally {
      setIsSelecting(false);
    }
  };

  const handlePickDocument = async () => {
    setIsSelecting(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (result.canceled === false && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        onImageSelected({
          uri: asset.uri,
          mimeType: asset.mimeType || 'application/pdf',
          fileName: asset.name,
        });
      }
    } catch (error: any) {
      console.error('[ImageUploadButton] Error picking document:', error);
      onError?.(t('imageUpload.documentError', 'ファイルの選択に失敗しました'));
    } finally {
      setIsSelecting(false);
    }
  };

  const showOptions = () => {
    if (Platform.OS === 'ios') {
      Alert.alert(
        t('imageUpload.selectSource', '画像を選択'),
        undefined,
        [
          {
            text: t('imageUpload.camera', 'カメラで撮影'),
            onPress: handleTakePhoto,
          },
          {
            text: t('imageUpload.library', 'フォトライブラリ'),
            onPress: handlePickImage,
          },
          {
            text: t('imageUpload.files', 'ファイルから選択'),
            onPress: handlePickDocument,
          },
          {
            text: t('common.cancel', 'キャンセル'),
            style: 'cancel',
          },
        ]
      );
    } else {
      // Android: Show simple picker
      handlePickImage();
    }
  };

  if (isSelecting) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#000000" />
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={showOptions}
      activeOpacity={0.7}
    >
      <Ionicons name="attach" size={24} color="#000000" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 34,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
