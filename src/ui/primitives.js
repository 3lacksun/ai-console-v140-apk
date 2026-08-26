import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, findNodeHandle, Modal, StyleSheet, Text, TextInput, TouchableOpacity, Vibration, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconClose, IconSearch, IconChevronUp, IconChevronDown } from '../components/Icons';
import { radii } from '../theme';
import { uiTokens } from './tokens';

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => live && setReduced(Boolean(v)));
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { live = false; sub?.remove?.(); };
  }, []);
  return reduced;
}

export function useModalAccessibilityFocus(visible, returnFocusRef = null) {
  const focusRef = useRef(null);
  const wasVisible = useRef(false);
  useEffect(() => {
    const focus = (target) => {
      const node = findNodeHandle(target);
      if (node && typeof AccessibilityInfo.setAccessibilityFocus === 'function') requestAnimationFrame(() => AccessibilityInfo.setAccessibilityFocus(node));
    };
    if (visible) { wasVisible.current = true; focus(focusRef.current); }
    else if (wasVisible.current) { wasVisible.current = false; focus(returnFocusRef?.current); }
  }, [visible, returnFocusRef]);
  return focusRef;
}

export function triggerHaptic(enabled = true) {
  if (enabled) Vibration.vibrate(12);
}

export const FeedbackBanner = ({ message, tone = 'info', onClose, actionLabel, onAction, palette }) => {
  const s = useMemo(() => styles(palette), [palette]);
  if (!message) return null;
  return (
    <View style={[s.banner, tone === 'error' && s.bannerError]} accessibilityRole="alert" accessibilityLiveRegion="assertive">
      <Text style={s.bannerText}>{message}</Text>
      {actionLabel && onAction ? (
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={actionLabel} onPress={onAction} style={s.bannerAction}>
          <Text style={s.bannerActionText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
      {onClose && (
        <IconButton label="Dismiss message" onPress={onClose} palette={palette}>
          <IconClose size={16} color="#fff" />
        </IconButton>
      )}
    </View>
  );
};

export const Button = ({ label, onPress, disabled = false, palette, kind = 'secondary' }) => {
  const s = styles(palette);
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={[s.button, kind === 'primary' && s.primary, disabled && s.disabled]}
    >
      <Text style={[s.buttonText, kind === 'primary' && s.primaryText]}>{label}</Text>
    </TouchableOpacity>
  );
};

export const IconButton = ({ label, onPress, children, palette, disabled = false }) => {
  const s = styles(palette);
  return (
    <TouchableOpacity style={s.iconButton} onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }}>
      {children}
    </TouchableOpacity>
  );
};

export const TextField = ({ label, value, onChangeText, multiline = false, palette, ...props }) => {
  const s = styles(palette);
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} multiline={multiline} style={[s.input, multiline && s.multiline]} placeholderTextColor={palette.textFaint} accessibilityLabel={label} {...props} />
    </View>
  );
};

export const SearchField = ({ value, onChangeText, palette, placeholder = 'Search' }) => {
  const s = styles(palette);
  return (
    <View style={s.search}>
      <IconSearch size={17} color={palette.textMuted} />
      <TextInput style={s.searchInput} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={palette.textFaint} accessibilityLabel={placeholder} />
    </View>
  );
};

export const Card = ({ children, palette, style }) => <View style={[styles(palette).card, style]}>{children}</View>;

export const ListRow = ({ title, detail, onPress, palette, selected = false }) => {
  const s = styles(palette);
  return (
    <TouchableOpacity style={[s.listRow, selected && s.selected]} onPress={onPress} accessibilityRole="button" accessibilityState={{ selected }}>
      <View style={{ flex: 1 }}>
        <Text style={s.rowTitle}>{title}</Text>
        {detail ? <Text style={s.rowDetail}>{detail}</Text> : null}
      </View>
    </TouchableOpacity>
  );
};

