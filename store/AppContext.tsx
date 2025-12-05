import React, { createContext, useContext, useState, useCallback, ReactNode, useMemo, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Intervention, Appointment, Company, User } from '@/types';
import { useAuth } from './AuthContext';
import { api } from '../services/api';

const COMPANIES_STORAGE_KEY = 'solartech_companies';
const USERS_STORAGE_KEY = 'solartech_users';
const INTERVENTIONS_STORAGE_KEY = 'solartech_interventions';

interface AppContextType {
  interventions: Intervention[];
  appointments: Appointment[];
  companies: Company[];
  users: User[];
  allInterventionsCount: number;
  unassignedInterventions: Intervention[];
  isRefreshing: boolean;
  refreshFromServer: () => Promise<void>;
  addIntervention: (intervention: Omit<Intervention, 'id' | 'number' | 'createdAt' | 'updatedAt'>) => Promise<boolean>;
  updateIntervention: (id: string, updates: Partial<Intervention>) => void;
  deleteIntervention: (id: string) => Promise<boolean>;
  bulkAssignToCompany: (interventionIds: string[], companyId: string, companyName: string) => void;
  assignTechnicianToIntervention: (interventionId: string, technicianId: string, technicianName: string) => Promise<boolean>;
  addAppointment: (appointment: Appointment) => void;
  updateAppointment: (id: string, appointment: Partial<Appointment>) => void;
  deleteAppointment: (id: string) => void;
  getInterventionById: (id: string) => Intervention | undefined;
  addCompany: (company: Omit<Company, 'id' | 'createdAt'>) => string;
  updateCompany: (id: string, updates: Partial<Company>) => void;
  deleteCompany: (id: string) => Promise<boolean>;
  addUser: (user: Omit<User, 'id' | 'createdAt'>, existingId?: string) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => Promise<boolean>;
  getCompanyById: (id: string) => Company | undefined;
  getUsersByCompany: (companyId: string) => User[];
  getAllInterventionsData: () => Intervention[];
  getGlobalStats: () => {
    totalInterventions: number;
    byStatus: Record<string, number>;
    byCompany: { companyId: string; companyName: string; count: number }[];
    totalCompanies: number;
    totalTechnicians: number;
    unassignedCount: number;
  };
}

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

