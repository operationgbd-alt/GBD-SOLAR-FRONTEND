import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ProfileScreen from "@/screens/ProfileScreen";
import { ManageCompaniesScreen } from "@/screens/ManageCompaniesScreen";
import { ManageUsersScreen } from "@/screens/ManageUsersScreen";
import { CreateInterventionScreen } from "@/screens/CreateInterventionScreen";
import { CompanyAccountScreen } from "@/screens/CompanyAccountScreen";
import { CloseInterventionsScreen } from "@/screens/CloseInterventionsScreen";
import { ManageTechniciansScreen } from "@/screens/ManageTechniciansScreen";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "@/navigation/screenOptions";

export type ProfileStackParamList = {
  Profile: undefined;
  ManageCompanies: { origin?: string };
  ManageUsers: { origin?: string };
  CreateIntervention: { origin?: string };
  CompanyAccount: { origin?: string };
  CloseInterventions: { origin?: string };
  ManageTechnicians: { origin?: string };
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export default function ProfileStackNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Stack.Navigator 
      screenOptions={getCommonScreenOptions({ theme, isDark })}
    >
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ 
          title: "Profilo",
          headerLeft: () => null,
        }}
      />
      <Stack.Screen
        name="ManageCompanies"
        component={ManageCompaniesScreen}
        options={{ title: "Gestione Ditte" }}
      />
      <Stack.Screen
        name="ManageUsers"
        component={ManageUsersScreen}
        options={{ title: "Gestione Utenti" }}
      />
      <Stack.Screen
        name="CreateIntervention"
        component={CreateInterventionScreen}
        options={{ title: "Nuovo Intervento" }}
      />
      <Stack.Screen
        name="CompanyAccount"
        component={CompanyAccountScreen}
        options={{ title: "Account Ditta" }}
      />
      <Stack.Screen
        name="CloseInterventions"
        component={CloseInterventionsScreen}
        options={{ title: "Chiudi Interventi" }}
      />
      <Stack.Screen
        name="ManageTechnicians"
        component={ManageTechniciansScreen}
        options={{ title: "Gestione Tecnici" }}
      />
    </Stack.Navigator>
  );
}
