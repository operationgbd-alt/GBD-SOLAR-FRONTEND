import React, { useMemo, useState, useRef } from 'react';
import { View, StyleSheet, Platform, Pressable, ScrollView, Linking } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useApp } from '@/store/AppContext';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { InlineBackButton } from '@/components/InlineBackButton';
import { Spacing, BorderRadius } from '@/constants/theme';
import { User } from '@/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import { TechnicianMap } from '@/components/TechnicianMap';

const ITALY_REGION = {
  latitude: 42.5,
  longitude: 12.5,
  latitudeDelta: 8,
  longitudeDelta: 8,
};

function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  
  if (minutes < 1) return 'Adesso';
  if (minutes < 60) return `${minutes} min fa`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ore fa`;
  
  const days = Math.floor(hours / 24);
  return `${days} giorni fa`;
}

function isValidCoordinate(lat: unknown, lng: unknown): boolean {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (!isFinite(lat) || !isFinite(lng)) return false;
  if (isNaN(lat) || isNaN(lng)) return false;
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;
  return true;
}

export function TechnicianMapScreen() {
  const { theme } = useTheme();
  const { users } = useApp();
  const [selectedTech, setSelectedTech] = useState<User | null>(null);
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const mapRef = useRef<any>(null);
  
  const allTechnicians = useMemo(() => {
    try {
      return (users || []).filter(u => u && u.role?.toUpperCase() === 'TECNICO');
    } catch (e) {
      console.warn('[TechnicianMapScreen] Error filtering technicians:', e);
      return [];
    }
  }, [users]);

  const techniciansWithValidLocation = useMemo(() => {
    try {
      return allTechnicians.filter(t => {
        if (!t || !t.lastLocation) return false;
        return isValidCoordinate(t.lastLocation.latitude, t.lastLocation.longitude);
      });
    } catch (e) {
      console.warn('[TechnicianMapScreen] Error filtering valid locations:', e);
      return [];
    }
  }, [allTechnicians]);
  
  const techniciansWithoutLocation = useMemo(() => {
    try {
      return allTechnicians.filter(t => {
        if (!t) return false;
        if (!t.lastLocation) return true;
        return !isValidCoordinate(t.lastLocation.latitude, t.lastLocation.longitude);
      });
    } catch (e) {
      console.warn('[TechnicianMapScreen] Error filtering no-location:', e);
      return [];
    }
  }, [allTechnicians]);
  
  const onlineTechnicians = useMemo(() => {
    try {
      return techniciansWithValidLocation.filter(t => t.lastLocation?.isOnline === true);
    } catch (e) {
      return [];
    }
  }, [techniciansWithValidLocation]);
  
  const offlineTechnicians = useMemo(() => {
    try {
      return techniciansWithValidLocation.filter(t => t.lastLocation?.isOnline !== true);
    } catch (e) {
      return [];
    }
  }, [techniciansWithValidLocation]);

  const initialRegion = useMemo(() => {
    try {
      if (techniciansWithValidLocation.length === 0) {
        return ITALY_REGION;
      }
      
      const validCoords: { lat: number; lng: number }[] = [];
      for (const t of techniciansWithValidLocation) {
        if (t.lastLocation && isValidCoordinate(t.lastLocation.latitude, t.lastLocation.longitude)) {
          validCoords.push({
            lat: Number(t.lastLocation.latitude),
            lng: Number(t.lastLocation.longitude),
          });
        }
      }
      
      if (validCoords.length === 0) {
        return ITALY_REGION;
      }
      
      const lats = validCoords.map(c => c.lat);
      const lngs = validCoords.map(c => c.lng);
      
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
      
      if (!isFinite(minLat) || !isFinite(maxLat) || !isFinite(minLng) || !isFinite(maxLng)) {
        return ITALY_REGION;
      }
      
      const centerLat = (minLat + maxLat) / 2;
      const centerLng = (minLng + maxLng) / 2;
      
      if (!isFinite(centerLat) || !isFinite(centerLng)) {
        return ITALY_REGION;
      }
      
      return {
        latitude: centerLat,
        longitude: centerLng,
        latitudeDelta: Math.max(0.05, (maxLat - minLat) * 1.5),
        longitudeDelta: Math.max(0.05, (maxLng - minLng) * 1.5),
      };
    } catch (e) {
      console.warn('[TechnicianMapScreen] Error computing region:', e);
      return ITALY_REGION;
    }
  }, [techniciansWithValidLocation]);

  const handleMarkerPress = (tech: User) => {
    setSelectedTech(tech);
  };

  const handleCallTech = (phone?: string | null) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  const handleCenterOnTech = (tech: User) => {
    if (tech.lastLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: tech.lastLocation.latitude,
        longitude: tech.lastLocation.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }, 500);
    }
  };

  const isNativeMap = Platform.OS !== 'web';

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{ paddingTop: headerHeight + Spacing.md, paddingBottom: insets.bottom + Spacing.xl, paddingHorizontal: Spacing.md }}
    >
      <InlineBackButton />
      
      <ThemedView style={[styles.header, { backgroundColor: theme.backgroundDefault }]}>
        <Feather name="map-pin" size={24} color={theme.primary} />
        <ThemedText type="h3" style={{ marginLeft: Spacing.md }}>
          Posizione Tecnici
        </ThemedText>
      </ThemedView>

      <TechnicianMap
        technicians={techniciansWithValidLocation}
        initialRegion={initialRegion}
        onMarkerPress={handleMarkerPress}
        onCallTech={handleCallTech}
        mapRef={mapRef}
        onlineTechnicians={onlineTechnicians}
        offlineTechnicians={offlineTechnicians}
      />

      {!isNativeMap ? (
        <View style={styles.legend}>
          <View style={[styles.legendItem, { backgroundColor: theme.success + '15' }]}>
            <View style={[styles.legendDotLarge, { backgroundColor: theme.success }]} />
            <ThemedText type="body" style={{ color: theme.success, fontWeight: '600' }}>
              Online ({onlineTechnicians.length})
            </ThemedText>
          </View>
          <View style={[styles.legendItem, { backgroundColor: theme.textSecondary + '15' }]}>
            <View style={[styles.legendDotLarge, { backgroundColor: theme.textSecondary }]} />
            <ThemedText type="body" style={{ color: theme.textSecondary, fontWeight: '600' }}>
              Offline ({offlineTechnicians.length})
            </ThemedText>
          </View>
          {techniciansWithoutLocation.length > 0 ? (
            <View style={[styles.legendItem, { backgroundColor: theme.secondary + '15' }]}>
              <View style={[styles.legendDotLarge, { backgroundColor: theme.secondary }]} />
              <ThemedText type="body" style={{ color: theme.secondary, fontWeight: '600' }}>
                No GPS ({techniciansWithoutLocation.length})
              </ThemedText>
            </View>
          ) : null}
        </View>
      ) : null}

      <ThemedText type="h4" style={{ marginHorizontal: Spacing.md, marginTop: Spacing.md, marginBottom: Spacing.sm }}>
        Lista Tecnici ({allTechnicians.length})
      </ThemedText>

      {allTechnicians.length === 0 ? (
        <ThemedView style={[styles.emptyState, { backgroundColor: theme.backgroundDefault }]}>
          <Feather name="users" size={48} color={theme.textTertiary} />
          <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md, textAlign: 'center' }}>
            Nessun tecnico registrato
          </ThemedText>
        </ThemedView>
      ) : null}

      {techniciansWithValidLocation.map((tech: User) => {
        const isOnline = tech.lastLocation?.isOnline;
        const isSelected = selectedTech?.id === tech.id;
        
        return (
          <Pressable
            key={tech.id}
            style={({ pressed }) => [
              styles.techCard,
              { 
                backgroundColor: theme.backgroundDefault, 
                opacity: pressed ? 0.8 : 1,
                borderLeftColor: isOnline ? theme.success : theme.textSecondary,
              }
            ]}
            onPress={() => {
              setSelectedTech(isSelected ? null : tech);
              if (!isSelected && isNativeMap) {
                handleCenterOnTech(tech);
              }
            }}
          >
            <View style={styles.techCardHeader}>
              <View style={[styles.avatar, { backgroundColor: isOnline ? theme.success + '20' : theme.primaryLight }]}>
                <ThemedText type="h4" style={{ color: isOnline ? theme.success : theme.primary }}>
                  {tech.name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                </ThemedText>
              </View>
              <View style={styles.techCardInfo}>
                <ThemedText type="h4">{tech.name}</ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  {tech.companyName}
                </ThemedText>
              </View>
              <View style={[
                styles.onlineStatus, 
                { backgroundColor: isOnline ? theme.success + '20' : theme.textSecondary + '20' }
              ]}>
                <View style={[
                  styles.statusDot, 
                  { backgroundColor: isOnline ? theme.success : theme.textSecondary }
                ]} />
                <ThemedText type="caption" style={{ color: isOnline ? theme.success : theme.textSecondary }}>
                  {isOnline ? 'Online' : 'Offline'}
                </ThemedText>
              </View>
            </View>
            
            <View style={styles.techCardLocation}>
              <Feather name="map-pin" size={14} color={theme.primary} />
              <ThemedText type="small" style={{ marginLeft: Spacing.sm, flex: 1 }}>
                {tech.lastLocation?.address || 'Posizione sconosciuta'}
              </ThemedText>
            </View>
            
            <View style={styles.techCardLocation}>
              <Feather name="clock" size={14} color={theme.textSecondary} />
              <ThemedText type="caption" style={{ marginLeft: Spacing.sm, color: theme.textSecondary }}>
                Ultimo aggiornamento: {tech.lastLocation ? formatTimeAgo(tech.lastLocation.timestamp) : 'N/D'}
              </ThemedText>
            </View>

            {isSelected ? (
              <View style={styles.actionButtons}>
                <Pressable 
                  style={[styles.actionButton, { backgroundColor: theme.primary }]}
                  onPress={() => handleCallTech(tech.phone)}
                >
                  <Feather name="phone" size={16} color={theme.buttonText} />
                  <ThemedText type="small" style={{ color: theme.buttonText, marginLeft: Spacing.xs }}>
                    Chiama
                  </ThemedText>
                </Pressable>
                {isNativeMap ? (
                  <Pressable 
                    style={[styles.actionButton, { backgroundColor: theme.primaryLight }]}
                    onPress={() => handleCenterOnTech(tech)}
                  >
                    <Feather name="navigation" size={16} color={theme.primary} />
                    <ThemedText type="small" style={{ color: theme.primary, marginLeft: Spacing.xs }}>
                      Centra Mappa
                    </ThemedText>
                  </Pressable>
                ) : (
                  <Pressable style={[styles.actionButton, { backgroundColor: theme.primaryLight }]}>
                    <Feather name="message-circle" size={16} color={theme.primary} />
                    <ThemedText type="small" style={{ color: theme.primary, marginLeft: Spacing.xs }}>
                      Messaggio
                    </ThemedText>
                  </Pressable>
                )}
              </View>
            ) : null}
          </Pressable>
        );
      })}

      {techniciansWithoutLocation.length > 0 ? (
        <View style={styles.noGpsSection}>
          <ThemedText type="h4" style={{ marginHorizontal: Spacing.md, marginBottom: Spacing.md, color: theme.secondary }}>
            Tecnici senza posizione GPS
          </ThemedText>
          {techniciansWithoutLocation.map((tech: User) => {
            const isSelected = selectedTech?.id === tech.id;
            
            return (
              <Pressable
                key={tech.id}
                style={({ pressed }) => [
                  styles.techCard,
                  { 
                    backgroundColor: theme.backgroundDefault, 
                    opacity: pressed ? 0.8 : 1,
                    borderLeftColor: theme.secondary,
                  }
                ]}
                onPress={() => setSelectedTech(isSelected ? null : tech)}
              >
                <View style={styles.techCardHeader}>
                  <View style={[styles.avatar, { backgroundColor: theme.secondary + '20' }]}>
                    <ThemedText type="h4" style={{ color: theme.secondary }}>
                      {tech.name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                    </ThemedText>
                  </View>
                  <View style={styles.techCardInfo}>
                    <ThemedText type="h4">{tech.name}</ThemedText>
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>
                      {tech.companyName}
                    </ThemedText>
                  </View>
                  <View style={[styles.onlineStatus, { backgroundColor: theme.secondary + '20' }]}>
                    <Feather name="map-pin" size={12} color={theme.secondary} />
                    <ThemedText type="caption" style={{ color: theme.secondary, marginLeft: 4 }}>
                      No GPS
                    </ThemedText>
                  </View>
                </View>
                
                <View style={styles.techCardLocation}>
                  <Feather name="alert-circle" size={14} color={theme.secondary} />
                  <ThemedText type="small" style={{ marginLeft: Spacing.sm, flex: 1, color: theme.secondary }}>
                    Posizione non ancora acquisita
                  </ThemedText>
                </View>

                {isSelected ? (
                  <View style={styles.actionButtons}>
                    <Pressable 
                      style={[styles.actionButton, { backgroundColor: theme.primary }]}
                      onPress={() => handleCallTech(tech.phone)}
                    >
                      <Feather name="phone" size={16} color={theme.buttonText} />
                      <ThemedText type="small" style={{ color: theme.buttonText, marginLeft: Spacing.xs }}>
                        Chiama
                      </ThemedText>
                    </Pressable>
                    <Pressable style={[styles.actionButton, { backgroundColor: theme.primaryLight }]}>
                      <Feather name="message-circle" size={16} color={theme.primary} />
                      <ThemedText type="small" style={{ color: theme.primary, marginLeft: Spacing.xs }}>
                        Messaggio
                      </ThemedText>
                    </Pressable>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  legendDotLarge: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: Spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing['2xl'],
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  techCard: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderLeftWidth: 4,
  },
  techCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  techCardInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  techCardLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.xs,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  noGpsSection: {
    marginTop: Spacing.lg,
  },
});
