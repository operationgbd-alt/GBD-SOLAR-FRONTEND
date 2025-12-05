import React, { useMemo, useState } from "react";
import { StyleSheet, View, Pressable, SectionList, Alert, ActivityIndicator } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp, useRoute } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { useApp } from "@/store/AppContext";
import { useAuth } from "@/store/AuthContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { Intervention, InterventionStatus, InterventionCategory } from "@/types";
import { InterventionsStackParamList } from "@/navigation/InterventionsStackNavigator";
import { api } from "@/services/api";

type InterventionsListNavProp = NativeStackNavigationProp<InterventionsStackParamList, "InterventionsList">;
type InterventionsListRouteProp = RouteProp<InterventionsStackParamList, "InterventionsList">;

interface Props {
  navigation: InterventionsListNavProp;
}

const STATUS_CONFIG: Record<InterventionStatus, { label: string; color: string; icon: string }> = {
  assegnato: { label: 'Assegnato', color: '#FF9500', icon: 'inbox' },
  appuntamento_fissato: { label: 'Appuntamento', color: '#007AFF', icon: 'calendar' },
  in_corso: { label: 'In Corso', color: '#5856D6', icon: 'play-circle' },
  completato: { label: 'Completato', color: '#34C759', icon: 'check-circle' },
  chiuso: { label: 'Chiuso', color: '#8E8E93', icon: 'lock' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  bassa: { label: 'Bassa', color: '#8E8E93' },
  normale: { label: 'Normale', color: '#007AFF' },
  alta: { label: 'Alta', color: '#FF9500' },
  urgente: { label: 'Urgente', color: '#FF3B30' },
};

const CATEGORY_CONFIG: Record<InterventionCategory, { label: string; icon: string; color: string }> = {
  sopralluogo: { label: 'Sopralluoghi', icon: 'search', color: '#5856D6' },
  installazione: { label: 'Installazioni', icon: 'tool', color: '#007AFF' },
  manutenzione: { label: 'Manutenzioni', icon: 'settings', color: '#FF9500' },
};

interface SectionData {
  title: string;
  category: InterventionCategory;
  icon: string;
  color: string;
  data: Intervention[];
}

const STATUS_LABELS: Record<InterventionStatus, string> = {
  assegnato: 'Nuovi',
  appuntamento_fissato: 'Programmati',
  in_corso: 'In Corso',
  completato: 'Completati',
  chiuso: 'Chiusi',
};

export default function InterventionsListScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { interventions, deleteIntervention, refreshFromServer, isRefreshing } = useApp();
  const { user, hasValidToken } = useAuth();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const route = useRoute<InterventionsListRouteProp>();
  
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  
  const isMaster = user?.role?.toLowerCase() === 'master';
  
  const paddingTop = headerHeight + Spacing.md;
  const paddingBottom = tabBarHeight + Spacing.xl;
  
  const filterStatus = route.params?.filterStatus;

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    const allIds = new Set<string>();
    sections.forEach(section => {
      section.data.forEach(item => allIds.add(item.id));
    });
    setSelectedIds(allIds);
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;

    if (!hasValidToken) {
      Alert.alert(
        'Modalità Offline',
        'L\'eliminazione degli interventi richiede una connessione al server.\n\nEffettua il logout e accedi nuovamente con connessione internet attiva.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Conferma Eliminazione',
      `Sei sicuro di voler eliminare ${selectedIds.size} intervento/i?\n\nQuesta azione non può essere annullata.`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            let successCount = 0;
            let errorCount = 0;

            const errors: string[] = [];
            
            for (const id of selectedIds) {
              try {
                console.log('[DELETE] Attempting to delete intervention:', id);
                const response = await api.deleteIntervention(id);
                console.log('[DELETE] Response:', response.success, response.error);
                
                if (response.success) {
                  deleteIntervention(id);
                  successCount++;
                } else {
                  errorCount++;
                  errors.push(response.error || 'Errore sconosciuto');
                }
              } catch (error) {
                console.error('[DELETE] Exception:', error);
                errorCount++;
                errors.push(error instanceof Error ? error.message : 'Errore di rete');
              }
            }

            setIsDeleting(false);
            exitSelectionMode();

            if (errorCount === 0) {
              Alert.alert('Successo', `${successCount} intervento/i eliminato/i con successo.`);
            } else {
              const uniqueErrors = [...new Set(errors)];
              Alert.alert(
                'Eliminazione Parziale',
                `Eliminati: ${successCount}\nErrori: ${errorCount}\n\n${uniqueErrors.join('\n')}`
              );
            }
          },
        },
      ]
    );
  };

  const sections = useMemo(() => {
    const categories: InterventionCategory[] = ['sopralluogo', 'installazione', 'manutenzione'];
    
    return categories.map(category => {
      const categoryInterventions = interventions
        .filter(i => {
          if (i.category !== category) return false;
          if (i.status === 'completato' || i.status === 'chiuso') return false;
          if (filterStatus && i.status !== filterStatus) return false;
          return true;
        })
        .sort((a, b) => {
          const statusOrder: InterventionStatus[] = ['assegnato', 'appuntamento_fissato', 'in_corso', 'completato'];
          const priorityOrder = ['urgente', 'alta', 'normale', 'bassa'];
          
          const statusDiff = statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
          if (statusDiff !== 0) return statusDiff;
          
          const priorityDiff = priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority);
          if (priorityDiff !== 0) return priorityDiff;
          
          return b.assignedAt - a.assignedAt;
        });

      const config = CATEGORY_CONFIG[category];
      return {
        title: config.label,
        category,
        icon: config.icon,
        color: config.color,
        data: categoryInterventions,
      };
    });
  }, [interventions, filterStatus]);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
    });
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderSectionHeader = ({ section }: { section: SectionData }) => (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIconContainer, { backgroundColor: section.color + '15' }]}>
        <Feather name={section.icon as any} size={20} color={section.color} />
      </View>
      <ThemedText type="h2" style={styles.sectionTitle}>
        {section.title}
      </ThemedText>
      <View style={[styles.countBadge, { backgroundColor: section.color + '20' }]}>
        <ThemedText type="caption" style={{ color: section.color, fontWeight: '600' }}>
          {section.data.length}
        </ThemedText>
      </View>
    </View>
  );

  const renderIntervention = ({ item }: { item: Intervention }) => {
    const statusConfig = STATUS_CONFIG[item.status];
    const priorityConfig = PRIORITY_CONFIG[item.priority];
    const isSelected = selectedIds.has(item.id);

    const handlePress = () => {
      if (selectionMode) {
        toggleSelection(item.id);
      } else {
        navigation.navigate('InterventionDetail', { interventionId: item.id });
      }
    };

    const handleLongPress = () => {
      if (isMaster && !selectionMode) {
        setSelectionMode(true);
        toggleSelection(item.id);
      }
    };

    return (
      <Pressable onLongPress={handleLongPress}>
        <Card 
          style={[styles.card, isSelected && { borderColor: theme.primary, borderWidth: 2 }]}
          onPress={handlePress}
        >
        <View style={styles.cardHeader}>
          {selectionMode ? (
            <Pressable 
              onPress={() => toggleSelection(item.id)}
              style={[
                styles.checkbox,
                { borderColor: theme.border },
                isSelected && { backgroundColor: theme.primary, borderColor: theme.primary }
              ]}
            >
              {isSelected ? (
                <Feather name="check" size={14} color="#FFFFFF" />
              ) : null}
            </Pressable>
          ) : null}
          <View style={[styles.numberBadge, selectionMode && { marginLeft: Spacing.sm }]}>
            <ThemedText type="caption" style={{ fontWeight: '600' }}>
              {item.number}
            </ThemedText>
          </View>
          <View style={{ flex: 1 }} />
          <View style={[styles.priorityBadge, { backgroundColor: priorityConfig.color + '20' }]}>
            <ThemedText type="caption" style={{ color: priorityConfig.color, fontWeight: '600' }}>
              {priorityConfig.label}
            </ThemedText>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.clientRow}>
            <Feather name="user" size={16} color={theme.textSecondary} />
            <ThemedText type="body" style={styles.clientName}>
              {item.client.name}
            </ThemedText>
          </View>

          <View style={styles.addressRow}>
            <Feather name="map-pin" size={14} color={theme.textTertiary} />
            <ThemedText type="caption" style={{ color: theme.textSecondary, marginLeft: Spacing.xs, flex: 1 }}>
              {item.client.address} {item.client.civicNumber}, {item.client.city}
            </ThemedText>
          </View>

          <ThemedText type="small" numberOfLines={2} style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
            {item.description}
          </ThemedText>
        </View>

        <View style={[styles.cardFooter, { borderTopColor: theme.border }]}>
          <View style={styles.statusContainer}>
            <Feather name={statusConfig.icon as any} size={14} color={statusConfig.color} />
            <ThemedText type="caption" style={{ color: statusConfig.color, marginLeft: Spacing.xs }}>
              {statusConfig.label}
            </ThemedText>
          </View>

          {item.appointment ? (
            <View style={styles.appointmentInfo}>
              <Feather name="clock" size={12} color={theme.textSecondary} />
              <ThemedText type="caption" style={{ color: theme.textSecondary, marginLeft: 4 }}>
                {formatDate(item.appointment.date)} {formatTime(item.appointment.date)}
              </ThemedText>
            </View>
          ) : (
            <ThemedText type="caption" style={{ color: theme.textTertiary }}>
              Assegnato {formatDate(item.assignedAt)}
            </ThemedText>
          )}
        </View>
      </Card>
      </Pressable>
    );
  };

  const renderSectionFooter = ({ section }: { section: SectionData }) => {
    if (section.data.length === 0) {
      return (
        <View style={styles.emptySectionState}>
          <ThemedText type="caption" style={{ color: theme.textTertiary }}>
            Nessun intervento in questa categoria
          </ThemedText>
        </View>
      );
    }
    return <View style={styles.sectionSpacer} />;
  };

  const totalInterventions = sections.reduce((acc, section) => acc + section.data.length, 0);
  const allSelected = selectedIds.size === totalInterventions && totalInterventions > 0;

  return (
    <ThemedView style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderIntervention}
        renderSectionHeader={renderSectionHeader}
        renderSectionFooter={renderSectionFooter}
        contentContainerStyle={[
          styles.listContent, 
          { paddingTop, paddingBottom: selectionMode ? paddingBottom + 70 : paddingBottom }
        ]}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
      />

      {isMaster && !selectionMode ? (
        <View style={[styles.fabContainer, { bottom: tabBarHeight + Spacing.lg + insets.bottom }]}>
          <Pressable
            style={[styles.fabButtonSmall, { backgroundColor: isRefreshing ? theme.textTertiary : theme.success }]}
            onPress={refreshFromServer}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Feather name="refresh-cw" size={20} color="#FFFFFF" />
            )}
          </Pressable>
          <Pressable
            style={[styles.fabButton, { backgroundColor: theme.primary }]}
            onPress={() => setSelectionMode(true)}
          >
            <Feather name="check-square" size={24} color="#FFFFFF" />
          </Pressable>
        </View>
      ) : null}

      {selectionMode ? (
        <View style={[styles.selectionBar, { backgroundColor: theme.backgroundSecondary, bottom: tabBarHeight }]}>
          <View style={styles.selectionInfo}>
            <Pressable onPress={exitSelectionMode} style={styles.closeButton}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
            <ThemedText type="body" style={{ marginLeft: Spacing.md }}>
              {selectedIds.size} selezionati
            </ThemedText>
          </View>
          
          <View style={styles.selectionActions}>
            <Pressable 
              onPress={allSelected ? deselectAll : selectAll}
              style={[styles.actionButton, { backgroundColor: theme.backgroundSecondary }]}
            >
              <Feather name={allSelected ? "square" : "check-square"} size={18} color={theme.text} />
              <ThemedText type="caption" style={{ marginLeft: Spacing.xs }}>
                {allSelected ? 'Deseleziona' : 'Tutti'}
              </ThemedText>
            </Pressable>

            <Pressable 
              onPress={handleDeleteSelected}
              disabled={selectedIds.size === 0 || isDeleting}
              style={[
                styles.deleteButton, 
                { backgroundColor: selectedIds.size === 0 ? theme.textTertiary : '#FF3B30' }
              ]}
            >
              <Feather name="trash-2" size={18} color="#FFFFFF" />
              <ThemedText type="caption" style={{ color: '#FFFFFF', marginLeft: Spacing.xs }}>
                Elimina
              </ThemedText>
            </Pressable>
          </View>
        </View>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    marginTop: Spacing.md,
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  countBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  card: {
    marginBottom: Spacing.md,
    padding: 0,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  numberBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  priorityBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  cardBody: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clientName: {
    fontWeight: '600',
    marginLeft: Spacing.sm,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: Spacing.xs,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appointmentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptySectionState: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  sectionSpacer: {
    height: Spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.xs,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabContainer: {
    position: 'absolute',
    right: Spacing.lg,
    flexDirection: 'column',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  fabButtonSmall: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  fabButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  selectionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  selectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeButton: {
    padding: Spacing.xs,
  },
  selectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
});
