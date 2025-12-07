import { useEffect, useRef, useCallback } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import * as Location from 'expo-location';
import { api } from '@/services/api';
import { useAuth } from '@/store/AuthContext';

const LOCATION_UPDATE_INTERVAL = 30000;

export function useLocationTracking() {
  const { user, hasValidToken } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const isTrackingRef = useRef(false);

  const updateLocation = useCallback(async () => {
    if (!hasValidToken || user?.role !== 'tecnico') {
      return;
    }

    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('[LOCATION] Permessi non concessi');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude, accuracy } = location.coords;
      console.log('[LOCATION] Posizione ottenuta:', latitude.toFixed(6), longitude.toFixed(6));

      await api.updateMyLocation(latitude, longitude, accuracy || undefined);
      console.log('[LOCATION] Posizione inviata al server');
    } catch (error) {
      console.error('[LOCATION] Errore aggiornamento:', error);
    }
  }, [hasValidToken, user?.role]);

  const startTracking = useCallback(async () => {
    if (!hasValidToken || user?.role !== 'tecnico') {
      console.log('[LOCATION] Tracking non attivo - utente non tecnico');
      return;
    }

    if (isTrackingRef.current) {
      console.log('[LOCATION] Tracking già attivo');
      return;
    }

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('[LOCATION] Permessi GPS negati');
        return;
      }

      console.log('[LOCATION] Avvio tracking ogni', LOCATION_UPDATE_INTERVAL / 1000, 'secondi');
      isTrackingRef.current = true;

      await updateLocation();

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      intervalRef.current = setInterval(updateLocation, LOCATION_UPDATE_INTERVAL);
    } catch (error) {
      console.error('[LOCATION] Errore avvio tracking:', error);
      isTrackingRef.current = false;
    }
  }, [hasValidToken, user?.role, updateLocation]);

  const stopTracking = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    isTrackingRef.current = false;
    console.log('[LOCATION] Tracking fermato');
  }, []);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextAppState;

      console.log('[LOCATION] AppState:', previousState, '->', nextAppState);

      if (nextAppState === 'active' && hasValidToken && user?.role === 'tecnico') {
        console.log('[LOCATION] App attiva - avvio/riprendo tracking');
        startTracking();
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        console.log('[LOCATION] App in background - fermo tracking');
        stopTracking();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [startTracking, stopTracking, hasValidToken, user?.role]);

  useEffect(() => {
    if (hasValidToken && user?.role === 'tecnico' && appStateRef.current === 'active') {
      startTracking();
    } else {
      stopTracking();
    }

    return () => {
      stopTracking();
    };
  }, [hasValidToken, user?.role, startTracking, stopTracking]);

  return {
    updateLocation,
    startTracking,
    stopTracking,
  };
}
