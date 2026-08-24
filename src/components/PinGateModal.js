import React, { useEffect, useMemo, useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { IconClose, IconKey } from './Icons';
import { radii } from '../theme';
import { useModalAccessibilityFocus, useReducedMotion } from '../ui/primitives';
import { isValidSettingsPin, normaliseSettingsPin } from '../utils/settingsPolicy.mjs';

export default function PinGateModal({ visible, mode = 'unlock', onClose, onSubmit, palette, returnFocusRef }) {
  const styles = useMemo(() => createStyles(palette), [palette]);
  const reducedMotion = useReducedMotion();
  const modalTitleRef = useModalAccessibilityFocus(visible, returnFocusRef);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [clock, setClock] = useState(Date.now());
  const creating = mode === 'create' || mode === 'change';

  useEffect(() => {
    if (visible) { setPin(''); setConfirmPin(''); setError(''); setFailedAttempts(0); setLockedUntil(0); }
  }, [visible, mode]);

  useEffect(() => { if (!visible || lockedUntil <= Date.now()) return undefined; const timer=setInterval(()=>setClock(Date.now()),250); return()=>clearInterval(timer); }, [visible, lockedUntil]);
  const remainingSeconds = Math.max(0, Math.ceil((lockedUntil - clock) / 1000));

  const submit = async () => {
    if (lockedUntil > Date.now()) { setError(`Try again in ${Math.ceil((lockedUntil-Date.now())/1000)} seconds.`); return; }
    if (!isValidSettingsPin(pin)) { setError('Enter exactly 6 digits.'); return; }
    if (creating && pin !== confirmPin) { setError('PIN confirmation does not match.'); return; }
    const result = await onSubmit(pin);
    if (result) { const next=failedAttempts+1; setFailedAttempts(next); if (mode==='unlock') { const delay=Math.min(30000, Math.max(1000, 1000 * (2 ** Math.max(0,next-2)))); setLockedUntil(Date.now()+delay); setClock(Date.now()); } setError(result); } else { setFailedAttempts(0); setLockedUntil(0); }
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
          <TouchableOpacity style={styles.submitBtn} onPress={submit} disabled={remainingSeconds>0} accessibilityRole="button" accessibilityState={{disabled:remainingSeconds>0}}><Text style={styles.submitText}>{remainingSeconds>0?`Try again in ${remainingSeconds}s`:(mode === 'unlock' ? 'Unlock' : 'Save PIN')}</Text></TouchableOpacity>
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
  recovery: { color: colors.textFaint, fontSize: 10, lineHeight: 15 },
});
