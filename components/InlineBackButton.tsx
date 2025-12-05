import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/hooks/useTheme';
import { ThemedText } from '@/components/ThemedText';
import { Spacing, BorderRadius } from '@/constants/theme';

interface InlineBackButtonProps {
  label?: string;
}

export function InlineBackButton({ label = 'Indietro' }: InlineBackButtonProps) {
  const { theme } = useTheme();
  const navigation = useNavigation();

  const handlePress = () => {
    console.log('[InlineBackButton] Pressed!');
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: pressed ? theme.backgroundSecondary : 'transparent' }
      ]}
    >
      <Ionicons name="arrow-back" size={20} color={theme.primary} />
      <ThemedText style={[styles.label, { color: theme.primary }]}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    alignSelf: 'flex-start',
    marginBottom: Spacing.md,
  },
  label: {
    marginLeft: Spacing.xs,
    fontWeight: '600',
  },
});

export default InlineBackButton;
