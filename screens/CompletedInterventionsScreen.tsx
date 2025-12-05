import React, { useMemo, useState } from "react";
import { StyleSheet, View, Pressable, ActivityIndicator, Alert, Platform } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as FileSystem from 'expo-file-system/legacy';
import * as MailComposer from 'expo-mail-composer';
import { ThemedText } from "@/components/ThemedText";
import { ScreenFlatList } from "@/components/ScreenFlatList";
import { Card } from "@/components/Card";
import { SendReportModal } from "@/components/SendReportModal";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/store/AuthContext";
import { useApp } from "@/store/AppContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { Intervention, InterventionCategory } from "@/types";
import { api } from "@/services/api";

type CompletedStackParamList = {
  CompletedList: undefined;
  CompletedDetail: { interventionId: string };
};

type CompletedListNavProp = NativeStackNavigationProp<CompletedStackParamList, "CompletedList">;

interface Props {
  navigation: CompletedListNavProp;
}

const CATEGORY_CONFIG: Record<InterventionCategory, { label: string; icon: string; color: string }> = {
  sopralluogo: { label: 'Sopralluogo', icon: 'search', color: '#5856D6' },
  installazione: { label: 'Installazione', icon: 'tool', color: '#007AFF' },
  manutenzione: { label: 'Manutenzione', icon: 'settings', color: '#FF9500' },
};

