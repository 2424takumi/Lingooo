import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { getWhatsNewForVersion } from '@/constants/whats-new';

interface WhatsNewModalProps {
  visible: boolean;
  version: string;
  onClose: () => void;
}

export function WhatsNewModal({ visible, version, onClose }: WhatsNewModalProps) {
  const { t } = useTranslation();
  const whatsNew = getWhatsNewForVersion(version);

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
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>
            {t('whatsNew.title', { version })}
          </Text>

          <View style={styles.itemList}>
            {items.map((item, index) => (
              <View key={index} style={styles.itemRow}>
                <Text style={styles.bullet}>●</Text>
                <Text style={styles.itemText}>{item}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.button} onPress={onClose}>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 28,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111111',
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
    color: '#00AA69',
    marginTop: 6,
  },
  itemText: {
    fontSize: 15,
    color: '#333333',
    lineHeight: 22,
    flex: 1,
  },
  button: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#111111',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
