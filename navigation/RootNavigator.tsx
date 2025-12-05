import React, { useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../store/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { usePushNotifications } from '../hooks/usePushNotifications';
import MainTabNavigator from './MainTabNavigator';
import { LoginScreen } from '../screens/LoginScreen';

export default function RootNavigator() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { theme } = useTheme();
  const { registerPushToken, unregisterPushToken } = usePushNotifications();
  const hasRegisteredToken = useRef(false);

  useEffect(() => {
    if (isAuthenticated && user?.role?.toLowerCase() === 'master' && !hasRegisteredToken.current) {
      hasRegisteredToken.current = true;
      registerPushToken().then(success => {
        if (success) {
          console.log('[AUTH] Push token registered for MASTER user');
        }
      });
    }

    if (!isAuthenticated && hasRegisteredToken.current) {
      hasRegisteredToken.current = false;
      unregisterPushToken();
    }
  }, [isAuthenticated, user?.role, registerPushToken, unregisterPushToken]);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return <MainTabNavigator />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
