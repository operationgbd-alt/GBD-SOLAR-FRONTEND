import React, { useMemo } from 'react';
import { View, StyleSheet, Pressable, Alert, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { ThemedText } from '@/components/ThemedText';
import { Card } from '@/components/Card';
import { InlineBackButton } from '@/components/InlineBackButton';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/store/AuthContext';
import { useApp } from '@/store/AppContext';
import { Spacing, BorderRadius } from '@/constants/theme';
import { ProfileStackParamList } from '@/navigation/ProfileStackNavigator';
import { InterventionStatus, User } from '@/types';

type CompanyAccountNavProp = NativeStackNavigationProp<ProfileStackParamList, 'CompanyAccount'>;

const STATUS_CONFIG: Record<InterventionStatus, { label: string; icon: string; color: string }> = {
  assegnato: { label: 'Nuovi', icon: 'inbox', color: '#FF9500' },
  appuntamento_fissato: { label: 'Programmati', icon: 'calendar', color: '#007AFF' },
  in_corso: { label: 'In Corso', icon: 'play-circle', color: '#5856D6' },
  completato: { label: 'Completati', icon: 'check-circle', color: '#34C759' },
  chiuso: { label: 'Chiusi', icon: 'archive', color: '#8E8E93' },
};

export function CompanyAccountScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<CompanyAccountNavProp>();
  const { user } = useAuth();
  const { interventions, users, companies } = useApp();

  const company = useMemo(() => 
    companies.find(c => c.id === user?.companyId),
    [companies, user?.companyId]
  );

  const companyTechnicians = useMemo(() => 
    users.filter(u => u.companyId === user?.companyId && u.role?.toUpperCase() === 'TECNICO'),
    [users, user?.companyId]
  );

  const stats = useMemo(() => {
    const byStatus: Record<InterventionStatus, number> = {
      assegnato: 0,
      appuntamento_fissato: 0,
      in_corso: 0,
      completato: 0,
      chiuso: 0,
    };

    interventions.forEach(i => {
      if (byStatus[i.status] !== undefined) {
        byStatus[i.status]++;
      }
    });

    return {
      total: interventions.length,
      byStatus,
      completedNotClosed: interventions.filter(i => i.status === 'completato').length,
    };
  }, [interventions]);

  const handleCloseInterventions = () => {
    if (stats.completedNotClosed === 0) {
      const msg = 'Non ci sono interventi completati da chiudere';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Info', msg);
      }
      return;
    }

    navigation.navigate('CloseInterventions');
  };

  const renderStatCard = (status: InterventionStatus) => {
    const config = STATUS_CONFIG[status];
    const count = stats.byStatus[status];

    return (
      <View
        key={status}
        style={[styles.statCard, { backgroundColor: theme.backgroundDefault }]}
      >
        <View style={[styles.statIcon, { backgroundColor: config.color + '20' }]}>
          <Feather name={config.icon as any} size={18} color={config.color} />
        </View>
        <ThemedText type="h3" style={{ color: config.color }}>
          {count}
        </ThemedText>
        <ThemedText type="caption" style={{ color: theme.textSecondary }}>
          {config.label}
        </ThemedText>
      </View>
    );
  };

  const renderTechnicianItem = (technician: User) => (
    <View
      key={technician.id}
      style={[styles.technicianItem, { backgroundColor: theme.backgroundDefault }]}
    >
      <View style={[styles.techAvatar, { backgroundColor: theme.primaryLight }]}>
        <ThemedText style={{ color: theme.primary, fontWeight: '600' }}>
          {technician.name.split(' ').map(n => n[0]).join('')}
        </ThemedText>
      </View>
      <View style={styles.techInfo}>
        <ThemedText type="body" style={{ fontWeight: '600' }}>
          {technician.name}
        </ThemedText>
        <ThemedText type="caption" style={{ color: theme.textSecondary }}>
          {technician.email}
        </ThemedText>
      </View>
      <View style={styles.techStats}>
        <View style={[styles.techBadge, { backgroundColor: theme.primaryLight }]}>
          <Feather name="briefcase" size={12} color={theme.primary} />
          <ThemedText type="caption" style={{ color: theme.primary, marginLeft: 4 }}>
            {interventions.filter(i => i.technicianId === technician.id && i.status !== 'completato' && i.status !== 'chiuso').length}
          </ThemedText>
        </View>
      </View>
    </View>
  );

  return (
    <ScreenScrollView>
      <InlineBackButton />
      
      <Card style={styles.companyCard}>
        <View style={[styles.companyIcon, { backgroundColor: theme.secondary + '20' }]}>
          <Feather name="home" size={32} color={theme.secondary} />
        </View>
        <ThemedText type="h2" style={styles.companyName}>
          {company?.name || user?.companyName}
        </ThemedText>
        {company?.address ? (
          <View style={styles.companyDetail}>
            <Feather name="map-pin" size={14} color={theme.textSecondary} />
            <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: Spacing.xs }}>
              {company.address}
            </ThemedText>
          </View>
        ) : null}
        {company?.phone ? (
          <View style={styles.companyDetail}>
            <Feather name="phone" size={14} color={theme.textSecondary} />
            <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: Spacing.xs }}>
              {company.phone}
            </ThemedText>
          </View>
        ) : null}
        {company?.email ? (
          <View style={styles.companyDetail}>
            <Feather name="mail" size={14} color={theme.textSecondary} />
            <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: Spacing.xs }}>
              {company.email}
            </ThemedText>
          </View>
        ) : null}
      </Card>

      <View style={styles.section}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Statistiche Interventi
        </ThemedText>
        <View style={styles.statsGrid}>
          {renderStatCard('assegnato')}
          {renderStatCard('appuntamento_fissato')}
          {renderStatCard('in_corso')}
          {renderStatCard('completato')}
          {renderStatCard('chiuso')}
        </View>
        <View style={[styles.totalCard, { backgroundColor: theme.backgroundDefault }]}>
          <Feather name="layers" size={20} color={theme.primary} />
          <ThemedText type="h3" style={{ marginLeft: Spacing.md }}>
            {stats.total}
          </ThemedText>
          <ThemedText type="body" style={{ color: theme.textSecondary, marginLeft: Spacing.sm }}>
            Interventi Totali
          </ThemedText>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <ThemedText type="h4">Tecnici</ThemedText>
          <View style={[styles.countBadge, { backgroundColor: theme.primaryLight }]}>
            <ThemedText type="caption" style={{ color: theme.primary, fontWeight: '600' }}>
              {companyTechnicians.length}
            </ThemedText>
          </View>
        </View>
        {companyTechnicians.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather name="users" size={32} color={theme.textTertiary} />
            <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
              Nessun tecnico associato
            </ThemedText>
          </View>
        ) : (
          <View style={styles.techniciansList}>
            {companyTechnicians.map(renderTechnicianItem)}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Azioni
        </ThemedText>
        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            { backgroundColor: theme.success, opacity: pressed ? 0.8 : 1 },
          ]}
          onPress={handleCloseInterventions}
        >
          <Feather name="check-square" size={20} color="#FFFFFF" />
          <View style={styles.actionButtonContent}>
            <ThemedText style={styles.actionButtonText}>
              Chiudi Interventi Completati
            </ThemedText>
            <ThemedText style={styles.actionButtonSubtext}>
              {stats.completedNotClosed} interventi da chiudere
            </ThemedText>
          </View>
          <Feather name="chevron-right" size={20} color="#FFFFFF" />
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            { backgroundColor: theme.primary, opacity: pressed ? 0.8 : 1, marginTop: Spacing.md },
          ]}
          onPress={() => {
            const msg = 'Funzionalita in arrivo';
            if (Platform.OS === 'web') {
              window.alert(msg);
            } else {
              Alert.alert('Info', msg);
            }
          }}
        >
          <Feather name="file-text" size={20} color="#FFFFFF" />
          <View style={styles.actionButtonContent}>
            <ThemedText style={styles.actionButtonText}>
              Report Mensile
            </ThemedText>
            <ThemedText style={styles.actionButtonSubtext}>
              Genera report interventi del mese
            </ThemedText>
          </View>
          <Feather name="chevron-right" size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      <View style={{ height: Spacing.xl }} />
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  companyCard: {
    alignItems: 'center',
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  companyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  companyName: {
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  companyDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  countBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  statCard: {
    width: '31%',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  totalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  techniciansList: {
    gap: Spacing.sm,
  },
  technicianItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  techAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  techInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  techStats: {
    alignItems: 'flex-end',
  },
  techBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  actionButtonContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  actionButtonSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 2,
  },
});
