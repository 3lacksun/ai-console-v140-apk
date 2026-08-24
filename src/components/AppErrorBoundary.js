import React from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    // Deliberately avoid echoing exception payloads into the UI or durable storage.
    // Runtime diagnostics belong in the Android/CI logcat artefact, where access is controlled.
  }

  retry = () => this.setState({ failed: false });

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.card} accessibilityRole="alert">
          <Text style={styles.title}>AI Console could not open this screen safely.</Text>
          <Text style={styles.body}>Your saved data has not been cleared. Retry the interface; if the problem returns, use the runtime diagnostic build rather than reinstalling or deleting app data.</Text>
          <TouchableOpacity style={styles.button} onPress={this.retry} accessibilityRole="button" accessibilityLabel="Retry AI Console">
            <Text style={styles.buttonText}>Retry AI Console</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc', justifyContent: 'center', padding: 20 },
  card: { borderRadius: 18, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#ffffff', padding: 20 },
  title: { color: '#0f172a', fontSize: 20, fontWeight: '800', marginBottom: 10 },
  body: { color: '#475569', fontSize: 14, lineHeight: 21, marginBottom: 18 },
  button: { minHeight: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f819c', paddingHorizontal: 18 },
  buttonText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
});
