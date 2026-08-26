import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import FormattedText from './FormattedText';
import MessageActionSheet from './MessageActionSheet';
import { IconBot, IconUser, IconCopy, IconCheck, IconEdit, IconMore, IconSpeak } from './Icons';

function TypingDots({ palette }) {
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [reduceMotion, setReduceMotion] = useState(false);
  const opacities = useRef([0, 1, 2].map(() => new Animated.Value(0.3))).current;
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => mounted && setReduceMotion(Boolean(v)));
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { mounted = false; sub?.remove?.(); };
  }, []);
  useEffect(() => {
    if (reduceMotion) {
      opacities.forEach((v) => v.setValue(0.75));
      return;
    }
    const loops = opacities.map((opacity, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 140),
          Animated.timing(opacity, { toValue: 1, duration: 260, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.3, duration: 260, useNativeDriver: true }),
        ]),
      ),
    );
    loops.forEach((a) => a.start());
    return () => loops.forEach((a) => a.stop());
  }, [opacities, reduceMotion]);
  return (
    <View style={styles.dotsRow} accessibilityLabel="Assistant is generating a response" accessibilityLiveRegion="polite">
      {opacities.map((opacity, index) => (
        <Animated.View key={index} style={[styles.dot, { opacity }]} />
      ))}
    </View>
  );
}

const CompactAction = ({ label, onPress, children, palette }) => (
  <TouchableOpacity style={createStyles(palette).actionBtn} onPress={onPress} accessibilityLabel={label} accessibilityRole="button">
    {children}
    <Text style={createStyles(palette).actionText}>{label}</Text>
  </TouchableOpacity>
);

export default function MessageBubble({
  message,
  isStreamingEmpty,
  palette,
  retryAvailable = false,
  onRetry = () => {},
  onRegenerate = () => {},
  onDownload = () => {},
  onShare = () => {},
  onContinue = () => {},
  onBranch = () => {},
  onBookmark = () => {},
  onQuote = () => {},
  onEdit = () => {},
  onResubmit = () => {},
  onSpeak = () => {},
  onAddToDocument = () => {},
  onDelete = () => {},
}) {
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [copied, setCopied] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const moreRef = useRef(null);
  const isUser = message.role === 'user';
  const imageUri = message.imageUri || message.attachment?.imageUri || null;
  const handleCopy = async () => {
    await Clipboard.setStringAsync(message.content || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <>
      <TouchableOpacity activeOpacity={1} onLongPress={() => setActionsOpen(true)} delayLongPress={350} accessibilityRole="text" accessibilityHint="Long press for message actions">
        <View style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
          {!isUser && (
            <View style={styles.avatarBot} accessible={false}>
              <IconBot size={16} color="#fff" />
            </View>
          )}
          <View style={styles.column}>
            <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
              {isUser ? (
                <Text style={styles.userText}>{message.content}</Text>
              ) : isStreamingEmpty ? (
                <TypingDots palette={palette} />
              ) : (
                <>
                  {!!message.content && <FormattedText text={message.content} palette={palette} />}
                  {imageUri ? (
                    <Image
                      source={{ uri: imageUri }}
                      style={styles.msgImage}
                      resizeMode="cover"
                      accessibilityLabel="Generated or attached image"
                    />
                  ) : null}
                </>
              )}
              {isUser && imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.msgImage} resizeMode="cover" accessibilityLabel="Attached image" />
              ) : null}
            </View>
            <View style={styles.actionRow}>
              <CompactAction label={copied ? 'Copied' : 'Copy'} onPress={handleCopy} palette={palette}>
                {copied ? <IconCheck size={14} color={palette.emerald} /> : <IconCopy size={14} color={palette.textFaint} />}
              </CompactAction>
              {isUser && (
                <CompactAction label="Edit" onPress={onEdit} palette={palette}>
                  <IconEdit size={14} color={palette.textFaint} />
                </CompactAction>
              )}
              {!isUser && !!message.content && (
                <CompactAction label="Speak" onPress={onSpeak} palette={palette}>
                  <IconSpeak size={14} color={palette.cyanBright} />
                </CompactAction>
              )}
              <TouchableOpacity ref={moreRef} style={styles.actionBtn} onPress={() => setActionsOpen(true)} accessibilityLabel="More" accessibilityRole="button">
                <IconMore size={15} color={palette.textFaint} />
                <Text style={styles.actionText}>More</Text>
              </TouchableOpacity>
            </View>
          </View>
          {isUser && (
            <View style={styles.avatarUser} accessible={false}>
              <IconUser size={16} color={palette.textMuted} />
            </View>
          )}
        </View>
      </TouchableOpacity>
      <MessageActionSheet
        visible={actionsOpen}
        message={message}
        onClose={() => setActionsOpen(false)}
        palette={palette}
        onCopy={handleCopy}
        onCopyMarkdown={handleCopy}
        onQuote={onQuote}
        onEdit={onEdit}
        onResubmit={onResubmit}
        onRetry={onRetry}
        onRegenerate={onRegenerate}
        onContinue={onContinue}
        onBranch={onBranch}
        onBookmark={onBookmark}
        onSpeak={onSpeak}
        onAddToDocument={onAddToDocument}
        onShare={onShare}
        onDownload={onDownload}
        retryAvailable={retryAvailable}
        onDelete={onDelete}
        returnFocusRef={moreRef}
      />
    </>
  );
}

const createStyles = (c) =>
  StyleSheet.create({
    row: { flexDirection: 'row', width: '100%', marginBottom: 18 },
    rowUser: { justifyContent: 'flex-end' },
    rowAssistant: { justifyContent: 'flex-start' },
    column: { maxWidth: '88%' },
    avatarBot: {
      width: 34,
      height: 34,
      borderRadius: 12,
      backgroundColor: c.cyan,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
      marginTop: 2,
      elevation: 2,
      shadowColor: c.shadow,
      shadowOpacity: 0.15,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
    },
    avatarUser: {
      width: 34,
      height: 34,
      borderRadius: 12,
      backgroundColor: c.panelAlt,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 10,
      marginTop: 2,
    },
    bubble: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 13 },
    bubbleUser: {
      backgroundColor: c.userBubble || c.cyan,
      borderBottomRightRadius: 6,
      elevation: 2,
      shadowColor: c.shadow,
      shadowOpacity: 0.12,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
    },
    bubbleAssistant: {
      backgroundColor: c.assistantBubble || c.surfaceElevated,
      borderWidth: 1,
      borderColor: c.border,
      borderBottomLeftRadius: 6,
      elevation: 1,
      shadowColor: c.shadow,
      shadowOpacity: 0.05,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 },
    },
    userText: { color: c.userText, fontSize: 15, lineHeight: 22 },
    msgImage: {
      width: '100%',
      minWidth: 180,
      height: 200,
      borderRadius: 14,
      marginTop: 10,
      backgroundColor: c.panelAlt,
    },
    actionRow: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
    actionBtn: {
      minHeight: 40,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 12,
      justifyContent: 'center',
      backgroundColor: c.panel,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 999,
    },
    actionText: { fontSize: 10, fontWeight: '700', color: c.textMuted },
    dotsRow: { flexDirection: 'row', gap: 6, paddingVertical: 6, alignItems: 'center', height: 18 },
    dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: c.cyanBright },
  });
