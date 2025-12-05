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

export function ManageUsersScreen() {
  const { theme } = useTheme();
  const { users, companies, addUser, deleteUser } = useApp();
  const { registerUser } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    email: '',
    phone: '',
    role: 'tecnico' as 'ditta' | 'tecnico',
    companyId: '',
  });

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const technicians = users.filter(u => u.role?.toUpperCase() === 'TECNICO');
  const companyAccounts = users.filter(u => u.role?.toUpperCase() === 'DITTA');

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

    if (!formData.companyId) {
      const msg = 'Seleziona una ditta';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Errore', msg);
      }
      return;
    }

    const company = companies.find(c => c.id === formData.companyId);

    const username = formData.username.trim().toLowerCase();
    const password = formData.password;
    const name = formData.name.trim();
    const email = formData.email.trim();
    const phone = formData.phone.trim();
    const role = formData.role;
    const companyId = formData.companyId;
    const companyName = company?.name || '';

    try {
      const registerResult = await registerUser({
        username,
        password,
        name,
        email,
        phone,
        role,
        companyId,
        companyName,
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
        role,
        companyId,
        companyName: companyName || null,
      }, registerResult.userId);

      const successMsg = `Utente "${name}" creato con successo!\n\nCredenziali:\nUsername: ${username}\nPassword: ${password}`;
      
      setFormData({
        username: '',
        password: '',
        name: '',
        email: '',
        phone: '',
        role: 'tecnico',
        companyId: '',
      });
      setShowForm(false);

      if (Platform.OS === 'web') {
        window.alert(successMsg);
      } else {
        Alert.alert('Utente Creato', successMsg);
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
    const confirmMessage = `Eliminare l'utente "${user.name}"?`;
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

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'master':
        return theme.danger;
      case 'ditta':
        return theme.secondary;
      case 'tecnico':
        return theme.primary;
      default:
        return theme.textSecondary;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'master':
        return 'Amministratore';
      case 'ditta':
        return 'Ditta';
      case 'tecnico':
        return 'Tecnico';
      default:
        return role;
    }
  };

  const renderUserCard = (user: User) => (
    <Card key={user.id} style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconContainer, { backgroundColor: getRoleColor(user.role) + '20' }]}>
          <Feather
            name={user.role?.toUpperCase() === 'TECNICO' ? 'tool' : user.role?.toUpperCase() === 'DITTA' ? 'home' : 'shield'}
            size={24}
            color={getRoleColor(user.role)}
          />
        </View>
        <View style={styles.cardInfo}>
          <ThemedText type="h4">{user.name}</ThemedText>
          <View style={styles.badges}>
            <View style={[styles.badge, { backgroundColor: getRoleColor(user.role) + '20' }]}>
              <ThemedText type="caption" style={{ color: getRoleColor(user.role) }}>
                {getRoleLabel(user.role)}
              </ThemedText>
            </View>
          </View>
        </View>
        {user.role !== 'master' ? (
          <Pressable
            onPress={() => handleDelete(user)}
            style={[styles.deleteButton, { backgroundColor: theme.danger + '20' }]}
          >
            <Feather name="trash-2" size={18} color={theme.danger} />
          </Pressable>
        ) : null}
      </View>

      {user.role !== 'master' ? (
        <View style={[styles.credentialsDisplay, { backgroundColor: theme.primaryLight, borderColor: theme.primary }]}>
          <View style={styles.credentialsDisplayHeader}>
            <Feather name="key" size={14} color={theme.primary} />
            <ThemedText type="small" style={{ color: theme.primary, fontWeight: '600', marginLeft: Spacing.xs }}>
              Credenziali Accesso
            </ThemedText>
          </View>
          <View style={styles.credentialRow}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>Username:</ThemedText>
            <ThemedText type="small" style={{ fontWeight: '600' }}>{user.username}</ThemedText>
          </View>
          <View style={styles.credentialRow}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>Password:</ThemedText>
            <View style={styles.passwordDisplay}>
              <ThemedText type="small" style={{ fontWeight: '600' }}>
                {visiblePasswords[user.id] ? (user.password || 'N/D') : '••••••••'}
              </ThemedText>
              <Pressable onPress={() => togglePasswordVisibility(user.id)}>
                <Feather 
                  name={visiblePasswords[user.id] ? 'eye-off' : 'eye'} 
                  size={16} 
                  color={theme.primary} 
                />
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}

      {user.email ? (
        <View style={styles.detailRow}>
          <Feather name="mail" size={14} color={theme.textSecondary} />
          <ThemedText type="small" style={[styles.detailText, { color: theme.textSecondary }]}>
            {user.email}
          </ThemedText>
        </View>
      ) : null}

      {user.companyName ? (
        <View style={styles.detailRow}>
          <Feather name="briefcase" size={14} color={theme.textSecondary} />
          <ThemedText type="small" style={[styles.detailText, { color: theme.textSecondary }]}>
            {user.companyName}
          </ThemedText>
        </View>
      ) : null}
    </Card>
  );

  return (
    <ScreenScrollView>
      <InlineBackButton />
      
      <View style={styles.header}>
        <ThemedText type="h2">Gestione Utenti</ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {technicians.length} tecnici, {companyAccounts.length} account ditta
        </ThemedText>
      </View>

      <Pressable
        style={[styles.addButton, { backgroundColor: theme.primary }]}
        onPress={() => setShowForm(!showForm)}
      >
        <Feather name={showForm ? 'x' : 'plus'} size={20} color="#FFFFFF" />
        <ThemedText style={styles.addButtonText}>
          {showForm ? 'Annulla' : 'Nuovo Utente'}
        </ThemedText>
      </Pressable>

      {showForm ? (
        <Card style={styles.formCard}>
          <ThemedText type="h4" style={styles.formTitle}>Nuovo Utente</ThemedText>

          <View style={styles.inputGroup}>
            <ThemedText type="small" style={styles.label}>Tipo Utente *</ThemedText>
            <View style={styles.roleButtons}>
              <Pressable
                style={[
                  styles.roleButton,
                  { borderColor: theme.border },
                  formData.role?.toUpperCase() === 'TECNICO' && { backgroundColor: theme.primary, borderColor: theme.primary },
                ]}
                onPress={() => setFormData(prev => ({ ...prev, role: 'tecnico' }))}
              >
                <Feather name="tool" size={16} color={formData.role?.toUpperCase() === 'TECNICO' ? '#FFFFFF' : theme.text} />
                <ThemedText style={[styles.roleButtonText, formData.role?.toUpperCase() === 'TECNICO' && { color: '#FFFFFF' }]}>
                  Tecnico
                </ThemedText>
              </Pressable>
              <Pressable
                style={[
                  styles.roleButton,
                  { borderColor: theme.border },
                  formData.role?.toUpperCase() === 'DITTA' && { backgroundColor: theme.secondary, borderColor: theme.secondary },
                ]}
                onPress={() => setFormData(prev => ({ ...prev, role: 'ditta' }))}
              >
                <Feather name="home" size={16} color={formData.role?.toUpperCase() === 'DITTA' ? '#FFFFFF' : theme.text} />
                <ThemedText style={[styles.roleButtonText, formData.role?.toUpperCase() === 'DITTA' && { color: '#FFFFFF' }]}>
                  Account Ditta
                </ThemedText>
              </Pressable>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <ThemedText type="small" style={styles.label}>Ditta *</ThemedText>
            <View style={styles.companyButtons}>
              {companies.map(company => (
                <Pressable
                  key={company.id}
                  style={[
                    styles.companyButton,
                    { borderColor: theme.border },
                    formData.companyId === company.id && { backgroundColor: theme.primaryLight, borderColor: theme.primary },
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, companyId: company.id }))}
                >
                  <ThemedText
                    type="small"
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
            <ThemedText style={styles.submitButtonText}>Crea Utente</ThemedText>
          </Pressable>
        </Card>
      ) : null}

      {technicians.length > 0 ? (
        <View style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>Tecnici</ThemedText>
          <View style={styles.list}>
            {technicians.map(renderUserCard)}
          </View>
        </View>
      ) : null}

      {companyAccounts.length > 0 ? (
        <View style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>Account Ditta</ThemedText>
          <View style={styles.list}>
            {companyAccounts.map(renderUserCard)}
          </View>
        </View>
      ) : null}

      {users.filter(u => u.role?.toUpperCase() === 'MASTER').length > 0 ? (
        <View style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>Amministratori</ThemedText>
          <View style={styles.list}>
            {users.filter(u => u.role?.toUpperCase() === 'MASTER').map(renderUserCard)}
          </View>
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
  roleButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  roleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  roleButtonText: {
    fontWeight: '500',
  },
  companyButtons: {
    gap: Spacing.sm,
  },
  companyButton: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  companyButtonText: {},
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
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
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
  badges: {
    flexDirection: 'row',
    marginTop: Spacing.xs,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
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
});
