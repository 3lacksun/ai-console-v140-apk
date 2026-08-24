import React, { useMemo, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { radii } from '../theme';
import { parseMarkdownBlocks, renderInlineTokens, sanitiseMarkdown } from '../domain/safeMarkdown.mjs';

function Inline({ value, styles }) {
  return <Text style={styles.body}>{renderInlineTokens(value).map((token, index) => {
    if (token.type === 'bold') return <Text key={index} style={styles.bold}>{token.content}</Text>;
    if (token.type === 'italic') return <Text key={index} style={styles.italic}>{token.content}</Text>;
    if (token.type === 'link') return <Text key={index} style={styles.link} onPress={() => /^https?:\/\//i.test(token.url) && Linking.openURL(token.url)} accessibilityRole="link">{token.label}</Text>;
    return token.content;
  })}</Text>;
}

function TextBlock({ content, styles }) {
  return <View>{sanitiseMarkdown(content).split('\n').map((line, index) => {
    if (/^#{1,3}\s+/.test(line)) { const level = line.match(/^#+/)[0].length; return <Text key={index} style={[styles.heading, level === 1 && styles.headingOne, level === 2 && styles.headingTwo]}><Inline value={line.replace(/^#+\s+/, '')} styles={styles} /></Text>; }
    if (/^\s*[-*+]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) return <View key={index} style={styles.listRow}><Text style={styles.bullet}>{/^\s*\d+\./.test(line) ? line.match(/^\s*\d+\./)[0] : '•'}</Text><View style={styles.listContent}><Inline value={line.replace(/^\s*(?:[-*+]|\d+\.)\s+/, '')} styles={styles} /></View></View>;
    if (!line.trim()) return <View key={index} style={styles.spacer} />;
    return <Inline key={index} value={line} styles={styles} />;
  })}</View>;
}

function CodeBlock({ block, styles }) {
  const [wrapped, setWrapped] = useState(false);
  const [copied, setCopied] = useState(false);
  const copy = async () => { await Clipboard.setStringAsync(block.content); setCopied(true); setTimeout(() => setCopied(false), 1400); };
  const code = <Text style={[styles.codeText, wrapped && styles.codeWrap]}>{block.content}</Text>;
  return <View style={styles.codeBlock}><View style={styles.codeHeader}><Text style={styles.codeLang}>{block.language.toUpperCase()}</Text><View style={styles.codeActions}><TouchableOpacity style={styles.codeAction} onPress={() => setWrapped((value) => !value)} accessibilityRole="button" accessibilityLabel={wrapped ? 'Disable code wrapping' : 'Enable code wrapping'}><Text style={styles.codeActionText}>{wrapped ? 'No wrap' : 'Wrap'}</Text></TouchableOpacity><TouchableOpacity style={styles.codeAction} onPress={copy} accessibilityRole="button" accessibilityLabel="Copy code block"><Text style={styles.codeActionText}>{copied ? 'Copied' : 'Copy'}</Text></TouchableOpacity></View></View>{wrapped ? code : <ScrollView horizontal showsHorizontalScrollIndicator={false}>{code}</ScrollView>}</View>;
}

export default function FormattedText({ text, baseStyle, palette }) {
  const styles = useMemo(() => createStyles(palette), [palette]);
  if (!text) return null;
  return <View>{parseMarkdownBlocks(text).map((block, index) => block.type === 'code' ? <CodeBlock key={index} block={block} styles={styles} /> : <View key={index} style={baseStyle}><TextBlock content={block.content} styles={styles} /></View>)}</View>;
}

const createStyles = (colors) => StyleSheet.create({
  body: { fontSize: 14, lineHeight: 20, color: colors.textSecondary }, bold: { fontWeight: '700', color: colors.textPrimary }, italic: { fontStyle: 'italic' }, link: { color: colors.cyanBright, textDecorationLine: 'underline' }, heading: { marginTop: 8, marginBottom: 4, color: colors.textPrimary, fontWeight: '700' }, headingOne: { fontSize: 20 }, headingTwo: { fontSize: 17 }, listRow: { flexDirection: 'row', gap: 7, paddingLeft: 2 }, bullet: { color: colors.cyanBright, minWidth: 18, lineHeight: 20 }, listContent: { flex: 1 }, spacer: { height: 7 }, codeBlock: { marginVertical: 8, borderRadius: radii.md, overflow: 'hidden', backgroundColor: colors.black, borderWidth: 1, borderColor: colors.border }, codeHeader: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.panelAlt, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: colors.border }, codeLang: { fontSize: 10, fontWeight: '700', color: colors.textFaint, letterSpacing: 1 }, codeActions: { flexDirection: 'row', gap: 2 }, codeAction: { minHeight: 40, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' }, codeActionText: { color: colors.cyanBright, fontWeight: '700', fontSize: 10 }, codeText: { padding: 12, fontFamily: 'monospace', fontSize: 12, color: colors.textSecondary, lineHeight: 18 }, codeWrap: { flexShrink: 1 },
});
