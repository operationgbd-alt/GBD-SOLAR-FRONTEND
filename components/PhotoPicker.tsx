import React from "react";
import { StyleSheet, View, Pressable, Image, Alert, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { Photo } from "@/types";

interface PhotoPickerProps {
  photos: Photo[];
  onPhotosChange: (photos: Photo[]) => void;
  maxPhotos?: number;
  disabled?: boolean;
}

export function PhotoPicker({ photos, onPhotosChange, maxPhotos = 10, disabled = false }: PhotoPickerProps) {
  const { theme } = useTheme();

  const requestPermissions = async () => {
    if (Platform.OS !== "web") {
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      const libraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (cameraPermission.status !== "granted" || libraryPermission.status !== "granted") {
        Alert.alert(
          "Permessi richiesti",
          "Per aggiungere foto, concedi i permessi per fotocamera e galleria."
        );
        return false;
      }
    }
    return true;
  };

  const handleAddPhoto = async () => {
    if (photos.length >= maxPhotos) {
      Alert.alert("Limite raggiunto", `Puoi aggiungere massimo ${maxPhotos} foto.`);
      return;
    }

    Alert.alert("Aggiungi Foto", "Come vuoi aggiungere la foto?", [
      {
        text: "Scatta Foto",
        onPress: takePhoto,
      },
      {
        text: "Scegli dalla Galleria",
        onPress: pickFromLibrary,
      },
      {
        text: "Annulla",
        style: "cancel",
      },
    ]);
  };

  const takePhoto = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const newPhoto: Photo = {
          id: String(Date.now()),
          uri: result.assets[0].uri,
          timestamp: Date.now(),
        };
        onPhotosChange([...photos, newPhoto]);
      }
    } catch (error) {
      Alert.alert("Errore", "Impossibile scattare la foto. Riprova.");
    }
  };

  const pickFromLibrary = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: maxPhotos - photos.length,
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        const newPhotos = result.assets.map((asset) => ({
          id: String(Date.now() + Math.random()),
          uri: asset.uri,
          timestamp: Date.now(),
        }));
        onPhotosChange([...photos, ...newPhotos]);
      }
    } catch (error) {
      Alert.alert("Errore", "Impossibile selezionare le foto. Riprova.");
    }
  };

  const handleRemovePhoto = (photoId: string) => {
    Alert.alert("Rimuovi Foto", "Sei sicuro di voler rimuovere questa foto?", [
      { text: "Annulla", style: "cancel" },
      {
        text: "Rimuovi",
        style: "destructive",
        onPress: () => {
          onPhotosChange(photos.filter((p) => p.id !== photoId));
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.photosGrid}>
        {photos.map((photo) => (
          <View key={photo.id} style={styles.photoWrapper}>
            <Image source={{ uri: photo.uri }} style={styles.photo} />
            <Pressable
              style={[styles.removeButton, { backgroundColor: theme.danger }]}
              onPress={() => handleRemovePhoto(photo.id)}
            >
              <Feather name="x" size={14} color="#FFFFFF" />
            </Pressable>
          </View>
        ))}

        {photos.length < maxPhotos ? (
          <Pressable
            style={({ pressed }) => [
              styles.addButton,
              {
                backgroundColor: theme.backgroundSecondary,
                borderColor: theme.primary,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
            onPress={handleAddPhoto}
          >
            <Feather name="camera" size={24} color={theme.primary} />
            <ThemedText type="caption" style={{ color: theme.primary, marginTop: Spacing.xs }}>
              Aggiungi
            </ThemedText>
          </Pressable>
        ) : null}
      </View>

      <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
        {photos.length} di {maxPhotos} foto
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  photosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  photoWrapper: {
    position: "relative",
    width: 100,
    height: 100,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  removeButton: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  addButton: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
});
