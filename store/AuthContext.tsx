import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';

interface AuthUser {
  id: string;
  username: string;
  role: 'master' | 'ditta' | 'tecnico';
  name: string;
  email: string;
  companyId: string | null;
  companyName: string | null;
}

interface RegisterUserData {
  username: string;
  password: string;
  name: string;
  email?: string;
  phone?: string;
  role: 'ditta' | 'tecnico';
  companyId: string;
  companyName?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasValidToken: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  registerUser: (userData: RegisterUserData) => Promise<{ success: boolean; error?: string; userId?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'solartech_auth_token';
const USER_KEY = 'solartech_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasValidToken, setHasValidToken] = useState(false);

  const handleUnauthorized = useCallback(async () => {
    console.log('[AUTH] Token scaduto o non valido - logout automatico');
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(USER_KEY);
    } catch (e) {
      console.error('[AUTH] Errore pulizia storage:', e);
    }
    api.setToken(null);
    setUser(null);
    setHasValidToken(false);
  }, []);

  const loadStoredAuth = useCallback(async () => {
    try {
      api.setOnUnauthorized(handleUnauthorized);
      
      const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
      const storedUser = await AsyncStorage.getItem(USER_KEY);
      
      if (storedToken && storedUser) {
        console.log('[AUTH] Sessione trovata, ripristino...');
        api.setToken(storedToken);
        setUser(JSON.parse(storedUser));
        setHasValidToken(true);
        console.log('[AUTH] Sessione ripristinata');
      } else {
        console.log('[AUTH] Nessuna sessione salvata');
        setUser(null);
        setHasValidToken(false);
      }
    } catch (error) {
      console.error('[AUTH] Errore caricamento sessione:', error);
    } finally {
      setIsLoading(false);
    }
  }, [handleUnauthorized]);

  useEffect(() => {
    loadStoredAuth();
  }, [loadStoredAuth]);

  const login = useCallback(async (username: string, password: string) => {
    console.log('[AUTH] Login in corso per:', username);
    
    try {
      const result = await api.login(username, password);
      
      if (result.success && result.data) {
        const { token, user: userData } = result.data;
        
        if (!token || !userData || !userData.role) {
          console.log('[AUTH] Risposta server non valida');
          return { success: false, error: 'Risposta del server non valida. Riprova.' };
        }
        
        console.log('[AUTH] Login riuscito');
        
        const rawCompanyId = userData.company?.id || userData.companyId;
        const normalizedUser: AuthUser = {
          id: String(userData.id),
          username: userData.username,
          name: userData.name || userData.username,
          email: userData.email || '',
          role: userData.role.toLowerCase() as 'master' | 'ditta' | 'tecnico',
          companyId: rawCompanyId ? String(rawCompanyId) : null,
          companyName: userData.company?.name || userData.companyName || null,
        };
        
        await AsyncStorage.setItem(TOKEN_KEY, token);
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(normalizedUser));
        api.setToken(token);
        setUser(normalizedUser);
        setHasValidToken(true);
        
        return { success: true };
      } else {
        const errorMsg = result.error || 'Credenziali non valide';
        console.log('[AUTH] Login fallito:', errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch (error: any) {
      console.error('[AUTH] Errore di rete:', error);
      const errorMessage = error?.message || 'Impossibile connettersi al server. Verifica la connessione internet.';
      return { success: false, error: errorMessage };
    }
  }, []);

  const logout = useCallback(async () => {
    console.log('[AUTH] Logout in corso...');
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(USER_KEY);
      api.setToken(null);
      setUser(null);
      setHasValidToken(false);
      console.log('[AUTH] Logout completato');
    } catch (error) {
      console.error('[AUTH] Errore durante logout:', error);
    }
  }, []);

  const registerUser = useCallback(async (userData: RegisterUserData): Promise<{ success: boolean; error?: string; userId?: string }> => {
    console.log('[AUTH] Registrazione utente:', userData.username);
    
    try {
      const response = await fetch('https://gbd-solar-backend-production.up.railway.app/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: userData.username,
          password: userData.password,
          name: userData.name,
          email: userData.email || null,
          role: userData.role,
          companyId: userData.companyId,
        }),
      });
      
      const data = await response.json();
      console.log('[AUTH] Risposta registrazione:', JSON.stringify(data));
      
      if (!response.ok) {
        return { success: false, error: data.error || 'Errore durante la registrazione' };
      }
      
      console.log('[AUTH] Utente registrato con successo');
      return { success: true, userId: String(data.user?.id) };
    } catch (error: any) {
      console.error('[AUTH] Errore registrazione:', error);
      return { success: false, error: error?.message || 'Errore di connessione al server' };
    }
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: user !== null,
    hasValidToken,
    login,
    logout,
    registerUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve essere usato dentro AuthProvider');
  }
  return context;
}