export const Chip = ({ label, selected, onPress, palette, accessibilityLabel = label, accessibilityHint }) => {
  const s = styles(palette);
  return (
    <TouchableOpacity
      style={[s.chip, selected && s.chipSelected]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ selected }}
    >
      <Text style={[s.chipText, selected && s.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
};

export const AppBar = ({ title, subtitle, actions, palette, titleRef }) => {
  const s = styles(palette);
  return (
    <View style={s.appBar}>
      <View style={{ flex: 1 }}>
        <Text ref={titleRef} accessible accessibilityRole="header" style={s.appBarTitle}>{title}</Text>
        {subtitle ? <Text style={s.rowDetail}>{subtitle}</Text> : null}
      </View>
      <View style={s.actions}>{actions}</View>
    </View>
  );
};

export const Dialog = ({ visible, title, children, onClose, palette, returnFocusRef }) => {
  const s = styles(palette);
  const reduced = useReducedMotion();
  const titleRef = useModalAccessibilityFocus(visible, returnFocusRef);
  return (
    <Modal visible={visible} transparent animationType={reduced ? 'none' : 'fade'} onRequestClose={onClose}>
      <View style={s.overlayCentered}>
        <View style={s.dialog} accessibilityViewIsModal accessibilityRole="summary">
          <AppBar title={title} titleRef={titleRef} palette={palette} actions={<IconButton label={`Close ${title}`} onPress={onClose} palette={palette}><IconClose color={palette.textMuted} /></IconButton>} />
          {children}
        </View>
      </View>
    </Modal>
  );
};

export const BottomActionSheet = ({ visible, title, children, onClose, palette, returnFocusRef }) => {
  const s = styles(palette);
  const reduced = useReducedMotion();
  const titleRef = useModalAccessibilityFocus(visible, returnFocusRef);
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType={reduced ? 'none' : 'slide'} onRequestClose={onClose}>
      <View style={s.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel={`Close ${title}`} />
        <View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]} accessibilityViewIsModal>
          <View style={s.sheetHandle} accessibilityElementsHidden />
          <AppBar title={title} titleRef={titleRef} palette={palette} actions={<IconButton label={`Close ${title}`} onPress={onClose} palette={palette}><IconClose color={palette.textMuted} /></IconButton>} />
          {children}
        </View>
      </View>
    </Modal>
  );
};

export const ActionRow = ({ label, detail, onPress, palette, danger = false }) => {
  const s = styles(palette);
  return (
    <TouchableOpacity style={s.actionRow} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <View style={{ flex: 1 }}>
        <Text style={[s.rowTitle, danger && { color: palette.rose }]}>{label}</Text>
        {detail ? <Text style={s.rowDetail}>{detail}</Text> : null}
      </View>
    </TouchableOpacity>
  );
};

export const EmptyState = ({ title, detail, actionLabel, onAction, icon, palette }) => {
  const s = styles(palette);
  return (
    <View style={s.empty}>
      <View style={s.emptyIconWrap}>{icon}</View>
      <Text style={s.emptyTitle}>{title}</Text>
      <Text style={s.emptyDetail}>{detail}</Text>
      {actionLabel ? <Button label={actionLabel} onPress={onAction} palette={palette} kind="primary" /> : null}
    </View>
  );
};

export const Skeleton = ({ palette }) => <View accessibilityLabel="Loading" style={styles(palette).skeleton} />;

export const Progress = ({ label, value, palette }) => {
  const s = styles(palette);
  const pct = Math.max(0, Math.min(1, Number(value) || 0));
  return (
    <View accessible accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}>
      <Text style={s.rowDetail}>{label}</Text>
      <View style={s.progressTrack}><View style={[s.progressFill, { width: `${pct * 100}%` }]} /></View>
    </View>
  );
};

export const AttachmentCard = ({ name, status, onPress, palette }) => <ListRow title={name} detail={status} onPress={onPress} palette={palette} />;
export const DocumentCard = ({ document, onPress, palette, selected }) => (
  <ListRow title={document.title || 'Untitled document'} detail={`${document.sections?.length || 0} sections · ${document.autosaveStatus || 'SAVED'}`} onPress={onPress} palette={palette} selected={selected} />
);
export const DocumentToolbar = ({ children, palette }) => <View style={styles(palette).toolbar}>{children}</View>;

export const AccessibleReorderControls = ({ label, onUp, onDown, palette, disableUp = false, disableDown = false }) => (
  <View style={styles(palette).actions}>
    <IconButton label={`Move ${label} up`} onPress={onUp} disabled={disableUp} palette={palette}><IconChevronUp color={palette.textMuted} /></IconButton>
    <IconButton label={`Move ${label} down`} onPress={onDown} disabled={disableDown} palette={palette}><IconChevronDown color={palette.textMuted} /></IconButton>
  </View>
);

