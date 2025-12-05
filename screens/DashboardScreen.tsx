import React from "react";
import { StyleSheet, View, Pressable } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation, CommonActions } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useApp } from "@/store/AppContext";
import { useAuth } from "@/store/AuthContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { DashboardStackParamList } from "@/navigation/DashboardStackNavigator";
import { InterventionStatus } from "@/types";

type DashboardNavProp = NativeStackNavigationProp<DashboardStackParamList, "Dashboard">;

const STATUS_CONFIG: Record<InterventionStatus, { label: string; color: string }> = {
  assegnato: { label: 'Assegnato', color: '#FF9500' },
  appuntamento_fissato: { label: 'Appuntamento', color: '#007AFF' },
  in_corso: { label: 'In Corso', color: '#5856D6' },
  completato: { label: 'Completato', color: '#34C759' },
  chiuso: { label: 'Chiuso', color: '#8E8E93' },
};

const PRIORITY_CONFIG: Record<string, { color: string }> = {
  bassa: { color: '#8E8E93' },
  normale: { color: '#007AFF' },
  alta: { color: '#FF9500' },
  urgente: { color: '#FF3B30' },
};

export default function DashboardScreen() {
  const navigation = useNavigation<DashboardNavProp>();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { interventions, appointments, getGlobalStats, unassignedInterventions, users } = useApp();
  const insets = useSafeAreaInsets();

  const userRole = user?.role?.toUpperCase();
  const isMaster = userRole?.toUpperCase() === 'MASTER';
  const isDitta = userRole?.toUpperCase() === 'DITTA';
  
  const techniciansCount = users.filter(u => u.role?.toUpperCase() === 'TECNICO').length;
  const globalStats = isMaster ? { ...getGlobalStats(), totalTechnicians: techniciansCount } : null;
  
  const companyTechnicians = isDitta ? users.filter(u => u.role?.toUpperCase() === 'TECNICO' && String(u.companyId) === String(user?.companyId)) : [];
  
  const interventionsWithTechnician = isDitta ? interventions.filter(i => i.technicianId) : [];
  const interventionsWithoutTechnician = isDitta ? interventions.filter(i => !i.technicianId) : [];

  const today = new Date();
  const formattedDate = today.toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const todayStart = new Date(today.setHours(0, 0, 0, 0)).getTime();
  const todayEnd = new Date(today.setHours(23, 59, 59, 999)).getTime();

  const todayAppointments = appointments.filter(
    (a) => a.date >= todayStart && a.date <= todayEnd
  );

  const pendingInterventions = interventions.filter(
    (i) => i.status === "assegnato"
  ).length;
  
  const scheduledInterventions = interventions.filter(
    (i) => i.status === "appuntamento_fissato"
  ).length;

  const inProgressInterventions = interventions.filter(
    (i) => i.status === "in_corso"
  ).length;

  const completedInterventions = interventions.filter(
    (i) => i.status === "completato" || i.status === "chiuso"
  ).length;

  const recentInterventions = [...interventions]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 5);

  const getUserInitials = (name: string) => {
    return name.split(" ").map((n: string) => n[0]).join("");
  };

  return (
    <ScreenScrollView>
      <View style={[styles.welcomeCard, { backgroundColor: theme.backgroundDefault }]}>
        <View style={styles.welcomeHeader}>
          <View style={[styles.avatar, { backgroundColor: isMaster ? theme.danger : theme.primary }]}>
            <ThemedText style={styles.avatarText}>
              {user ? getUserInitials(user.name) : "?"}
            </ThemedText>
          </View>
          <View style={styles.welcomeText}>
            <ThemedText type="h3">Ciao, {user?.name.split(" ")[0]}</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {formattedDate}
            </ThemedText>
          </View>
        </View>
      </View>


      {isMaster && globalStats ? (
        <View style={styles.masterSection}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Panoramica Globale
          </ThemedText>
          <View style={styles.masterStatsGrid}>
            <Pressable 
              style={({ pressed }) => [
                styles.masterStatCard, 
                { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.7 : 1 }
              ]}
              onPress={() => {
                const nav = navigation.getParent() as any;
                nav?.navigate("InterventionsTab");
              }}
            >
              <Feather name="briefcase" size={24} color={theme.primary} />
              <ThemedText type="h2">{globalStats.totalInterventions}</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                Interventi Totali
              </ThemedText>
            </Pressable>
            <Pressable 
              style={({ pressed }) => [
                styles.masterStatCard, 
                { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.7 : 1 }
              ]}
              onPress={() => {
                navigation.navigate("ManageCompanies", { origin: 'DashboardTab' });
              }}
            >
              <Feather name="home" size={24} color={theme.secondary} />
              <ThemedText type="h2">{globalStats.totalCompanies}</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                Ditte
              </ThemedText>
            </Pressable>
            <Pressable 
              style={({ pressed }) => [
                styles.masterStatCard, 
                { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.7 : 1 }
              ]}
              onPress={() => navigation.navigate("TechnicianMap")}
            >
              <Feather name="users" size={24} color={theme.success} />
              <ThemedText type="h2">{globalStats.totalTechnicians}</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                Tecnici
              </ThemedText>
            </Pressable>
          </View>

          <ThemedText type="h4" style={[styles.sectionTitle, { marginTop: Spacing.lg }]}>
            Interventi per Ditta
          </ThemedText>
          {globalStats.byCompany.map((company) => (
            <Pressable
              key={company.companyId}
              style={({ pressed }) => [
                styles.companyStatRow, 
                { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.7 : 1 }
              ]}
              onPress={() => {
                navigation.navigate("CompanyInterventions", { 
                  companyId: company.companyId,
                  companyName: company.companyName 
                });
              }}
            >
              <View style={styles.companyInfo}>
                <View style={[styles.companyIcon, { backgroundColor: theme.primaryLight }]}>
                  <Feather name="home" size={16} color={theme.primary} />
                </View>
                <ThemedText type="body">{company.companyName}</ThemedText>
              </View>
              <View style={styles.companyInfoRight}>
                <View style={[styles.countBadge, { backgroundColor: theme.primaryLight }]}>
                  <ThemedText type="body" style={{ color: theme.primary, fontWeight: '600' }}>
                    {company.count}
                  </ThemedText>
                </View>
                <Feather name="chevron-right" size={18} color={theme.textTertiary} />
              </View>
            </Pressable>
          ))}

          {globalStats.unassignedCount > 0 ? (
            <Pressable
              style={({ pressed }) => [
                styles.unassignedRow,
                { backgroundColor: theme.secondary + '15', borderColor: theme.secondary, opacity: pressed ? 0.7 : 1 }
              ]}
              onPress={() => navigation.navigate("BulkAssign")}
            >
              <View style={styles.companyInfo}>
                <View style={[styles.companyIcon, { backgroundColor: theme.secondary + '30' }]}>
                  <Feather name="inbox" size={16} color={theme.secondary} />
                </View>
                <View>
                  <ThemedText type="body" style={{ fontWeight: '600' }}>
                    Interventi Non Assegnati
                  </ThemedText>
                  <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                    Da assegnare a una ditta
                  </ThemedText>
                </View>
              </View>
              <View style={styles.companyInfoRight}>
                <View style={[styles.countBadge, { backgroundColor: theme.secondary + '30' }]}>
                  <ThemedText type="body" style={{ color: theme.secondary, fontWeight: '600' }}>
                    {globalStats.unassignedCount}
                  </ThemedText>
                </View>
                <Feather name="chevron-right" size={18} color={theme.secondary} />
              </View>
            </Pressable>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.mapButton,
              { backgroundColor: theme.success + '15', borderColor: theme.success, opacity: pressed ? 0.7 : 1 }
            ]}
            onPress={() => navigation.navigate("TechnicianMap")}
          >
            <View style={styles.companyInfo}>
              <View style={[styles.companyIcon, { backgroundColor: theme.success + '30' }]}>
                <Feather name="map-pin" size={16} color={theme.success} />
              </View>
              <View>
                <ThemedText type="body" style={{ fontWeight: '600' }}>
                  Mappa Tecnici
                </ThemedText>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  Monitora posizione tecnici operativi
                </ThemedText>
              </View>
            </View>
            <View style={styles.companyInfoRight}>
              <View style={[styles.countBadge, { backgroundColor: theme.success + '30' }]}>
                <ThemedText type="body" style={{ color: theme.success, fontWeight: '600' }}>
                  {globalStats.totalTechnicians}
                </ThemedText>
              </View>
              <Feather name="chevron-right" size={18} color={theme.success} />
            </View>
          </Pressable>
        </View>
      ) : null}

      {isDitta && (
        <View style={styles.masterSection}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Gestione Ditta
          </ThemedText>
          <View style={styles.masterStatsGrid}>
            <Pressable 
              style={({ pressed }) => [
                styles.masterStatCard, 
                { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.7 : 1 }
              ]}
              onPress={() => {
                const nav = navigation.getParent() as any;
                nav?.navigate("InterventionsTab");
              }}
            >
              <Feather name="briefcase" size={24} color={theme.primary} />
              <ThemedText type="h2">{interventions.length}</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                Interventi Totali
              </ThemedText>
            </Pressable>
            <Pressable 
              style={({ pressed }) => [
                styles.masterStatCard, 
                { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.7 : 1 }
              ]}
              onPress={() => {
                navigation.navigate("ManageTechnicians", { origin: 'DashboardTab' });
              }}
            >
              <Feather name="users" size={24} color={theme.success} />
              <ThemedText type="h2">{companyTechnicians.length}</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                Tecnici
              </ThemedText>
            </Pressable>
            <Pressable 
              style={({ pressed }) => [
                styles.masterStatCard, 
                { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.7 : 1 }
              ]}
              onPress={() => {
                const nav = navigation.getParent() as any;
                nav?.navigate("InterventionsTab", {
                  screen: "InterventionsList",
                  params: { filterStatus: "completato" },
                });
              }}
            >
              <Feather name="check-circle" size={24} color="#34C759" />
              <ThemedText type="h2">{interventions.filter(i => i.status === 'completato' || i.status === 'chiuso').length}</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                Completati
              </ThemedText>
            </Pressable>
          </View>

          {interventionsWithoutTechnician.length > 0 && (
            <>
              <ThemedText type="h4" style={[styles.sectionTitle, { marginTop: Spacing.lg }]}>
                Da Assegnare ai Tecnici
              </ThemedText>
              <Pressable
                style={({ pressed }) => [
                  styles.unassignedRow,
                  { backgroundColor: theme.warning + '15', borderColor: theme.warning, opacity: pressed ? 0.7 : 1 }
                ]}
                onPress={() => {
                  const nav = navigation.getParent() as any;
                  nav?.navigate("InterventionsTab");
                }}
              >
                <View style={styles.companyInfo}>
                  <View style={[styles.companyIcon, { backgroundColor: theme.warning + '30' }]}>
                    <Feather name="alert-circle" size={16} color={theme.warning} />
                  </View>
                  <View>
                    <ThemedText type="body" style={{ fontWeight: '600' }}>
                      Interventi Senza Tecnico
                    </ThemedText>
                    <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                      Clicca per assegnare un tecnico
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.companyInfoRight}>
                  <View style={[styles.countBadge, { backgroundColor: theme.warning + '30' }]}>
                    <ThemedText type="body" style={{ color: theme.warning, fontWeight: '600' }}>
                      {interventionsWithoutTechnician.length}
                    </ThemedText>
                  </View>
                  <Feather name="chevron-right" size={18} color={theme.warning} />
                </View>
              </Pressable>
            </>
          )}

          <ThemedText type="h4" style={[styles.sectionTitle, { marginTop: Spacing.lg }]}>
            Tecnici della Ditta
          </ThemedText>
          {companyTechnicians.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.backgroundDefault }]}>
              <Feather name="users" size={32} color={theme.textTertiary} />
              <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
                Nessun tecnico registrato
              </ThemedText>
              <Pressable
                style={({ pressed }) => [
                  styles.addTechnicianButton,
                  { backgroundColor: theme.primary, opacity: pressed ? 0.8 : 1 }
                ]}
                onPress={() => navigation.navigate("ManageTechnicians", { origin: 'DashboardTab' })}
              >
                <Feather name="plus" size={16} color="#fff" />
                <ThemedText style={{ color: '#fff', marginLeft: Spacing.xs }}>
                  Aggiungi Tecnico
                </ThemedText>
              </Pressable>
            </View>
          ) : (
            companyTechnicians.map((tech) => {
              const techInterventions = interventions.filter(i => String(i.technicianId) === String(tech.id));
              const activeInterventions = techInterventions.filter(i => i.status !== 'completato' && i.status !== 'chiuso');
              return (
                <Pressable
                  key={tech.id}
                  style={({ pressed }) => [
                    styles.companyStatRow, 
                    { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.7 : 1 }
                  ]}
                  onPress={() => {
                    const nav = navigation.getParent() as any;
                    nav?.navigate("InterventionsTab", {
                      screen: "InterventionsList",
                      params: { filterTechnician: tech.id },
                    });
                  }}
                >
                  <View style={styles.companyInfo}>
                    <View style={[styles.companyIcon, { backgroundColor: theme.success + '30' }]}>
                      <ThemedText style={{ color: theme.success, fontWeight: '600', fontSize: 12 }}>
                        {getUserInitials(tech.name)}
                      </ThemedText>
                    </View>
                    <View>
                      <ThemedText type="body">{tech.name}</ThemedText>
                      <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                        {activeInterventions.length} interventi attivi
                      </ThemedText>
                    </View>
                  </View>
                  <View style={styles.companyInfoRight}>
                    <View style={[styles.countBadge, { backgroundColor: theme.primaryLight }]}>
                      <ThemedText type="body" style={{ color: theme.primary, fontWeight: '600' }}>
                        {techInterventions.length}
                      </ThemedText>
                    </View>
                    <Feather name="chevron-right" size={18} color={theme.textTertiary} />
                  </View>
                </Pressable>
              );
            })
          )}
        </View>
      )}

      <View style={styles.statsRow}>
        <Pressable
          style={({ pressed }) => [
            styles.statCard,
            { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.8 : 1 },
          ]}
          onPress={() => {
            const nav = navigation.getParent() as any;
            nav?.navigate("InterventionsTab", {
              screen: "InterventionsList",
              params: { filterStatus: "assegnato" },
            });
          }}
        >
          <View style={[styles.statIcon, { backgroundColor: '#FF9500' + "20" }]}>
            <Feather name="inbox" size={20} color="#FF9500" />
          </View>
          <ThemedText type="h2">{pendingInterventions}</ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            Nuovi
          </ThemedText>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.statCard,
            { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.8 : 1 },
          ]}
          onPress={() => {
            const nav = navigation.getParent() as any;
            nav?.navigate("InterventionsTab", {
              screen: "InterventionsList",
              params: { filterStatus: "appuntamento_fissato" },
            });
          }}
        >
          <View style={[styles.statIcon, { backgroundColor: theme.primary + "20" }]}>
            <Feather name="calendar" size={20} color={theme.primary} />
          </View>
          <ThemedText type="h2">{scheduledInterventions}</ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            Programmati
          </ThemedText>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.statCard,
            { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.8 : 1 },
          ]}
          onPress={() => {
            const nav = navigation.getParent() as any;
            nav?.navigate("InterventionsTab", {
              screen: "InterventionsList",
              params: { filterStatus: "in_corso" },
            });
          }}
        >
          <View style={[styles.statIcon, { backgroundColor: '#5856D6' + "20" }]}>
            <Feather name="play-circle" size={20} color="#5856D6" />
          </View>
          <ThemedText type="h2">{inProgressInterventions}</ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            In corso
          </ThemedText>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.statCard,
            { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.8 : 1 },
          ]}
          onPress={() => {
            const nav = navigation.getParent() as any;
            nav?.navigate("CompletedTab");
          }}
        >
          <View style={[styles.statIcon, { backgroundColor: '#34C759' + "20" }]}>
            <Feather name="check-circle" size={20} color="#34C759" />
          </View>
          <ThemedText type="h2">{completedInterventions}</ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            Completati
          </ThemedText>
        </Pressable>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <ThemedText type="h3">Appuntamenti Oggi</ThemedText>
          <Pressable
            onPress={() => navigation.navigate("Calendar")}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <Feather name="calendar" size={22} color={theme.primary} />
          </Pressable>
        </View>

        {todayAppointments.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.backgroundDefault }]}>
            <Feather name="calendar" size={32} color={theme.textTertiary} />
            <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
              Nessun appuntamento per oggi
            </ThemedText>
          </View>
        ) : (
          todayAppointments.map((appointment) => {
            const intervention = interventions.find(i => i.id === appointment.interventionId);
            const priorityColor = intervention ? PRIORITY_CONFIG[intervention.priority]?.color : theme.primary;
            
            return (
              <Pressable
                key={appointment.id}
                style={({ pressed }) => [
                  styles.appointmentCard,
                  { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.8 : 1 },
                ]}
                onPress={() => {
                  if (intervention) {
                    const nav = navigation.getParent() as any;
                    nav?.navigate("InterventionsTab", {
                      screen: "InterventionDetail",
                      params: { interventionId: intervention.id },
                    });
                  }
                }}
              >
                <View
                  style={[
                    styles.appointmentType,
                    { backgroundColor: priorityColor + "20" },
                  ]}
                >
                  <Feather name="briefcase" size={16} color={priorityColor} />
                </View>
                <View style={styles.appointmentInfo}>
                  <ThemedText type="h4">{appointment.clientName}</ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    {new Date(appointment.date).toLocaleTimeString("it-IT", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    - {appointment.address}
                  </ThemedText>
                </View>
                <Feather name="chevron-right" size={20} color={theme.textTertiary} />
              </Pressable>
            );
          })
        )}
      </View>

      <View style={styles.section}>
        <ThemedText type="h3" style={styles.sectionTitleOnly}>
          Interventi Recenti
        </ThemedText>

        {recentInterventions.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.backgroundDefault }]}>
            <Feather name="briefcase" size={32} color={theme.textTertiary} />
            <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
              Nessun intervento recente
            </ThemedText>
          </View>
        ) : (
          recentInterventions.map((intervention) => {
            const statusConfig = STATUS_CONFIG[intervention.status];

            return (
              <Pressable
                key={intervention.id}
                style={({ pressed }) => [
                  styles.activityCard,
                  { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.8 : 1 },
                ]}
                onPress={() => {
                  const nav = navigation.getParent() as any;
                  nav?.navigate("InterventionsTab", {
                    screen: "InterventionDetail",
                    params: { interventionId: intervention.id },
                  });
                }}
              >
                <View style={styles.activityLeft}>
                  <Feather name="briefcase" size={18} color={theme.textSecondary} />
                  <View style={styles.activityInfo}>
                    <ThemedText type="body">{intervention.client.name}</ThemedText>
                    <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                      {intervention.number} - {intervention.client.city}
                    </ThemedText>
                  </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + "20" }]}>
                  <ThemedText type="caption" style={{ color: statusConfig.color, fontWeight: "600" }}>
                    {statusConfig.label}
                  </ThemedText>
                </View>
              </Pressable>
            );
          })
        )}
      </View>

      <View style={{ height: Spacing["3xl"] + 80 }} />

      {isMaster ? (
        <Pressable
          style={({ pressed }) => [
            styles.fab,
            { 
              backgroundColor: theme.primary,
              bottom: insets.bottom + Spacing.xl + 60,
              opacity: pressed ? 0.8 : 1,
            }
          ]}
          onPress={() => navigation.navigate("CreateIntervention")}
        >
          <Feather name="plus" size={24} color="#FFFFFF" />
        </Pressable>
      ) : null}
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  welcomeCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  welcomeHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 18,
  },
  welcomeText: {
    marginLeft: Spacing.md,
  },
  masterSection: {
    marginBottom: Spacing.xl,
  },
  masterStatsGrid: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  masterStatCard: {
    flex: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: "center",
    gap: Spacing.xs,
  },
  companyStatRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  unassignedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  mapButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
    borderWidth: 1,
  },
  companyInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  companyIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  companyInfoRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  countBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    minWidth: 70,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: "center",
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xs,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  sectionTitleOnly: {
    marginBottom: Spacing.md,
  },
  emptyCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing["2xl"],
    alignItems: "center",
    justifyContent: "center",
  },
  addTechnicianButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
  appointmentCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  appointmentType: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  appointmentInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  activityCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  activityLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  activityInfo: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  fab: {
    position: "absolute",
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