let interventionCounter = 0;
const generateInterventionNumber = () => {
  interventionCounter++;
  return `INT-2025-${String(interventionCounter).padStart(3, '0')}`;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const { user, hasValidToken } = useAuth();
  const [interventionsData, setInterventionsData] = useState<Intervention[]>([]);
  const [appointmentsData, setAppointmentsData] = useState<Appointment[]>([]);
  const [companiesData, setCompaniesData] = useState<Company[]>([]);
  const [usersData, setUsersData] = useState<User[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const lastRefreshUserId = useRef<string | null>(null);

  useEffect(() => {
    const loadStoredData = async () => {
      try {
        console.log('[LOAD] Loading data from local storage...');
        const [storedCompanies, storedUsers, storedInterventions] = await Promise.all([
          AsyncStorage.getItem(COMPANIES_STORAGE_KEY),
          AsyncStorage.getItem(USERS_STORAGE_KEY),
          AsyncStorage.getItem(INTERVENTIONS_STORAGE_KEY),
        ]);

        if (storedCompanies) {
          const parsed = JSON.parse(storedCompanies);
          console.log('[LOAD] Found stored companies:', parsed.length);
          setCompaniesData(parsed);
        } else {
          console.log('[LOAD] No stored companies found');
        }

        if (storedUsers) {
          const parsed = JSON.parse(storedUsers);
          console.log('[LOAD] Found stored users:', parsed.length);
          setUsersData(parsed);
        } else {
          console.log('[LOAD] No stored users found');
        }

        if (storedInterventions) {
          const parsed: Intervention[] = JSON.parse(storedInterventions);
          console.log('[LOAD] Found stored interventions:', parsed.length);
          setInterventionsData(parsed);
          if (parsed.length > 0) {
            const maxNum = Math.max(...parsed.map(i => {
              const match = i.number?.match(/INT-2025-(\d+)/);
              return match ? parseInt(match[1]) : 0;
            }));
            interventionCounter = maxNum;
          }
        } else {
          console.log('[LOAD] No stored interventions found');
        }
      } catch (error) {
        console.error('Error loading stored data:', error);
      } finally {
        setIsDataLoaded(true);
      }
    };

    loadStoredData();
  }, []);

  useEffect(() => {
    if (!isDataLoaded) return;
    if (companiesData.length > 0) {
      console.log('[SAVE] Saving companies:', companiesData.length);
      AsyncStorage.setItem(COMPANIES_STORAGE_KEY, JSON.stringify(companiesData))
        .then(() => console.log('[SAVE] Companies saved successfully'))
        .catch(err => console.error('[SAVE] Error saving companies:', err));
    } else {
      AsyncStorage.removeItem(COMPANIES_STORAGE_KEY);
    }
  }, [companiesData, isDataLoaded]);

  useEffect(() => {
    if (!isDataLoaded) return;
    if (usersData.length > 0) {
      console.log('[SAVE] Saving users:', usersData.length);
      AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersData));
    } else {
      AsyncStorage.removeItem(USERS_STORAGE_KEY);
    }
  }, [usersData, isDataLoaded]);

  useEffect(() => {
    if (!isDataLoaded) return;
    if (interventionsData.length > 0) {
      console.log('[SAVE] Saving interventions:', interventionsData.length);
      AsyncStorage.setItem(INTERVENTIONS_STORAGE_KEY, JSON.stringify(interventionsData))
        .then(() => console.log('[SAVE] Interventions saved successfully'))
        .catch(err => console.error('[SAVE] Error saving interventions:', err));
    } else {
      AsyncStorage.removeItem(INTERVENTIONS_STORAGE_KEY);
    }
  }, [interventionsData, isDataLoaded]);

  const refreshFromServer = useCallback(async () => {
    if (!hasValidToken) {
      console.log('[REFRESH] No valid token, skipping server refresh');
      return;
    }

    console.log('[REFRESH] Starting server sync...');
    setIsRefreshing(true);

    try {
      await AsyncStorage.multiRemove([
        COMPANIES_STORAGE_KEY,
        USERS_STORAGE_KEY,
        INTERVENTIONS_STORAGE_KEY,
      ]);
      console.log('[REFRESH] Cleared local cache');

      const response = await api.getInterventions();
      console.log('[REFRESH] API response:', response.success, response.data?.length || 0, 'interventions');

      if (response.success && response.data) {
        const serverInterventions: Intervention[] = response.data.map((serverInt: any) => ({
          id: String(serverInt.id),
          number: serverInt.number,
          client: {
            name: serverInt.clientName || serverInt.client?.name || '',
            address: serverInt.clientAddress || serverInt.client?.address || '',
            civicNumber: serverInt.clientCivicNumber || serverInt.client?.civicNumber || '',
            cap: serverInt.clientPostalCode || serverInt.client?.cap || '',
            city: serverInt.clientCity || serverInt.client?.city || '',
            phone: serverInt.clientPhone || serverInt.client?.phone || '',
            email: serverInt.clientEmail || serverInt.client?.email || '',
          },
          companyId: serverInt.companyId ? String(serverInt.companyId) : null,
          companyName: serverInt.companyName || serverInt.company?.name || null,
          technicianId: serverInt.technicianId ? String(serverInt.technicianId) : null,
          technicianName: serverInt.technicianName || serverInt.technician?.name || null,
          category: serverInt.category || serverInt.type,
          description: serverInt.description,
          priority: serverInt.priority,
          assignedAt: serverInt.assignedAt ? new Date(serverInt.assignedAt).getTime() : Date.now(),
          assignedBy: serverInt.assignedBy || 'Admin',
          status: serverInt.status,
          location: serverInt.locationLatitude ? {
            latitude: serverInt.locationLatitude,
            longitude: serverInt.locationLongitude,
            address: serverInt.locationAddress || '',
            timestamp: serverInt.locationTimestamp ? new Date(serverInt.locationTimestamp).getTime() : Date.now(),
          } : undefined,
          documentation: {
            photos: serverInt.documentationPhotos || [],
            notes: serverInt.documentationNotes || '',
            startedAt: serverInt.startedAt ? new Date(serverInt.startedAt).getTime() : undefined,
            completedAt: serverInt.completedAt ? new Date(serverInt.completedAt).getTime() : undefined,
          },
          createdAt: serverInt.createdAt ? new Date(serverInt.createdAt).getTime() : Date.now(),
          updatedAt: serverInt.updatedAt ? new Date(serverInt.updatedAt).getTime() : Date.now(),
        }));

        console.log('[REFRESH] Mapped', serverInterventions.length, 'interventions from server');
        setInterventionsData(serverInterventions);
        
        if (serverInterventions.length > 0) {
          const maxNum = Math.max(...serverInterventions.map(i => {
            const match = i.number?.match(/INT-2025-(\d+)/);
            return match ? parseInt(match[1]) : 0;
          }));
          interventionCounter = maxNum;
        }
        
        setAppointmentsData([]);
      } else {
        console.log('[REFRESH] API failed, keeping local data');
      }

      const companiesResponse = await api.getCompanies();
      const companiesArray = Array.isArray(companiesResponse) 
        ? companiesResponse 
        : (companiesResponse.data || []);
      
      if (companiesArray.length > 0) {
        const serverCompanies: Company[] = companiesArray.map((c: any) => ({
          id: String(c.id),
          name: c.name,
          address: c.address || '',
          phone: c.phone || '',
          email: c.email || '',
          username: c.username || '',
          createdAt: c.created_at ? new Date(c.created_at).getTime() : Date.now(),
        }));
        console.log('[REFRESH] Loaded', serverCompanies.length, 'companies from server');
        setCompaniesData(serverCompanies);
      } else {
        console.log('[REFRESH] No companies found on server');
        setCompaniesData([]);
      }

      const usersResponse = await api.getUsers();
      const usersArray = Array.isArray(usersResponse)
        ? usersResponse
        : (usersResponse.data || []);
      
      if (usersArray.length > 0) {
        const serverUsers: User[] = usersArray.map((u: any) => ({
          id: String(u.id),
          username: u.username,
          role: u.role,
          name: u.name || u.username,
          email: u.email || '',
          phone: u.phone || '',
          companyId: u.company_id ? String(u.company_id) : null,
          companyName: u.companyName || null,
          createdAt: u.created_at ? new Date(u.created_at).getTime() : Date.now(),
        }));
        console.log('[REFRESH] Loaded', serverUsers.length, 'users from server');
        setUsersData(serverUsers);
      } else {
        console.log('[REFRESH] No users found on server');
        setUsersData([]);
      }
    } catch (error) {
      console.error('[REFRESH] Error:', error);
    } finally {
      setIsRefreshing(false);
      console.log('[REFRESH] Sync complete');
    }
  }, [hasValidToken]);

  useEffect(() => {
    if (!user || !hasValidToken || !isDataLoaded) return;
    
    if (lastRefreshUserId.current !== user.id) {
      console.log('[REFRESH AUTO] New user login detected, syncing from server...');
      lastRefreshUserId.current = user.id;
      refreshFromServer();
    }
  }, [user, hasValidToken, isDataLoaded, refreshFromServer]);

  const interventions = useMemo(() => {
    if (!user) {
      console.log('[INTERVENTIONS] No user, returning empty array');
      return [];
    }
    const role = user.role?.toLowerCase();
    console.log('[INTERVENTIONS] User role:', user.role, '-> normalized:', role);
    console.log('[INTERVENTIONS] Total interventionsData:', interventionsData.length);
    switch (role) {
      case 'master':
        console.log('[INTERVENTIONS] MASTER - returning all', interventionsData.length, 'interventions');
        return interventionsData;
      case 'ditta':
        console.log('[DEBUG] DITTA Login - user.companyId:', user.companyId);
        const filtered = interventionsData.filter(i => i.companyId === user.companyId);
        console.log('[DEBUG] Filtered interventions count:', filtered.length);
        return filtered;
      case 'tecnico':
        console.log('[DEBUG] TECNICO Login - user.id:', user.id);
        const tecnicoFiltered = interventionsData.filter(i =>
          i.companyId === user.companyId &&
          (i.technicianId === user.id || i.technicianId === null)
        );
        console.log('[DEBUG] TECNICO filtered count:', tecnicoFiltered.length);
        return tecnicoFiltered;
      default:
        return [];
    }
  }, [user, interventionsData]);

  const appointments = useMemo(() => {
    if (!user) return [];
    const visibleIds = new Set(interventions.map(i => i.id));
    return appointmentsData.filter(a =>
      a.interventionId ? visibleIds.has(a.interventionId) : true
    );
  }, [user, appointmentsData, interventions]);

  const companies = useMemo(() => {
    if (!user) return [];
    const role = user.role?.toLowerCase();
    if (role === 'master') return companiesData;
    if (role === 'ditta') return companiesData.filter(c => c.id === user.companyId);
    return [];
  }, [user, companiesData]);

  const users = useMemo(() => {
    if (!user) return [];
    const role = user.role?.toLowerCase();
    if (role === 'master') return usersData;
    if (role === 'ditta') return usersData.filter(u => u.companyId === user.companyId);
    return [];
  }, [user, usersData]);

  const addIntervention = useCallback(async (intervention: Omit<Intervention, 'id' | 'number' | 'createdAt' | 'updatedAt'>): Promise<boolean> => {
    console.log('[CREATE] Starting addIntervention, hasValidToken:', hasValidToken);
    const now = Date.now();
    const localId = generateId();
    const localNumber = generateInterventionNumber();
    
    const newIntervention: Intervention = {
      ...intervention,
      id: localId,
      number: localNumber,
      createdAt: now,
      updatedAt: now,
    };
    
    setInterventionsData(prev => [newIntervention, ...prev]);
    
    if (hasValidToken) {
      try {
        console.log('[CREATE] Saving intervention to server...');
        const fullAddress = [
          intervention.client?.address,
          intervention.client?.civicNumber,
          intervention.client?.cap,
          intervention.client?.city
        ].filter(Boolean).join(' ');
        
        const response = await api.createIntervention({
          clientName: intervention.client?.name || '',
          address: fullAddress || '',
          phone: intervention.client?.phone || '',
          email: intervention.client?.email || '',
          type: intervention.category || 'installazione',
          priority: intervention.priority || 'normale',
          description: intervention.description || '',
          technicianId: intervention.technicianId || null,
          companyId: intervention.companyId || null,
        });
        
        if (response.success && response.data) {
          console.log('[CREATE] Server saved, ID:', response.data.id, 'Number:', response.data.number);
          setInterventionsData(prev => prev.map(i => 
            i.id === localId 
              ? { 
                  ...i, 
                  id: String(response.data.id), 
                  number: response.data.number || localNumber 
                }
              : i
          ));
          return true;
        } else {
          console.warn('[CREATE] Server save failed:', response);
          setInterventionsData(prev => prev.filter(i => i.id !== localId));
          return false;
        }
      } catch (error) {
        console.error('[CREATE] Error saving to server:', error);
        setInterventionsData(prev => prev.filter(i => i.id !== localId));
        return false;
      }
    }
    
    return true;
  }, [hasValidToken]);

  const updateIntervention = useCallback((id: string, updates: Partial<Intervention>) => {
    setInterventionsData(prev =>
      prev.map(i => (i.id === id ? { ...i, ...updates, updatedAt: Date.now() } : i))
    );
  }, []);

  const deleteIntervention = useCallback(async (id: string): Promise<boolean> => {
    // Rimuovi localmente prima per feedback immediato
    setInterventionsData(prev => prev.filter(i => i.id !== id));
    
    if (hasValidToken) {
      try {
        console.log('[DELETE] Deleting intervention', id, 'from server...');
        const response = await api.delete<{ success: boolean }>(`/interventions/${id}`);
        console.log('[DELETE] Server response:', response);
        
        if (response.success) {
          console.log('[DELETE] Intervention deleted successfully from server');
          return true;
        } else {
          console.warn('[DELETE] Server delete failed, refreshing data...');
          return false;
        }
      } catch (error) {
        console.error('[DELETE] Error deleting intervention:', error);
        return false;
      }
    }
    return true;
  }, [hasValidToken]);

  const bulkAssignToCompany = useCallback(async (interventionIds: string[], companyId: string, companyName: string) => {
    const now = Date.now();
    
    setInterventionsData(prev =>
      prev.map(i =>
        interventionIds.includes(i.id)
          ? { 
              ...i, 
              companyId, 
              companyName, 
              assignedAt: now,
              assignedBy: 'Admin',
              status: 'assegnato' as const,
              updatedAt: now,
            }
          : i
      )
    );

    if (hasValidToken) {
      console.log('[ASSIGN] Saving', interventionIds.length, 'interventions to company', companyId);
      
      for (const id of interventionIds) {
        try {
          const response = await api.put<{ success: boolean }>(`/interventions/${id}`, {
            companyId: companyId,
            status: 'assegnato',
          });
          console.log('[ASSIGN] Saved intervention', id, 'result:', response);
        } catch (error) {
          console.error('[ASSIGN] Error saving intervention', id, ':', error);
        }
      }
    }
  }, [hasValidToken]);

  const assignTechnicianToIntervention = useCallback(async (
    interventionId: string, 
    technicianId: string, 
    technicianName: string
  ): Promise<boolean> => {
    const now = Date.now();
    
    setInterventionsData(prev =>
      prev.map(i =>
        i.id === interventionId
          ? { 
              ...i, 
              technicianId,
              technician: { id: technicianId, name: technicianName },
              updatedAt: now,
            }
          : i
      )
    );

    if (hasValidToken) {
      try {
        console.log('[ASSIGN TECH] Assigning technician', technicianId, 'to intervention', interventionId);
        const response = await api.put<any>(`/interventions/${interventionId}`, {
          technicianId: Number(technicianId),
        });
        console.log('[ASSIGN TECH] Server response:', response);
        
        if (response.id || response.success) {
          console.log('[ASSIGN TECH] Technician assigned successfully');
          return true;
        } else {
          console.warn('[ASSIGN TECH] Server assignment failed');
          return false;
        }
      } catch (error) {
        console.error('[ASSIGN TECH] Error:', error);
        return false;
      }
    }
    return true;
  }, [hasValidToken]);

  const unassignedInterventions = useMemo(() => {
    return interventionsData.filter(i => !i.companyId);
  }, [interventionsData]);

  const addAppointment = useCallback((appointment: Appointment) => {
    setAppointmentsData(prev => [...prev, { ...appointment, id: appointment.id || generateId() }]);
  }, []);

  const updateAppointment = useCallback((id: string, updates: Partial<Appointment>) => {
    setAppointmentsData(prev => prev.map(a => (a.id === id ? { ...a, ...updates } : a)));
  }, []);

  const deleteAppointment = useCallback((id: string) => {
    setAppointmentsData(prev => prev.filter(a => a.id !== id));
  }, []);

  const getInterventionById = useCallback(
    (id: string) => interventionsData.find(i => i.id === id),
    [interventionsData]
  );

  const addCompany = useCallback((company: Omit<Company, 'id' | 'createdAt'>): string => {
    const companyId = generateId();
    const newCompany: Company = {
      ...company,
      id: companyId,
      createdAt: Date.now(),
    };
    setCompaniesData(prev => {
      const updated = [...prev, newCompany];
      console.log('[SAVE IMMEDIATE] Saving company:', newCompany.name, 'with id:', companyId);
      AsyncStorage.setItem(COMPANIES_STORAGE_KEY, JSON.stringify(updated))
        .then(() => console.log('[SAVE IMMEDIATE] Company saved'))
        .catch(err => console.error('[SAVE IMMEDIATE] Error:', err));
      return updated;
    });
    return companyId;
  }, []);

  const updateCompany = useCallback((id: string, updates: Partial<Company>) => {
    setCompaniesData(prev => prev.map(c => (c.id === id ? { ...c, ...updates } : c)));
  }, []);

  const deleteCompany = useCallback(async (id: string): Promise<boolean> => {
    // Rimuovi localmente prima per feedback immediato
    setCompaniesData(prev => prev.filter(c => c.id !== id));
    
    if (hasValidToken) {
      try {
        console.log('[DELETE] Deleting company', id, 'from server...');
        const response = await api.delete<{ success: boolean }>(`/companies/${id}`);
        console.log('[DELETE] Server response:', response);
        
        if (response.success) {
          console.log('[DELETE] Company deleted successfully from server');
          return true;
        } else {
          console.warn('[DELETE] Server delete failed');
          return false;
        }
      } catch (error) {
        console.error('[DELETE] Error deleting company:', error);
        return false;
      }
    }
    return true;
  }, [hasValidToken]);

  const addUser = useCallback((user: Omit<User, 'id' | 'createdAt'>, existingId?: string) => {
    const newUser: User = {
      ...user,
      id: existingId || generateId(),
      createdAt: Date.now(),
    };
    setUsersData(prev => [...prev, newUser]);
  }, []);

  const updateUser = useCallback((id: string, updates: Partial<User>) => {
    setUsersData(prev => {
      const updated = prev.map(u => (u.id === id ? { ...u, ...updates } : u));
      AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updated))
        .then(() => console.log('[UPDATE USER] User updated and saved'))
        .catch(err => console.error('[UPDATE USER] Error saving:', err));
      return updated;
    });
  }, []);

  const deleteUser = useCallback(async (id: string): Promise<boolean> => {
    // Rimuovi localmente prima per feedback immediato
    setUsersData(prev => prev.filter(u => u.id !== id));
    
    if (hasValidToken) {
      try {
        console.log('[DELETE] Deleting user', id, 'from server...');
        const response = await api.delete<{ success: boolean }>(`/users/${id}`);
        console.log('[DELETE] Server response:', response);
        
        if (response.success) {
          console.log('[DELETE] User deleted successfully from server');
          return true;
        } else {
          console.warn('[DELETE] Server delete failed');
          return false;
        }
      } catch (error) {
        console.error('[DELETE] Error deleting user:', error);
        return false;
      }
    }
    return true;
  }, [hasValidToken]);

  const getCompanyById = useCallback(
    (id: string) => companiesData.find(c => c.id === id),
    [companiesData]
  );

  const getUsersByCompany = useCallback(
    (companyId: string) => usersData.filter(u => u.companyId === companyId),
    [usersData]
  );

  const getGlobalStats = useCallback(() => {
    const byStatus: Record<string, number> = {};
    const byCompanyMap: Record<string, { companyName: string; count: number }> = {};

    interventionsData.forEach(i => {
      byStatus[i.status] = (byStatus[i.status] || 0) + 1;
      if (i.companyId) {
        if (!byCompanyMap[i.companyId]) {
          byCompanyMap[i.companyId] = { companyName: i.companyName || 'Senza Ditta', count: 0 };
        }
        byCompanyMap[i.companyId].count++;
      }
    });

    const byCompany = Object.entries(byCompanyMap).map(([companyId, data]) => ({
      companyId,
      companyName: data.companyName,
      count: data.count,
    }));

    const unassignedCount = interventionsData.filter(i => !i.companyId).length;

    return {
      totalInterventions: interventionsData.length,
      byStatus,
      byCompany,
      totalCompanies: companiesData.length,
      totalTechnicians: usersData.filter(u => u.role?.toLowerCase() === 'tecnico').length,
      unassignedCount,
    };
  }, [interventionsData, companiesData, usersData]);

  return (
    <AppContext.Provider
      value={{
        interventions,
        appointments,
        companies,
        users,
        allInterventionsCount: interventionsData.length,
        unassignedInterventions,
        isRefreshing,
        refreshFromServer,
        addIntervention,
        updateIntervention,
        deleteIntervention,
        bulkAssignToCompany,
        assignTechnicianToIntervention,
        addAppointment,
        updateAppointment,
        deleteAppointment,
        getInterventionById,
        addCompany,
        updateCompany,
        deleteCompany,
        addUser,
        updateUser,
        deleteUser,
        getCompanyById,
        getUsersByCompany,
        getAllInterventionsData: () => interventionsData,
        getGlobalStats,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