export default function CompletedInterventionsScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { interventions, updateIntervention } = useApp();
  const [selectedIntervention, setSelectedIntervention] = useState<Intervention | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [generatingReportId, setGeneratingReportId] = useState<string | null>(null);

  const isDitta = user?.role?.toUpperCase() === 'DITTA';
  const isMasterOrDitta = user?.role?.toUpperCase() === 'MASTER' || user?.role?.toUpperCase() === 'DITTA';

  const handleGenerateReport = async (intervention: Intervention) => {
    if (generatingReportId) return;
    
    setGeneratingReportId(intervention.id);
    
    try {
      const demoUser = user ? {
        id: user.id,
        name: user.name,
        role: user.role,
        companyId: user.companyId,
      } : undefined;
      
      let photosForReport: any[] = [];
      
      try {
        const serverPhotosResponse = await api.getInterventionPhotos(intervention.id);
        if (serverPhotosResponse.success && serverPhotosResponse.data) {
          for (const photo of serverPhotosResponse.data) {
            try {
              const photoDataResponse = await api.getPhoto(photo.id);
              if (photoDataResponse.success && photoDataResponse.data?.data) {
                photosForReport.push({
                  id: photo.id,
                  data: photoDataResponse.data.data,
                  mimeType: photo.mimeType || 'image/jpeg',
                  caption: photo.caption || `Foto`,
                  timestamp: new Date(photo.createdAt).getTime(),
                });
              }
            } catch (e) {
              console.log('[REPORT] Failed to fetch photo data:', photo.id);
            }
          }
        }
      } catch (e) {
        console.log('[REPORT] Failed to fetch server photos, using local');
      }
      
      if (photosForReport.length === 0 && intervention.documentation?.photos?.length > 0) {
        for (const photo of intervention.documentation.photos) {
          if (photo.uri) {
            try {
              if (photo.uri.startsWith('data:')) {
                photosForReport.push({
                  id: photo.id,
                  data: photo.uri,
                  mimeType: 'image/jpeg',
                  caption: photo.caption || `Foto`,
                  timestamp: photo.timestamp,
                });
              } else if (Platform.OS !== 'web' && photo.uri.startsWith('file://')) {
                const base64 = await FileSystem.readAsStringAsync(photo.uri, { encoding: 'base64' });
                photosForReport.push({
                  id: photo.id,
                  data: `data:image/jpeg;base64,${base64}`,
                  mimeType: 'image/jpeg',
                  caption: photo.caption || `Foto`,
                  timestamp: photo.timestamp,
                });
              }
            } catch (e) {
              console.log('[REPORT] Failed to convert local photo:', photo.id);
            }
          }
        }
      }
      
      console.log('[REPORT] Total photos for report:', photosForReport.length);
      
      const interventionData = {
        id: intervention.id,
        number: intervention.number,
        category: intervention.category,
        priority: intervention.priority,
        status: intervention.status,
        description: intervention.description,
        assignedAt: intervention.assignedAt,
        client: intervention.client,
        technicianId: intervention.technicianId,
        technicianName: intervention.technicianName,
        companyId: intervention.companyId,
        companyName: intervention.companyName,
        appointment: intervention.appointment,
        documentation: {
          ...intervention.documentation,
          photos: photosForReport,
        },
      };
      
      const response = await api.generateReport(intervention.id, 'base64', demoUser, interventionData);
      
      if (!response.success) {
        throw new Error(response.error || 'Errore nella generazione del report');
      }

      // API returns { success, data: "base64...", filename: "..." }
      // After service unwrap: { success, data: "base64..." } - filename is at root level in raw response
      // Handle both nested and flat response formats
      const rawResponse = response as any;
      const pdfBase64 = typeof response.data === 'string' ? response.data : response.data?.data;
      const fileName = rawResponse.filename || response.data?.filename || `Report_${intervention.number}.pdf`;
      
      if (!pdfBase64) {
        throw new Error('Dati PDF non ricevuti dal server');
      }
      
      if (Platform.OS === 'web') {
        const byteCharacters = atob(pdfBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        
        Alert.alert('Report Generato', 'Il report PDF e stato aperto in una nuova finestra.');
      } else {
        const cacheDir = FileSystem.cacheDirectory || FileSystem.documentDirectory || '';
        const fileUri = `${cacheDir}${fileName}`;
        await FileSystem.writeAsStringAsync(fileUri, pdfBase64, {
          encoding: 'base64',
        });

        const canSendMail = await MailComposer.isAvailableAsync();
        console.log('[EMAIL] MailComposer available:', canSendMail);
        
        if (canSendMail) {
          const result = await MailComposer.composeAsync({
            recipients: ['operation.gbd@gruppo-phoenix.com'],
            subject: `Report Intervento ${intervention.number} - ${intervention.client.name}`,
            body: `In allegato il report dell'intervento ${intervention.number} per il cliente ${intervention.client.name}.`,
            attachments: [fileUri],
          });
          
          console.log('[EMAIL] MailComposer result:', result.status);
          
          if (result.status === 'sent') {
            updateIntervention(intervention.id, {
              emailSentTo: 'operation.gbd@gruppo-phoenix.com',
            });
            
            api.notifyReportSent(intervention.id, intervention.number, intervention.client?.name || 'Cliente')
              .catch(err => console.log('[PUSH] Failed to notify report sent:', err));
            
            Alert.alert('Email Inviata', 'Il report e stato inviato con successo a operation.gbd@gruppo-phoenix.com');
          } else if (result.status === 'cancelled') {
            Alert.alert('Invio Annullato', 'Il report PDF e stato generato ma l\'invio email e stato annullato.\n\nIl file e stato salvato sul dispositivo.');
          } else {
            Alert.alert('Report Salvato', 'Il report PDF e stato salvato. Apri l\'app email per completare l\'invio.');
          }
        } else {
          Alert.alert(
            'Email Non Disponibile', 
            'Non e presente un\'app email configurata sul dispositivo.\n\nIl report PDF e stato salvato in:\n' + fileUri
          );
        }
      }
    } catch (error) {
      console.error('Errore generazione report:', error);
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      if (errorMessage.includes('Network') || errorMessage.includes('fetch') || errorMessage.includes('Failed')) {
        Alert.alert(
          'Server non disponibile',
          'Il server per la generazione dei report non e attivo. Contatta l\'amministratore o riavvia l\'applicazione.',
        );
      } else {
        Alert.alert('Errore', errorMessage);
      }
    } finally {
      setGeneratingReportId(null);
    }
  };

  const handleReportSent = (interventionId: string) => {
    updateIntervention(interventionId, {
      emailSentTo: 'operation.gbd@gruppo-phoenix.com',
    });
  };

  const completedInterventions = useMemo(() => {
    return interventions
      .filter(i => i.status === 'completato')
      .sort((a, b) => {
        const aCompleted = a.documentation.completedAt || a.updatedAt;
        const bCompleted = b.documentation.completedAt || b.updatedAt;
        return bCompleted - aCompleted;
      });
  }, [interventions]);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const renderHeader = () => (
    <View style={styles.statsBar}>
      <View style={[styles.statItem, { backgroundColor: theme.success + '15' }]}>
        <Feather name="check-circle" size={20} color={theme.success} />
        <ThemedText type="h2" style={{ color: theme.success, marginLeft: Spacing.sm }}>
          {completedInterventions.length}
        </ThemedText>
        <ThemedText type="caption" style={{ color: theme.textSecondary, marginLeft: Spacing.sm }}>
          Interventi Completati
        </ThemedText>
      </View>
    </View>
  );

  const renderIntervention = ({ item }: { item: Intervention }) => {
    const categoryConfig = CATEGORY_CONFIG[item.category];
    const completedDate = item.documentation.completedAt || item.updatedAt;

    return (
      <Card 
        style={styles.card}
        onPress={() => navigation.navigate('CompletedDetail', { interventionId: item.id })}
      >
        <View style={styles.cardHeader}>
          <View style={styles.numberBadge}>
            <ThemedText type="caption" style={{ fontWeight: '600' }}>
              {item.number}
            </ThemedText>
          </View>
          <View style={[styles.categoryBadge, { backgroundColor: categoryConfig.color + '20' }]}>
            <Feather name={categoryConfig.icon as any} size={12} color={categoryConfig.color} />
            <ThemedText type="caption" style={{ color: categoryConfig.color, marginLeft: 4, fontWeight: '600' }}>
              {categoryConfig.label}
            </ThemedText>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.clientRow}>
            <Feather name="user" size={16} color={theme.textSecondary} />
            <ThemedText type="body" style={styles.clientName}>
              {item.client.name}
            </ThemedText>
          </View>

          <View style={styles.addressRow}>
            <Feather name="map-pin" size={14} color={theme.textTertiary} />
            <ThemedText type="caption" style={{ color: theme.textSecondary, marginLeft: Spacing.xs, flex: 1 }}>
              {item.client.address} {item.client.civicNumber}, {item.client.city}
            </ThemedText>
          </View>

          <ThemedText type="small" numberOfLines={2} style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
            {item.description}
          </ThemedText>
        </View>

        <View style={[styles.cardFooter, { borderTopColor: theme.border }]}>
          <View style={styles.statusContainer}>
            <Feather name="check-circle" size={14} color={theme.success} />
            <ThemedText type="caption" style={{ color: theme.success, marginLeft: Spacing.xs }}>
              Completato
            </ThemedText>
          </View>

          <View style={styles.dateInfo}>
            <Feather name="calendar" size={12} color={theme.textSecondary} />
            <ThemedText type="caption" style={{ color: theme.textSecondary, marginLeft: 4 }}>
              {formatDate(completedDate)}
            </ThemedText>
          </View>
        </View>

        {item.documentation.notes ? (
          <View style={[styles.notesPreview, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather name="file-text" size={12} color={theme.textTertiary} />
            <ThemedText type="caption" numberOfLines={1} style={{ color: theme.textSecondary, marginLeft: Spacing.xs, flex: 1 }}>
              {item.documentation.notes}
            </ThemedText>
          </View>
        ) : null}

        {item.documentation.photos.length > 0 ? (
          <View style={[styles.photosPreview, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather name="camera" size={12} color={theme.textTertiary} />
            <ThemedText type="caption" style={{ color: theme.textSecondary, marginLeft: Spacing.xs }}>
              {item.documentation.photos.length} foto allegate
            </ThemedText>
          </View>
        ) : null}

        {isMasterOrDitta && !item.emailSentTo ? (
          <Pressable 
            style={[styles.generateReportButton, { backgroundColor: '#5856D6' }]}
            onPress={() => handleGenerateReport(item)}
            disabled={generatingReportId === item.id}
          >
            {generatingReportId === item.id ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Feather name="send" size={16} color="#FFFFFF" />
            )}
            <ThemedText type="body" style={{ color: '#FFFFFF', marginLeft: Spacing.sm, fontWeight: '600' }}>
              {generatingReportId === item.id ? 'Invio in corso...' : 'INVIA REPORT'}
            </ThemedText>
          </Pressable>
        ) : null}

        {item.emailSentTo ? (
          <View style={[styles.reportSentBadge, { backgroundColor: theme.success + '15' }]}>
            <Feather name="check-circle" size={14} color={theme.success} />
            <ThemedText type="caption" style={{ color: theme.success, marginLeft: Spacing.xs }}>
              Report inviato
            </ThemedText>
          </View>
        ) : null}
      </Card>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Feather name="inbox" size={48} color={theme.textTertiary} />
      <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md, textAlign: 'center' }}>
        Nessun intervento completato
      </ThemedText>
      <ThemedText type="caption" style={{ color: theme.textTertiary, marginTop: Spacing.sm, textAlign: 'center' }}>
        Gli interventi completati appariranno qui
      </ThemedText>
    </View>
  );

  return (
    <>
      <ScreenFlatList
        data={completedInterventions}
        keyExtractor={(item) => item.id}
        renderItem={renderIntervention}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
      />
      {selectedIntervention ? (
        <SendReportModal
          visible={showReportModal}
          onClose={() => {
            setShowReportModal(false);
            setSelectedIntervention(null);
          }}
          intervention={selectedIntervention}
          companyName={user?.companyName || 'Ditta'}
          onReportSent={handleReportSent}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  statsBar: {
    marginBottom: Spacing.md,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  card: {
    marginBottom: Spacing.md,
    padding: 0,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  numberBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
  },
  cardBody: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clientName: {
    fontWeight: '600',
    marginLeft: Spacing.sm,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: Spacing.xs,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notesPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  photosPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  sendReportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  generateReportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  reportSentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['3xl'],
  },
});
