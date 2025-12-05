import React, { useState } from 'react';
import { View, StyleSheet, Pressable, TextInput, Alert, Platform, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { ScreenKeyboardAwareScrollView } from '@/components/ScreenKeyboardAwareScrollView';
import { ThemedText } from '@/components/ThemedText';
import { Card } from '@/components/Card';
import { InlineBackButton } from '@/components/InlineBackButton';
import { useTheme } from '@/hooks/useTheme';
import { useApp } from '@/store/AppContext';
import { Spacing, BorderRadius, Typography } from '@/constants/theme';
import { InterventionCategory } from '@/types';

const CATEGORIES: { value: InterventionCategory; label: string; icon: string }[] = [
  { value: 'sopralluogo', label: 'Sopralluogo', icon: 'search' },
  { value: 'installazione', label: 'Installazione', icon: 'tool' },
  { value: 'manutenzione', label: 'Manutenzione', icon: 'settings' },
];

const PRIORITIES: { value: 'bassa' | 'normale' | 'alta' | 'urgente'; label: string; color: string }[] = [
  { value: 'bassa', label: 'Bassa', color: '#8E8E93' },
  { value: 'normale', label: 'Normale', color: '#007AFF' },
  { value: 'alta', label: 'Alta', color: '#FF9500' },
  { value: 'urgente', label: 'Urgente', color: '#FF3B30' },
];

export function CreateInterventionScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { companies, users, addIntervention } = useApp();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    clientName: '',
    clientAddress: '',
    clientCivicNumber: '',
    clientCap: '',
    clientCity: '',
    clientPhone: '',
    clientEmail: '',
    category: 'installazione' as InterventionCategory,
    priority: 'normale' as 'bassa' | 'normale' | 'alta' | 'urgente',
    description: '',
    companyId: '',
    technicianId: '',
  });

  const selectedCompanyTechnicians = users.filter(
    u => u.role?.toUpperCase() === 'TECNICO' && u.companyId === formData.companyId
  );

  const handleSubmit = async () => {
    if (!formData.clientName.trim() || !formData.clientAddress.trim() || !formData.clientCity.trim()) {
      const msg = 'Inserisci nome, indirizzo e città del cliente';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Errore', msg);
      }
      return;
    }

    setIsSubmitting(true);

    const company = formData.companyId 
      ? companies.find(c => c.id === formData.companyId)
      : null;
    const technician = formData.technicianId
      ? users.find(u => u.id === formData.technicianId)
      : null;

    try {
      const success = await addIntervention({
        client: {
          name: formData.clientName.trim(),
          address: formData.clientAddress.trim(),
          civicNumber: formData.clientCivicNumber.trim(),
          cap: formData.clientCap.trim(),
          city: formData.clientCity.trim(),
          phone: formData.clientPhone.trim(),
          email: formData.clientEmail.trim(),
        },
        companyId: company?.id || null,
        companyName: company?.name || null,
        technicianId: technician?.id || null,
        technicianName: technician?.name || null,
        category: formData.category,
        priority: formData.priority,
        description: formData.description.trim(),
        assignedAt: Date.now(),
        assignedBy: 'Admin',
        status: formData.companyId ? 'assegnato' : 'assegnato',
        documentation: { photos: [], notes: '' },
      });

      if (success) {
        const successMsg = 'Intervento creato con successo';
        if (Platform.OS === 'web') {
          window.alert(successMsg);
        } else {
          Alert.alert('Successo', successMsg);
        }
        navigation.goBack();
      } else {
        const errorMsg = 'Errore durante la creazione. Riprova.';
        if (Platform.OS === 'web') {
          window.alert(errorMsg);
        } else {
          Alert.alert('Errore', errorMsg);
        }
      }
    } catch (error) {
      console.error('[CREATE] Error:', error);
      const errorMsg = 'Errore imprevisto. Riprova.';
      if (Platform.OS === 'web') {
        window.alert(errorMsg);
      } else {
        Alert.alert('Errore', errorMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenKeyboardAwareScrollView>
      <InlineBackButton />
      
      <View style={styles.header}>
        <ThemedText type="h2">Nuovo Intervento</ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          Compila i dati per creare un nuovo intervento
        </ThemedText>
      </View>

      <Card style={styles.section}>
        <ThemedText type="h4" style={styles.sectionTitle}>Dati Cliente</ThemedText>

        <View style={styles.inputGroup}>
          <ThemedText type="small" style={styles.label}>Nome Cliente *</ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
            placeholder="Es. Mario Rossi"
            placeholderTextColor={theme.textSecondary}
            value={formData.clientName}
            onChangeText={(text) => setFormData(prev => ({ ...prev, clientName: text }))}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 2 }]}>
            <ThemedText type="small" style={styles.label}>Indirizzo *</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
              placeholder="Es. Via Roma"
              placeholderTextColor={theme.textSecondary}
              value={formData.clientAddress}
              onChangeText={(text) => setFormData(prev => ({ ...prev, clientAddress: text }))}
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1, marginLeft: Spacing.sm }]}>
            <ThemedText type="small" style={styles.label}>N. Civico</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
              placeholder="123"
              placeholderTextColor={theme.textSecondary}
              value={formData.clientCivicNumber}
              onChangeText={(text) => setFormData(prev => ({ ...prev, clientCivicNumber: text }))}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <ThemedText type="small" style={styles.label}>CAP</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
              placeholder="00100"
              placeholderTextColor={theme.textSecondary}
              value={formData.clientCap}
              onChangeText={(text) => setFormData(prev => ({ ...prev, clientCap: text }))}
              keyboardType="number-pad"
            />
          </View>
          <View style={[styles.inputGroup, { flex: 2, marginLeft: Spacing.sm }]}>
            <ThemedText type="small" style={styles.label}>Città *</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
              placeholder="Es. Roma"
              placeholderTextColor={theme.textSecondary}
              value={formData.clientCity}
              onChangeText={(text) => setFormData(prev => ({ ...prev, clientCity: text }))}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <ThemedText type="small" style={styles.label}>Telefono</ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
            placeholder="Es. +39 333 1234567"
            placeholderTextColor={theme.textSecondary}
            value={formData.clientPhone}
            onChangeText={(text) => setFormData(prev => ({ ...prev, clientPhone: text }))}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.inputGroup}>
          <ThemedText type="small" style={styles.label}>Email</ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
            placeholder="Es. cliente@email.it"
            placeholderTextColor={theme.textSecondary}
            value={formData.clientEmail}
            onChangeText={(text) => setFormData(prev => ({ ...prev, clientEmail: text }))}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
      </Card>

      <Card style={styles.section}>
        <ThemedText type="h4" style={styles.sectionTitle}>Dettagli Intervento</ThemedText>

        <View style={styles.inputGroup}>
          <ThemedText type="small" style={styles.label}>Categoria *</ThemedText>
          <View style={styles.optionsRow}>
            {CATEGORIES.map(cat => (
              <Pressable
                key={cat.value}
                style={[
                  styles.optionButton,
                  { borderColor: theme.border },
                  formData.category === cat.value && { backgroundColor: theme.primaryLight, borderColor: theme.primary },
                ]}
                onPress={() => setFormData(prev => ({ ...prev, category: cat.value }))}
              >
                <Feather
                  name={cat.icon as any}
                  size={18}
                  color={formData.category === cat.value ? theme.primary : theme.textSecondary}
                />
                <ThemedText
                  type="small"
                  style={[
                    styles.optionText,
                    formData.category === cat.value && { color: theme.primary, fontWeight: '600' },
                  ]}
                >
                  {cat.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <ThemedText type="small" style={styles.label}>Priorità *</ThemedText>
          <View style={styles.priorityRow}>
            {PRIORITIES.map(pri => (
              <Pressable
                key={pri.value}
                style={[
                  styles.priorityButton,
                  { borderColor: theme.border },
                  formData.priority === pri.value && { backgroundColor: pri.color + '20', borderColor: pri.color },
                ]}
                onPress={() => setFormData(prev => ({ ...prev, priority: pri.value }))}
              >
                <View style={[styles.priorityDot, { backgroundColor: pri.color }]} />
                <ThemedText
                  type="caption"
                  style={[
                    styles.priorityText,
                    formData.priority === pri.value && { color: pri.color, fontWeight: '600' },
                  ]}
                >
                  {pri.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <ThemedText type="small" style={styles.label}>Descrizione</ThemedText>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border },
            ]}
            placeholder="Descrivi l'intervento da eseguire..."
            placeholderTextColor={theme.textSecondary}
            value={formData.description}
            onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      </Card>

      <Card style={styles.section}>
        <ThemedText type="h4" style={styles.sectionTitle}>Assegnazione (opzionale)</ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.md }}>
          Puoi assegnare l'intervento a una ditta ora, oppure lasciarlo libero e assegnarlo successivamente
        </ThemedText>

        <View style={styles.inputGroup}>
          <ThemedText type="small" style={styles.label}>Ditta</ThemedText>
          <View style={styles.companyButtons}>
            <Pressable
              style={[
                styles.companyButton,
                { borderColor: theme.border },
                !formData.companyId && { backgroundColor: theme.backgroundSecondary, borderColor: theme.primary },
              ]}
              onPress={() => setFormData(prev => ({ ...prev, companyId: '', technicianId: '' }))}
            >
              <Feather
                name="inbox"
                size={16}
                color={!formData.companyId ? theme.primary : theme.textSecondary}
              />
              <ThemedText
                style={[
                  styles.companyButtonText,
                  !formData.companyId && { color: theme.primary, fontWeight: '600' },
                ]}
              >
                Non assegnare (intervento libero)
              </ThemedText>
            </Pressable>
            {companies.map(company => (
              <Pressable
                key={company.id}
                style={[
                  styles.companyButton,
                  { borderColor: theme.border },
                  formData.companyId === company.id && { backgroundColor: theme.primaryLight, borderColor: theme.primary },
                ]}
                onPress={() => setFormData(prev => ({ ...prev, companyId: company.id, technicianId: '' }))}
              >
                <Feather
                  name="home"
                  size={16}
                  color={formData.companyId === company.id ? theme.primary : theme.textSecondary}
                />
                <ThemedText
                  style={[
                    styles.companyButtonText,
                    formData.companyId === company.id && { color: theme.primary, fontWeight: '600' },
                  ]}
                >
                  {company.name}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        {formData.companyId && selectedCompanyTechnicians.length > 0 ? (
          <View style={styles.inputGroup}>
            <ThemedText type="small" style={styles.label}>Tecnico (opzionale)</ThemedText>
            <View style={styles.technicianButtons}>
              <Pressable
                style={[
                  styles.technicianButton,
                  { borderColor: theme.border },
                  !formData.technicianId && { backgroundColor: theme.backgroundSecondary, borderColor: theme.primary },
                ]}
                onPress={() => setFormData(prev => ({ ...prev, technicianId: '' }))}
              >
                <ThemedText
                  type="small"
                  style={[!formData.technicianId && { color: theme.primary, fontWeight: '600' }]}
                >
                  Non assegnare
                </ThemedText>
              </Pressable>
              {selectedCompanyTechnicians.map(tech => (
                <Pressable
                  key={tech.id}
                  style={[
                    styles.technicianButton,
                    { borderColor: theme.border },
                    formData.technicianId === tech.id && { backgroundColor: theme.primaryLight, borderColor: theme.primary },
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, technicianId: tech.id }))}
                >
                  <Feather
                    name="user"
                    size={14}
                    color={formData.technicianId === tech.id ? theme.primary : theme.textSecondary}
                  />
                  <ThemedText
                    type="small"
                    style={[
                      formData.technicianId === tech.id && { color: theme.primary, fontWeight: '600' },
                    ]}
                  >
                    {tech.name}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
      </Card>

      <Pressable
        style={[styles.submitButton, { backgroundColor: isSubmitting ? theme.textSecondary : theme.success }]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        <Feather name={isSubmitting ? "loader" : "check"} size={20} color="#FFFFFF" />
        <ThemedText style={styles.submitButtonText}>
          {isSubmitting ? 'Creazione in corso...' : 'Crea Intervento'}
        </ThemedText>
      </Pressable>

      <View style={{ height: Spacing.xl }} />
    </ScreenKeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.lg,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  label: {
    marginBottom: Spacing.xs,
    fontWeight: '500',
  },
  input: {
    height: 48,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    fontSize: Typography.body.fontSize,
  },
  textArea: {
    height: 100,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
  },
  optionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  optionButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  optionText: {},
  priorityRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  priorityButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  priorityText: {},
  companyButtons: {
    gap: Spacing.sm,
  },
  companyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  companyButtonText: {},
  technicianButtons: {
    gap: Spacing.sm,
  },
  technicianButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: Typography.body.fontSize,
  },
});
