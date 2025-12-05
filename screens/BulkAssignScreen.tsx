import React, { useState, useMemo } from 'react';
import { View, StyleSheet, Pressable, Alert, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { ThemedText } from '@/components/ThemedText';
import { Card } from '@/components/Card';
import { InlineBackButton } from '@/components/InlineBackButton';
import { useTheme } from '@/hooks/useTheme';
import { useApp } from '@/store/AppContext';
import { Spacing, BorderRadius } from '@/constants/theme';
import { Intervention, InterventionCategory } from '@/types';

const CATEGORY_CONFIG: Record<InterventionCategory, { icon: string; color: string }> = {
  sopralluogo: { icon: 'search', color: '#5856D6' },
  installazione: { icon: 'tool', color: '#007AFF' },
  manutenzione: { icon: 'settings', color: '#FF9500' },
};

const PRIORITY_CONFIG: Record<string, { color: string }> = {
  bassa: { color: '#8E8E93' },
  normale: { color: '#007AFF' },
  alta: { color: '#FF9500' },
  urgente: { color: '#FF3B30' },
};

export function BulkAssignScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { unassignedInterventions, companies, bulkAssignToCompany } = useApp();

  const [selectedInterventions, setSelectedInterventions] = useState<string[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  const selectedCompany = useMemo(() => 
    companies.find(c => c.id === selectedCompanyId),
    [companies, selectedCompanyId]
  );

  const toggleIntervention = (id: string) => {
    setSelectedInterventions(prev =>
      prev.includes(id)
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedInterventions(unassignedInterventions.map(i => i.id));
  };

  const deselectAll = () => {
    setSelectedInterventions([]);
  };

  const handleAssign = () => {
    if (selectedInterventions.length === 0) {
      const msg = 'Seleziona almeno un intervento';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Attenzione', msg);
      }
      return;
    }

    if (!selectedCompanyId || !selectedCompany) {
      const msg = 'Seleziona una ditta';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Attenzione', msg);
      }
      return;
    }

    bulkAssignToCompany(selectedInterventions, selectedCompanyId, selectedCompany.name);

    const successMsg = `${selectedInterventions.length} interventi assegnati a ${selectedCompany.name}`;
    if (Platform.OS === 'web') {
      window.alert(successMsg);
    } else {
      Alert.alert('Successo', successMsg);
    }

    navigation.goBack();
  };

  const renderInterventionCard = (intervention: Intervention) => {
    const isSelected = selectedInterventions.includes(intervention.id);
    const categoryConfig = CATEGORY_CONFIG[intervention.category];
    const priorityConfig = PRIORITY_CONFIG[intervention.priority];

    return (
      <Card
        key={intervention.id}
        style={[
          styles.interventionCard,
          isSelected && { borderColor: theme.primary, borderWidth: 2 },
        ]}
        onPress={() => toggleIntervention(intervention.id)}
      >
        <View style={styles.cardRow}>
          <View style={[
            styles.checkbox,
            { borderColor: isSelected ? theme.primary : theme.border },
            isSelected && { backgroundColor: theme.primary },
          ]}>
            {isSelected ? (
              <Feather name="check" size={14} color="#FFFFFF" />
            ) : null}
          </View>

          <View style={[styles.categoryIcon, { backgroundColor: categoryConfig.color + '20' }]}>
            <Feather name={categoryConfig.icon as any} size={16} color={categoryConfig.color} />
          </View>

          <View style={styles.cardInfo}>
            <ThemedText type="h4">{intervention.client.name}</ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              {intervention.number} - {intervention.client.city}
            </ThemedText>
          </View>

          <View style={[styles.priorityDot, { backgroundColor: priorityConfig.color }]} />
        </View>
      </Card>
    );
  };

  return (
    <ScreenScrollView>
      <InlineBackButton />
      
      <View style={styles.header}>
        <ThemedText type="h2">Assegna Interventi</ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          Seleziona gli interventi e la ditta a cui assegnarli
        </ThemedText>
      </View>

      <Card style={styles.section}>
        <View style={styles.sectionHeader}>
          <ThemedText type="h4">Interventi Non Assegnati</ThemedText>
          <View style={styles.selectionBadge}>
            <ThemedText type="caption" style={{ color: theme.primary, fontWeight: '600' }}>
              {selectedInterventions.length}/{unassignedInterventions.length}
            </ThemedText>
          </View>
        </View>

        <View style={styles.selectionActions}>
          <Pressable
            style={[styles.selectionButton, { borderColor: theme.border }]}
            onPress={selectAll}
          >
            <Feather name="check-square" size={14} color={theme.primary} />
            <ThemedText type="caption" style={{ color: theme.primary }}>Seleziona tutti</ThemedText>
          </Pressable>
          <Pressable
            style={[styles.selectionButton, { borderColor: theme.border }]}
            onPress={deselectAll}
          >
            <Feather name="square" size={14} color={theme.textSecondary} />
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>Deseleziona</ThemedText>
          </Pressable>
        </View>

        {unassignedInterventions.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather name="inbox" size={32} color={theme.textTertiary} />
            <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
              Nessun intervento da assegnare
            </ThemedText>
          </View>
        ) : (
          <View style={styles.interventionsList}>
            {unassignedInterventions.map(renderInterventionCard)}
          </View>
        )}
      </Card>

      <Card style={styles.section}>
        <ThemedText type="h4" style={styles.sectionTitle}>Assegna a Ditta</ThemedText>

        <View style={styles.companyButtons}>
          {companies.map(company => (
            <Pressable
              key={company.id}
              style={[
                styles.companyButton,
                { borderColor: theme.border },
                selectedCompanyId === company.id && { backgroundColor: theme.primaryLight, borderColor: theme.primary },
              ]}
              onPress={() => setSelectedCompanyId(company.id)}
            >
              <View style={styles.companyButtonContent}>
                <Feather
                  name="home"
                  size={16}
                  color={selectedCompanyId === company.id ? theme.primary : theme.textSecondary}
                />
                <ThemedText
                  style={[
                    styles.companyButtonText,
                    selectedCompanyId === company.id && { color: theme.primary, fontWeight: '600' },
                  ]}
                >
                  {company.name}
                </ThemedText>
              </View>
              {selectedCompanyId === company.id ? (
                <Feather name="check-circle" size={20} color={theme.primary} />
              ) : null}
            </Pressable>
          ))}
        </View>
      </Card>

      <Pressable
        style={[
          styles.submitButton,
          { backgroundColor: selectedInterventions.length > 0 && selectedCompanyId ? theme.success : theme.textTertiary },
        ]}
        onPress={handleAssign}
        disabled={selectedInterventions.length === 0 || !selectedCompanyId}
      >
        <Feather name="check" size={20} color="#FFFFFF" />
        <ThemedText style={styles.submitButtonText}>
          Assegna {selectedInterventions.length} Interventi
        </ThemedText>
      </Pressable>

      <View style={{ height: Spacing.xl }} />
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    marginBottom: Spacing.lg,
  },
  selectionBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  selectionActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  selectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  interventionsList: {
    gap: Spacing.sm,
  },
  interventionCard: {
    padding: Spacing.md,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  priorityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
  },
  companyButtons: {
    gap: Spacing.sm,
  },
  companyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  companyButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  companyButtonText: {},
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
});
