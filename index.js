import React, { useCallback, useEffect, useState } from 'react';
import { registerRootComponent } from 'expo';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppErrorBoundary from './src/components/AppErrorBoundary';
import { loadApplicationModule } from './src/startup/appLoader.mjs';

// Keep native splash until the first frame of the real app — or the recovery shell — is ready.
SplashScreen.preventAutoHideAsync().catch(() => {});

function ModuleRecoveryShell({ message, onRetry }) {
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.card} accessibilityRole="alert">
        <Text style={styles.title}>Command Centre could not start safely.</Text>
        <Text style={styles.body}>
          {message || 'The application module failed to load. Your saved data has not been cleared.'}
        </Text>
        <TouchableOpacity style={styles.button} onPress={onRetry} accessibilityRole="button" accessibilityLabel="Retry Command Centre">
          <Text style={styles.buttonText}>Retry Command Centre</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function Root() {
  const [ready, setReady] = useState({ status: 'LOADING', component: null, error: '' });

  const load = useCallback(() => {
    setReady({ status: 'LOADING', component: null, error: '' });
    void loadApplicationModule(async () => require('./App')).then((result) => {
      if (result.ok) setReady({ status: 'READY', component: result.component, error: '' });
      else setReady({ status: 'UNAVAILABLE', component: null, error: result.error });
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (ready.status === 'LOADING') return;
    SplashScreen.hideAsync().catch(() => {});
  }, [ready.status]);

  let body = null;
  if (ready.status === 'READY' && ready.component) {
    const LoadedApp = ready.component;
    body = <LoadedApp />;
  } else if (ready.status !== 'LOADING') {
    body = <ModuleRecoveryShell message={ready.error} onRetry={load} />;
  }

  return (
    <SafeAreaProvider>
      <AppErrorBoundary>
        {body}
      </AppErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc', justifyContent: 'center', padding: 20 },
  card: { borderRadius: 18, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#ffffff', padding: 20 },
  title: { color: '#0f172a', fontSize: 20, fontWeight: '800', marginBottom: 10 },
  body: { color: '#475569', fontSize: 14, lineHeight: 21, marginBottom: 18 },
  button: { minHeight: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f819c', paddingHorizontal: 18 },
  buttonText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
});

registerRootComponent(Root);
