import React from 'react';
import { Pressable, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { useTheme } from '@/hooks/useTheme';

interface BackButtonProps {
  fallbackTab?: string;
  fallbackScreen?: string;
}

export function BackButton({ fallbackTab, fallbackScreen }: BackButtonProps) {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();

  const handlePress = () => {
    console.log('[BackButton] Pressed!');
    
    try {
      if (navigation.canGoBack()) {
        console.log('[BackButton] Using goBack()');
        navigation.goBack();
      } else if (fallbackScreen) {
        console.log('[BackButton] Using fallbackScreen:', fallbackScreen);
        navigation.navigate(fallbackScreen);
      } else if (fallbackTab) {
        console.log('[BackButton] Using fallbackTab:', fallbackTab);
        const parent = navigation.getParent();
        if (parent) {
          parent.navigate(fallbackTab);
        }
      } else {
        console.log('[BackButton] Using default DashboardTab');
        const parent = navigation.getParent();
        if (parent) {
          parent.navigate('DashboardTab');
        }
      }
    } catch (error) {
      console.error('[BackButton] Error:', error);
      navigation.dispatch(CommonActions.goBack());
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed
      ]}
      hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
    >
      <Ionicons name="arrow-back" size={24} color={theme.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: Platform.OS === 'android' ? -4 : 0,
  },
  pressed: {
    opacity: 0.5,
  },
});

export default BackButton;
