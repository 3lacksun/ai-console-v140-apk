import React, { useEffect, useMemo, useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { IconClose, IconKey } from './Icons';
import { radii } from '../theme';
import { useModalAccessibilityFocus, useReducedMotion } from '../ui/primitives';
import { isValidSettingsPin, normaliseSettingsPin } from '../utils/settingsPolicy.mjs';

export default function PinGateModal({
  visible,
  mode = 'unlock',
  onClose,
  onSubmit,
  onUseBiometric,
  lockRemainingMs = 0,
  palette,
  returnFocusRef,
}) {
  const styles = useMemo(() => createStyles(palette), [palette]);
  const reducedMotion = useReducedMotion();
  const modalTitleRef = useModalAccessibilityFocus(visible, returnFocusRef);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [clock, setClock] = useState(Date.now());
  const [lockStartedAt, setLockStartedAt] = useState(Date.now());
  const creating = mode === 'create' || mode === 'change';

  useEffect(() => {
    if (visible) {
      setPin('');
      setConfirmPin('');
      setError('');
      setClock(Date.now());
      setLockStartedAt(Date.now());
    }
  }, [visible, mode, lockRemainingMs]);

  useEffect(() => {
    if (!visible || !(Number(lockRemainingMs) > 0)) return undefined;
    const timer = setInterval(() => setClock(Date.now()), 250);
    return () => clearInterval(timer);
  }, [visible, lockRemainingMs]);

  const remainingMs = Math.max(0, Number(lockRemainingMs) || 0) - Math.max(0, clock - lockStartedAt);
  const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));

  const submit = async () => {
    if (remainingSeconds > 0) {
      setError(`Try again in ${remainingSeconds} seconds.`);
      return;
    }
    if (!isValidSettingsPin(pin)) {
      setError('Enter exactly 6 digits.');
      return;
    }
    if (creating && pin !== confirmPin) {
      setError('PIN confirmation does not match.');
      return;
    }
    const result = await onSubmit(pin);
    if (result) setError(result);
  };

  const useBiometric = async () => {
    if (typeof onUseBiometric !== 'function') return;
    const result = await onUseBiometric();
    if (result) setError(result);
  };

  const title = mode === 'unlock' ? 'Unlock AI Settings' : mode === 'change' ? 'Change AI Settings PIN' : 'Create AI Settings PIN';
  return (
    <Modal visible={visible} transparent animationType={reducedMotion ? 'none' : 'fade'} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card} accessibilityViewIsModal>
          <View style={styles.header}>
            <View style={styles.titleRow}><IconKey color={palette.cyanBright} /><Text ref={modalTitleRef} accessible accessibilityRole="header" style={styles.title}>{title}</Text></View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close PIN entry"><IconClose color={palette.textMuted} /></TouchableOpacity>
          </View>
          <Text style={styles.help}>{mode === 'unlock' ? 'Enter the 6-digit PIN to access model, provider and prompt settings.' : 'Use a 6-digit PIN. Only a salted one-way verifier is retained in device-backed SecureStore.'}</Text>
          <TextInput value={pin} onChangeText={(value) => setPin(normaliseSettingsPin(value))} keyboardType="number-pad" secureTextEntry maxLength={6} style={styles.pinInput} placeholder="••••••" placeholderTextColor={palette.textFaint} accessibilityLabel={creating ? 'New 6 digit PIN' : '6 digit PIN'} autoFocus />
          {creating && <TextInput value={confirmPin} onChangeText={(value) => setConfirmPin(normaliseSettingsPin(value))} keyboardType="number-pad" secureTextEntry maxLength={6} style={styles.pinInput} placeholder="Confirm PIN" placeholderTextColor={palette.textFaint} accessibilityLabel="Confirm 6 digit PIN" />}
          {!!error && <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text>}
          <TouchableOpacity style={styles.submitBtn} onPress={submit} disabled={remainingSeconds > 0} accessibilityRole="button" accessibilityState={{ disabled: remainingSeconds > 0 }}><Text style={styles.submitText}>{remainingSeconds > 0 ? `Try again in ${remainingSeconds}s` : (mode === 'unlock' ? 'Unlock' : 'Save PIN')}</Text></TouchableOpacity>
          {mode === 'unlock' && typeof onUseBiometric === 'function' ? (
            <TouchableOpacity style={styles.bioBtn} onPress={useBiometric} accessibilityRole="button" accessibilityLabel="Unlock with device credential or biometrics">
              <Text style={styles.bioText}>Use device unlock</Text>
            </TouchableOpacity>
          ) : null}
          <Text style={styles.recovery}>For security there is no unprotected PIN bypass. If the PIN is lost, protected settings can only be reset by clearing the app’s local data or reinstalling.</Text>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 420, backgroundColor: colors.bg, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border, padding: 18, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  closeBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.panel },
  help: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  pinInput: { minHeight: 52, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel, color: colors.textPrimary, fontSize: 22, letterSpacing: 8, textAlign: 'center' },
  error: { color: colors.rose, fontSize: 12, fontWeight: '600' },
  submitBtn: { minHeight: 48, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cyan },
  submitText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
  bioBtn: { minHeight: 48, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border },
  bioText: { color: colors.textPrimary, fontSize: 13, fontWeight: '700' },
  recovery: { color: colors.textFaint, fontSize: 10, lineHeight: 15 },
});
