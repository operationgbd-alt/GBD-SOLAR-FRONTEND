import React, { useState, useMemo } from "react";
import { StyleSheet, View, Pressable, ScrollView } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useHeaderHeight } from "@react-navigation/elements";
import { ThemedText } from "@/components/ThemedText";
import { InlineBackButton } from "@/components/InlineBackButton";
import { useTheme } from "@/hooks/useTheme";
import { useApp } from "@/store/AppContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { DashboardStackParamList } from "@/navigation/DashboardStackNavigator";
import { Appointment } from "@/types";

type CalendarNavProp = NativeStackNavigationProp<DashboardStackParamList, "Calendar">;

interface Props {
  navigation: CalendarNavProp;
}

const DAYS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
const MONTHS = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

export default function CalendarScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { appointments } = useApp();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (Date | null)[] = [];

    let startDay = firstDay.getDay() - 1;
    if (startDay < 0) startDay = 6;

    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  }, [currentDate]);

  const appointmentsByDate = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    appointments.forEach((apt) => {
      const dateKey = new Date(apt.date).toDateString();
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(apt);
    });
    return map;
  }, [appointments]);

  const selectedDateAppointments = useMemo(() => {
    const dateKey = selectedDate.toDateString();
    return (appointmentsByDate[dateKey] || []).sort((a, b) => a.date - b.date);
  }, [selectedDate, appointmentsByDate]);

  const goToPrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date) => {
    return date.toDateString() === selectedDate.toDateString();
  };

  const hasAppointments = (date: Date) => {
    return !!appointmentsByDate[date.toDateString()];
  };

  const getAppointmentConfig = (type: string) => {
    switch (type) {
      case "sopralluogo":
        return { color: theme.secondary, icon: "clipboard" as const, label: "Sopralluogo" };
      case "installazione":
        return { color: theme.primary, icon: "tool" as const, label: "Installazione" };
      case "manutenzione":
        return { color: theme.success, icon: "settings" as const, label: "Manutenzione" };
      case "intervento":
      default:
        return { color: theme.primary, icon: "briefcase" as const, label: "Intervento" };
    }
  };

  const renderAppointment = (item: Appointment) => {
    const config = getAppointmentConfig(item.type);
    return (
      <Pressable
        key={item.id}
        style={({ pressed }) => [
          styles.appointmentCard,
          { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.8 : 1 },
        ]}
        onPress={() => navigation.navigate("AppointmentForm", { appointment: item })}
      >
        <View
          style={[
            styles.appointmentTime,
            { backgroundColor: config.color + "20" },
          ]}
        >
          <ThemedText
            type="caption"
            style={{
              color: config.color,
              fontWeight: "600",
            }}
          >
            {new Date(item.date).toLocaleTimeString("it-IT", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </ThemedText>
        </View>
        <View style={styles.appointmentInfo}>
          <ThemedText type="h4">{item.clientName}</ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {item.address}
          </ThemedText>
          <View style={styles.appointmentTypeRow}>
            <Feather
              name={config.icon}
              size={12}
              color={theme.textSecondary}
            />
            <ThemedText type="caption" style={{ color: theme.textSecondary, marginLeft: 4 }}>
              {config.label}
            </ThemedText>
          </View>
        </View>
        <Feather name="chevron-right" size={20} color={theme.textTertiary} />
      </Pressable>
    );
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{ 
        paddingTop: headerHeight + Spacing.md,
        paddingBottom: tabBarHeight + Spacing.xl,
        paddingHorizontal: Spacing.md
      }}
      showsVerticalScrollIndicator={false}
    >
      <InlineBackButton />
      
      <View style={styles.calendarContainer}>
        <View style={styles.monthHeader}>
          <Pressable onPress={goToPrevMonth} style={styles.monthButton}>
            <Feather name="chevron-left" size={24} color={theme.primary} />
          </Pressable>
          <ThemedText type="h3">
            {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
          </ThemedText>
          <Pressable onPress={goToNextMonth} style={styles.monthButton}>
            <Feather name="chevron-right" size={24} color={theme.primary} />
          </Pressable>
        </View>

        <View style={styles.weekHeader}>
          {DAYS.map((day) => (
            <View key={day} style={styles.weekDay}>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                {day}
              </ThemedText>
            </View>
          ))}
        </View>

        <View style={styles.daysGrid}>
          {daysInMonth.map((date, index) => (
            <Pressable
              key={index}
              style={[
                styles.dayCell,
                date && isSelected(date) && { backgroundColor: theme.primary },
                date && isToday(date) && !isSelected(date) && { backgroundColor: theme.primaryLight },
              ]}
              onPress={() => date && setSelectedDate(date)}
              disabled={!date}
            >
              {date ? (
                <>
                  <ThemedText
                    type="body"
                    style={[
                      styles.dayText,
                      isSelected(date) && { color: "#FFFFFF" },
                      isToday(date) && !isSelected(date) && { color: theme.primary, fontWeight: "600" },
                    ]}
                  >
                    {date.getDate()}
                  </ThemedText>
                  {hasAppointments(date) ? (
                    <View
                      style={[
                        styles.dot,
                        { backgroundColor: isSelected(date) ? "#FFFFFF" : theme.primary },
                      ]}
                    />
                  ) : null}
                </>
              ) : null}
            </Pressable>
          ))}
        </View>
      </View>

      <View style={[styles.appointmentsSection, { backgroundColor: theme.backgroundDefault }]}>
        <View style={styles.appointmentsHeader}>
          <ThemedText type="h4">
            {selectedDate.toLocaleDateString("it-IT", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </ThemedText>
          <Pressable
            style={({ pressed }) => [
              styles.addButton,
              { backgroundColor: theme.primary, opacity: pressed ? 0.8 : 1 },
            ]}
            onPress={() => navigation.navigate("AppointmentForm", { date: selectedDate.getTime() })}
          >
            <Feather name="plus" size={20} color="#FFFFFF" />
          </Pressable>
        </View>

        {selectedDateAppointments.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="calendar" size={40} color={theme.textTertiary} />
            <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
              Nessun appuntamento
            </ThemedText>
          </View>
        ) : (
          <View>
            {selectedDateAppointments.map(renderAppointment)}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  calendarContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  monthHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  monthButton: {
    padding: Spacing.sm,
  },
  weekHeader: {
    flexDirection: "row",
    marginBottom: Spacing.sm,
  },
  weekDay: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: "14.28%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.full,
  },
  dayText: {
    textAlign: "center",
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    position: "absolute",
    bottom: 6,
  },
  appointmentsSection: {
    minHeight: 200,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  appointmentsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xl,
  },
  appointmentCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  appointmentTime: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  appointmentInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  appointmentTypeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.xs,
  },
});
