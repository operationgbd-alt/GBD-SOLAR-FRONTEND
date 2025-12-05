import React, { useState } from 'react';
import { Modal, View, StyleSheet, TextInput, Pressable, Alert, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as MailComposer from 'expo-mail-composer';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button } from '@/components/Button';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius } from '@/constants/theme';
import { Intervention } from '@/types';

const GBD_EMAIL = 'operation.gbd@gruppo-phoenix.com';

interface Props {
  visible: boolean;
  onClose: () => void;
  intervention: Intervention;
  companyName: string;
  onReportSent?: (interventionId: string) => void;
}

export function SendReportModal({ visible, onClose, intervention, companyName, onReportSent }: Props) {
  const { theme } = useTheme();
  const [extraNotes, setExtraNotes] = useState('');
  const [isSending, setIsSending] = useState(false);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const buildEmailBody = () => {
    const lines: string[] = [];
    
    lines.push('═══════════════════════════════════════');
    lines.push('REPORT INTERVENTO COMPLETATO');
    lines.push('═══════════════════════════════════════');
    lines.push('');
    
    lines.push('▸ DATI INTERVENTO');
    lines.push(`  Numero: ${intervention.number}`);
    lines.push(`  Categoria: ${getCategoryLabel(intervention.category)}`);
    lines.push(`  Priorità: ${intervention.priority.toUpperCase()}`);
    lines.push(`  Descrizione: ${intervention.description}`);
    lines.push('');
    
    lines.push('▸ CLIENTE');
    lines.push(`  Nome: ${intervention.client.name}`);
    lines.push(`  Indirizzo: ${intervention.client.address} ${intervention.client.civicNumber}`);
    lines.push(`  CAP/Città: ${intervention.client.cap} ${intervention.client.city}`);
    lines.push(`  Telefono: ${intervention.client.phone}`);
    lines.push(`  Email: ${intervention.client.email}`);
    lines.push('');
    
    lines.push('▸ DITTA INSTALLATRICE');
    lines.push(`  Nome: ${companyName}`);
    lines.push(`  Tecnico: ${intervention.technicianName || 'Non assegnato'}`);
    lines.push('');
    
    lines.push('▸ DATE');
    lines.push(`  Assegnato il: ${formatDate(intervention.assignedAt)}`);
    if (intervention.documentation.startedAt) {
      lines.push(`  Iniziato il: ${formatDate(intervention.documentation.startedAt)}`);
    }
    if (intervention.documentation.completedAt) {
      lines.push(`  Completato il: ${formatDate(intervention.documentation.completedAt)}`);
    }
    lines.push('');
    
    if (intervention.location) {
      lines.push('▸ POSIZIONE GPS LAVORO');
      lines.push(`  Indirizzo: ${intervention.location.address || 'N/D'}`);
      lines.push(`  Coordinate: ${intervention.location.latitude.toFixed(6)}, ${intervention.location.longitude.toFixed(6)}`);
      lines.push(`  Registrata il: ${formatDate(intervention.location.timestamp)}`);
      lines.push(`  Google Maps: https://www.google.com/maps?q=${intervention.location.latitude},${intervention.location.longitude}`);
      lines.push('');
    }
    
    if (intervention.documentation.notes) {
      lines.push('▸ NOTE TECNICO');
      lines.push(`  ${intervention.documentation.notes}`);
      lines.push('');
    }
    
    if (extraNotes.trim()) {
      lines.push('▸ NOTE AGGIUNTIVE DITTA');
      lines.push(`  ${extraNotes.trim()}`);
      lines.push('');
    }
    
    lines.push('▸ DOCUMENTAZIONE FOTOGRAFICA');
    lines.push(`  Numero foto allegate: ${intervention.documentation.photos.length}`);
    if (intervention.documentation.photos.length > 0) {
      lines.push('  (Le foto sono allegate a questa email)');
    }
    lines.push('');
    
    lines.push('═══════════════════════════════════════');
    lines.push('Report generato automaticamente da SolarTech App');
    lines.push(`Data invio: ${formatDate(Date.now())}`);
    lines.push('═══════════════════════════════════════');
    
    return lines.join('\n');
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      sopralluogo: 'Sopralluogo',
      installazione: 'Installazione',
      manutenzione: 'Manutenzione',
    };
    return labels[category] || category;
  };

  const handleSendReport = async () => {
    setIsSending(true);
    
    try {
      const isAvailable = await MailComposer.isAvailableAsync();
      
      if (!isAvailable) {
        if (Platform.OS === 'web') {
          const subject = encodeURIComponent(`[SolarTech] Report Intervento ${intervention.number} - ${intervention.client.name}`);
          const body = encodeURIComponent(buildEmailBody());
          const mailtoUrl = `mailto:${GBD_EMAIL}?subject=${subject}&body=${body}`;
          
          window.open(mailtoUrl, '_blank');
          
          onReportSent?.(intervention.id);
          setIsSending(false);
          onClose();
          return;
        } else {
          Alert.alert(
            'Email Non Disponibile',
            'Nessuna app email configurata sul dispositivo.',
            [{ text: 'OK' }]
          );
        }
        setIsSending(false);
        return;
      }

      const subject = `[SolarTech] Report Intervento ${intervention.number} - ${intervention.client.name}`;
      const body = buildEmailBody();
      
      const attachments = intervention.documentation.photos
        .map(photo => photo.uri)
        .filter(uri => uri && !uri.startsWith('http'));

      onReportSent?.(intervention.id);

      const result = await MailComposer.composeAsync({
        recipients: [GBD_EMAIL],
        subject,
        body,
        attachments: attachments.length > 0 ? attachments : undefined,
      });

      if (Platform.OS === 'web') {
        onClose();
      } else if (result.status === MailComposer.MailComposerStatus.SENT) {
        Alert.alert(
          'Report Inviato',
          'Il report è stato inviato con successo a GBD.',
          [{ text: 'OK', onPress: onClose }]
        );
      } else if (result.status === MailComposer.MailComposerStatus.CANCELLED) {
        Alert.alert(
          'Report Salvato',
          'L\'intervento è stato marcato come inviato. Potrai inviare l\'email in seguito.',
          [{ text: 'OK', onPress: onClose }]
        );
      } else {
        Alert.alert(
          'Report Pronto',
          'L\'email è stata preparata. Completa l\'invio dalla tua app email.',
          [{ text: 'OK', onPress: onClose }]
        );
      }
    } catch (error) {
      onReportSent?.(intervention.id);
      if (Platform.OS === 'web') {
        onClose();
      } else {
        Alert.alert(
          'Report Salvato',
          'L\'intervento è stato marcato come inviato. Verifica che l\'email sia stata inviata.',
          [{ text: 'OK', onPress: onClose }]
        );
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setExtraNotes('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <ThemedView style={[styles.container, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.header}>
            <ThemedText type="h3">Invia Report a GBD</ThemedText>
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <Feather name="x" size={24} color={theme.textSecondary} />
            </Pressable>
          </View>

          <View style={[styles.infoBox, { backgroundColor: theme.primaryLight }]}>
            <Feather name="mail" size={20} color={theme.primary} />
            <View style={{ marginLeft: Spacing.md, flex: 1 }}>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                Destinatario
              </ThemedText>
              <ThemedText type="body" style={{ color: theme.primary, fontWeight: '600' }}>
                {GBD_EMAIL}
              </ThemedText>
            </View>
          </View>

          <View style={[styles.summaryBox, { backgroundColor: theme.backgroundSecondary }]}>
            <ThemedText type="h4" style={{ marginBottom: Spacing.sm }}>
              Intervento {intervention.number}
            </ThemedText>
            <View style={styles.summaryRow}>
              <Feather name="user" size={14} color={theme.textSecondary} />
              <ThemedText type="small" style={{ marginLeft: Spacing.xs, color: theme.textSecondary }}>
                {intervention.client.name}
              </ThemedText>
            </View>
            <View style={styles.summaryRow}>
              <Feather name="camera" size={14} color={theme.textSecondary} />
              <ThemedText type="small" style={{ marginLeft: Spacing.xs, color: theme.textSecondary }}>
                {intervention.documentation.photos.length} foto allegate
              </ThemedText>
            </View>
            {intervention.location ? (
              <View style={styles.summaryRow}>
                <Feather name="map-pin" size={14} color={theme.success} />
                <ThemedText type="small" style={{ marginLeft: Spacing.xs, color: theme.success }}>
                  Posizione GPS inclusa
                </ThemedText>
              </View>
            ) : null}
            {intervention.documentation.notes ? (
              <View style={styles.summaryRow}>
                <Feather name="file-text" size={14} color={theme.textSecondary} />
                <ThemedText type="small" style={{ marginLeft: Spacing.xs, color: theme.textSecondary }}>
                  Note tecnico incluse
                </ThemedText>
              </View>
            ) : null}
          </View>

          <ThemedText type="body" style={{ fontWeight: '600', marginBottom: Spacing.sm }}>
            Note Extra (opzionale)
          </ThemedText>
          <TextInput
            style={[
              styles.notesInput,
              { 
                backgroundColor: theme.backgroundSecondary, 
                color: theme.text,
                borderColor: theme.border,
              }
            ]}
            placeholder="Aggiungi note aggiuntive per GBD..."
            placeholderTextColor={theme.textTertiary}
            value={extraNotes}
            onChangeText={setExtraNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <View style={styles.buttonRow}>
            <Button 
              variant="secondary" 
              onPress={handleClose}
              style={{ flex: 1, marginRight: Spacing.sm }}
            >
              Annulla
            </Button>
            <Button 
              onPress={handleSendReport}
              disabled={isSending}
              style={{ flex: 1, marginLeft: Spacing.sm }}
            >
              {isSending ? 'Preparazione...' : 'Invia Report'}
            </Button>
          </View>
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  summaryBox: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    minHeight: 100,
    marginBottom: Spacing.lg,
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: 'row',
  },
});
