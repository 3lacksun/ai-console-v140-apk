import React, { useMemo } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconClose, IconUpload, IconCamera, IconGallery, IconImageGen } from './Icons';
import { radii } from '../theme';
import { useModalAccessibilityFocus, useReducedMotion } from '../ui/primitives';

export default function AttachmentSourceSheet({
  visible,
  onClose,
  onDocument,
  onCamera,
  onGallery,
  onGenerateImage,
  palette,
  returnFocusRef,
}) {
  const styles = useMemo(() => createStyles(palette), [palette]);
  const reducedMotion = useReducedMotion();
  const modalTitleRef = useModalAccessibilityFocus(visible, returnFocusRef);
  const insets = useSafeAreaInsets();
  const choose = async (handler) => {
    onClose();
    await handler();
  };
  return (
    <Modal visible={visible} transparent animationType={reducedMotion ? 'none' : 'slide'} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close attachment source picker" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) }]} accessibilityViewIsModal>
          <View style={styles.header}>
            <View>
              <Text ref={modalTitleRef} accessible accessibilityRole="header" style={styles.title}>
                Add media
              </Text>
              <Text style={styles.subtitle}>Upload a photo, capture one, or create a new image from a text prompt in the composer.</Text>
            </View>
            <TouchableOpacity style={styles.close} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close attachment source picker">
              <IconClose color={palette.textMuted} />
            </TouchableOpacity>
          </View>
          <View style={styles.body}>
            <TouchableOpacity style={styles.action} onPress={() => choose(onDocument)} accessibilityRole="button">
              <IconUpload size={18} color={palette.cyanBright} />
              <View style={styles.actionCopy}>
                <Text style={styles.actionTitle}>Document / PDF / ZIP</Text>
                <Text style={styles.actionText}>Choose a local document. PDFs are inspected and page text is extracted locally where supported.</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.action} onPress={() => choose(onCamera)} accessibilityRole="button">
              <IconCamera size={20} color={palette.cyanBright} />
              <View style={styles.actionCopy}>
                <Text style={styles.actionTitle}>Camera</Text>
                <Text style={styles.actionText}>Capture a photo to send with your next message.</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.action} onPress={() => choose(onGallery)} accessibilityRole="button">
              <IconGallery size={20} color={palette.cyanBright} />
              <View style={styles.actionCopy}>
                <Text style={styles.actionTitle}>Upload image</Text>
                <Text style={styles.actionText}>Pick an existing photo from the device library.</Text>
              </View>
            </TouchableOpacity>
            {typeof onGenerateImage === 'function' ? (
              <TouchableOpacity style={[styles.action, styles.actionAccent]} onPress={() => choose(onGenerateImage)} accessibilityRole="button">
                <IconImageGen size={20} color={palette.cyanBright} />
                <View style={styles.actionCopy}>
                  <Text style={styles.actionTitle}>Create image</Text>
                  <Text style={styles.actionText}>Generate an image from the text currently in the message box (OpenRouter image model).</Text>
                </View>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay },
    sheet: {
      backgroundColor: colors.bg,
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      borderWidth: 1,
      borderColor: colors.border,
    },
    header: {
      minHeight: 72,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    title: { color: colors.textPrimary, fontSize: 16, fontWeight: '800' },
    subtitle: { marginTop: 4, maxWidth: 280, color: colors.textFaint, fontSize: 11, lineHeight: 15 },
    close: {
      width: 48,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.panel,
      borderRadius: radii.sm,
    },
    body: { padding: 16, gap: 10 },
    action: {
      minHeight: 72,
      padding: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.panel,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
    },
    actionAccent: { borderColor: colors.cyanBorder, backgroundColor: colors.cyanDim },
    actionCopy: { flex: 1 },
    actionTitle: { color: colors.textSecondary, fontWeight: '800', fontSize: 13 },
    actionText: { marginTop: 4, color: colors.textFaint, fontSize: 11, lineHeight: 15 },
  });
