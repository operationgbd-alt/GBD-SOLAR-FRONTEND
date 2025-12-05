import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { RouteProp, useRoute, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { ScreenFlatList } from "@/components/ScreenFlatList";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { InlineBackButton } from "@/components/InlineBackButton";
import { useTheme } from "@/hooks/useTheme";
import { useApp } from "@/store/AppContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { DashboardStackParamList } from "@/navigation/DashboardStackNavigator";
import { Intervention, InterventionStatus } from "@/types";

type CompanyInterventionsRouteProp = RouteProp<DashboardStackParamList, "CompanyInterventions">;

const STATUS_CONFIG: Record<InterventionStatus, { label: string; color: string }> = {
  assegnato: { label: 'Assegnato', color: '#FF9500' },
  appuntamento_fissato: { label: 'Appuntamento', color: '#007AFF' },
  in_corso: { label: 'In Corso', color: '#5856D6' },
  completato: { label: 'Completato', color: '#34C759' },
  chiuso: { label: 'Chiuso', color: '#8E8E93' },
};

const CATEGORY_CONFIG: Record<string, { icon: string; color: string }> = {
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

export function CompanyInterventionsScreen() {
  const route = useRoute<CompanyInterventionsRouteProp>();
  const navigation = useNavigation<NativeStackNavigationProp<DashboardStackParamList>>();
  const { theme } = useTheme();
  const { interventions } = useApp();

  const { companyId, companyName } = route.params;

  const companyInterventions = useMemo(() => {
    return interventions
      .filter((i) => i.companyId === companyId)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [interventions, companyId]);

  const activeInterventions = companyInterventions.filter(
    (i) => i.status !== 'completato' && i.status !== 'chiuso'
  );
  const completedInterventions = companyInterventions.filter(
    (i) => i.status === 'completato' || i.status === 'chiuso'
  );

  const renderInterventionCard = ({ item }: { item: Intervention }) => {
    const statusConfig = STATUS_CONFIG[item.status];
    const categoryConfig = CATEGORY_CONFIG[item.category];
    const priorityConfig = PRIORITY_CONFIG[item.priority];

    return (
      <Card 
        style={styles.card}
        onPress={() => navigation.navigate("InterventionDetail", { interventionId: item.id })}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.categoryIcon, { backgroundColor: categoryConfig.color + '20' }]}>
            <Feather name={categoryConfig.icon as any} size={18} color={categoryConfig.color} />
          </View>
          <View style={styles.cardInfo}>
            <ThemedText type="h4">{item.client.name}</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {item.number} - {item.client.city}
            </ThemedText>
          </View>
          <View style={[styles.priorityDot, { backgroundColor: priorityConfig.color }]} />
        </View>

        <ThemedText type="small" numberOfLines={2} style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
          {item.description}
        </ThemedText>

        <View style={styles.cardFooter}>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '20' }]}>
            <ThemedText type="caption" style={{ color: statusConfig.color, fontWeight: '600' }}>
              {statusConfig.label}
            </ThemedText>
          </View>
          {item.technicianName ? (
            <View style={styles.technicianInfo}>
              <Feather name="user" size={12} color={theme.textSecondary} />
              <ThemedText type="caption" style={{ color: theme.textSecondary, marginLeft: 4 }}>
                {item.technicianName}
              </ThemedText>
            </View>
          ) : (
            <View style={[styles.unassignedBadge, { backgroundColor: theme.secondary + '20' }]}>
              <ThemedText type="caption" style={{ color: theme.secondary }}>
                Non assegnato
              </ThemedText>
            </View>
          )}
        </View>
      </Card>
    );
  };

  const renderSectionHeader = (title: string, count: number) => (
    <View style={styles.sectionHeader}>
      <ThemedText type="h4">{title}</ThemedText>
      <View style={[styles.countBadge, { backgroundColor: theme.primaryLight }]}>
        <ThemedText type="caption" style={{ color: theme.primary, fontWeight: '600' }}>
          {count}
        </ThemedText>
      </View>
    </View>
  );

  const data = [
    { type: 'backButton' },
    { type: 'header', title: companyName },
    ...(activeInterventions.length > 0 ? [{ type: 'section', title: 'Attivi', count: activeInterventions.length }] : []),
    ...activeInterventions.map((i) => ({ type: 'item', data: i })),
    ...(completedInterventions.length > 0 ? [{ type: 'section', title: 'Completati', count: completedInterventions.length }] : []),
    ...completedInterventions.map((i) => ({ type: 'item', data: i })),
  ];

  return (
    <ScreenFlatList
      data={data}
      keyExtractor={(item: any, index) => item.type === 'item' ? item.data.id : `${item.type}-${index}`}
      renderItem={({ item }: { item: any }) => {
        if (item.type === 'backButton') {
          return <InlineBackButton />;
        }
        if (item.type === 'header') {
          return (
            <View style={styles.headerCard}>
              <View style={[styles.headerIcon, { backgroundColor: theme.primaryLight }]}>
                <Feather name="home" size={28} color={theme.primary} />
              </View>
              <ThemedText type="h2">{item.title}</ThemedText>
              <ThemedText type="body" style={{ color: theme.textSecondary }}>
                {companyInterventions.length} interventi totali
              </ThemedText>
            </View>
          );
        }
        if (item.type === 'section') {
          return renderSectionHeader(item.title, item.count);
        }
        return renderInterventionCard({ item: item.data });
      }}
      ListEmptyComponent={
        <View style={[styles.emptyState, { backgroundColor: theme.backgroundDefault }]}>
          <Feather name="inbox" size={48} color={theme.textTertiary} />
          <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
            Nessun intervento per questa ditta
          </ThemedText>
        </View>
      }
      contentContainerStyle={styles.listContent}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: Spacing.xl,
  },
  headerCard: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  countBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  card: {
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  priorityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.md,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
  },
  technicianInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  unassignedBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing["3xl"],
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xl,
  },
});
