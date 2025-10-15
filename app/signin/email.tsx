import { getCurrentUser, loginUser } from '@/lib/api';
import { saveUser, type UserData } from '@/lib/storage';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

export default function EmailSignIn() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSignIn = async () => {
    setError(null);
    
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);

    // Call Flask API to login
    const result = await loginUser(email, password);

    if (!result.success || !result.authenticated) {
      setError(result.error || 'Invalid credentials');
      setLoading(false);
      return;
    }

    // Fetch user profile from backend
    const userResult = await getCurrentUser();
    
    if (userResult.success && userResult.user) {
      // Map backend user data to local storage format
      const backendUser = userResult.user;
      
      let age: number | undefined;
      if (backendUser.dob) {
        const dob = new Date(backendUser.dob);
        const now = new Date();
        age = now.getFullYear() - dob.getFullYear();
        const m = now.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
      }

      const height = backendUser.height_cm ? Number(backendUser.height_cm) : undefined;
      const weight = backendUser.weight_kg ? Number(backendUser.weight_kg) : undefined;
      
      // Calculate BMI if we have height and weight
      let bmi: number | undefined;
      if (height && weight) {
        const h = height / 100;
        bmi = Number((weight / (h * h)).toFixed(2));
      }

      const allergies = backendUser.allergies ? backendUser.allergies.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
      const conditions = backendUser.known_conditions ? backendUser.known_conditions.split(',').map((s: string) => s.trim()).filter(Boolean) : [];

      const userData: UserData = {
        name: backendUser.full_name || backendUser.email,
        age,
        gender: backendUser.gender ? (backendUser.gender.charAt(0).toUpperCase() + backendUser.gender.slice(1)) : undefined,
        blood_group: backendUser.blood_group || undefined,
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

      await saveUser(userData);
    }

    setLoading(false);
    router.replace('/dashboard' as any);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Sign in</Text>
        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@example.com"
            style={styles.input}
            editable={!loading}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            style={styles.input}
            editable={!loading}
          />
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable 
          onPress={onSignIn} 
          disabled={loading}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed, loading && styles.buttonDisabled]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign in</Text>
          )}
        </Pressable>

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>New here?</Text>
          <Pressable onPress={() => router.push('/register' as any)} disabled={loading}>
            <Text style={styles.linkText}>Create an account</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  card: { width: '100%', maxWidth: 420, backgroundColor: '#fff', borderRadius: 12, padding: 20, borderWidth: 1, borderColor: '#eee', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 1 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 16, color: '#11181C' },
  field: { marginBottom: 12 },
  label: { marginBottom: 6, color: '#11181C', fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: Platform.OS === 'web' ? 10 : 12, fontSize: 16, backgroundColor: '#fff', color: '#11181C' },
  error: { color: '#b91c1c', marginBottom: 12 },
  button: { backgroundColor: '#0a7ea4', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 10, alignItems: 'center', marginTop: 4 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  buttonPressed: { opacity: 0.9 },
  buttonDisabled: { opacity: 0.6 },
  footerRow: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginTop: 14 },
  footerText: { color: '#6B7280' },
  linkText: { color: '#0a7ea4', fontWeight: '600' },
});
