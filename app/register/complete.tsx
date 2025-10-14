import { getBasics, getDetails as getRegDetails, resetRegistration } from '@/lib/registration-store';
import { calcBMI, saveUser, type UserData } from '@/lib/storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function RegisterComplete() {
  const router = useRouter();
  const [name, setName] = useState('');

  useEffect(() => {
    const basics = getBasics();
    if (basics) setName(basics.name);
  }, []);

  const goHome = async () => {
    // Compose MVP user data from registration draft and store locally
    const basics = getBasics();
    const details = getRegDetails?.();
    if (basics && details) {
      // Compute age from DOB
      let age: number | undefined;
      if (details.dob) {
        const dob = new Date(details.dob);
        const now = new Date();
        age = now.getFullYear() - dob.getFullYear();
        const m = now.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
      }
      const height = details.height_cm ? Number(details.height_cm) : undefined;
      const weight = details.weight_kg ? Number(details.weight_kg) : undefined;
      const bmi = calcBMI(height, weight);
      const allergies = details.allergies ? details.allergies.split(',').map((s) => s.trim()).filter(Boolean) : [];
      const conditions = details.known_conditions ? details.known_conditions.split(',').map((s) => s.trim()).filter(Boolean) : [];

      const user: UserData = {
        name: basics.name,
        age,
        gender: details.gender ? (details.gender.charAt(0).toUpperCase() + details.gender.slice(1)) : undefined,
        blood_group: details.blood_group || undefined,
        height_cm: height,
        weight_kg: weight,
        bmi,
        allergies,
        conditions,
        medications: [],
        prescriptions: [],
        reports: [],
        reminders: [],
        last_sync: new Date().toISOString(),
      };
      await saveUser(user);
    }
    resetRegistration();
    router.replace('/dashboard' as any);
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Welcome to Healix{name ? `, ${name}` : ''}!</Text>
        <Text style={styles.subtitle}>Your account has been created.</Text>
        <Pressable onPress={goHome} style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
          <Text style={styles.buttonText}>Go to Home</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  card: { width: '100%', maxWidth: 520, backgroundColor: '#fff', borderRadius: 12, padding: 20, borderWidth: 1, borderColor: '#eee', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 1, alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 8, color: '#11181C', textAlign: 'center' },
  subtitle: { color: '#6B7280', marginBottom: 16, textAlign: 'center' },
  button: { backgroundColor: '#0a7ea4', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 10, alignItems: 'center', marginTop: 4, minWidth: 160 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  buttonPressed: { opacity: 0.9 },
});
