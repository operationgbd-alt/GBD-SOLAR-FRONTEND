import React, { useState } from 'react';
import { View, StyleSheet, Pressable, TextInput, Alert, Platform, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { ThemedText } from '@/components/ThemedText';
import { Card } from '@/components/Card';
import { InlineBackButton } from '@/components/InlineBackButton';
import { useTheme } from '@/hooks/useTheme';
import { useApp } from '@/store/AppContext';
import { useAuth } from '@/store/AuthContext';
import { api } from '@/services/api';
import { Spacing, BorderRadius, Typography } from '@/constants/theme';
import { Company } from '@/types';

export function ManageCompaniesScreen() {
  const { theme } = useTheme();
  const { companies, addCompany, deleteCompany, getUsersByCompany, addUser, refreshFromServer } = useApp();
  const { registerUser } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    username: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      const msg = 'Inserisci il nome della ditta';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Errore', msg);
      }
      return;
    }

    if (!formData.username.trim() || !formData.password.trim()) {
      const msg = 'Inserisci username e password per l\'account ditta';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Errore', msg);
      }
      return;
    }

    if (formData.password.length < 6) {
      const msg = 'La password deve essere di almeno 6 caratteri';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Errore', msg);
      }
      return;
    }

    const companyName = formData.name.trim();
    const companyAddress = formData.address.trim();
    const companyPhone = formData.phone.trim();
    const companyEmail = formData.email.trim();
    const username = formData.username.trim().toLowerCase();
    const password = formData.password;

    setIsLoading(true);

    try {
      console.log('[COMPANY] Creating company in backend...');
      const companyResponse = await api.post<any>('/companies', {
        name: companyName,
        address: companyAddress,
        phone: companyPhone,
        email: companyEmail,
      });
      
      console.log('[COMPANY] Backend response:', JSON.stringify(companyResponse));
      
      const backendCompanyId = companyResponse.id || companyResponse.data?.id;
      
      if (!backendCompanyId) {
        throw new Error('ID ditta non ricevuto dal server');
      }
      
      console.log('[COMPANY] Company created with ID:', backendCompanyId);
      
      console.log('[COMPANY] Registering user for company...');
      const registerResult = await registerUser({
        username: username,
        password: password,
        name: companyName,
        email: companyEmail,
        phone: companyPhone,
        role: 'ditta',
        companyId: String(backendCompanyId),
        companyName: companyName,
      });

      if (!registerResult.success) {
        console.log('[COMPANY] User registration failed:', registerResult.error);
        const errorMsg = registerResult.error || 'Errore durante la creazione dell\'account';
        if (Platform.OS === 'web') {
          window.alert(errorMsg);
        } else {
          Alert.alert('Errore', errorMsg);
        }
        setIsLoading(false);
        return;
      }

      console.log('[COMPANY] User registered, refreshing data...');
      
      if (refreshFromServer) {
        await refreshFromServer();
      }

      const successMsg = `Ditta "${companyName}" creata con successo!\n\nCredenziali:\nUsername: ${username}\nPassword: ${password}`;

      setFormData({ name: '', address: '', phone: '', email: '', username: '', password: '' });
      setShowForm(false);
      setIsLoading(false);

      if (Platform.OS === 'web') {
        window.alert(successMsg);
      } else {
        Alert.alert('Ditta Creata', successMsg);
      }
    } catch (error: any) {
      console.error('[COMPANY] Error:', error);
      console.error('[COMPANY] Error message:', error?.message);
      console.error('[COMPANY] Error details:', JSON.stringify(error));
      setIsLoading(false);
      let errorMsg = 'Errore durante la creazione della ditta. Riprova.';
      if (error?.message) {
        errorMsg = error.message;
      }
      if (Platform.OS === 'web') {
        window.alert(errorMsg);
      } else {
        Alert.alert('Errore', errorMsg);
      }
    }
  };

  const handleDelete = (company: Company) => {
    const users = getUsersByCompany(company.id);
    const confirmMessage = users.length > 0
      ? `Eliminare "${company.name}"? Ci sono ${users.length} utenti associati.`
      : `Eliminare "${company.name}"?`;

    if (Platform.OS === 'web') {
      if (window.confirm(confirmMessage)) {
        deleteCompany(company.id);
      }
    } else {
      Alert.alert('Conferma', confirmMessage, [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Elimina', style: 'destructive', onPress: () => deleteCompany(company.id) },
      ]);
    }
  };

  const renderCompanyCard = (company: Company) => {
    const users = getUsersByCompany(company.id);
    const technicians = users.filter(u => u.role?.toUpperCase() === 'TECNICO');

    return (
      <Card key={company.id} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, { backgroundColor: theme.primaryLight }]}>
            <Feather name="home" size={24} color={theme.primary} />
          </View>
          <View style={styles.cardInfo}>
            <ThemedText type="h4">{company.name}</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {technicians.length} tecnici
            </ThemedText>
          </View>
          <Pressable
            onPress={() => handleDelete(company)}
            style={[styles.deleteButton, { backgroundColor: theme.danger + '20' }]}
          >
            <Feather name="trash-2" size={18} color={theme.danger} />
          </Pressable>
        </View>
        
        {company.address ? (
          <View style={styles.detailRow}>
            <Feather name="map-pin" size={14} color={theme.textSecondary} />
            <ThemedText type="small" style={[styles.detailText, { color: theme.textSecondary }]}>
              {company.address}
            </ThemedText>
          </View>
        ) : null}
        
        {company.phone ? (
          <View style={styles.detailRow}>
            <Feather name="phone" size={14} color={theme.textSecondary} />
            <ThemedText type="small" style={[styles.detailText, { color: theme.textSecondary }]}>
              {company.phone}
            </ThemedText>
          </View>
        ) : null}
        
        {company.email ? (
          <View style={styles.detailRow}>
            <Feather name="mail" size={14} color={theme.textSecondary} />
            <ThemedText type="small" style={[styles.detailText, { color: theme.textSecondary }]}>
              {company.email}
            </ThemedText>
          </View>
        ) : null}

        {company.username ? (
          <View style={[styles.credentialsBox, { backgroundColor: theme.primaryLight, borderColor: theme.primary }]}>
            <View style={styles.credentialsBoxHeader}>
              <Feather name="key" size={14} color={theme.primary} />
              <ThemedText type="small" style={{ color: theme.primary, fontWeight: '600', marginLeft: Spacing.xs }}>
                Credenziali Accesso
              </ThemedText>
            </View>
            <View style={styles.credentialRow}>
              <Feather name="user" size={12} color={theme.text} />
              <ThemedText type="small" style={{ marginLeft: Spacing.xs }}>
                {company.username}
              </ThemedText>
            </View>
            {company.password ? (
              <View style={styles.credentialRow}>
                <Feather name="lock" size={12} color={theme.text} />
                <ThemedText type="small" style={{ marginLeft: Spacing.xs }}>
                  {company.password}
                </ThemedText>
              </View>
            ) : null}
          </View>
        ) : null}
      </Card>
    );
  };

  return (
    <ScreenScrollView>
      <InlineBackButton />
      
      <View style={styles.header}>
        <ThemedText type="h2">Gestione Ditte</ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {companies.length} ditte registrate
        </ThemedText>
      </View>

      <Pressable
        style={[styles.addButton, { backgroundColor: theme.primary }]}
        onPress={() => setShowForm(!showForm)}
      >
        <Feather name={showForm ? 'x' : 'plus'} size={20} color="#FFFFFF" />
        <ThemedText style={styles.addButtonText}>
          {showForm ? 'Annulla' : 'Nuova Ditta'}
        </ThemedText>
      </Pressable>

      {showForm ? (
        <Card style={styles.formCard}>
          <ThemedText type="h4" style={styles.formTitle}>Nuova Ditta</ThemedText>
          
          <View style={styles.inputGroup}>
            <ThemedText type="small" style={styles.label}>Nome Ditta *</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
              placeholder="Es. Solar Tech S.r.l."
              placeholderTextColor={theme.textSecondary}
              value={formData.name}
              onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText type="small" style={styles.label}>Indirizzo</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
              placeholder="Es. Via Roma 123, Milano"
              placeholderTextColor={theme.textSecondary}
              value={formData.address}
              onChangeText={(text) => setFormData(prev => ({ ...prev, address: text }))}
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText type="small" style={styles.label}>Telefono</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
              placeholder="Es. +39 02 12345678"
              placeholderTextColor={theme.textSecondary}
              value={formData.phone}
              onChangeText={(text) => setFormData(prev => ({ ...prev, phone: text }))}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText type="small" style={styles.label}>Email</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
              placeholder="Es. info@solartech.it"
              placeholderTextColor={theme.textSecondary}
              value={formData.email}
              onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={[styles.credentialsSection, { backgroundColor: theme.primaryLight, borderColor: theme.primary }]}>
            <View style={styles.credentialsHeader}>
              <Feather name="lock" size={18} color={theme.primary} />
              <ThemedText type="h4" style={{ marginLeft: Spacing.sm, color: theme.primary }}>
                Credenziali Accesso
              </ThemedText>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="small" style={styles.label}>Username *</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundDefault, color: theme.text, borderColor: theme.border }]}
                placeholder="Es. solartech"
                placeholderTextColor={theme.textSecondary}
                value={formData.username}
                onChangeText={(text) => setFormData(prev => ({ ...prev, username: text }))}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="small" style={styles.label}>Password *</ThemedText>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.passwordInput, { backgroundColor: theme.backgroundDefault, color: theme.text, borderColor: theme.border }]}
                  placeholder="Min. 6 caratteri"
                  placeholderTextColor={theme.textSecondary}
                  value={formData.password}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, password: text }))}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Pressable
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Feather name={showPassword ? 'eye-off' : 'eye'} size={20} color={theme.textSecondary} />
                </Pressable>
              </View>
            </View>
          </View>

          <Pressable
            style={[styles.submitButton, { backgroundColor: theme.success, opacity: isLoading ? 0.7 : 1 }]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Feather name="check" size={20} color="#FFFFFF" />
            )}
            <ThemedText style={styles.submitButtonText}>
              {isLoading ? 'Creazione in corso...' : 'Crea Ditta'}
            </ThemedText>
          </Pressable>
        </Card>
      ) : null}

      <View style={styles.list}>
        {companies.map(renderCompanyCard)}
      </View>

      {companies.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="home" size={48} color={theme.textSecondary} />
          <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
            Nessuna ditta registrata
          </ThemedText>
        </View>
      ) : null}
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: Spacing.lg,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: Typography.body.fontSize,
  },
  formCard: {
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
  },
  formTitle: {
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
  credentialsSection: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  credentialsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    height: 48,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    fontSize: Typography.body.fontSize,
  },
  eyeButton: {
    position: 'absolute',
    right: Spacing.md,
    padding: Spacing.xs,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: Typography.body.fontSize,
  },
  list: {
    gap: Spacing.md,
  },
  card: {
    padding: Spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
    gap: Spacing.sm,
  },
  detailText: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['3xl'],
  },
  credentialsBox: {
    marginTop: Spacing.md,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  credentialsBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  credentialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
});