export const PrimaryNavigation = ({ items, active, onSelect, palette, vertical = false }) => {
  const s = styles(palette);
  return (
    <View style={[s.nav, vertical && s.navVertical]} accessibilityRole="tablist">
      {items.map((item) => {
        const isActive = active === item.id;
        return (
          <TouchableOpacity
            key={item.id}
            style={[s.navItem, isActive && s.navActive]}
            onPress={() => onSelect(item.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={item.label}
          >
            {isActive ? <View style={s.navIndicator} /> : <View style={s.navIndicatorSpacer} />}
            {item.icon}
            <Text style={[s.navText, isActive && s.navTextActive]}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = (c) => StyleSheet.create({
  banner: {
    minHeight: 48,
    marginHorizontal: 12,
    marginTop: 8,
    paddingHorizontal: 14,
    backgroundColor: c.cyan,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radii.lg,
    elevation: 3,
    shadowColor: c.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  bannerError: { backgroundColor: c.rose },
  bannerText: { flex: 1, color: '#fff', fontSize: 12, fontWeight: '700', lineHeight: 16 },
  bannerAction: { minHeight: 48, paddingHorizontal: 12, justifyContent: 'center' },
  bannerActionText: { color: '#fff', fontWeight: '800' },

  button: {
    minHeight: uiTokens.touch.minimum,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radii.md,
    backgroundColor: c.panel,
  },
  primary: {
    backgroundColor: c.cyan,
    borderColor: c.cyan,
    elevation: 2,
    shadowColor: c.shadow,
    shadowOpacity: 0.14,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  disabled: { opacity: 0.42 },
  buttonText: { color: c.textSecondary, fontWeight: '700', fontSize: 13 },
  primaryText: { color: '#fff' },

  iconButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
  },

  field: { gap: 6 },
  label: { fontSize: 11, fontWeight: '800', color: c.textMuted, letterSpacing: 0.3, textTransform: 'uppercase' },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    color: c.textPrimary,
    backgroundColor: c.panel,
    fontSize: 15,
  },
  multiline: { minHeight: 112, textAlignVertical: 'top', paddingTop: 14 },

  search: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radii.lg,
    paddingHorizontal: 14,
    backgroundColor: c.panel,
  },
  searchInput: { flex: 1, color: c.textPrimary, fontSize: 15 },

  card: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radii.lg,
    padding: 14,
    backgroundColor: c.surfaceElevated,
    elevation: 1,
    shadowColor: c.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },

  listRow: {
    minHeight: 60,
    paddingVertical: 12,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  selected: { backgroundColor: c.cyanDim, borderRadius: radii.md },
  rowTitle: { fontSize: 14, fontWeight: '700', color: c.textPrimary },
  rowDetail: { fontSize: 11, lineHeight: 16, color: c.textMuted, marginTop: 2 },

  chip: {
    minHeight: 42,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radii.pill,
    backgroundColor: c.panel,
  },
  chipSelected: {
    backgroundColor: c.cyan,
    borderColor: c.cyan,
  },
  chipText: { fontSize: 12, fontWeight: '700', color: c.textSecondary },
  chipTextSelected: { color: '#ffffff' },

  appBar: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  appBarTitle: { fontSize: 17, fontWeight: '800', color: c.textPrimary, letterSpacing: -0.2 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: c.overlay },
  overlayCentered: { flex: 1, justifyContent: 'center', backgroundColor: c.overlay, padding: 20 },
  dialog: {
    maxHeight: '86%',
    backgroundColor: c.bg,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: c.border,
    overflow: 'hidden',
    elevation: 12,
    shadowColor: c.shadow,
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
  sheet: {
    maxHeight: '88%',
    width: '100%',
    backgroundColor: c.bg,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderWidth: 1,
    borderColor: c.border,
    overflow: 'hidden',
    elevation: 16,
    shadowColor: c.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -4 },
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.sheetHandle || c.borderLight,
    marginTop: 10,
    marginBottom: 2,
  },

  actionRow: {
    minHeight: 58,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },

  empty: { flex: 1, minHeight: 240, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 28 },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: c.cyanDim,
    borderWidth: 1,
    borderColor: c.cyanBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: c.textPrimary, letterSpacing: -0.3 },
  emptyDetail: { fontSize: 13, lineHeight: 19, color: c.textMuted, textAlign: 'center', maxWidth: 300 },

  skeleton: { height: 56, borderRadius: radii.md, backgroundColor: c.panelAlt, marginVertical: 4 },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: c.border, overflow: 'hidden', marginTop: 6 },
  progressFill: { height: 6, backgroundColor: c.cyan, borderRadius: 3 },

  toolbar: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
    backgroundColor: c.bgHeader,
  },

  nav: {
    minHeight: 64,
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    backgroundColor: c.bgHeader,
    elevation: 8,
    shadowColor: c.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -2 },
  },
  navVertical: {
    minHeight: 0,
    width: 92,
    flexDirection: 'column',
    borderTopWidth: 0,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: c.border,
    elevation: 0,
    shadowOpacity: 0,
  },
  navItem: {
    flex: 1,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingTop: 4,
  },
  navActive: { backgroundColor: c.navActive || c.cyanDim },
  navIndicator: {
    width: 22,
    height: 3,
    borderRadius: 2,
    backgroundColor: c.cyanBright,
    marginBottom: 2,
  },
  navIndicatorSpacer: { width: 22, height: 3, marginBottom: 2 },
  navText: { fontSize: 10, fontWeight: '700', color: c.textMuted },
  navTextActive: { color: c.cyanBright, fontWeight: '800' },
});
