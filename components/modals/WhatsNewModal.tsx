import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { getWhatsNewForVersion } from '@/constants/whats-new';
import { useThemeColor } from '@/hooks/use-theme-color';

interface WhatsNewModalProps {
  visible: boolean;
  version: string;
  onClose: () => void;
}

export function WhatsNewModal({ visible, version, onClose }: WhatsNewModalProps) {
  const { t } = useTranslation();
  const whatsNew = getWhatsNewForVersion(version);
  const overlayColor = useThemeColor({}, 'modalOverlay');
  const modalBg = useThemeColor({}, 'modalBackground');
  const textColor = useThemeColor({}, 'text');
  const accentColor = useThemeColor({}, 'accent');
  const itemTextColor = useThemeColor({}, 'text');
  const primaryColor = useThemeColor({}, 'primary');

  if (!whatsNew) return null;

  const items = Array.from({ length: whatsNew.itemCount }, (_, i) =>
    t(`whatsNew.versions.${version}.items.${i}`)
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: overlayColor }]}>
        <View style={[styles.card, { backgroundColor: modalBg }]}>
          <Text style={[styles.title, { color: textColor }]}>
            {t('whatsNew.title', { version })}
          </Text>

          <View style={styles.itemList}>
            {items.map((item, index) => (
              <View key={index} style={styles.itemRow}>
                <Text style={[styles.bullet, { color: accentColor }]}>●</Text>
                <Text style={[styles.itemText, { color: itemTextColor }]}>{item}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={[styles.button, { backgroundColor: primaryColor }]} onPress={onClose}>
            <Text style={styles.buttonText}>{t('whatsNew.dismiss')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  card: {
    width: '100%',
    borderRadius: 20,
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 28,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
  },
  itemList: {
    marginBottom: 28,
    gap: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bullet: {
    fontSize: 8,
    marginTop: 6,
  },
  itemText: {
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
  button: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
