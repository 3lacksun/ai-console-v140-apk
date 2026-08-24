import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ActionRow, BottomActionSheet, EmptyState } from '../ui/primitives';
import { IconDocument } from './Icons';
import { radii } from '../theme';

const MODES = [
  { id: 'before', label: 'Before' },
  { id: 'after', label: 'After' },
  { id: 'replace', label: 'Replace' },
];

export default function DocumentTargetSheet({ visible, documents = [], onClose, onSelect, onCreateNew = () => {}, palette }) {
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [selectedDocumentId, setSelectedDocumentId] = useState(null);
  const [mode, setMode] = useState('after');
  const selected = documents.find((doc) => doc.id === selectedDocumentId) || null;

  useEffect(() => {
    if (!visible) {
      setSelectedDocumentId(null);
      setMode('after');
    }
  }, [visible]);

  const finish = (documentId, placement) => {
    onSelect(documentId, placement);
    onClose();
  };

  return <BottomActionSheet visible={visible} title="Add to document" onClose={onClose} palette={palette}>
    {!selected ? <ScrollView contentContainerStyle={styles.list}>
      <ActionRow label="Create new document" detail="Create a document in this workspace and add the selected message." onPress={() => { onCreateNew(); onClose(); }} palette={palette} />
      {documents.length ? documents.map((doc) => <ActionRow key={doc.id} label={doc.title} detail={`${doc.sections?.length || 0} sections · choose placement`} onPress={() => setSelectedDocumentId(doc.id)} palette={palette} />) : <EmptyState title="No existing documents" detail="Create a new document directly from this chat message." icon={<IconDocument size={32} color={palette.cyanBright} />} palette={palette} />}
    </ScrollView> : <ScrollView contentContainerStyle={styles.list}>
      <TouchableOpacity style={styles.back} onPress={() => setSelectedDocumentId(null)} accessibilityRole="button"><Text style={styles.backText}>← Choose another document</Text></TouchableOpacity>
      <Text style={styles.heading}>{selected.title}</Text>
      <ActionRow label="Append to document" detail="Add the chat message after the final section." onPress={() => finish(selected.id, { mode: 'append' })} palette={palette} />
      <Text style={styles.label}>Or place relative to a section</Text>
      <View style={styles.modes}>{MODES.map((item) => <TouchableOpacity key={item.id} style={[styles.mode, mode === item.id && styles.modeActive]} onPress={() => setMode(item.id)} accessibilityRole="button" accessibilityState={{ selected: mode === item.id }}><Text style={[styles.modeText, mode === item.id && styles.modeTextActive]}>{item.label}</Text></TouchableOpacity>)}</View>
      {(selected.sections || []).map((section, index) => <ActionRow key={section.id} label={`Section ${index + 1}`} detail={(section.content || '').trim().slice(0, 90) || section.type} onPress={() => finish(selected.id, { mode, sectionId: section.id })} palette={palette} />)}
    </ScrollView>}
  </BottomActionSheet>;
}

const createStyles = (colors) => StyleSheet.create({
  list: { gap: 8, paddingBottom: 12 },
  back: { minHeight: 48, justifyContent: 'center' },
  backText: { color: colors.cyanBright, fontSize: 12, fontWeight: '700' },
  heading: { color: colors.textPrimary, fontSize: 16, fontWeight: '800' },
  label: { color: colors.textMuted, fontSize: 11, fontWeight: '700', marginTop: 4 },
  modes: { flexDirection: 'row', gap: 8 },
  mode: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel, borderRadius: radii.md },
  modeActive: { borderColor: colors.cyanBright, backgroundColor: colors.cyanDim },
  modeText: { color: colors.textSecondary, fontSize: 11, fontWeight: '700' },
  modeTextActive: { color: colors.cyanBright },
});
