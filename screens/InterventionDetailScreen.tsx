import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
  Modal,
  FlatList,
  TextInput,
  Image,
} from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as MailComposer from 'expo-mail-composer';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import { useAuth } from '../store/AuthContext';
import { useApp } from '../store/AppContext';
import { api } from '../services/api';
import { Colors, Spacing } from '../constants/theme';
import { useTheme } from '../hooks/useTheme';
import { InlineBackButton } from '../components/InlineBackButton';
import { User } from '../types';

interface RouteParams {
  interventionId: string;
}

export default function InterventionDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { interventionId } = route.params as RouteParams;
  const { user } = useAuth();
  const { users, assignTechnicianToIntervention, refreshFromServer } = useApp();
  const { colors } = useTheme();
  
  const [intervention, setIntervention] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [showTechnicianModal, setShowTechnicianModal] = useState(false);
  const [assigningTechnician, setAssigningTechnician] = useState(false);
  const [sendingReport, setSendingReport] = useState(false);
  
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [appointmentNotes, setAppointmentNotes] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [interventionPhotos, setInterventionPhotos] = useState<{uri: string, caption: string}[]>([]);
  const [interventionNotes, setInterventionNotes] = useState('');
  const [savingLocation, setSavingLocation] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [showEsitoDropdown, setShowEsitoDropdown] = useState(false);
  const [selectedEsito, setSelectedEsito] = useState<string | null>(null);
  const [serverPhotos, setServerPhotos] = useState<any[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);

  const userRole = user?.role?.toUpperCase();
  const isMaster = userRole === 'MASTER';
  const isDitta = userRole === 'DITTA';
  const isTecnico = userRole === 'TECNICO';
  const canDelete = isMaster;
  const canGeneratePdf = isMaster || isDitta;
  const canAssignTechnician = isDitta;
  const canSendReport = (isMaster || isDitta) && (intervention?.status === 'completato' || intervention?.status === 'ko');
  const canEditIntervention = isTecnico && (intervention?.status === 'assegnato' || intervention?.status === 'appuntamento_fissato' || intervention?.status === 'in_corso');
  
  const companyTechnicians = useMemo(() => {
    if (!isDitta || !user?.companyId) return [];
    return users.filter(u => u.role?.toLowerCase() === 'tecnico' && u.companyId === user.companyId);
  }, [users, isDitta, user?.companyId]);

  const mapInterventionData = (data: any) => {
    return {
      id: String(data.id),
      number: data.number || `INT-${new Date(data.created_at).getFullYear()}-${String(data.id).padStart(3, '0')}`,
      clientName: data.clientName || data.client_name,
      clientAddress: data.clientAddress || data.address,
      clientCivicNumber: data.clientCivicNumber || data.civic_number,
      clientCity: data.clientCity || data.city,
      clientPhone: data.clientPhone || data.phone,
      clientEmail: data.clientEmail || data.email,
      category: data.category || data.type,
      priority: data.priority,
      description: data.description,
      status: data.status,
      technicianId: data.technicianId || (data.technician_id ? String(data.technician_id) : null),
      companyId: data.companyId || (data.company_id ? String(data.company_id) : null),
      notes: data.notes,
      latitude: data.latitude,
      longitude: data.longitude,
      locationCapturedAt: data.locationCapturedAt || data.location_captured_at,
      scheduledDate: data.scheduledDate || data.scheduled_date,
      technician: data.technician,
    };
  };

  const loadIntervention = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get<any>(`/interventions/${interventionId}`);
      console.log('[DETAIL] API response:', response);
      
      let rawData = null;
      if (response.success && response.data) {
        rawData = response.data;
      } else if (response.id || response.client_name) {
        rawData = response;
      }
      
      if (rawData) {
        const interventionData = mapInterventionData(rawData);
        setIntervention(interventionData);
        setInterventionNotes(interventionData.notes || '');
      } else {
        console.error('[DETAIL] Invalid response format:', response);
      }
    } catch (error) {
      console.error('Error loading intervention:', error);
      Alert.alert('Errore', 'Impossibile caricare i dettagli dell\'intervento');
    } finally {
      setLoading(false);
    }
  }, [interventionId]);

  const loadPhotos = useCallback(async () => {
    try {
      setLoadingPhotos(true);
      const response = await api.getInterventionPhotos(interventionId);
      if (response.success && response.data) {
        setServerPhotos(response.data);
      } else {
        setServerPhotos([]);
      }
    } catch (error) {
      console.error('Error loading photos:', error);
      setServerPhotos([]);
    } finally {
      setLoadingPhotos(false);
    }
  }, [interventionId]);

  useFocusEffect(
    useCallback(() => {
      loadIntervention();
      loadPhotos();
    }, [loadIntervention, loadPhotos])
  );

  const handleCall = (phone: string) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  const handleNavigate = () => {
    if (intervention?.clientAddress) {
      const address = `${intervention.clientAddress} ${intervention.clientCivicNumber || ''}, ${intervention.clientCity || ''}`.trim();
      const encodedAddress = encodeURIComponent(address);
      const url = Platform.select({
        ios: `maps:?q=${encodedAddress}`,
        android: `geo:0,0?q=${encodedAddress}`,
        default: `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`,
      });
      if (url) Linking.openURL(url);
    }
  };

  const handleDelete = () => {
    if (!canDelete) {
      Alert.alert('Accesso Negato', 'Solo gli utenti MASTER possono eliminare gli interventi');
      return;
    }

    Alert.alert(
      'Conferma Eliminazione',
      `Sei sicuro di voler eliminare l'intervento ${intervention?.number}? Questa azione non può essere annullata.`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading('delete');
              const response = await api.delete<{ success?: boolean; message?: string; error?: string }>(`/interventions/${interventionId}`);
              if (response.message || response.success !== false) {
                Alert.alert('Successo', 'Intervento eliminato con successo');
                await refreshFromServer();
                navigation.goBack();
              } else {
                Alert.alert('Errore', response.error || 'Impossibile eliminare l\'intervento');
              }
            } catch (error: any) {
              console.error('Error deleting intervention:', error);
              Alert.alert('Errore', 'Errore durante l\'eliminazione');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleGeneratePdf = async () => {
    if (!canGeneratePdf) {
      Alert.alert('Accesso Negato', 'Solo MASTER e DITTA possono generare report PDF');
      return;
    }

    try {
      setGeneratingPdf(true);
      
      const response = await api.post<{ success: boolean; data?: string; filename?: string; error?: string }>(
        `/reports/intervention/${interventionId}?format=base64`,
        { interventionData: intervention }
      );

      if (response.success && response.data) {
        const base64Data = response.data;
        const filename = response.filename || `Report_${intervention?.number || interventionId}.pdf`;
        const fileUri = `${FileSystem.documentDirectory}${filename}`;

        await FileSystem.writeAsStringAsync(fileUri, base64Data, {
          encoding: FileSystem.EncodingType.Base64,
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Condividi Report PDF',
          });
        } else {
          Alert.alert('Successo', `PDF salvato: ${filename}`);
        }
      } else {
        Alert.alert('Errore', response.error || 'Impossibile generare il PDF');
      }
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      Alert.alert('Errore', 'Errore durante la generazione del PDF');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleAssignTechnician = async (technician: User) => {
    setAssigningTechnician(true);
    try {
      const success = await assignTechnicianToIntervention(
        interventionId, 
        technician.id, 
        technician.name || technician.username
      );
      
      if (success) {
        setIntervention((prev: any) => ({
          ...prev,
          technicianId: technician.id,
          technician: { id: technician.id, name: technician.name || technician.username, phone: technician.phone },
        }));
        Alert.alert('Successo', `Tecnico ${technician.name || technician.username} assegnato con successo`);
      } else {
        Alert.alert('Errore', 'Impossibile assegnare il tecnico');
      }
    } catch (error) {
      console.error('Error assigning technician:', error);
      Alert.alert('Errore', 'Errore durante l\'assegnazione del tecnico');
    } finally {
      setAssigningTechnician(false);
      setShowTechnicianModal(false);
    }
  };

  const handleSendReport = async () => {
    if (!canSendReport) return;
    
    setSendingReport(true);
    try {
      const response = await api.post<{ success: boolean; data?: string; filename?: string; error?: string }>(
        `/reports/intervention/${interventionId}?format=base64`,
        { interventionData: intervention }
      );

      if (response.success && response.data) {
        const base64Data = response.data;
        const filename = response.filename || `Report_${intervention?.number || interventionId}.pdf`;
        const fileUri = `${FileSystem.documentDirectory}${filename}`;

        await FileSystem.writeAsStringAsync(fileUri, base64Data, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const isAvailable = await MailComposer.isAvailableAsync();
        if (isAvailable) {
          await MailComposer.composeAsync({
            subject: `Report Intervento ${intervention?.number} - ${intervention?.clientName}`,
            body: `Gentile Cliente,\n\nIn allegato trova il report dell'intervento ${intervention?.number}.\n\nDettagli:\n- Cliente: ${intervention?.clientName}\n- Indirizzo: ${intervention?.clientAddress || 'N/A'}\n- Tipo: ${intervention?.category}\n- Stato: ${getStatusLabel(intervention?.status)}\n\nCordiali saluti,\n${user?.name || 'SolarTech'}`,
            attachments: [fileUri],
          });
          Alert.alert('Successo', 'Report pronto per l\'invio');
        } else {
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri, {
              mimeType: 'application/pdf',
              dialogTitle: 'Condividi Report',
            });
          } else {
            Alert.alert('Info', 'Email non disponibile. Il PDF è stato salvato localmente.');
          }
        }
      } else {
        Alert.alert('Errore', response.error || 'Impossibile generare il report');
      }
    } catch (error: any) {
      console.error('Error sending report:', error);
      Alert.alert('Errore', 'Errore durante l\'invio del report');
    } finally {
      setSendingReport(false);
    }
  };

  const handleScheduleAppointment = async () => {
    if (!appointmentDate) {
      Alert.alert('Errore', 'Inserisci una data per l\'appuntamento');
      return;
    }
    
    setUpdatingStatus(true);
    try {
      const scheduledDateTime = `${appointmentDate}${appointmentTime ? ' ' + appointmentTime : ''}`;
      console.log('[APPOINTMENT] Sending request:', { status: 'appuntamento_fissato', scheduledDate: scheduledDateTime });
      
      const response = await api.put<any>(`/interventions/${interventionId}`, {
        status: 'appuntamento_fissato',
        scheduledDate: scheduledDateTime,
        notes: appointmentNotes || intervention?.notes,
      });
      
      console.log('[APPOINTMENT] Response:', response);
      
      if (response.success || response.data || response.id) {
        setShowAppointmentModal(false);
        setAppointmentDate('');
        setAppointmentTime('');
        setAppointmentNotes('');
        
        await loadIntervention();
        await refreshFromServer();
        
        Alert.alert('Successo', 'Appuntamento fissato con successo!');
      } else {
        console.error('[APPOINTMENT] Error response:', response);
        Alert.alert('Errore', response.error || 'Impossibile fissare l\'appuntamento');
      }
    } catch (error: any) {
      console.error('Error scheduling appointment:', error);
      Alert.alert('Errore', 'Errore durante la fissazione dell\'appuntamento');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleStartIntervention = async () => {
    Alert.alert(
      'Avvia Intervento',
      'Vuoi avviare l\'intervento? Lo stato cambierà in "In Corso".',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Avvia',
          onPress: async () => {
            setUpdatingStatus(true);
            try {
              console.log('[START] Sending request for intervention:', interventionId);
              const response = await api.put<any>(`/interventions/${interventionId}`, {
                status: 'in_corso',
              });
              
              console.log('[START] Response:', response);
              
              if (response.success || response.data || response.id) {
                await loadIntervention();
                await refreshFromServer();
                Alert.alert('Successo', 'Intervento avviato! Ora puoi caricare foto e documentazione.');
              } else {
                console.error('[START] Error response:', response);
                Alert.alert('Errore', response.error || 'Impossibile avviare l\'intervento');
              }
            } catch (error: any) {
              console.error('Error starting intervention:', error);
              Alert.alert('Errore', 'Errore durante l\'avvio dell\'intervento');
            } finally {
              setUpdatingStatus(false);
            }
          },
        },
      ]
    );
  };

  const handleSaveLocation = async () => {
    if (!isTecnico) {
      Alert.alert('Accesso Negato', 'Solo i tecnici possono registrare la posizione GPS.');
      return;
    }
    
    setSavingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permesso Negato', 'È necessario il permesso per accedere alla posizione GPS.');
        setSavingLocation(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;
      console.log('[GPS] Posizione acquisita:', latitude, longitude);

      const response = await api.saveInterventionGps(interventionId, latitude, longitude);
      
      if (response.success) {
        setIntervention((prev: any) => ({
          ...prev,
          latitude,
          longitude,
          locationCapturedAt: response.data?.locationCapturedAt || new Date().toISOString(),
        }));
        Alert.alert('Successo', `Posizione registrata!\n\nLat: ${latitude.toFixed(6)}\nLon: ${longitude.toFixed(6)}`);
      } else {
        Alert.alert('Errore', 'Impossibile salvare la posizione');
      }
    } catch (error: any) {
      console.error('[GPS] Errore:', error);
      Alert.alert('Errore', 'Errore durante l\'acquisizione della posizione GPS');
    } finally {
      setSavingLocation(false);
    }
  };

  const compressImage = async (uri: string): Promise<string> => {
    try {
      console.log('[COMPRESS] Starting compression for:', uri);
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1200 } }],
        { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
      );
      console.log('[COMPRESS] Compressed image URI:', manipResult.uri);
      return manipResult.uri;
    } catch (error) {
      console.error('[COMPRESS] Error compressing image:', error);
      return uri;
    }
  };

  const handlePickPhoto = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Permesso Negato', 'È necessario il permesso per accedere alla galleria.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      const compressedUri = await compressImage(result.assets[0].uri);
      setInterventionPhotos(prev => [...prev, { uri: compressedUri, caption: '' }]);
    }
  };

  const handleTakePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Permesso Negato', 'È necessario il permesso per usare la fotocamera.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      const compressedUri = await compressImage(result.assets[0].uri);
      setInterventionPhotos(prev => [...prev, { uri: compressedUri, caption: '' }]);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setInterventionPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleUploadPhotos = async () => {
    if (interventionPhotos.length === 0) {
      Alert.alert('Nessuna Foto', 'Aggiungi almeno una foto prima di caricare.');
      return;
    }

    setUpdatingStatus(true);
    try {
      for (const photo of interventionPhotos) {
        const base64 = await FileSystem.readAsStringAsync(photo.uri, { encoding: FileSystem.EncodingType.Base64 });
        await api.uploadInterventionPhoto(interventionId, `data:image/jpeg;base64,${base64}`, photo.caption || 'Foto intervento');
      }
      Alert.alert('Successo', `${interventionPhotos.length} foto caricate con successo!`);
      setInterventionPhotos([]);
      loadPhotos();
    } catch (error: any) {
      console.error('Error uploading photos:', error);
      Alert.alert('Errore', 'Errore durante il caricamento delle foto');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      const response = await api.put<any>(`/interventions/${interventionId}`, {
        notes: interventionNotes,
      });
      
      if (response.success || response.data) {
        setIntervention((prev: any) => ({
          ...prev,
          notes: interventionNotes,
        }));
        Alert.alert('Successo', 'Note salvate con successo!');
      } else {
        Alert.alert('Errore', response.error || 'Impossibile salvare le note');
      }
    } catch (error: any) {
      console.error('Error saving notes:', error);
      Alert.alert('Errore', 'Errore durante il salvataggio delle note');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleEsitoSelect = async (esito: string) => {
    setSelectedEsito(esito);
    setShowEsitoDropdown(false);
    
    const newStatus = esito === 'ko' ? 'ko' : 'completato';
    
    Alert.alert(
      'Conferma Esito',
      `Sei sicuro di voler esitare l'intervento come "${esito.toUpperCase()}"?`,
      [
        { text: 'Annulla', style: 'cancel', onPress: () => setSelectedEsito(null) },
        {
          text: 'Conferma',
          onPress: async () => {
            setUpdatingStatus(true);
            try {
              const response = await api.put<any>(`/interventions/${interventionId}`, {
                status: newStatus,
                notes: interventionNotes || intervention?.notes,
              });
              
              if (response.success || response.data) {
                setIntervention((prev: any) => ({
                  ...prev,
                  status: newStatus,
                  notes: interventionNotes || prev?.notes,
                }));
                await refreshFromServer();
                Alert.alert('Successo', `Intervento esitato come ${esito.toUpperCase()}!`, [
                  { text: 'OK', onPress: () => navigation.goBack() }
                ]);
              } else {
                Alert.alert('Errore', response.error || 'Impossibile esitare l\'intervento');
                setSelectedEsito(null);
              }
            } catch (error: any) {
              console.error('Error updating status:', error);
              Alert.alert('Errore', 'Errore durante l\'aggiornamento dello stato');
              setSelectedEsito(null);
            } finally {
              setUpdatingStatus(false);
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assegnato': return '#FFA500';
      case 'appuntamento_fissato': return '#2196F3';
      case 'in_corso': return '#9C27B0';
      case 'completato': return '#4CAF50';
      case 'ko': return '#F44336';
      case 'chiuso': return '#607D8B';
      default: return '#999';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'assegnato': return 'Assegnato';
      case 'appuntamento_fissato': return 'Appuntamento Fissato';
      case 'in_corso': return 'In Corso';
      case 'completato': return 'Completato';
      case 'ko': return 'KO';
      case 'chiuso': return 'Chiuso';
      default: return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'alta': return '#F44336';
      case 'media': return '#FF9800';
      case 'bassa': return '#4CAF50';
      default: return '#999';
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.backgroundDefault }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!intervention) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.backgroundDefault }]}>
        <Feather name="alert-circle" size={48} color={colors.textSecondary} />
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>
          Intervento non trovato
        </Text>
      </View>
    );
  }

  const isInterventionCompleted = intervention.status === 'completato' || intervention.status === 'ko';

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.backgroundDefault }]}
      contentContainerStyle={{ paddingTop: headerHeight + Spacing.md, paddingBottom: 40 + insets.bottom, paddingHorizontal: Spacing.md }}
    >
      <InlineBackButton />
      
      {/* SEZIONE 1: INFO INTERVENTO */}
      <View style={[styles.section, { backgroundColor: colors.backgroundSecondary }]}>
        <View style={styles.sectionHeader}>
          <Feather name="file-text" size={20} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Info Intervento</Text>
        </View>
        
        <View style={styles.headerInfo}>
          <Text style={[styles.interventionNumber, { color: colors.text }]}>
            {intervention.number}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(intervention.status) }]}>
            <Text style={styles.statusText}>{getStatusLabel(intervention.status)}</Text>
          </View>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Categoria</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{intervention.category || 'N/A'}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Priorità</Text>
            <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(intervention.priority) }]}>
              <Text style={styles.priorityText}>{intervention.priority?.toUpperCase() || 'N/A'}</Text>
            </View>
          </View>
        </View>

        {intervention.description ? (
          <View style={styles.descriptionContainer}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Descrizione</Text>
            <Text style={[styles.description, { color: colors.text }]}>{intervention.description}</Text>
          </View>
        ) : null}

        {intervention.scheduledDate ? (
          <View style={[styles.scheduledInfo, { borderColor: colors.border }]}>
            <Feather name="calendar" size={18} color="#2196F3" />
            <Text style={[styles.scheduledText, { color: colors.text }]}>
              Appuntamento: {intervention.scheduledDate}
            </Text>
          </View>
        ) : null}

        {intervention.technician ? (
          <View style={styles.technicianInfo}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Tecnico Assegnato</Text>
            <View style={styles.technicianRow}>
              <Feather name="user" size={16} color={colors.primary} />
              <Text style={[styles.technicianName, { color: colors.text }]}>{intervention.technician.name}</Text>
            </View>
          </View>
        ) : null}

        {canAssignTechnician && companyTechnicians.length > 0 ? (
          <TouchableOpacity
            style={styles.assignButton}
            onPress={() => setShowTechnicianModal(true)}
          >
            <Feather name="user-plus" size={18} color="#fff" />
            <Text style={styles.assignButtonText}>
              {intervention.technician ? 'Cambia Tecnico' : 'Assegna Tecnico'}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* SEZIONE 2: DETTAGLIO CLIENTE */}
      <View style={[styles.section, { backgroundColor: colors.backgroundSecondary }]}>
        <View style={styles.sectionHeader}>
          <Feather name="user" size={20} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Dettaglio Cliente</Text>
        </View>
        
        <Text style={[styles.clientName, { color: colors.text }]}>{intervention.clientName}</Text>
        
        {intervention.clientAddress ? (
          <Text style={[styles.clientAddress, { color: colors.textSecondary }]}>
            {`${intervention.clientAddress} ${intervention.clientCivicNumber || ''}, ${intervention.clientCity || ''}`.trim()}
          </Text>
        ) : null}

        {intervention.clientPhone ? (
          <Text style={[styles.clientPhone, { color: colors.textSecondary }]}>
            Tel: {intervention.clientPhone}
          </Text>
        ) : null}

        <View style={styles.clientActions}>
          {intervention.clientPhone ? (
            <TouchableOpacity
              style={[styles.clientActionButton, { backgroundColor: '#4CAF50' }]}
              onPress={() => handleCall(intervention.clientPhone)}
            >
              <Feather name="phone" size={20} color="#fff" />
              <Text style={styles.clientActionText}>Chiama</Text>
            </TouchableOpacity>
          ) : null}
          
          {intervention.clientAddress ? (
            <TouchableOpacity
              style={[styles.clientActionButton, { backgroundColor: '#2196F3' }]}
              onPress={handleNavigate}
            >
              <Feather name="navigation" size={20} color="#fff" />
              <Text style={styles.clientActionText}>Naviga</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* SEZIONE 3: AZIONI INTERVENTO (Solo Tecnico - stati assegnato o appuntamento_fissato) */}
      {isTecnico && (intervention.status === 'assegnato' || intervention.status === 'appuntamento_fissato') ? (
        <View style={[styles.section, { backgroundColor: colors.backgroundSecondary }]}>
          <View style={styles.sectionHeader}>
            <Feather name="play-circle" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Azioni Intervento</Text>
          </View>

          {intervention.status === 'assegnato' ? (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#2196F3' }]}
              onPress={() => setShowAppointmentModal(true)}
              disabled={updatingStatus}
            >
              {updatingStatus ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Feather name="calendar" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Fissa Appuntamento</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#9C27B0' }]}
              onPress={handleStartIntervention}
              disabled={updatingStatus}
            >
              {updatingStatus ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Feather name="play-circle" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Avvia Intervento</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      ) : null}

      {/* SEZIONE 4: CARICA FOTO E DOCUMENTI (Solo Tecnico) */}
      {isTecnico && !isInterventionCompleted ? (
        <View style={[styles.section, { backgroundColor: colors.backgroundSecondary }]}>
          <View style={styles.sectionHeader}>
            <Feather name="camera" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Foto e Documenti</Text>
          </View>

          {intervention.status === 'in_corso' ? (
            <>
              <View style={styles.photoButtons}>
                <TouchableOpacity
                  style={[styles.photoButton, { backgroundColor: colors.backgroundDefault, borderColor: colors.border }]}
                  onPress={handleTakePhoto}
                >
                  <Feather name="camera" size={24} color={colors.primary} />
                  <Text style={[styles.photoButtonText, { color: colors.primary }]}>Scatta Foto</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.photoButton, { backgroundColor: colors.backgroundDefault, borderColor: colors.border }]}
                  onPress={handlePickPhoto}
                >
                  <Feather name="image" size={24} color={colors.primary} />
                  <Text style={[styles.photoButtonText, { color: colors.primary }]}>Galleria</Text>
                </TouchableOpacity>
              </View>

              {interventionPhotos.length > 0 ? (
                <View style={styles.photosPreview}>
                  <Text style={[styles.previewTitle, { color: colors.text }]}>
                    Foto da caricare ({interventionPhotos.length})
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
                    {interventionPhotos.map((photo, index) => (
                      <View key={index} style={styles.photoPreviewContainer}>
                        <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
                        <TouchableOpacity
                          style={styles.removePhotoButton}
                          onPress={() => handleRemovePhoto(index)}
                        >
                          <Feather name="x-circle" size={24} color="#F44336" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                  <TouchableOpacity
                    style={[styles.uploadButton, { backgroundColor: '#4CAF50' }]}
                    onPress={handleUploadPhotos}
                    disabled={updatingStatus}
                  >
                    {updatingStatus ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Feather name="upload-cloud" size={18} color="#fff" />
                        <Text style={styles.uploadButtonText}>Carica {interventionPhotos.length} foto</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              ) : null}

              {serverPhotos.length > 0 ? (
                <View style={styles.serverPhotosContainer}>
                  <Text style={[styles.previewTitle, { color: colors.text }]}>
                    Foto caricate ({serverPhotos.length})
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
                    {serverPhotos.map((photo, index) => (
                      <View key={index} style={styles.photoPreviewContainer}>
                        <Image 
                          source={{ uri: photo.photo_url || photo.url }} 
                          style={styles.photoPreview} 
                        />
                      </View>
                    ))}
                  </ScrollView>
                </View>
              ) : loadingPhotos ? (
                <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 16 }} />
              ) : null}
            </>
          ) : (
            <View style={[styles.disabledSection, { borderColor: colors.border }]}>
              <Feather name="lock" size={24} color={colors.textSecondary} />
              <Text style={[styles.disabledText, { color: colors.textSecondary }]}>
                Avvia l'intervento per caricare foto
              </Text>
            </View>
          )}
        </View>
      ) : null}

      {/* Anteprima foto per DITTA e MASTER */}
      {(isDitta || isMaster) && serverPhotos.length > 0 ? (
        <View style={[styles.section, { backgroundColor: colors.backgroundSecondary }]}>
          <View style={styles.sectionHeader}>
            <Feather name="image" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Documentazione Fotografica</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
            {serverPhotos.map((photo, index) => (
              <View key={index} style={styles.photoPreviewContainer}>
                <Image 
                  source={{ uri: photo.photo_url || photo.url }} 
                  style={styles.photoPreviewLarge} 
                />
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {/* SEZIONE 5: REGISTRA POSIZIONE (Solo Tecnico) */}
      {isTecnico && !isInterventionCompleted ? (
        <View style={[styles.section, { backgroundColor: colors.backgroundSecondary }]}>
          <View style={styles.sectionHeader}>
            <Feather name="map-pin" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Posizione GPS</Text>
          </View>

          {intervention.status === 'in_corso' ? (
            intervention.latitude && intervention.longitude ? (
              <View style={[styles.locationInfo, { borderColor: colors.border }]}>
                <View style={styles.locationDetails}>
                  <Text style={[styles.locationText, { color: colors.text }]}>
                    Lat: {parseFloat(intervention.latitude).toFixed(6)}
                  </Text>
                  <Text style={[styles.locationText, { color: colors.text }]}>
                    Lon: {parseFloat(intervention.longitude).toFixed(6)}
                  </Text>
                  {intervention.locationCapturedAt ? (
                    <Text style={[styles.locationDate, { color: colors.textSecondary }]}>
                      Registrata: {new Date(intervention.locationCapturedAt).toLocaleString('it-IT')}
                    </Text>
                  ) : null}
                </View>
                <TouchableOpacity
                  style={[styles.refreshLocationButton, { backgroundColor: '#FF9800' }]}
                  onPress={handleSaveLocation}
                  disabled={savingLocation}
                >
                  {savingLocation ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Feather name="refresh-cw" size={16} color="#fff" />
                      <Text style={styles.refreshLocationText}>Aggiorna</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#FF9800' }]}
                onPress={handleSaveLocation}
                disabled={savingLocation}
              >
                {savingLocation ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Feather name="map-pin" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>Registra Posizione</Text>
                  </>
                )}
              </TouchableOpacity>
            )
          ) : (
            <View style={[styles.disabledSection, { borderColor: colors.border }]}>
              <Feather name="lock" size={24} color={colors.textSecondary} />
              <Text style={[styles.disabledText, { color: colors.textSecondary }]}>
                Avvia l'intervento per registrare posizione
              </Text>
            </View>
          )}
        </View>
      ) : null}

      {/* Visualizza posizione per DITTA/MASTER */}
      {(isDitta || isMaster) && intervention.latitude && intervention.longitude ? (
        <View style={[styles.section, { backgroundColor: colors.backgroundSecondary }]}>
          <View style={styles.sectionHeader}>
            <Feather name="map-pin" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Posizione Intervento</Text>
          </View>
          <View style={styles.locationDetails}>
            <Text style={[styles.locationText, { color: colors.text }]}>
              Lat: {parseFloat(intervention.latitude).toFixed(6)} | Lon: {parseFloat(intervention.longitude).toFixed(6)}
            </Text>
            {intervention.locationCapturedAt ? (
              <Text style={[styles.locationDate, { color: colors.textSecondary }]}>
                Registrata: {new Date(intervention.locationCapturedAt).toLocaleString('it-IT')}
              </Text>
            ) : null}
            <TouchableOpacity
              style={[styles.viewMapButton, { marginTop: 12 }]}
              onPress={() => {
                const url = `https://www.google.com/maps?q=${intervention.latitude},${intervention.longitude}`;
                Linking.openURL(url);
              }}
            >
              <Feather name="external-link" size={16} color={colors.primary} />
              <Text style={{ color: colors.primary, marginLeft: 8 }}>Apri in Google Maps</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* SEZIONE 5: NOTE */}
      <View style={[styles.section, { backgroundColor: colors.backgroundSecondary }]}>
        <View style={styles.sectionHeader}>
          <Feather name="edit-3" size={20} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Note</Text>
        </View>
        
        {isTecnico && !isInterventionCompleted ? (
          <>
            <TextInput
              style={[styles.notesInput, { backgroundColor: colors.backgroundDefault, borderColor: colors.border, color: colors.text }]}
              placeholder="Aggiungi note sull'intervento..."
              placeholderTextColor={colors.textSecondary}
              value={interventionNotes}
              onChangeText={setInterventionNotes}
              multiline
              numberOfLines={4}
            />
            <TouchableOpacity
              style={[styles.saveNotesButton, { opacity: savingNotes ? 0.6 : 1 }]}
              onPress={handleSaveNotes}
              disabled={savingNotes}
            >
              {savingNotes ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Feather name="save" size={18} color="#fff" />
                  <Text style={styles.saveNotesText}>Salva Note</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <Text style={[styles.notesText, { color: intervention.notes ? colors.text : colors.textSecondary }]}>
            {intervention.notes || 'Nessuna nota'}
          </Text>
        )}
      </View>

      {/* SEZIONE 7: ESITA INTERVENTO (Solo Tecnico) */}
      {isTecnico && !isInterventionCompleted ? (
        <View style={[styles.section, { backgroundColor: colors.backgroundSecondary }]}>
          <View style={styles.sectionHeader}>
            <Feather name="check-square" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Esita Intervento</Text>
          </View>
          
          {intervention.status === 'in_corso' ? (
            <>
              <TouchableOpacity
                style={[styles.dropdownButton, { backgroundColor: colors.backgroundDefault, borderColor: colors.border }]}
                onPress={() => setShowEsitoDropdown(!showEsitoDropdown)}
                disabled={updatingStatus}
              >
                <Text style={[styles.dropdownText, { color: selectedEsito ? colors.text : colors.textSecondary }]}>
                  {selectedEsito ? selectedEsito.toUpperCase() : 'Seleziona esito...'}
                </Text>
                <Feather name={showEsitoDropdown ? "chevron-up" : "chevron-down"} size={20} color={colors.textSecondary} />
              </TouchableOpacity>

              {showEsitoDropdown ? (
                <View style={[styles.dropdownMenu, { backgroundColor: colors.backgroundDefault, borderColor: colors.border }]}>
                  <TouchableOpacity
                    style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
                    onPress={() => handleEsitoSelect('ko')}
                  >
                    <Feather name="x-circle" size={20} color="#F44336" />
                    <Text style={[styles.dropdownItemText, { color: colors.text }]}>KO</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => handleEsitoSelect('completato')}
                  >
                    <Feather name="check-circle" size={20} color="#4CAF50" />
                    <Text style={[styles.dropdownItemText, { color: colors.text }]}>COMPLETATO</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </>
          ) : (
            <View style={[styles.disabledSection, { borderColor: colors.border }]}>
              <Feather name="lock" size={24} color={colors.textSecondary} />
              <Text style={[styles.disabledText, { color: colors.textSecondary }]}>
                Avvia l'intervento per esitare
              </Text>
            </View>
          )}
        </View>
      ) : null}

      {/* Messaggio intervento completato */}
      {isInterventionCompleted ? (
        <View style={[styles.section, { backgroundColor: intervention.status === 'ko' ? '#FFEBEE' : '#E8F5E9' }]}>
          <View style={styles.completedMessage}>
            <Feather 
              name={intervention.status === 'ko' ? "x-circle" : "check-circle"} 
              size={40} 
              color={intervention.status === 'ko' ? '#F44336' : '#4CAF50'} 
            />
            <Text style={[styles.completedText, { color: intervention.status === 'ko' ? '#F44336' : '#4CAF50' }]}>
              Intervento {intervention.status === 'ko' ? 'KO' : 'Completato'}
            </Text>
          </View>
        </View>
      ) : null}

      {/* AZIONI DITTA/MASTER */}
      {(isMaster || isDitta) ? (
        <View style={styles.actionsContainer}>
          {canGeneratePdf ? (
            <TouchableOpacity
              style={[styles.masterActionButton, { backgroundColor: '#FF6B00' }]}
              onPress={handleGeneratePdf}
              disabled={generatingPdf}
            >
              {generatingPdf ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Feather name="file-text" size={20} color="#fff" />
                  <Text style={styles.masterActionText}>Genera PDF</Text>
                </>
              )}
            </TouchableOpacity>
          ) : null}

          {canSendReport ? (
            <TouchableOpacity
              style={[styles.masterActionButton, { backgroundColor: '#4CAF50' }]}
              onPress={handleSendReport}
              disabled={sendingReport}
            >
              {sendingReport ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Feather name="send" size={20} color="#fff" />
                  <Text style={styles.masterActionText}>Invia Report</Text>
                </>
              )}
            </TouchableOpacity>
          ) : null}

          {canDelete ? (
            <TouchableOpacity
              style={[styles.masterActionButton, { backgroundColor: '#F44336' }]}
              onPress={handleDelete}
              disabled={actionLoading === 'delete'}
            >
              {actionLoading === 'delete' ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Feather name="trash-2" size={20} color="#fff" />
                  <Text style={styles.masterActionText}>Elimina</Text>
                </>
              )}
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {/* Modal Selezione Tecnico */}
      <Modal
        visible={showTechnicianModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTechnicianModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.backgroundSecondary }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Seleziona Tecnico</Text>
              <TouchableOpacity onPress={() => setShowTechnicianModal(false)}>
                <Feather name="x" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            {companyTechnicians.length === 0 ? (
              <Text style={[styles.noTechniciansText, { color: colors.textSecondary }]}>
                Nessun tecnico disponibile
              </Text>
            ) : (
              <FlatList
                data={companyTechnicians}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.technicianItem,
                      intervention.technicianId === item.id && styles.technicianItemSelected
                    ]}
                    onPress={() => handleAssignTechnician(item)}
                    disabled={assigningTechnician}
                  >
                    <View style={styles.technicianItemInfo}>
                      <Feather name="user" size={20} color={colors.primary} />
                      <View style={styles.technicianItemDetails}>
                        <Text style={[styles.technicianItemName, { color: colors.text }]}>
                          {item.name || item.username}
                        </Text>
                        {item.phone ? (
                          <Text style={[styles.technicianItemPhone, { color: colors.textSecondary }]}>
                            {item.phone}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                    {intervention.technicianId === item.id ? (
                      <Feather name="check-circle" size={20} color="#4CAF50" />
                    ) : (
                      <Feather name="chevron-right" size={20} color={colors.textSecondary} />
                    )}
                  </TouchableOpacity>
                )}
              />
            )}
            
            {assigningTechnician ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator color={colors.primary} />
                <Text style={[styles.modalLoadingText, { color: colors.textSecondary }]}>
                  Assegnazione in corso...
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Modal Appuntamento */}
      <Modal
        visible={showAppointmentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAppointmentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.backgroundSecondary }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Fissa Appuntamento</Text>
              <TouchableOpacity onPress={() => setShowAppointmentModal(false)}>
                <Feather name="x" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.appointmentForm}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Data *</Text>
              <TextInput
                style={[styles.appointmentInput, { backgroundColor: colors.backgroundDefault, borderColor: colors.border, color: colors.text }]}
                placeholder="es. 15/12/2025"
                placeholderTextColor={colors.textSecondary}
                value={appointmentDate}
                onChangeText={setAppointmentDate}
              />
              
              <Text style={[styles.inputLabel, { color: colors.text }]}>Ora (opzionale)</Text>
              <TextInput
                style={[styles.appointmentInput, { backgroundColor: colors.backgroundDefault, borderColor: colors.border, color: colors.text }]}
                placeholder="es. 10:00"
                placeholderTextColor={colors.textSecondary}
                value={appointmentTime}
                onChangeText={setAppointmentTime}
              />
              
              <Text style={[styles.inputLabel, { color: colors.text }]}>Note (opzionale)</Text>
              <TextInput
                style={[styles.appointmentInput, styles.appointmentTextArea, { backgroundColor: colors.backgroundDefault, borderColor: colors.border, color: colors.text }]}
                placeholder="Aggiungi note..."
                placeholderTextColor={colors.textSecondary}
                value={appointmentNotes}
                onChangeText={setAppointmentNotes}
                multiline
                numberOfLines={3}
              />
              
              <TouchableOpacity
                style={[styles.confirmButton, { opacity: updatingStatus ? 0.6 : 1 }]}
                onPress={handleScheduleAppointment}
                disabled={updatingStatus}
              >
                {updatingStatus ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Feather name="check" size={20} color="#fff" />
                    <Text style={styles.confirmButtonText}>Conferma</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
  },
  section: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  interventionNumber: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  priorityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  descriptionContainer: {
    marginTop: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  scheduledInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    gap: 8,
  },
  scheduledText: {
    fontSize: 14,
  },
  technicianInfo: {
    marginTop: 12,
  },
  technicianRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  technicianName: {
    fontSize: 16,
    fontWeight: '500',
  },
  assignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0066CC',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
    marginTop: 12,
  },
  assignButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  clientName: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  clientAddress: {
    fontSize: 14,
    marginBottom: 4,
  },
  clientPhone: {
    fontSize: 14,
    marginBottom: 12,
  },
  clientActions: {
    flexDirection: 'row',
    gap: 12,
  },
  clientActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  clientActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  photoButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderStyle: 'dashed',
    gap: 8,
  },
  photoButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  photosPreview: {
    marginTop: 16,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  photoScroll: {
    flexDirection: 'row',
  },
  photoPreviewContainer: {
    position: 'relative',
    marginRight: 12,
  },
  photoPreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  photoPreviewLarge: {
    width: 150,
    height: 150,
    borderRadius: 8,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 12,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  serverPhotosContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  locationDetails: {
    flex: 1,
  },
  locationText: {
    fontSize: 14,
  },
  locationDate: {
    fontSize: 12,
    marginTop: 4,
  },
  refreshLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 4,
  },
  refreshLocationText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  viewMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  saveNotesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0066CC',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 12,
  },
  saveNotesText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  notesText: {
    fontSize: 14,
    lineHeight: 20,
  },
  disabledSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderWidth: 1,
    borderRadius: 8,
    borderStyle: 'dashed',
    gap: 12,
  },
  disabledText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderWidth: 1,
    borderRadius: 8,
  },
  dropdownText: {
    fontSize: 16,
  },
  dropdownMenu: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
    borderBottomWidth: 1,
  },
  dropdownItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  completedMessage: {
    alignItems: 'center',
    padding: 16,
    gap: 8,
  },
  completedText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  masterActionButton: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  masterActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  noTechniciansText: {
    textAlign: 'center',
    padding: 20,
    fontSize: 14,
  },
  technicianItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  technicianItemSelected: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  technicianItemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  technicianItemDetails: {
    gap: 2,
  },
  technicianItemName: {
    fontSize: 16,
    fontWeight: '500',
  },
  technicianItemPhone: {
    fontSize: 13,
  },
  modalLoading: {
    alignItems: 'center',
    padding: 20,
    gap: 8,
  },
  modalLoadingText: {
    fontSize: 14,
  },
  appointmentForm: {
    gap: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  appointmentInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  appointmentTextArea: {
    textAlignVertical: 'top',
    minHeight: 80,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0066CC',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
