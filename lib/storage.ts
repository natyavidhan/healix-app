import AsyncStorage from '@react-native-async-storage/async-storage';

export type Medication = {
  name: string;
  dosage: string;
  frequency: string; // e.g., "2/day"
  next_dose: string; // e.g., "8:00 PM"
  status: 'taken' | 'upcoming';
};

export type Prescription = {
  id?: string;
  doctor: string;
  date: string; // ISO or YYYY-MM-DD
  medicine_count: number;
};

export type Report = {
  id?: string;
  name: string;
  date: string; // ISO or YYYY-MM-DD
  summary: string;
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
      { name: 'Metformin', dosage: '500mg', frequency: '2/day', next_dose: '8:00 PM', status: 'upcoming' },
      { name: 'Paracetamol', dosage: '500mg', frequency: '3/day', next_dose: '9:00 PM', status: 'upcoming' },
    ],
    prescriptions: [
      { id: 'rx-1', doctor: 'Dr. Mehta', date: '2025-10-12', medicine_count: 3 },
    ],
    reports: [
      { id: 'rep-1', name: 'Blood Test', date: '2025-10-10', summary: 'All parameters normal' },
    ],
    reminders: [
      { id: 'rem-1', type: 'medication', message: 'Take Paracetamol 500mg', time: '8:00 PM', done: false },
    ],
    last_sync: new Date().toISOString(),
  };
}
