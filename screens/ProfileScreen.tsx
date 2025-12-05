import React from "react";
import { StyleSheet, View, Pressable, Alert, Switch, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { reloadAppAsync } from "expo";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/store/AuthContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { ProfileStackParamList } from "@/navigation/ProfileStackNavigator";

type ProfileScreenNavigationProp = NativeStackNavigationProp<ProfileStackParamList, 'Profile'>;

const getRoleLabel = (role: string) => {
  switch (role?.toLowerCase()) {
    case 'master':
      return 'Amministratore';
    case 'ditta':
      return 'Ditta Installatrice';
    case 'tecnico':
      return 'Tecnico';
    default:
      return role;
  }
};

export default function ProfileScreen() {
  const { theme } = useTheme();
  const { user, logout } = useAuth();
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  
  const isMaster = user?.role?.toUpperCase() === 'MASTER';
  const isDitta = user?.role?.toUpperCase() === 'DITTA';

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm("Sei sicuro di voler uscire da SolarTech?")) {
        logout();
      }
    } else {
      Alert.alert("Esci", "Sei sicuro di voler uscire da SolarTech?", [
        { text: "Annulla", style: "cancel" },
        {
          text: "Esci",
          style: "destructive",
          onPress: () => {
            logout();
          },
        },
      ]);
    }
  };

  const handleClearCache = async () => {
    const clearData = async () => {
      try {
        await AsyncStorage.multiRemove([
          '@solartech_companies',
          '@solartech_users', 
          '@solartech_interventions',
          '@solartech_registered_users',
        ]);
        if (Platform.OS === 'web') {
          window.location.reload();
        } else {
          await reloadAppAsync();
        }
      } catch (error) {
        console.error('Error clearing cache:', error);
        Alert.alert("Errore", "Impossibile pulire la cache");
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm("Questo elimina tutti i dati locali e ricarica l'app. Continuare?")) {
        clearData();
      }
    } else {
      Alert.alert(
        "Pulisci Cache",
        "Questo elimina tutti i dati locali e ricarica l'app. I dati sul server non verranno modificati.",
        [
          { text: "Annulla", style: "cancel" },
          { text: "Pulisci", style: "destructive", onPress: clearData },
        ]
      );
    }
  };

  const renderSettingItem = (
    icon: string,
    title: string,
    subtitle?: string,
    rightElement?: React.ReactNode,
    onPress?: () => void,
    danger?: boolean
  ) => (
    <Pressable
      style={({ pressed }) => [
        styles.settingItem,
        { backgroundColor: theme.backgroundDefault, opacity: pressed && onPress ? 0.8 : 1 },
      ]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View
        style={[
          styles.settingIcon,
          { backgroundColor: danger ? theme.danger + "20" : theme.primaryLight },
        ]}
      >
        <Feather name={icon as any} size={18} color={danger ? theme.danger : theme.primary} />
      </View>
      <View style={styles.settingContent}>
        <ThemedText type="body" style={danger ? { color: theme.danger } : undefined}>
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      {rightElement ? (
        rightElement
      ) : onPress ? (
        <Feather name="chevron-right" size={20} color={theme.textTertiary} />
      ) : null}
    </Pressable>
  );

  return (
    <ScreenScrollView>
      <View style={[styles.profileCard, { backgroundColor: theme.backgroundDefault }]}>
        <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
          <ThemedText style={styles.avatarText}>
            {user?.name.split(" ").map((n) => n[0]).join("")}
          </ThemedText>
        </View>
        <ThemedText type="h2" style={styles.name}>
          {user?.name}
        </ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {user?.email}
        </ThemedText>
        <View style={[styles.roleBadge, { backgroundColor: isMaster ? theme.danger + '20' : isDitta ? theme.secondary + '20' : theme.primaryLight }]}>
          <Feather 
            name={isMaster ? 'shield' : isDitta ? 'home' : 'tool'} 
            size={14} 
            color={isMaster ? theme.danger : isDitta ? theme.secondary : theme.primary} 
          />
          <ThemedText type="caption" style={{ color: isMaster ? theme.danger : isDitta ? theme.secondary : theme.primary, marginLeft: Spacing.xs }}>
            {getRoleLabel(user?.role || '')}
          </ThemedText>
        </View>
        {user?.companyName ? (
          <View style={[styles.badge, { backgroundColor: theme.primaryLight }]}>
            <Feather name="briefcase" size={14} color={theme.primary} />
            <ThemedText type="caption" style={{ color: theme.primary, marginLeft: Spacing.xs }}>
              {user.companyName}
            </ThemedText>
          </View>
        ) : null}
      </View>

      {isMaster ? (
        <View style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Gestione Sistema
          </ThemedText>
          <View style={styles.settingGroup}>
            {renderSettingItem(
              "home",
              "Gestione Ditte",
              "Crea e modifica aziende installatrici",
              undefined,
              () => navigation.navigate('ManageCompanies', { origin: 'Profile' })
            )}
            {renderSettingItem(
              "users",
              "Gestione Utenti",
              "Crea tecnici e account ditta",
              undefined,
              () => navigation.navigate('ManageUsers', { origin: 'Profile' })
            )}
            {renderSettingItem(
              "plus-circle",
              "Nuovo Intervento",
              "Crea e assegna un intervento",
              undefined,
              () => navigation.navigate('CreateIntervention', { origin: 'Profile' })
            )}
          </View>
        </View>
      ) : null}

      {isDitta ? (
        <View style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Gestione Ditta
          </ThemedText>
          <View style={styles.settingGroup}>
            {renderSettingItem(
              "home",
              "Account Ditta",
              "Statistiche, tecnici e chiusura interventi",
              undefined,
              () => navigation.navigate('CompanyAccount', { origin: 'Profile' })
            )}
            {renderSettingItem(
              "users",
              "Gestione Tecnici",
              "Crea e modifica tecnici della tua ditta",
              undefined,
              () => navigation.navigate('ManageTechnicians', { origin: 'Profile' })
            )}
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Account
        </ThemedText>
        <View style={styles.settingGroup}>
          {renderSettingItem(
            "user",
            "Profilo",
            "Modifica i tuoi dati personali",
            undefined,
            () => Alert.alert("Info", "Funzionalita in arrivo")
          )}
          {renderSettingItem(
            "lock",
            "Sicurezza",
            "Password e autenticazione",
            undefined,
            () => Alert.alert("Info", "Funzionalita in arrivo")
          )}
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Notifiche
        </ThemedText>
        <View style={styles.settingGroup}>
          {renderSettingItem(
            "bell",
            "Notifiche Push",
            "Ricevi avvisi per appuntamenti",
            <Switch
              value={true}
              onValueChange={() => {}}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor="#FFFFFF"
            />
          )}
          {renderSettingItem(
            "volume-2",
            "Suoni",
            "Attiva suoni notifiche",
            <Switch
              value={true}
              onValueChange={() => {}}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor="#FFFFFF"
            />
          )}
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Preferenze
        </ThemedText>
        <View style={styles.settingGroup}>
          {renderSettingItem(
            "globe",
            "Lingua",
            "Italiano",
            undefined,
            () => Alert.alert("Info", "Funzionalita in arrivo")
          )}
          {renderSettingItem(
            "moon",
            "Tema",
            "Automatico",
            undefined,
            () => Alert.alert("Info", "Funzionalita in arrivo")
          )}
          {renderSettingItem(
            "trash-2",
            "Pulisci Cache",
            "Elimina dati locali e ricarica",
            undefined,
            handleClearCache,
            true
          )}
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Informazioni
        </ThemedText>
        <View style={styles.settingGroup}>
          {renderSettingItem(
            "file-text",
            "Termini di Servizio",
            undefined,
            undefined,
            () => Alert.alert("Info", "Funzionalita in arrivo")
          )}
          {renderSettingItem(
            "shield",
            "Privacy Policy",
            undefined,
            undefined,
            () => Alert.alert("Info", "Funzionalita in arrivo")
          )}
          {renderSettingItem(
            "info",
            "Versione App",
            "1.0.0"
          )}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.settingGroup}>
          {renderSettingItem(
            "log-out",
            "Esci",
            undefined,
            undefined,
            handleLogout,
            true
          )}
        </View>
      </View>

      <View style={{ height: Spacing["3xl"] }} />
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    alignItems: "center",
    padding: Spacing["2xl"],
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  avatarText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 28,
  },
  name: {
    marginBottom: Spacing.xs,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.md,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.sm,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
    marginLeft: Spacing.xs,
  },
  settingGroup: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    marginBottom: 1,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  settingContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
});
