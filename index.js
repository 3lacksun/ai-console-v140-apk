import React, { useCallback, useState } from 'react';
import { registerRootComponent } from 'expo';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AppErrorBoundary from './src/components/AppErrorBoundary';
import { loadApplicationModule } from './src/startup/appLoader.mjs';

const BOOT_MARK = 'startup shell 24';

try {
  const errorUtils = global.ErrorUtils;
  if (errorUtils && typeof errorUtils.setGlobalHandler === 'function') {
    const previous = typeof errorUtils.getGlobalHandler === 'function' ? errorUtils.getGlobalHandler() : null;
    errorUtils.setGlobalHandler((error, isFatal) => {
      try { previous?.(error, isFatal); } catch (_) {}
    });
  }
} catch (_) {}

function BootShell({ phase, message, onOpen }) {
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.card} accessibilityRole="alert">
        <Text style={styles.kicker}>{BOOT_MARK}</Text>
        <Text style={styles.title}>
          {phase === 'fail' ? 'Command Centre could not start safely.' : "Dr Stone's Command Centre"}
        </Text>
        <Text style={styles.body}>
          {phase === 'fail'
            ? (message || 'The application module failed to load. Your saved data has not been cleared.')
            : 'Native load succeeded. If you can read this, JS is running. Tap Open to load the full app.'}
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={onOpen}
          disabled={phase === 'loading'}
          accessibilityRole="button"
          accessibilityLabel="Open Command Centre"
        >
          <Text style={styles.buttonText}>{phase === 'loading' ? 'Opening…' : 'Open Command Centre'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function Root() {
  const [phase, setPhase] = useState('boot');
  const [ready, setReady] = useState({ component: null, error: '' });

  const load = useCallback(() => {
    setPhase('loading');
    void loadApplicationModule(async () => require('./App')).then((result) => {
      if (result.ok) {
        setReady({ component: result.component, error: '' });
        setPhase('ready');
      } else {
        setReady({ component: null, error: result.error });
        setPhase('fail');
      }
    });
  }, []);

  if (phase === 'ready' && ready.component) {
    const LoadedApp = ready.component;
    return (
      <AppErrorBoundary>
        <LoadedApp />
      </AppErrorBoundary>
    );
  }

  return (
    <AppErrorBoundary>
      <BootShell phase={phase} message={ready.error} onOpen={load} />
    </AppErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc', justifyContent: 'center', padding: 20 },
  card: { borderRadius: 18, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#ffffff', padding: 20 },
  kicker: { color: '#0f819c', fontSize: 12, fontWeight: '800', letterSpacing: 0.6, marginBottom: 8 },
  title: { color: '#0f172a', fontSize: 20, fontWeight: '800', marginBottom: 10 },
  body: { color: '#475569', fontSize: 14, lineHeight: 21, marginBottom: 18 },
  button: { minHeight: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f819c', paddingHorizontal: 18 },
  buttonText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
});

registerRootComponent(Root);
