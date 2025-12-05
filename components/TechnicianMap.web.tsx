import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius } from '@/constants/theme';
import { User } from '@/types';

interface TechnicianMapProps {
  technicians: User[];
  initialRegion: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  onMarkerPress: (tech: User) => void;
  onCallTech: (phone?: string | null) => void;
  mapRef: React.RefObject<any>;
  onlineTechnicians: User[];
  offlineTechnicians: User[];
}

export function TechnicianMap({
  onlineTechnicians,
  offlineTechnicians,
}: TechnicianMapProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.primaryLight }]}>
      <View style={styles.iconContainer}>
        <Feather name="map" size={24} color={colors.primary} />
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: colors.primary }]}>
          Mappa Tecnici
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          La mappa interattiva e disponibile solo nell'app mobile.
        </Text>
      </View>
      <View style={styles.statsContainer}>
        <View style={[styles.statBadge, { backgroundColor: '#4CAF5020' }]}>
          <View style={[styles.statDot, { backgroundColor: '#4CAF50' }]} />
          <Text style={[styles.statText, { color: '#4CAF50' }]}>
            {onlineTechnicians.length} Online
          </Text>
        </View>
        <View style={[styles.statBadge, { backgroundColor: '#9E9E9E20' }]}>
          <View style={[styles.statDot, { backgroundColor: '#9E9E9E' }]} />
          <Text style={[styles.statText, { color: '#9E9E9E' }]}>
            {offlineTechnicians.length} Offline
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  iconContainer: {
    marginRight: Spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default TechnicianMap;
