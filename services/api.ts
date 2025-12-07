// URL del backend Railway
const API_BASE_URL = 'https://gbd-solar-backend-production.up.railway.app/api';

console.log('[API] Base URL:', API_BASE_URL);

// Token e callback memorizzati
let authToken: string | null = null;
let onUnauthorizedCallback: (() => void) | null = null;

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...options.headers,
  };

  const url = `${API_BASE_URL}${endpoint}`;
  console.log('[API] Request:', options.method || 'GET', url);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Gestione 401 - token scaduto
    if (response.status === 401 && onUnauthorizedCallback) {
      console.log('[API] 401 Unauthorized - calling logout');
      onUnauthorizedCallback();
      throw new Error('Sessione scaduta');
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return data;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
    console.error('[API] Error:', errorMessage);
    throw error;
  }
}

export const api = {
  // Generic HTTP methods
  get: async <T,>(endpoint: string) => {
    return apiRequest<T>(endpoint, { method: 'GET' });
  },

  post: async <T,>(endpoint: string, body?: any) => {
    return apiRequest<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  patch: async <T,>(endpoint: string, body?: any) => {
    return apiRequest<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  put: async <T,>(endpoint: string, body?: any) => {
    return apiRequest<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  delete: async <T,>(endpoint: string) => {
    return apiRequest<T>(endpoint, { method: 'DELETE' });
  },

  // Token management
  setToken: (token: string | null) => {
    authToken = token;
    console.log('[API] Token set:', token ? 'YES' : 'NO');
  },

  setOnUnauthorized: (callback: () => void) => {
    onUnauthorizedCallback = callback;
  },

  // Auth
  login: async (username: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      
      const data = await response.json();
      console.log('[API] Login response:', JSON.stringify(data));
      
      if (!response.ok) {
        return { success: false, error: data.error || 'Login fallito', data: null };
      }
      
      return data;
    } catch (error: any) {
      console.error('[API] Login error:', error);
      return { success: false, error: error.message || 'Errore di connessione', data: null };
    }
  },

  // Users
  getUsers: async () => {
    return apiRequest<{ success: boolean; data: any[] }>('/users');
  },

  createUser: async (userData: any) => {
    return apiRequest<{ success: boolean; data: any }>('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  updateUser: async (id: string, userData: any) => {
    return apiRequest<{ success: boolean; data: any }>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  },

  deleteUser: async (id: string) => {
    return apiRequest<{ success: boolean }>(`/users/${id}`, {
      method: 'DELETE',
    });
  },

  resetPassword: async (id: string) => {
    return apiRequest<{ success: boolean; newPassword: string; message: string }>(`/users/${id}/reset-password`, {
      method: 'POST',
    });
  },

  // Companies
  getCompanies: async () => {
    return apiRequest<{ success: boolean; data: any[] }>('/companies');
  },

  createCompany: async (companyData: any) => {
    return apiRequest<{ success: boolean; data: any }>('/companies', {
      method: 'POST',
      body: JSON.stringify(companyData),
    });
  },

  updateCompany: async (id: string, companyData: any) => {
    return apiRequest<{ success: boolean; data: any }>(`/companies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(companyData),
    });
  },

  deleteCompany: async (id: string) => {
    return apiRequest<{ success: boolean }>(`/companies/${id}`, {
      method: 'DELETE',
    });
  },

  // Interventions
  getInterventions: async () => {
    return apiRequest<{ success: boolean; data: any[] }>('/interventions');
  },

  getIntervention: async (id: string) => {
    return apiRequest<{ success: boolean; data: any }>(`/interventions/${id}`);
  },

  createIntervention: async (interventionData: any) => {
    return apiRequest<{ success: boolean; data: any }>('/interventions', {
      method: 'POST',
      body: JSON.stringify(interventionData),
    });
  },

  updateIntervention: async (id: string, interventionData: any) => {
    return apiRequest<{ success: boolean; data: any }>(`/interventions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(interventionData),
    });
  },

  deleteIntervention: async (id: string) => {
    return apiRequest<{ success: boolean }>(`/interventions/${id}`, {
      method: 'DELETE',
    });
  },

  updateInterventionStatus: async (id: string, status: string, notes?: string) => {
    return apiRequest<{ success: boolean; data: any }>(`/interventions/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes }),
    });
  },

  updateInterventionGps: async (id: string, latitude: number, longitude: number) => {
    return apiRequest<{ success: boolean; data: any }>(`/interventions/${id}/gps`, {
      method: 'PUT',
      body: JSON.stringify({ latitude, longitude }),
    });
  },

  setAppointment: async (id: string, date: string, notes?: string) => {
    return apiRequest<{ success: boolean; data: any }>(`/interventions/${id}/appointment`, {
      method: 'POST',
      body: JSON.stringify({ date, notes }),
    });
  },

  // Photos
  getPhotos: async (interventionId: string) => {
    return apiRequest<{ success: boolean; data: any[] }>(`/photos/intervention/${interventionId}`);
  },

  getInterventionPhotos: async (interventionId: string) => {
    return apiRequest<{ success: boolean; data: any[] }>(`/photos/intervention/${interventionId}`);
  },

  getPhoto: async (photoId: string) => {
    return apiRequest<{ success: boolean; data: any }>(`/photos/${photoId}`);
  },

  uploadPhoto: async (interventionId: string, photoData: string, mimeType: string, description?: string) => {
    return apiRequest<{ success: boolean; data: any }>('/photos', {
      method: 'POST',
      body: JSON.stringify({
        intervention_id: interventionId,
        photo_data: photoData,
        mime_type: mimeType,
        description,
      }),
    });
  },

  uploadInterventionPhoto: async (interventionId: string, photoData: string, caption?: string) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      };
      
      console.log('[UPLOAD API] Starting upload for intervention:', interventionId, 'photoData length:', photoData.length);
      
      const response = await fetch(`${API_BASE_URL}/photos`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          intervention_id: interventionId,
          photo_data: photoData,
          mime_type: 'image/jpeg',
          description: caption,
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      const data = await response.json();
      console.log('[UPLOAD API] Response status:', response.status, 'data:', JSON.stringify(data));
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      
      return data;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        console.error('[UPLOAD API] Request timeout after 60s');
        throw new Error('Timeout: foto troppo grande o connessione lenta');
      }
      console.error('[UPLOAD API] Error:', error.message);
      throw error;
    }
  },

  saveInterventionGps: async (interventionId: string, latitude: number, longitude: number) => {
    return apiRequest<{ success: boolean; data: { id: string; latitude: number; longitude: number; locationCapturedAt: string } }>(`/interventions/${interventionId}/gps`, {
      method: 'PUT',
      body: JSON.stringify({ latitude, longitude }),
    });
  },

  deletePhoto: async (id: string) => {
    return apiRequest<{ success: boolean }>(`/photos/${id}`, {
      method: 'DELETE',
    });
  },

  // Reports
  generateReport: async (interventionId: string) => {
    return apiRequest<{ success: boolean; data: { pdf: string } }>(`/reports/intervention/${interventionId}`);
  },

  // Push Tokens
  registerPushToken: async (token: string) => {
    return apiRequest<{ success: boolean }>('/push-tokens/register', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  },

  unregisterPushToken: async (token: string) => {
    return apiRequest<{ success: boolean }>('/push-tokens/unregister', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  },

  getTechniciansLocations: async () => {
    return apiRequest<{ success: boolean; data: any[] }>('/locations/technicians');
  },

  updateMyLocation: async (latitude: number, longitude: number, accuracy?: number) => {
    return apiRequest<{ success: boolean; message: string }>('/locations/update', {
      method: 'POST',
      body: JSON.stringify({ latitude, longitude, accuracy }),
    });
  },
};
