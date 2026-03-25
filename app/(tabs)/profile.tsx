import { StyleSheet, View, Text, TouchableOpacity, ScrollView, TextInput, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ThemedView } from '@/components/themed-view';
import { UnifiedHeaderBar } from '@/components/ui/unified-header-bar';
import { useThemeColor } from '@/hooks/use-theme-color';
import { router } from 'expo-router';
import Svg, { Path, Circle } from 'react-native-svg';
import { useLearningLanguages } from '@/contexts/learning-languages-context';

// Icons
function ChevronRightIcon({ size = 24, color = '#686868' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 18l6-6-6-6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
function CameraIcon({ size = 24, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2v11z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={13} r={4} stroke={color} strokeWidth={2} />
    </Svg>
  );
}

function UserIcon({ size = 60, color = '#686868' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function ProfileScreen() {
  const pageBackground = useThemeColor({}, 'pageBackground');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const textMutedColor = useThemeColor({}, 'textMuted');
  const textPlaceholderColor = useThemeColor({}, 'textPlaceholder');
  const primaryColor = useThemeColor({}, 'primary');
  const textOnPrimaryColor = useThemeColor({}, 'textOnPrimary');
  const cardBgColor = useThemeColor({}, 'cardBackgroundElevated');
  const inputBorderColor = useThemeColor({}, 'inputBorder');
  const errorTextColor = useThemeColor({}, 'errorText');
  const { defaultLanguage } = useLearningLanguages();
  const [name, setName] = useState('ユーザー名');
  const [email, setEmail] = useState('user@example.com');
  const [bio, setBio] = useState('');

  const handleSave = () => {
    // TODO: プロフィール情報を保存
    router.back();
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: pageBackground }]}>
      <StatusBar style="auto" />

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <UnifiedHeaderBar
            pageType="other"
            title="プロフィール"
            onBackPress={() => router.back()}
          />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Profile Picture */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatarWrapper}>
              <View style={[styles.avatar, { backgroundColor: primaryColor }]}>
                <UserIcon size={60} color={textOnPrimaryColor} />
              </View>
              <TouchableOpacity style={[styles.cameraButton, { backgroundColor: primaryColor, borderColor: pageBackground }]}>
                <CameraIcon size={20} color={textOnPrimaryColor} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.avatarHint, { color: textSecondaryColor }]}>タップして写真を変更</Text>
          </View>

          {/* Form Fields */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: textColor }]}>名前</Text>
            <TextInput
              style={[styles.input, { backgroundColor: cardBgColor, color: textColor, borderColor: inputBorderColor }]}
              value={name}
              onChangeText={setName}
              placeholder="名前を入力"
              placeholderTextColor={textPlaceholderColor}
            />
          </View>

          <View style={styles.section}>
            <Text style={[styles.label, { color: textColor }]}>メールアドレス</Text>
            <TextInput
              style={[styles.input, { backgroundColor: cardBgColor, color: textColor, borderColor: inputBorderColor }]}
              value={email}
              onChangeText={setEmail}
              placeholder="メールアドレスを入力"
              placeholderTextColor={textPlaceholderColor}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.section}>
            <Text style={[styles.label, { color: textColor }]}>自己紹介</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: cardBgColor, color: textColor, borderColor: inputBorderColor }]}
              value={bio}
              onChangeText={setBio}
              placeholder="自己紹介を入力（任意）"
              placeholderTextColor={textPlaceholderColor}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Default Language */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: textColor }]}>デフォルト言語</Text>
            <TouchableOpacity
              style={[styles.languageButton, { backgroundColor: cardBgColor, borderColor: inputBorderColor }]}
              onPress={() => router.push('/language-select')}
            >
              <View style={styles.languageButtonContent}>
                <Text style={styles.flag}>{defaultLanguage.flag}</Text>
                <Text style={[styles.languageName, { color: textColor }]}>{defaultLanguage.name}</Text>
              </View>
              <ChevronRightIcon color={textSecondaryColor} />
            </TouchableOpacity>
            <Text style={[styles.hint, { color: textMutedColor }]}>アプリの設定や通知で使用される言語です</Text>
          </View>

          {/* Save Button */}
          <TouchableOpacity style={[styles.saveButton, { backgroundColor: primaryColor }]} onPress={handleSave}>
            <Text style={[styles.saveButtonText, { color: textOnPrimaryColor }]}>保存</Text>
          </TouchableOpacity>

          {/* Account Actions */}
          <View style={styles.actionsSection}>
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: cardBgColor, borderColor: inputBorderColor }]}>
              <Text style={[styles.actionButtonText, { color: textColor }]}>パスワードを変更</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionButton, styles.dangerButton]}>
              <Text style={[styles.actionButtonText, { color: errorTextColor }]}>アカウントを削除</Text>
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
    marginBottom: 12,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
  },
  avatarHint: {
    fontSize: 14,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 14,
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
  },
  languageButtonContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  flag: {
    fontSize: 24,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '500',
  },
  hint: {
    fontSize: 12,
    marginTop: 6,
  },
  saveButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionsSection: {
    marginBottom: 40,
    gap: 12,
  },
  actionButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  dangerButton: {
    borderColor: '#FF4444',
  },
});
