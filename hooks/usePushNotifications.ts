import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { api } from '@/services/api';

const isExpoGo = Constants.executionEnvironment === 'storeClient';

if (!isExpoGo && Platform.OS !== 'web') {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (e) {
  }
}

async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === 'web') {
    console.log('[PUSH] Web platform - notifications not supported');
    return null;
  }

  if (isExpoGo) {
    console.log('[PUSH] Expo Go detected - push notifications disabled (SDK 53+ limitation)');
    return null;
  }

  const isDevice = Constants.executionEnvironment === 'standalone';
  
  if (!isDevice) {
    console.log('[PUSH] Not a standalone build - skipping push registration');
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[PUSH] Permission not granted');
      return null;
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      console.log('[PUSH] No project ID found');
      return null;
    }

    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    console.log('[PUSH] Token obtained:', token.data);

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0066CC',
      });
    }

    return token.data;
  } catch (error) {
    console.log('[PUSH] Push notifications not available');
    return null;
  }
}

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    if (isExpoGo || Platform.OS === 'web') {
      return;
    }

    try {
      const notificationSubscription = Notifications.addNotificationReceivedListener(notification => {
        console.log('[PUSH] Notification received:', notification);
        setNotification(notification);
      });
      notificationListener.current = notificationSubscription;

      const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
        console.log('[PUSH] Notification response:', response);
        const data = response.notification.request.content.data;
        if (data?.type === 'status_change' || data?.type === 'appointment_set' || data?.type === 'report_sent') {
          console.log('[PUSH] Intervention notification tapped:', data.interventionNumber);
        }
      });
      responseListener.current = responseSubscription;
    } catch (e) {
    }

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  const registerPushToken = async (): Promise<boolean> => {
    if (isExpoGo || Platform.OS === 'web') {
      return false;
    }

    try {
      const token = await registerForPushNotificationsAsync();
      if (token) {
        setExpoPushToken(token);
        
        const platform = Platform.OS;
        const response = await api.registerPushToken(token, platform);
        
        if (response.success) {
          console.log('[PUSH] Token registered on server');
          return true;
        } else {
          console.log('[PUSH] Failed to register token on server');
          return false;
        }
      }
      return false;
    } catch (error) {
      console.log('[PUSH] Push registration skipped');
      return false;
    }
  };

  const unregisterPushToken = async (): Promise<void> => {
    if (expoPushToken) {
      try {
        await api.unregisterPushToken(expoPushToken);
        setExpoPushToken(null);
        console.log('[PUSH] Token unregistered');
      } catch (error) {
        console.log('[PUSH] Token unregister skipped');
      }
    }
  };

  return {
    expoPushToken,
    notification,
    registerPushToken,
    unregisterPushToken,
  };
}
