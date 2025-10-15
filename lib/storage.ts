import AsyncStorage from '@react-native-async-storage/async-storage';

export type Medication = {
  _id?: string;
  user_id?: string;

  name: string;                      // Generic or brand name
  brand_name?: string;               // Optional, helps with clarity
  form?: 'tablet' | 'syrup' | 'capsule' | 'injection'; // Medication form
  strength?: string;                 // Dose strength (e.g., "500mg")
  dosage?: string;                   // Per intake (e.g., "1 tablet")
  frequency_per_day: number;         // Times per day
  times: string[];                   // Exact intake times (e.g., ["08:00", "20:00"])
  duration_days: number;             // Total number of days
  start_date: string;                // When the course begins (YYYY-MM-DD)
  end_date?: string;                 // Auto-calculated from start + duration
  instructions?: string;             // Doctor's notes (optional)

  // Meta
  source?: 'prescription_scan' | 'manual_add' | 'barcode_scan';
  status: 'active' | 'completed' | 'stopped';
  created_at?: string;               // ISO timestamp
  updated_at?: string;               // ISO timestamp
};

export type Prescription = {
  id?: string;
  doctor: string;
  date: string; // ISO or YYYY-MM-DD
  medicine_count: number;
};

export type ReportValue = {
  name: string;
  value: string; // e.g., "13.8"
  unit?: string; // e.g., "g/dL"
  ref?: string; // e.g., "13.5–17.5"
  flag?: 'low' | 'high' | 'normal';
};

export type Report = {
  id?: string;
  name: string;
  date: string; // ISO or YYYY-MM-DD
  summary: string;
  file_uri?: string; // local file uri from DocumentPicker
  mime_type?: string;
  size_bytes?: number;
  values?: ReportValue[];
};

export type Reminder = {
  id?: string;
  type: 'medication' | 'appointment' | 'test';
  message: string;
  time: string; // e.g., "8:00 PM"
  done?: boolean;
};

export type UserData = {
  name: string;
  age?: number;
  gender?: string;
  blood_group?: string;
  height_cm?: number;
  weight_kg?: number;
  bmi?: number;
  allergies?: string[];
  conditions?: string[];
  medications?: Medication[];
  prescriptions?: Prescription[];
  reports?: Report[];
  reminders?: Reminder[];
  last_sync?: string; // ISO
};

const USER_KEY = 'healix:user';

export async function loadUser(): Promise<UserData | null> {
  try {
    const raw = await AsyncStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to load user', e);
    return null;
  }
}

export async function saveUser(user: UserData): Promise<void> {
  try {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (e) {
    console.warn('Failed to save user', e);
  }
}

export async function clearUser(): Promise<void> {
  try {
    await AsyncStorage.removeItem(USER_KEY);
  } catch (e) {
    console.warn('Failed to clear user', e);
  }
}

export async function updateUser(patch: Partial<UserData>): Promise<UserData | null> {
  const current = (await loadUser()) ?? {} as UserData;
  const next = { ...current, ...patch } as UserData;
  await saveUser(next);
  return next;
}

export function calcBMI(height_cm?: number, weight_kg?: number): number | undefined {
  if (!height_cm || !weight_kg) return undefined;
  const h = height_cm / 100;
  const bmi = weight_kg / (h * h);
  return Number(bmi.toFixed(2));
}

export function getSampleUser(): UserData {
  return {
    name: 'Rahul Sharma',
    age: 27,
    gender: 'Male',
    blood_group: 'B+',
    height_cm: 172,
    weight_kg: 68,
    bmi: 22.99,
    allergies: ['Penicillin'],
    conditions: ['Diabetes'],
    medications: [
      {
        name: 'Metformin',
        brand_name: 'Glucophage',
        form: 'tablet',
        strength: '500mg',
        dosage: '1 tablet',
        frequency_per_day: 2,
        times: ['08:00', '20:00'],
        duration_days: 30,
        start_date: '2025-10-01',
        end_date: '2025-10-31',
        instructions: 'After food',
        source: 'manual_add',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        name: 'Paracetamol',
        brand_name: 'Calpol 500',
        form: 'tablet',
        strength: '500mg',
        dosage: '1 tablet',
        frequency_per_day: 3,
        times: ['08:00', '14:00', '21:00'],
        duration_days: 5,
        start_date: '2025-10-12',
        end_date: '2025-10-17',
        instructions: 'After food',
        source: 'manual_add',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    prescriptions: [
      { id: 'rx-1', doctor: 'Dr. Mehta', date: '2025-10-12', medicine_count: 3 },
    ],
    reports: [
      {
        id: 'rep-1',
        name: 'Complete Blood Count (CBC)',
        date: '2025-10-10',
        summary: 'All parameters within normal limits.',
        values: [
          { name: 'Hemoglobin', value: '13.8', unit: 'g/dL', ref: '13.5–17.5', flag: 'normal' },
          { name: 'WBC', value: '6.5', unit: 'x10^3/µL', ref: '4.0–11.0', flag: 'normal' },
          { name: 'Platelets', value: '250', unit: 'x10^3/µL', ref: '150–400', flag: 'normal' },
          { name: 'RBC', value: '4.9', unit: 'x10^6/µL', ref: '4.5–5.9', flag: 'normal' },
          { name: 'MCV', value: '88', unit: 'fL', ref: '80–100', flag: 'normal' },
          { name: 'MCH', value: '29', unit: 'pg', ref: '27–33', flag: 'normal' },
          { name: 'MCHC', value: '33', unit: 'g/dL', ref: '32–36', flag: 'normal' },
        ],
      },
      {
        id: 'rep-2',
        name: 'Lipid Profile',
        date: '2025-09-22',
        summary: 'Desirable lipid profile.',
        values: [
          { name: 'Total Cholesterol', value: '178', unit: 'mg/dL', ref: '< 200', flag: 'normal' },
          { name: 'LDL-C', value: '98', unit: 'mg/dL', ref: '< 100', flag: 'normal' },
          { name: 'HDL-C', value: '52', unit: 'mg/dL', ref: '> 40', flag: 'normal' },
          { name: 'Triglycerides', value: '130', unit: 'mg/dL', ref: '< 150', flag: 'normal' },
          { name: 'Chol/HDL Ratio', value: '3.4', unit: '', ref: '< 5.0', flag: 'normal' },
        ],
      },
    ],
    reminders: [
      { id: 'rem-1', type: 'medication', message: 'Take Paracetamol 500mg', time: '8:00 PM', done: false },
    ],
    last_sync: new Date().toISOString(),
  };
}
