import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import { IconKey, IconServer, IconRefresh, IconClose } from './Icons';
import { radii } from '../theme';
import { useModalAccessibilityFocus, useReducedMotion } from '../ui/primitives';
import { DEFAULT_SYSTEM_PROMPT } from '../utils/storage';
import { MAX_OUTPUT_TOKENS, MIN_OUTPUT_TOKENS, normaliseOutputTokens } from '../utils/outputTokens.mjs';

const PROMPT_PRESETS = [
  { label: 'Structured', value: DEFAULT_SYSTEM_PROMPT },
  { label: 'Data Analyst', value: 'You are an expert data analyst. Present complex comparisons using clear Markdown tables based on objective facts.' },
  { label: 'General', value: 'You are a helpful, accurate, and highly capable AI assistant.' },
];

export default function LLMSettingsSheet({
  visible, onClose, apiKey, onChangeApiKey, togetherApiKey = '', onChangeTogetherApiKey = () => {},
  llmProvider = 'openrouter', onChangeLlmProvider = () => {},
  currentModelName, onOpenModelPicker,
  systemPrompt, onChangeSystemPrompt, temperature, onChangeTemperature, maxTokens,
  onChangeMaxTokens, isFetchingModels, onSyncModels, onChangePin, onOpenProtectedWorkspaceTools = () => {}, apiKeyPersistenceStatus = 'UNKNOWN', togetherKeyPersistenceStatus = 'UNKNOWN', palette, returnFocusRef,
}) {
  const styles = useMemo(() => createStyles(palette), [palette]);
  const reducedMotion = useReducedMotion();
  const modalTitleRef = useModalAccessibilityFocus(visible, returnFocusRef);
  const insets = useSafeAreaInsets();
  const [showKey, setShowKey] = useState(false);
  const [tokenDraft, setTokenDraft] = useState(String(maxTokens));
  useEffect(() => { setTokenDraft(String(maxTokens)); }, [maxTokens]);
  const commitTokenDraft = () => { const next = normaliseOutputTokens(tokenDraft, maxTokens); onChangeMaxTokens(next); setTokenDraft(String(next)); };
  return (
    <Modal visible={visible} animationType={reducedMotion ? 'none' : 'slide'} transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} accessibilityLabel="Lock and close AI settings" accessibilityRole="button" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) }]} accessibilityViewIsModal>
          <View style={styles.header}>
            <View style={styles.titleRow}><IconKey color={palette.cyanBright} /><Text ref={modalTitleRef} accessible accessibilityRole="header" style={styles.headerTitle}>Protected Command Settings</Text></View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="Lock and close AI settings" accessibilityRole="button"><IconClose size={18} color={palette.textMuted} /></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <Text style={styles.securityNote}>This menu locks whenever it is closed. A 6-digit PIN is required for every new access.</Text>
            <View style={styles.section}>
              <View style={styles.labelRow}><IconServer color={palette.textMuted} /><Text style={styles.label}>Provider</Text></View>
              <View style={styles.providerRow}>
                <TouchableOpacity style={[styles.providerChip, llmProvider === 'openrouter' && styles.providerChipActive]} onPress={() => onChangeLlmProvider('openrouter')} accessibilityRole="button" accessibilityState={{ selected: llmProvider === 'openrouter' }}>
                  <Text style={[styles.providerChipText, llmProvider === 'openrouter' && styles.providerChipTextActive]}>OpenRouter</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.providerChip, llmProvider === 'together' && styles.providerChipActive]} onPress={() => onChangeLlmProvider('together')} accessibilityRole="button" accessibilityState={{ selected: llmProvider === 'together' }}>
                  <Text style={[styles.providerChipText, llmProvider === 'together' && styles.providerChipTextActive]}>Together.ai</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.hint}>Active provider is used for chat, voice mode, and model sync.</Text>
            </View>

            <View style={styles.section}>
              <View style={styles.labelRow}><IconKey color={palette.textMuted} /><Text style={styles.label}>OpenRouter API Key</Text></View>
              <TextInput value={apiKey} onChangeText={onChangeApiKey} placeholder="sk-or-v1-..." placeholderTextColor={palette.textFaint} secureTextEntry={!showKey} autoCapitalize="none" autoCorrect={false} style={styles.input} accessibilityLabel="OpenRouter API key" />
              <Text style={styles.persistenceStatus} accessibilityLiveRegion="polite">{apiKeyPersistenceStatus === 'SAVED_SECURELY' ? 'Saved securely' : apiKeyPersistenceStatus === 'SESSION_ONLY' ? 'Session only' : apiKeyPersistenceStatus === 'READ_FAILED' ? 'Read failed' : apiKeyPersistenceStatus === 'READ_OK' ? 'Read OK' : 'Not verified'}</Text>
            </View>

            <View style={styles.section}>
              <View style={styles.labelRow}><IconKey color={palette.textMuted} /><Text style={styles.label}>Together.ai API Key</Text></View>
              <TextInput value={togetherApiKey} onChangeText={onChangeTogetherApiKey} placeholder="together-..." placeholderTextColor={palette.textFaint} secureTextEntry={!showKey} autoCapitalize="none" autoCorrect={false} style={styles.input} accessibilityLabel="Together.ai API key" />
              <Text style={styles.persistenceStatus} accessibilityLiveRegion="polite">{togetherKeyPersistenceStatus === 'SAVED_SECURELY' ? 'Saved securely' : togetherKeyPersistenceStatus === 'SESSION_ONLY' ? 'Session only' : togetherKeyPersistenceStatus === 'READ_FAILED' ? 'Read failed' : togetherKeyPersistenceStatus === 'READ_OK' ? 'Read OK' : 'Not verified'}</Text>
              <TouchableOpacity onPress={() => setShowKey((value) => !value)} style={styles.textAction} accessibilityRole="button"><Text style={styles.toggleText}>{showKey ? 'Hide keys' : 'Show keys'}</Text></TouchableOpacity>
              <Text style={styles.hint}>Keys are stored in device SecureStore. Voice Mode uses the active provider.</Text>
            </View>

            <View style={styles.section}>
              <View style={styles.labelRowBetween}>
                <View style={styles.labelRow}><IconServer color={palette.textMuted} /><Text style={styles.label}>Model</Text></View>
                <TouchableOpacity onPress={onSyncModels} disabled={isFetchingModels} style={styles.syncBtn} accessibilityLabel="Sync models" accessibilityRole="button">
                  {isFetchingModels ? <ActivityIndicator size="small" color={palette.cyanBright} /> : <IconRefresh color={palette.cyanBright} />}
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.selectBtn} onPress={onOpenModelPicker} accessibilityRole="button"><Text style={styles.selectBtnText} numberOfLines={1}>{currentModelName}</Text></TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Prompt System / Assistant Instructions</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetRow}>
                {PROMPT_PRESETS.map((preset) => {
                  const active = systemPrompt === preset.value;
                  return <TouchableOpacity accessibilityRole="button" key={preset.label} onPress={() => onChangeSystemPrompt(preset.value)} style={[styles.presetChip, active && styles.presetChipActive]}><Text style={[styles.presetChipText, active && styles.presetChipTextActive]}>{preset.label}</Text></TouchableOpacity>;
                })}
              </ScrollView>
              <TextInput value={systemPrompt} onChangeText={onChangeSystemPrompt} multiline textAlignVertical="top" style={styles.promptInput} accessibilityLabel="System prompt" />
            </View>

            <View style={styles.sliderPanel}>
              <View style={styles.sliderBlock}>
                <View style={styles.sliderLabelRow}><Text style={styles.sliderLabel}>Temperature</Text><Text style={styles.sliderValue}>{Number(temperature).toFixed(1)}</Text></View>
                <Slider minimumValue={0} maximumValue={1} step={0.1} value={Number(temperature)} onValueChange={onChangeTemperature} minimumTrackTintColor={palette.cyan} maximumTrackTintColor={palette.border} thumbTintColor={palette.cyanBright} accessibilityLabel="Temperature" />
              </View>
              <View style={styles.sliderBlock}>
                <View style={styles.sliderLabelRow}><Text style={styles.sliderLabel}>Max Tokens</Text><Text style={styles.sliderValue}>{Number(maxTokens).toLocaleString()}</Text></View>
                <Slider minimumValue={MIN_OUTPUT_TOKENS} maximumValue={MAX_OUTPUT_TOKENS} step={MIN_OUTPUT_TOKENS} value={normaliseOutputTokens(maxTokens)} onValueChange={(value) => onChangeMaxTokens(normaliseOutputTokens(value))} minimumTrackTintColor={palette.cyan} maximumTrackTintColor={palette.border} thumbTintColor={palette.cyanBright} accessibilityLabel="Maximum output tokens" />
                <TextInput value={tokenDraft} onChangeText={setTokenDraft} onBlur={commitTokenDraft} onSubmitEditing={commitTokenDraft} keyboardType="number-pad" returnKeyType="done" placeholder="Exact output-token limit" placeholderTextColor={palette.textFaint} style={styles.tokenInput} accessibilityLabel="Exact maximum output tokens" accessibilityHint={`Enter between ${MIN_OUTPUT_TOKENS} and ${MAX_OUTPUT_TOKENS} output tokens`} />
                <Text style={styles.tokenHint}>Large-model ceiling: up to {MAX_OUTPUT_TOKENS.toLocaleString()} tokens. Providers may enforce lower per-model limits.</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.changePinBtn} onPress={onOpenProtectedWorkspaceTools} accessibilityRole="button"><Text style={styles.changePinText}>Manage Prompt Library & Project AI Configuration</Text></TouchableOpacity>
            <TouchableOpacity style={styles.changePinBtn} onPress={onChangePin} accessibilityRole="button"><Text style={styles.changePinText}>Change Protected Settings PIN</Text></TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: { height: '90%', backgroundColor: colors.bg, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  titleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  closeBtn: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.panel, borderRadius: radii.sm },
  body: { padding: 16, paddingBottom: 40, gap: 24 },
  securityNote: { padding: 12, fontSize: 12, lineHeight: 18, color: colors.textMuted, backgroundColor: colors.cyanDim, borderWidth: 1, borderColor: colors.cyanBorder, borderRadius: radii.md },
  section: { gap: 8 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  labelRowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 1, textTransform: 'uppercase' },
  input: { minHeight: 48, padding: 12, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, color: colors.textSecondary, fontSize: 14 },
  textAction: { minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center' },
  toggleText: { fontSize: 11, color: colors.cyanBright, fontWeight: '700' },
  hint: { fontSize: 11, color: colors.textFaint },
  syncBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md },
  selectBtn: { minHeight: 48, padding: 12, justifyContent: 'center', backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md },
  selectBtnText: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },
  presetRow: { flexDirection: 'row', marginBottom: 4 },
  presetChip: { minHeight: 44, justifyContent: 'center', marginRight: 8, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radii.md, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border },
  presetChipActive: { backgroundColor: colors.cyanDim, borderColor: colors.cyanBorder },
  presetChipText: { fontSize: 11, fontWeight: '700', color: colors.textSecondary },
  presetChipTextActive: { color: colors.cyanBright },
  promptInput: { padding: 12, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, color: colors.textSecondary, fontSize: 13, minHeight: 112 },
  sliderPanel: { gap: 18, padding: 14, borderRadius: radii.md, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border },
  sliderBlock: { gap: 4 },
  sliderLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sliderLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  sliderValue: { fontSize: 11, fontWeight: '700', color: colors.cyanBright }, tokenInput: { minHeight: 48, marginTop: 6, paddingHorizontal: 12, color: colors.textSecondary, backgroundColor: colors.panelAlt, borderWidth: 1, borderColor: colors.border, borderRadius: radii.sm, fontSize: 14 }, tokenHint: { color: colors.textFaint, fontSize: 10, lineHeight: 14 },
  changePinBtn: { minHeight: 48, alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: radii.md, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.borderLight },
  changePinText: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' }, persistenceStatus: { color: colors.textMuted, fontSize: 10, lineHeight: 15, marginTop: 5 },
});
