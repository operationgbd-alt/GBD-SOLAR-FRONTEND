import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Appointment } from '@/types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }
  
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  return finalStatus === 'granted';
}

export async function scheduleAppointmentNotification(
  appointment: Appointment,
  minutesBefore: number
): Promise<string | null> {
  if (Platform.OS === 'web') {
    return null;
  }

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    return null;
  }

  const appointmentDate = new Date(appointment.date);
  const notificationTime = new Date(appointmentDate.getTime() - minutesBefore * 60 * 1000);

  if (notificationTime <= new Date()) {
    return null;
  }

  const typeLabels: Record<string, string> = {
    sopralluogo: 'Sopralluogo',
    installazione: 'Installazione',
    manutenzione: 'Manutenzione',
    altro: 'Appuntamento',
  };

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: `${typeLabels[appointment.type] || 'Appuntamento'} - ${appointment.clientName}`,
      body: `Tra ${minutesBefore} minuti: ${appointment.address}`,
      data: { appointmentId: appointment.id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: notificationTime,
    },
  });

  return identifier;
}

export async function cancelNotificationByAppointmentId(notificationId: string): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }
  
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.warn('Error cancelling notification:', error);
  }
}

export async function cancelAllNotifications(): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }
  
  await Notifications.cancelAllScheduledNotificationsAsync();
}
