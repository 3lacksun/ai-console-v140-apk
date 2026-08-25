import React, { useEffect } from 'react';
import { registerRootComponent } from 'expo';
import * as SplashScreen from 'expo-splash-screen';
import App from './App';
import AppErrorBoundary from './src/components/AppErrorBoundary';

// Keep native splash until the first frame of the real app is ready.
SplashScreen.preventAutoHideAsync().catch(() => {});

function Root() {
  useEffect(() => {
    // Hide as soon as the React tree mounts. Errors are caught by AppErrorBoundary.
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  );
}

registerRootComponent(Root);
