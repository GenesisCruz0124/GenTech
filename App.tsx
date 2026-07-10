import React, { useEffect, useState } from 'react';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import RootNavigator from './src/navigation/RootNavigator';
import { AppTheme } from './src/constants/theme';
import { startSyncListeners, stopSyncListeners } from './src/services/syncService';
import SplashScreen from './src/screens/SplashScreen';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    startSyncListeners();
    return stopSyncListeners;
  }, []);

  return (
    <SafeAreaProvider>
      <PaperProvider theme={AppTheme}>
        <StatusBar style="light" backgroundColor="#1565C0" />
        <RootNavigator />
        {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}
      </PaperProvider>
    </SafeAreaProvider>
  );
}
