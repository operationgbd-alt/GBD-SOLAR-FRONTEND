import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { getCommonScreenOptions } from "@/navigation/screenOptions";
import { useTheme } from "@/hooks/useTheme";
import InterventionsListScreen from "@/screens/InterventionsListScreen";
import InterventionDetailScreen from "@/screens/InterventionDetailScreen";
import { InterventionStatus } from "@/types";

export type InterventionsStackParamList = {
  InterventionsList: { filterStatus?: InterventionStatus; origin?: string };
  InterventionDetail: { interventionId: string; origin?: string };
};

const Stack = createNativeStackNavigator<InterventionsStackParamList>();

export default function InterventionsStackNavigator() {
  const { theme, isDark } = useTheme();
  const commonOptions = getCommonScreenOptions({ theme, isDark });

  return (
    <Stack.Navigator screenOptions={commonOptions}>
      <Stack.Screen
        name="InterventionsList"
        component={InterventionsListScreen}
        options={{
          title: "Interventi",
          headerLeft: () => null,
        }}
      />
      <Stack.Screen
        name="InterventionDetail"
        component={InterventionDetailScreen}
        options={{ title: "Dettaglio" }}
      />
    </Stack.Navigator>
  );
}
