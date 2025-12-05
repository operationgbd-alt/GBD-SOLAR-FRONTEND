import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import DashboardScreen from "@/screens/DashboardScreen";
import CalendarScreen from "@/screens/CalendarScreen";
import AppointmentFormScreen from "@/screens/AppointmentFormScreen";
import { CompanyInterventionsScreen } from "@/screens/CompanyInterventionsScreen";
import { CreateInterventionScreen } from "@/screens/CreateInterventionScreen";
import { BulkAssignScreen } from "@/screens/BulkAssignScreen";
import { TechnicianMapScreen } from "@/screens/TechnicianMapScreen";
import InterventionDetailScreen from "@/screens/InterventionDetailScreen";
import { ManageCompaniesScreen } from "@/screens/ManageCompaniesScreen";
import { ManageUsersScreen } from "@/screens/ManageUsersScreen";
import { HeaderTitle } from "@/components/HeaderTitle";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "@/navigation/screenOptions";
import { Appointment } from "@/types";

export type DashboardStackParamList = {
  Dashboard: undefined;
  Calendar: { origin?: string };
  AppointmentForm: { appointment?: Appointment; date?: number; origin?: string };
  CompanyInterventions: { companyId: string; companyName: string; origin?: string };
  InterventionDetail: { interventionId: string; origin?: string };
  CreateIntervention: { origin?: string };
  BulkAssign: { origin?: string };
  TechnicianMap: { origin?: string };
  ManageCompanies: { origin?: string };
  ManageUsers: { origin?: string };
};

const Stack = createNativeStackNavigator<DashboardStackParamList>();

export default function DashboardStackNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        ...getCommonScreenOptions({ theme, isDark }),
      }}
    >
      <Stack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          headerTitle: () => <HeaderTitle title="SolarTech" />,
          headerLeft: () => null,
        }}
      />
      <Stack.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{ headerTitle: "Calendario" }}
      />
      <Stack.Screen
        name="AppointmentForm"
        component={AppointmentFormScreen}
        options={({ route }) => ({
          headerTitle: route.params?.appointment ? "Modifica Appuntamento" : "Nuovo Appuntamento",
          presentation: "modal",
        })}
      />
      <Stack.Screen
        name="CompanyInterventions"
        component={CompanyInterventionsScreen}
        options={({ route }) => ({
          headerTitle: route.params.companyName,
        })}
      />
      <Stack.Screen
        name="CreateIntervention"
        component={CreateInterventionScreen}
        options={{
          headerTitle: "Nuovo Intervento",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="BulkAssign"
        component={BulkAssignScreen}
        options={{
          headerTitle: "Assegna Interventi",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="TechnicianMap"
        component={TechnicianMapScreen}
        options={{ headerTitle: "Mappa Tecnici" }}
      />
      <Stack.Screen
        name="InterventionDetail"
        component={InterventionDetailScreen}
        options={{ headerTitle: "Dettaglio Intervento" }}
      />
      <Stack.Screen
        name="ManageCompanies"
        component={ManageCompaniesScreen}
        options={{ headerTitle: "Gestione Ditte" }}
      />
      <Stack.Screen
        name="ManageUsers"
        component={ManageUsersScreen}
        options={{ headerTitle: "Gestione Utenti" }}
      />
    </Stack.Navigator>
  );
}
