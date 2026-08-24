import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, SectionList, StyleSheet } from 'react-native';
import { IconClose, IconCheck, IconServer } from './Icons';
import { radii } from '../theme';
import { useModalAccessibilityFocus, useReducedMotion } from '../ui/primitives';

export default function ModelPicker({ visible, onClose, modelGroups, selectedId, onSelect, palette, returnFocusRef }) {
  const styles = useMemo(() => createStyles(palette), [palette]);
  const reducedMotion = useReducedMotion();
  const modalTitleRef = useModalAccessibilityFocus(visible, returnFocusRef);
  const [query, setQuery] = useState('');
  const normalisedQuery = query.trim().toLocaleLowerCase();
  const sections = useMemo(() => Object.entries(modelGroups)
    .map(([title, data]) => ({
      title,
      data: data.filter((item) => !normalisedQuery || `${title} ${item.name} ${item.id}`.toLocaleLowerCase().includes(normalisedQuery)),
    }))
    .filter((section) => section.data.length), [modelGroups, normalisedQuery]);

  useEffect(() => { if (!visible) setQuery(''); }, [visible]);

  return (
    <Modal visible={visible} animationType={reducedMotion ? 'none' : 'slide'} transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close model picker" />
        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}><IconServer size={16} color={palette.textMuted} /><Text ref={modalTitleRef} accessible accessibilityRole="header" style={styles.headerTitle}>Select Model</Text></View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close model picker" accessibilityRole="button"><IconClose size={18} color={palette.textMuted} /></TouchableOpacity>
          </View>
          <View style={styles.searchWrap}>
            <TextInput value={query} onChangeText={setQuery} placeholder="Search provider, model name, or ID" placeholderTextColor={palette.textFaint} autoCapitalize="none" autoCorrect={false} clearButtonMode="while-editing" returnKeyType="search" style={styles.searchInput} accessibilityLabel="Search LLM models" accessibilityHint="Filters the protected model list by provider, model name, or model identifier" />
            <Text style={styles.searchMeta} accessibilityLiveRegion="polite">{sections.reduce((total, section) => total + section.data.length, 0)} model{sections.reduce((total, section) => total + section.data.length, 0) === 1 ? '' : 's'} shown</Text>
          </View>
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            stickySectionHeadersEnabled
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>No model matches “{query.trim()}”.</Text></View>}
            renderSectionHeader={({ section: { title } }) => <View style={styles.sectionHeader}><Text style={styles.sectionHeaderText}>{title}</Text></View>}
            renderItem={({ item }) => {
              const active = item.id === selectedId;
              return <TouchableOpacity accessibilityRole="button" accessibilityState={{ selected: active }} accessibilityLabel={`Select model ${item.name}`} style={[styles.row, active && styles.rowActive]} onPress={() => { onSelect(item.id); onClose(); }}><View style={styles.rowCopy}><Text style={[styles.rowText, active && styles.rowTextActive]}>{item.name}</Text><Text style={styles.rowId}>{item.id}</Text></View>{active && <IconCheck size={16} color={palette.cyanBright} />}</TouchableOpacity>;
            }}
            contentContainerStyle={styles.listContent}
          />
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: { height: '86%', backgroundColor: colors.bg, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 12, fontWeight: '700', color: colors.textMuted, letterSpacing: 1, textTransform: 'uppercase' },
  closeBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.panel, borderRadius: radii.sm },
  searchWrap: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  searchInput: { minHeight: 48, borderWidth: 1, borderColor: colors.borderLight, borderRadius: radii.md, paddingHorizontal: 12, color: colors.textPrimary, backgroundColor: colors.panel, fontSize: 14 },
  searchMeta: { marginTop: 6, color: colors.textFaint, fontSize: 11 },
  sectionHeader: { backgroundColor: colors.bg, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
  sectionHeaderText: { fontSize: 11, fontWeight: '700', color: colors.cyanBright, letterSpacing: 1.5, textTransform: 'uppercase' },
  row: { minHeight: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowCopy: { flex: 1, paddingRight: 10 },
  rowActive: { backgroundColor: colors.cyanDim },
  rowText: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },
  rowTextActive: { color: colors.cyanBright },
  rowId: { fontSize: 11, color: colors.textFaint, marginTop: 2 },
  listContent: { paddingBottom: 24, flexGrow: 1 },
  empty: { alignItems: 'center', padding: 28 },
  emptyText: { color: colors.textFaint, textAlign: 'center' },
});
