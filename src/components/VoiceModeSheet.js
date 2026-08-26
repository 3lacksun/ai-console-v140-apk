import React, { useMemo } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconClose, IconMic, IconStop } from './Icons';
import { radii } from '../theme';
import { VoiceModeStatus } from '../voice/voiceConversation.mjs';
import { useReducedMotion } from '../ui/primitives';

function statusLabel(status) {
  switch (status) {
    case VoiceModeStatus.LISTENING: return 'Listening…';
    case VoiceModeStatus.THINKING: return 'Thinking…';
    case VoiceModeStatus.SPEAKING: return 'Speaking…';
    case VoiceModeStatus.ERROR: return 'Error';
    default: return 'Voice Mode';
  }
}

export default function VoiceModeSheet({
  visible,
  onClose,
  status = VoiceModeStatus.IDLE,
  transcript = '',
  interim = '',
  reply = '',
  error = '',
  providerLabel = 'OpenRouter',
  modelName = '',
  onInterrupt,
  onToggleListen,
  palette,
}) {
  const styles = useMemo(() => createStyles(palette), [palette]);
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const listening = status === VoiceModeStatus.LISTENING;
  const busy = status === VoiceModeStatus.THINKING || status === VoiceModeStatus.SPEAKING;

  return (
    <Modal visible={visible} animationType={reducedMotion ? 'none' : 'slide'} transparent onRequestClose={onClose}>
      <View style={[styles.root, { paddingTop: Math.max(insets.top, 12), paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>COMMAND CENTRE</Text>
            <Text style={styles.title}>Voice Mode</Text>
            <Text style={styles.meta}>{providerLabel} · {modelName || 'default model'}</Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} accessibilityRole="button" accessibilityLabel="Exit voice mode">
            <IconClose color={palette.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles.stage}>
          <View style={[styles.orb, listening && styles.orbLive, status === VoiceModeStatus.SPEAKING && styles.orbSpeak]}>
            {status === VoiceModeStatus.THINKING ? (
              <ActivityIndicator color={palette.cyanBright} size="large" />
            ) : (
              <IconMic size={36} color={listening ? '#ffffff' : palette.textPrimary} />
            )}
          </View>
          <Text style={styles.status}>{statusLabel(status)}</Text>
          <Text style={styles.hint}>
            {listening
              ? 'Speak naturally. Ends after a short pause (VAD).'
              : busy
                ? 'Tap Interrupt to stop and speak again.'
                : 'Tap the mic to start a spoken turn.'}
          </Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelLabel}>You</Text>
          <Text style={styles.panelText}>{transcript || interim || '—'}</Text>
        </View>
        <View style={styles.panel}>
          <Text style={styles.panelLabel}>Assistant</Text>
          <Text style={styles.panelText} numberOfLines={8}>{reply || '—'}</Text>
        </View>
        {!!error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.actions}>
          {busy ? (
            <TouchableOpacity style={styles.secondaryBtn} onPress={onInterrupt} accessibilityRole="button" accessibilityLabel="Interrupt">
              <IconStop size={18} color={palette.textPrimary} />
              <Text style={styles.secondaryText}>Interrupt</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.primaryBtn, listening && styles.primaryBtnLive]}
              onPress={onToggleListen}
              accessibilityRole="button"
              accessibilityLabel={listening ? 'Stop listening' : 'Start listening'}
            >
              <IconMic size={20} color="#ffffff" />
              <Text style={styles.primaryText}>{listening ? 'Stop' : 'Start'}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.ghostBtn} onPress={onClose} accessibilityRole="button">
            <Text style={styles.ghostText}>Exit</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  eyebrow: { color: colors.textFaint, fontSize: 10, fontWeight: '800', letterSpacing: 1.4 },
  title: { color: colors.textPrimary, fontSize: 22, fontWeight: '800', marginTop: 2 },
  meta: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
  closeBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radii.sm, backgroundColor: colors.panelAlt },
  stage: { alignItems: 'center', paddingVertical: 28, gap: 12 },
  orb: {
    width: 112, height: 112, borderRadius: 56, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.panelAlt, borderWidth: 2, borderColor: colors.border,
  },
  orbLive: { backgroundColor: colors.cyan, borderColor: colors.cyanBright },
  orbSpeak: { backgroundColor: colors.surfaceElevated, borderColor: colors.textPrimary },
  status: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' },
  hint: { color: colors.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 18, maxWidth: 280 },
  panel: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, padding: 14,
    backgroundColor: colors.surfaceElevated, marginBottom: 10, minHeight: 72,
  },
  panelLabel: { color: colors.textFaint, fontSize: 10, fontWeight: '800', marginBottom: 6, letterSpacing: 0.8 },
  panelText: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  error: { color: colors.rose, fontSize: 12, marginBottom: 8 },
  actions: { marginTop: 'auto', gap: 10 },
  primaryBtn: {
    minHeight: 56, borderRadius: radii.lg, backgroundColor: colors.cyan,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  primaryBtnLive: { backgroundColor: colors.rose },
  primaryText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
  secondaryBtn: {
    minHeight: 52, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.panelAlt, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  secondaryText: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },
  ghostBtn: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  ghostText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
});
