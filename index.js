import React, { useEffect, useState } from 'react';
import { registerRootComponent } from 'expo';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import AppErrorBoundary from './src/components/AppErrorBoundary';
import { loadApplicationModule } from './src/startup/appLoader.mjs';

// Keep the native splash visible until Bootstrap has a concrete result.
SplashScreen.preventAutoHideAsync().catch(() => {});

function StartupErrorBoundary({ error, onRetry }) {
  if (!error) return null;
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.card} accessibilityRole="alert">
        <Text style={styles.title}>AI Console could not start safely.</Text>
        <Text style={styles.body}>
          Typing-first recovery remains available. Your saved data has not been cleared. Retry startup; use CI/device diagnostics if the failure returns.
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Retry AI Console startup"
        >
          <Text style={styles.buttonText}>Retry startup</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function Bootstrap() {
  const [AppComponent, setAppComponent] = useState(null);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setError(null);
    setAppComponent(null);

    void loadApplicationModule(() =>
      Promise.resolve().then(() => require('./App'))
    ).then((result) => {
      if (!active) return;
      if (result.ok) {
        setAppComponent(() => result.component);
      } else {
        setError(new Error(result.error));
      }
    });

    return () => {
      active = false;
    };
  }, [attempt]);

  // Dismiss the native splash as soon as we have either the real app or a recovery UI.
  useEffect(() => {
    if (AppComponent || error) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [AppComponent, error]);

  if (error) {
    return (
      <StartupErrorBoundary
        error={error}
        onRetry={() => setAttempt((x) => x + 1)}
      />
    );
  }

  if (!AppComponent) {
    return (
      <SafeAreaView style={styles.root}>
        <Text style={styles.loading}>Opening AI Console…</Text>
      </SafeAreaView>
    );
  }

  return (
    <AppErrorBoundary>
      <AppComponent />
    </AppErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    padding: 20,
  },
  title: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 10,
  },
  body: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 18,
  },
  button: {
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f819c',
    paddingHorizontal: 18,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  loading: {
    color: '#334155',
    fontSize: 15,
    textAlign: 'center',
  },
});

registerRootComponent(Bootstrap);
