import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Medication } from './storage';

// ---------------- Prescriptions ----------------
export type BackendPrescription = {
  _id?: string;
  user_id?: string;
  doctor: string;
  date: string; // YYYY-MM-DD
  medications: Medication[];
  created_at?: string;
  updated_at?: string;
};

export async function createPrescription(prescription: Omit<BackendPrescription, '_id' | 'user_id'>): Promise<{
  success: boolean;
  prescription?: BackendPrescription;
  error?: string;
}> {
  const result = await apiRequest('/prescriptions', {
    method: 'POST',
    body: JSON.stringify(prescription),
  });

  if (result.success && result.data) {
    const backendResponse = result.data as any;
    return {
      success: backendResponse.success || result.success,
      prescription: backendResponse.prescription,
      error: backendResponse.message,
    };
  }

  return { success: false, error: result.error || 'Failed to create prescription' };
}

export async function getPrescriptions(): Promise<{
  success: boolean;
  prescriptions?: BackendPrescription[];
  error?: string;
}> {
  const result = await apiRequest('/prescriptions', {
    method: 'GET',
  });

  if (result.success && result.data) {
    const backendResponse = result.data as any;
    return {
      success: backendResponse.success || result.success,
      prescriptions: backendResponse.prescriptions || [],
      error: backendResponse.message,
    };
  }

  return { success: false, prescriptions: [], error: result.error || 'Failed to get prescriptions' };
}

// Configure your Flask backend URL here
// For local development:
// - iOS Simulator: use 'http://localhost:5000/api'
// - Android Emulator: use 'http://10.0.2.2:5000/api'
// - Physical device: use your computer's local IP, e.g., 'http://192.168.1.100:5000/api'
// - Production: use your deployed server URL
const API_BASE_URL = 'http://192.168.1.35:5000/api';

const TOKEN_KEY = 'healix:access_token';
const REFRESH_TOKEN_KEY = 'healix:refresh_token';

/**
 * Store JWT tokens in AsyncStorage
 */
export async function storeTokens(accessToken: string, refreshToken: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, accessToken);
  await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

/**
 * Get access token from storage
 */
export async function getAccessToken(): Promise<string | null> {
  return await AsyncStorage.getItem(TOKEN_KEY);
}

/**
 * Get refresh token from storage
 */
export async function getRefreshToken(): Promise<string | null> {
  return await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
}

/**
 * Clear tokens from storage (on logout)
 */
export async function clearTokens(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
  await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${refreshToken}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.access_token) {
        await AsyncStorage.setItem(TOKEN_KEY, data.access_token);
        return data.access_token;
      }
    }
  } catch (error) {
    console.error('Failed to refresh token:', error);
  }

  return null;
}

/**
 * Make authenticated API request with automatic token refresh
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
  let token = await getAccessToken();
  console.log(`API: Making request to ${endpoint}, token present: ${!!token}`);

  const makeRequest = async (authToken: string | null) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Merge any additional headers from options
    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        if (typeof value === 'string') headers[key] = value;
      });
    }

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    return response;
  };

  try {
    let response = await makeRequest(token);
    console.log(`API: Response status for ${endpoint}:`, response.status);

    // If unauthorized, try refreshing token once
    if (response.status === 401 && token) {
      console.log('API: 401 received, attempting token refresh...');
      token = await refreshAccessToken();
      if (token) {
        console.log('API: Token refreshed, retrying request...');
        response = await makeRequest(token);
        console.log(`API: Retry response status for ${endpoint}:`, response.status);
      } else {
        console.log('API: Token refresh failed');
      }
    }

    const data = await response.json();
    console.log(`API: Response data for ${endpoint}:`, data);

    if (response.ok) {
      return { success: true, data };
    } else {
      return { success: false, error: data.message || 'Request failed' };
    }
  } catch (error) {
    console.error('API request failed:', error);
    return { success: false, error: 'Network error' };
  }
}

/**
 * Register a new user
 */
export async function registerUser(userData: {
  full_name: string;
  email: string;
  password: string;
  dob: string;
  gender: string;
  blood_group: string;
  height_cm?: string;
  weight_kg?: string;
  known_conditions?: string;
  allergies?: string;
  food_tolerance?: string;
  smoking?: string;
  alcohol?: string;
  physical_activity?: string;
  diet_type?: string;
}): Promise<{ success: boolean; tokens?: { access_token: string; refresh_token: string }; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      if (data.access_token && data.refresh_token) {
        await storeTokens(data.access_token, data.refresh_token);
      }
      return { success: true, tokens: { access_token: data.access_token, refresh_token: data.refresh_token } };
    } else {
      return { success: false, error: data.message || 'Registration failed' };
    }
  } catch (error) {
    console.error('Registration error:', error);
    return { success: false, error: 'Network error' };
  }
}

/**
 * Login user
 */
