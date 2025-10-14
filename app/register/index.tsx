import { setBasics } from '@/lib/registration-store';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

export default function RegisterBasics() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onNext = () => {
    setError(null);
    if (!name || !email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setBasics({ name, email, password });
  router.push('/register/details' as any);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Create your account</Text>
        <View style={styles.field}>
          <Text style={styles.label}>Full name</Text>
          <TextInput value={name} onChangeText={setName} placeholder="John Doe" style={styles.input} />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" style={styles.input} />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" style={styles.input} />
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable onPress={onNext} style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
          <Text style={styles.buttonText}>Next</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  card: { width: '100%', maxWidth: 520, backgroundColor: '#fff', borderRadius: 12, padding: 20, borderWidth: 1, borderColor: '#eee', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 1 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 16, color: '#11181C' },
  field: { marginBottom: 12 },
  label: { marginBottom: 6, color: '#11181C', fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: Platform.OS === 'web' ? 10 : 12, fontSize: 16, backgroundColor: '#fff', color: '#11181C' },
  error: { color: '#b91c1c', marginBottom: 12 },
  button: { backgroundColor: '#0a7ea4', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 10, alignItems: 'center', marginTop: 4 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  buttonPressed: { opacity: 0.9 },
});
