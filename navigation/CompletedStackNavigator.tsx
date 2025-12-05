import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { getCommonScreenOptions } from "@/navigation/screenOptions";
import { useTheme } from "@/hooks/useTheme";
import CompletedInterventionsScreen from "@/screens/CompletedInterventionsScreen";
import InterventionDetailScreen from "@/screens/InterventionDetailScreen";

export type CompletedStackParamList = {
  CompletedList: undefined;
  CompletedDetail: { interventionId: string; origin?: string };
};

const Stack = createNativeStackNavigator<CompletedStackParamList>();

export default function CompletedStackNavigator() {
  const { theme, isDark } = useTheme();
  const commonOptions = getCommonScreenOptions({ theme, isDark });

  return (
    <Stack.Navigator screenOptions={commonOptions}>
      <Stack.Screen
        name="CompletedList"
        component={CompletedInterventionsScreen}
        options={{
          title: "Completati",
          headerLeft: () => null,
        }}
      />
      <Stack.Screen
        name="CompletedDetail"
        component={InterventionDetailScreen as any}
        options={{ title: "Dettaglio" }}
      />
    </Stack.Navigator>
  );
}