export async function loginUser(email: string, password: string): Promise<{ 
  success: boolean; 
  authenticated?: boolean;
  tokens?: { access_token: string; refresh_token: string }; 
  error?: string 
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (response.ok && data.success && data.authenticated) {
      if (data.access_token && data.refresh_token) {
        await storeTokens(data.access_token, data.refresh_token);
      }
      return { success: true, authenticated: true, tokens: { access_token: data.access_token, refresh_token: data.refresh_token } };
    } else {
      return { success: false, authenticated: false, error: data.message || 'Login failed' };
    }
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, authenticated: false, error: 'Network error' };
  }
}

/**
 * Get current user profile
 */
export async function getCurrentUser(): Promise<{ success: boolean; user?: any; error?: string }> {
  const result = await apiRequest('/user', { method: 'GET' });
  
  // apiRequest wraps the response in { success, data }, but the backend returns { success, user }
  // So result.data contains { success, user }
  if (result.success && result.data) {
    const backendResponse = result.data as any;
    return {
      success: backendResponse.success || result.success,
      user: backendResponse.user,
      error: backendResponse.message
    };
  }
  
  return { success: false, error: result.error || 'Failed to get user' };
}

/**
 * Logout user (clear tokens)
 */
export async function logoutUser(): Promise<void> {
  await clearTokens();
  // Optionally call backend logout endpoint if needed
  try {
    await fetch(`${API_BASE_URL}/logout`, { method: 'POST' });
  } catch (e) {
    // Ignore errors
  }
}

/**
 * Sync user data from backend and update local storage
 * Returns updated UserData or null if failed
 */
export async function syncUserFromBackend(): Promise<any | null> {
  console.log('API: Calling getCurrentUser...');
  const result = await getCurrentUser();
  
  console.log('API: getCurrentUser result:', { success: result.success, hasUser: !!result.user, error: result.error });
  
  if (!result.success || !result.user) {
    console.error('API: Failed to get user data:', result.error);
    return null;
  }

  console.log('API: User data received:', result.user);
  return result.user;
}

/**
 * Create a new medication for the current user
 */
export async function createMedication(medication: Omit<Medication, '_id' | 'user_id'>): Promise<{
  success: boolean;
  medication?: Medication;
  error?: string;
}> {
  const result = await apiRequest('/medications', {
    method: 'POST',
    body: JSON.stringify(medication),
  });

  if (result.success && result.data) {
    const backendResponse = result.data as any;
    return {
      success: backendResponse.success || result.success,
      medication: backendResponse.medication,
      error: backendResponse.message,
    };
  }

  return { success: false, error: result.error || 'Failed to create medication' };
}

/**
 * Get all medications for the current user
 */
export async function getMedications(): Promise<{
  success: boolean;
  medications?: Medication[];
  error?: string;
}> {
  const result = await apiRequest('/medications', {
    method: 'GET',
  });

  if (result.success && result.data) {
    const backendResponse = result.data as any;
    return {
      success: backendResponse.success || result.success,
      medications: backendResponse.medications || [],
      error: backendResponse.message,
    };
  }

  return { success: false, medications: [], error: result.error || 'Failed to get medications' };
}

/**
 * Update a medication
 */
export async function updateMedication(
  medicationId: string,
  updates: Partial<Medication>
): Promise<{
  success: boolean;
  medication?: Medication;
  error?: string;
}> {
  const result = await apiRequest(`/medications/${medicationId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });

  if (result.success && result.data) {
    const backendResponse = result.data as any;
    return {
      success: backendResponse.success || result.success,
      medication: backendResponse.medication,
      error: backendResponse.message,
    };
  }

  return { success: false, error: result.error || 'Failed to update medication' };
}

/**
 * Delete a medication
 */
export async function deleteMedication(medicationId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const result = await apiRequest(`/medications/${medicationId}`, {
    method: 'DELETE',
  });

  if (result.success && result.data) {
    const backendResponse = result.data as any;
    return {
      success: backendResponse.success || result.success,
      error: backendResponse.message,
    };
  }

  return { success: false, error: result.error || 'Failed to delete medication' };
}

// ---------------- OCR Upload ----------------
export type OCRExtracted = {
  doctor: string | null;
  date: string | null; // YYYY-MM-DD or raw
  medicines: Array<{
    name?: string;
    strength?: string;
    form?: string;
    dosage?: string;
    frequency_per_day?: number;
    duration_days?: number | null;
    instructions?: string;
  }>;
};

/**
 * Upload a prescription file (PDF/Image) using multipart/form-data to OCR endpoint.
 * Accepts a FormData already constructed by the caller to support native/web differences.
 */
export async function uploadPrescriptionFormData(formData: any): Promise<{
  success: boolean;
  extracted?: OCRExtracted;
  error?: string;
}> {
  try {
    const token = await getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    // Do NOT set Content-Type so boundary is set automatically
    const response = await fetch(`${API_BASE_URL}/prescriptions/ocr`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await response.json();

    if (response.ok && data && (data.success === true)) {
      return { success: true, extracted: data.extracted as OCRExtracted };
    }

    return { success: false, error: (data && data.message) || 'OCR upload failed' };
  } catch (error) {
    console.error('OCR upload error:', error);
    return { success: false, error: 'Network error' };
  }
}
