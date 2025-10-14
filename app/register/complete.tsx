import { getBasics, resetRegistration } from '@/lib/registration-store';
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

  const goHome = () => {
    resetRegistration();
    router.replace('/' as any);
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
