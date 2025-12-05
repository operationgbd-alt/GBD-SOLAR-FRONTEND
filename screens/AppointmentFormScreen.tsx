import React, { useState, useLayoutEffect } from "react";
import { StyleSheet, View, TextInput, Pressable, Alert, Platform } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { ScreenKeyboardAwareScrollView } from "@/components/ScreenKeyboardAwareScrollView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useApp } from "@/store/AppContext";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { DashboardStackParamList } from "@/navigation/DashboardStackNavigator";
import { AppointmentType, Appointment } from "@/types";
import { 
  scheduleAppointmentNotification, 
  requestNotificationPermissions, 
  cancelNotificationByAppointmentId 
} from "@/utils/notifications";

type AppointmentFormNavProp = NativeStackNavigationProp<DashboardStackParamList, "AppointmentForm">;
type AppointmentFormRouteProp = RouteProp<DashboardStackParamList, "AppointmentForm">;

interface Props {
  navigation: AppointmentFormNavProp;
  route: AppointmentFormRouteProp;
}

const NOTIFY_OPTIONS = [
  { label: "Nessuna", value: null },
  { label: "15 minuti prima", value: 15 },
  { label: "30 minuti prima", value: 30 },
  { label: "1 ora prima", value: 60 },
  { label: "1 giorno prima", value: 1440 },
];

