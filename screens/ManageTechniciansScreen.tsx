import React, { useState } from 'react';
import { View, StyleSheet, Pressable, TextInput, Alert, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { ThemedText } from '@/components/ThemedText';
import { Card } from '@/components/Card';
import { InlineBackButton } from '@/components/InlineBackButton';
import { useTheme } from '@/hooks/useTheme';
import { useApp } from '@/store/AppContext';
import { useAuth } from '@/store/AuthContext';
import { Spacing, BorderRadius, Typography } from '@/constants/theme';
import { User } from '@/types';
import { api } from '@/services/api';

export function ManageTechniciansScreen() {
  const { theme } = useTheme();
  const { user: currentUser, registerUser } = useAuth();
  const { users, addUser, deleteUser, updateUser } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [resettingPassword, setResettingPassword] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    email: '',
    phone: '',
  });

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const companyTechnicians = users.filter(
    u => u.role?.toUpperCase() === 'TECNICO' && u.companyId === currentUser?.companyId
  );

  const handleSubmit = async () => {
    if (!formData.username.trim() || !formData.name.trim()) {
      const msg = 'Inserisci username e nome';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Errore', msg);
      }
      return;
    }

    if (!formData.password.trim()) {
      const msg = 'Inserisci la password';
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

    if (!currentUser?.companyId || !currentUser?.companyName) {
      const msg = 'Errore: ditta non configurata';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Errore', msg);
      }
      return;
    }

    const username = formData.username.trim().toLowerCase();
    const password = formData.password;
    const name = formData.name.trim();
    const email = formData.email.trim();
    const phone = formData.phone.trim();

    try {
      const registerResult = await registerUser({
        username,
        password,
        name,
        email,
        phone,
        role: 'tecnico',
        companyId: currentUser.companyId,
        companyName: currentUser.companyName,
      });

      if (!registerResult.success) {
        const errorMsg = registerResult.error || 'Errore durante la creazione dell\'account';
        if (Platform.OS === 'web') {
          window.alert(errorMsg);
        } else {
          Alert.alert('Errore', errorMsg);
        }
        return;
      }

      addUser({
        username,
        password,
        name,
        email,
        phone,
        role: 'tecnico',
        companyId: currentUser.companyId,
        companyName: currentUser.companyName,
      }, registerResult.userId);

      const successMsg = `Tecnico "${name}" creato con successo!\n\nCredenziali:\nUsername: ${username}\nPassword: ${password}`;

      setFormData({
        username: '',
        password: '',
        name: '',
        email: '',
        phone: '',
      });
      setShowForm(false);

      if (Platform.OS === 'web') {
        window.alert(successMsg);
      } else {
        Alert.alert('Tecnico Creato', successMsg);
      }
    } catch (error) {
      const errorMsg = 'Errore durante la creazione dell\'account. Riprova.';
      if (Platform.OS === 'web') {
        window.alert(errorMsg);
      } else {
        Alert.alert('Errore', errorMsg);
      }
    }
  };

  const handleDelete = (user: User) => {
    const confirmMessage = `Eliminare il tecnico "${user.name}"?`;
    if (Platform.OS === 'web') {
      if (window.confirm(confirmMessage)) {
        deleteUser(user.id);
      }
    } else {
      Alert.alert('Conferma', confirmMessage, [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Elimina', style: 'destructive', onPress: () => deleteUser(user.id) },
      ]);
    }
  };

  const handleResetPassword = async (user: User) => {
    const confirmMessage = `Resettare la password per "${user.name}"?`;
    
    const doReset = async () => {
      setResettingPassword(user.id);
      try {
        const response = await api.resetPassword(user.id);
        if (response.success && response.newPassword) {
          updateUser(user.id, { password: response.newPassword });
          const successMsg = `Password resettata con successo!\n\nNuova password: ${response.newPassword}\n\nComunicala al tecnico.`;
          if (Platform.OS === 'web') {
            window.alert(successMsg);
          } else {
            Alert.alert('Password Resettata', successMsg);
          }
        } else {
          throw new Error('Errore nel reset');
        }
      } catch (error: any) {
        const errorMsg = error.message || 'Errore durante il reset della password';
        if (Platform.OS === 'web') {
          window.alert(errorMsg);
        } else {
          Alert.alert('Errore', errorMsg);
        }
      } finally {
        setResettingPassword(null);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(confirmMessage)) {
        doReset();
      }
    } else {
      Alert.alert('Conferma', confirmMessage, [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Resetta', onPress: doReset },
      ]);
    }
  };

  const renderTechnicianCard = (technician: User) => (
    <Card key={technician.id} style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconContainer, { backgroundColor: theme.primaryLight }]}>
          <Feather name="tool" size={24} color={theme.primary} />
        </View>
        <View style={styles.cardInfo}>
          <ThemedText type="h4">{technician.name}</ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            @{technician.username}
          </ThemedText>
        </View>
        <Pressable
          onPress={() => handleDelete(technician)}
          style={[styles.deleteButton, { backgroundColor: theme.danger + '20' }]}
        >
          <Feather name="trash-2" size={18} color={theme.danger} />
        </Pressable>
      </View>

      <View style={[styles.credentialsDisplay, { backgroundColor: theme.primaryLight, borderColor: theme.primary }]}>
        <View style={styles.credentialsDisplayHeader}>
          <Feather name="key" size={14} color={theme.primary} />
          <ThemedText type="small" style={{ color: theme.primary, fontWeight: '600', marginLeft: Spacing.xs }}>
            Credenziali Accesso
          </ThemedText>
        </View>
        <View style={styles.credentialRow}>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>Username:</ThemedText>
          <ThemedText type="small" style={{ fontWeight: '600' }}>{technician.username}</ThemedText>
        </View>
        <View style={styles.credentialRow}>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>Password:</ThemedText>
          <View style={styles.passwordDisplay}>
            <ThemedText type="small" style={{ fontWeight: '600' }}>
              {visiblePasswords[technician.id] ? (technician.password || 'N/D') : '••••••••'}
            </ThemedText>
            <Pressable onPress={() => togglePasswordVisibility(technician.id)}>
              <Feather 
                name={visiblePasswords[technician.id] ? 'eye-off' : 'eye'} 
                size={16} 
                color={theme.primary} 
              />
            </Pressable>
          </View>
        </View>
        <Pressable
          style={[
            styles.resetPasswordButton, 
            { backgroundColor: '#FF9500' + '20', borderColor: '#FF9500' },
            resettingPassword === technician.id && { opacity: 0.6 }
          ]}
          onPress={() => handleResetPassword(technician)}
          disabled={resettingPassword === technician.id}
        >
          <Feather name="refresh-cw" size={14} color="#FF9500" />
          <ThemedText type="small" style={{ color: '#FF9500', fontWeight: '600', marginLeft: Spacing.xs }}>
            {resettingPassword === technician.id ? 'Resettando...' : 'Reset Password'}
          </ThemedText>
        </Pressable>
      </View>

      {technician.email ? (
        <View style={styles.detailRow}>
          <Feather name="mail" size={14} color={theme.textSecondary} />
          <ThemedText type="small" style={[styles.detailText, { color: theme.textSecondary }]}>
            {technician.email}
          </ThemedText>
        </View>
      ) : null}

      {technician.phone ? (
        <View style={styles.detailRow}>
          <Feather name="phone" size={14} color={theme.textSecondary} />
          <ThemedText type="small" style={[styles.detailText, { color: theme.textSecondary }]}>
            {technician.phone}
          </ThemedText>
        </View>
      ) : null}
    </Card>
  );

  return (
    <ScreenScrollView>
      <InlineBackButton />
      
      <View style={styles.header}>
        <ThemedText type="h2">I Tuoi Tecnici</ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {companyTechnicians.length} tecnici registrati
        </ThemedText>
      </View>

      <Pressable
        style={[styles.addButton, { backgroundColor: theme.primary }]}
        onPress={() => setShowForm(!showForm)}
      >
        <Feather name={showForm ? 'x' : 'plus'} size={20} color="#FFFFFF" />
        <ThemedText style={styles.addButtonText}>
          {showForm ? 'Annulla' : 'Nuovo Tecnico'}
        </ThemedText>
      </Pressable>

      {showForm ? (
        <Card style={styles.formCard}>
          <ThemedText type="h4" style={styles.formTitle}>Nuovo Tecnico</ThemedText>

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
                placeholder="Es. mario.rossi"
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

          <View style={styles.inputGroup}>
            <ThemedText type="small" style={styles.label}>Nome Completo *</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
              placeholder="Es. Mario Rossi"
              placeholderTextColor={theme.textSecondary}
              value={formData.name}
              onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText type="small" style={styles.label}>Email</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
              placeholder="Es. mario@azienda.it"
              placeholderTextColor={theme.textSecondary}
              value={formData.email}
              onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText type="small" style={styles.label}>Telefono</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
              placeholder="Es. +39 333 1234567"
              placeholderTextColor={theme.textSecondary}
              value={formData.phone}
              onChangeText={(text) => setFormData(prev => ({ ...prev, phone: text }))}
              keyboardType="phone-pad"
            />
          </View>

          <Pressable
            style={[styles.submitButton, { backgroundColor: theme.success }]}
            onPress={handleSubmit}
          >
            <Feather name="check" size={20} color="#FFFFFF" />
            <ThemedText style={styles.submitButtonText}>Crea Tecnico</ThemedText>
          </Pressable>
        </Card>
      ) : null}

      <View style={styles.list}>
        {companyTechnicians.map(renderTechnicianCard)}
      </View>

      {companyTechnicians.length === 0 && !showForm ? (
        <View style={styles.emptyState}>
          <Feather name="users" size={48} color={theme.textSecondary} />
          <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md, textAlign: 'center' }}>
            Nessun tecnico registrato.{'\n'}Crea il primo tecnico per iniziare.
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
    marginBottom: Spacing.sm,
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
  credentialsDisplay: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  credentialsDisplayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  credentialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  passwordDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  resetPasswordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['3xl'],
  },
});