export default function AppointmentFormScreen({ navigation, route }: Props) {
  const { theme, isDark } = useTheme();
  const { addAppointment, updateAppointment, deleteAppointment } = useApp();

  const existingAppointment = route.params?.appointment;
  const presetDate = route.params?.date;

  const [type, setType] = useState<AppointmentType>(existingAppointment?.type || "sopralluogo");
  const [clientName, setClientName] = useState(existingAppointment?.clientName || "");
  const [address, setAddress] = useState(existingAppointment?.address || "");
  const [date, setDate] = useState(
    existingAppointment?.date
      ? new Date(existingAppointment.date)
      : presetDate
      ? new Date(presetDate)
      : new Date()
  );
  const [notes, setNotes] = useState(existingAppointment?.notes || "");
  const [notifyBefore, setNotifyBefore] = useState<number | null>(
    existingAppointment?.notifyBefore ?? 30
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable onPress={() => navigation.goBack()}>
          <ThemedText type="body" style={{ color: theme.primary }}>
            Annulla
          </ThemedText>
        </Pressable>
      ),
      headerRight: () => (
        <Pressable onPress={handleSave}>
          <ThemedText type="body" style={{ color: theme.primary, fontWeight: "600" }}>
            Salva
          </ThemedText>
        </Pressable>
      ),
    });
  }, [navigation, theme, clientName, address, type, date, notes, notifyBefore]);

  const handleSave = async () => {
    if (!clientName.trim()) {
      Alert.alert("Errore", "Inserisci il nome del cliente");
      return;
    }
    if (!address.trim()) {
      Alert.alert("Errore", "Inserisci l'indirizzo");
      return;
    }

    const appointmentData = {
      type,
      clientName: clientName.trim(),
      address: address.trim(),
      date: date.getTime(),
      notes: notes.trim(),
      notifyBefore,
    };

    let appointmentId: string;
    if (existingAppointment) {
      appointmentId = existingAppointment.id;
      updateAppointment(existingAppointment.id, appointmentData);
      
      if (Platform.OS !== "web") {
        await cancelNotificationByAppointmentId(existingAppointment.id);
      }
    } else {
      appointmentId = `apt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      addAppointment({
        id: appointmentId,
        ...appointmentData,
      });
    }

    if (notifyBefore && Platform.OS !== "web") {
      const hasPermission = await requestNotificationPermissions();
      if (hasPermission) {
        const appointment: Appointment = {
          id: appointmentId,
          ...appointmentData,
        };
        await scheduleAppointmentNotification(appointment);
      } else {
        Alert.alert(
          "Notifiche disabilitate",
          "Per ricevere promemoria, abilita le notifiche nelle impostazioni del dispositivo."
        );
      }
    }

    navigation.goBack();
  };

  const handleDelete = () => {
    if (!existingAppointment) return;

    Alert.alert(
      "Elimina Appuntamento",
      "Sei sicuro di voler eliminare questo appuntamento?",
      [
        { text: "Annulla", style: "cancel" },
        {
          text: "Elimina",
          style: "destructive",
          onPress: async () => {
            if (Platform.OS !== "web") {
              await cancelNotificationByAppointmentId(existingAppointment.id);
            }
            deleteAppointment(existingAppointment.id);
            navigation.goBack();
          },
        },
      ]
    );
  };

  const inputStyle = [
    styles.input,
    {
      backgroundColor: theme.backgroundSecondary,
      color: theme.text,
    },
  ];

  return (
    <ScreenKeyboardAwareScrollView>
      <View style={styles.section}>
        <ThemedText type="small" style={styles.label}>
          Tipo
        </ThemedText>
        <View style={styles.typeRow}>
          <Pressable
            style={[
              styles.typeButton,
              {
                backgroundColor:
                  type === "sopralluogo" ? theme.secondary + "20" : theme.backgroundSecondary,
                borderColor: type === "sopralluogo" ? theme.secondary : "transparent",
                borderWidth: 2,
              },
            ]}
            onPress={() => setType("sopralluogo")}
          >
            <Feather
              name="clipboard"
              size={20}
              color={type === "sopralluogo" ? theme.secondary : theme.textSecondary}
            />
            <ThemedText
              type="small"
              style={{
                color: type === "sopralluogo" ? theme.secondary : theme.textSecondary,
                marginLeft: Spacing.sm,
              }}
            >
              Sopralluogo
            </ThemedText>
          </Pressable>

          <Pressable
            style={[
              styles.typeButton,
              {
                backgroundColor:
                  type === "installazione" ? theme.primary + "20" : theme.backgroundSecondary,
                borderColor: type === "installazione" ? theme.primary : "transparent",
                borderWidth: 2,
              },
            ]}
            onPress={() => setType("installazione")}
          >
            <Feather
              name="tool"
              size={20}
              color={type === "installazione" ? theme.primary : theme.textSecondary}
            />
            <ThemedText
              type="small"
              style={{
                color: type === "installazione" ? theme.primary : theme.textSecondary,
                marginLeft: Spacing.sm,
              }}
            >
              Installazione
            </ThemedText>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText type="small" style={styles.label}>
          Cliente
        </ThemedText>
        <TextInput
          style={inputStyle}
          value={clientName}
          onChangeText={setClientName}
          placeholder="Nome del cliente"
          placeholderTextColor={theme.textTertiary}
        />
      </View>

      <View style={styles.section}>
        <ThemedText type="small" style={styles.label}>
          Indirizzo
        </ThemedText>
        <TextInput
          style={inputStyle}
          value={address}
          onChangeText={setAddress}
          placeholder="Via, numero, citta"
          placeholderTextColor={theme.textTertiary}
        />
      </View>

      <View style={styles.section}>
        <ThemedText type="small" style={styles.label}>
          Data e Ora
        </ThemedText>
        <View style={[styles.dateDisplay, { backgroundColor: theme.backgroundSecondary }]}>
          <Feather name="calendar" size={20} color={theme.textSecondary} />
          <ThemedText style={{ marginLeft: Spacing.md }}>
            {date.toLocaleDateString("it-IT", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}{" "}
            alle{" "}
            {date.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
          </ThemedText>
        </View>
        <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
          La selezione data/ora sara disponibile nella versione completa
        </ThemedText>
      </View>

      <View style={styles.section}>
        <ThemedText type="small" style={styles.label}>
          Notifica
        </ThemedText>
        <View style={styles.notifyOptions}>
          {NOTIFY_OPTIONS.map((option) => (
            <Pressable
              key={option.label}
              style={[
                styles.notifyOption,
                {
                  backgroundColor:
                    notifyBefore === option.value ? theme.primary + "20" : theme.backgroundSecondary,
                  borderColor: notifyBefore === option.value ? theme.primary : "transparent",
                  borderWidth: 1,
                },
              ]}
              onPress={() => setNotifyBefore(option.value)}
            >
              <ThemedText
                type="caption"
                style={{
                  color: notifyBefore === option.value ? theme.primary : theme.text,
                }}
              >
                {option.label}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText type="small" style={styles.label}>
          Note
        </ThemedText>
        <TextInput
          style={[inputStyle, styles.textArea]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Note aggiuntive..."
          placeholderTextColor={theme.textTertiary}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      {existingAppointment ? (
        <Pressable
          style={({ pressed }) => [
            styles.deleteButton,
            { backgroundColor: theme.danger + "15", opacity: pressed ? 0.8 : 1 },
          ]}
          onPress={handleDelete}
        >
          <Feather name="trash-2" size={18} color={theme.danger} />
          <ThemedText style={{ color: theme.danger, marginLeft: Spacing.sm }}>
            Elimina Appuntamento
          </ThemedText>
        </Pressable>
      ) : null}

      <View style={{ height: Spacing["3xl"] }} />
    </ScreenKeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: Spacing.xl,
  },
  label: {
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  input: {
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.lg,
    fontSize: Typography.body.fontSize,
  },
  textArea: {
    height: 100,
    paddingTop: Spacing.md,
  },
  typeRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  typeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  dateDisplay: {
    flexDirection: "row",
    alignItems: "center",
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.lg,
  },
  notifyOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  notifyOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xs,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xl,
  },
});
