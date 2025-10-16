import { WEB_BASE_URL } from '@/lib/api';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import React, { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

export default function AddDoctor() {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const inferredLink = useMemo(() => {
    const trimmed = input.trim();
    if (!trimmed) return '';
    // If full URL provided, trust it
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    // If 8-char code (from backend), build full URL
    if (/^[a-f0-9]{8}$/i.test(trimmed)) return `${WEB_BASE_URL}/link/doctor/${trimmed}`;
    return '';
  }, [input]);

  const onOpen = async () => {
    try {
      const url = inferredLink || input.trim();
      if (!url) {
        Alert.alert('Enter code or link', 'Paste the QR link or 8-character code from your doctor.');
        return;
      }
      setBusy(true);
      // Open external web page to complete link and sign in if needed
      await Linking.openURL(url);
    } catch (e) {
      Alert.alert('Failed to open link', String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.select({ ios: 'padding', android: undefined })}>
      <View style={styles.card}>
        <Text style={styles.title}>Add your doctor</Text>
        <Text style={styles.subtitle}>Paste the QR link or the 8-character code from your doctor's clinic.</Text>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Paste link or enter code"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />
        <Pressable onPress={onOpen} disabled={busy} style={({ pressed }) => [styles.button, pressed && { opacity: 0.9 }, busy && { opacity: 0.6 }]}>
          <Ionicons name="qr-code-outline" size={18} color="#fff" />
          <Text style={styles.buttonText}>{busy ? 'Opening…' : 'Open link'}</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/add-doctor-scan' as any)} style={({ pressed }) => [styles.secondary, pressed && { opacity: 0.9 }]}>
          <Ionicons name="camera-outline" size={18} color="#0ea5e9" />
          <Text style={styles.secondaryText}>Scan QR</Text>
        </Pressable>
        {!!inferredLink && (
          <Text numberOfLines={1} style={styles.preview}>Will open: {inferredLink}</Text>
        )}
        <Text style={styles.helper}>This will open a secure page to confirm sharing your records with the doctor. You may be asked to sign in.</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#F8FAFC', justifyContent: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 6, color: '#0F172A' },
  subtitle: { color: '#64748B', marginBottom: 16 },
  input: { borderColor: '#E2E8F0', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 14 },
  button: { backgroundColor: '#0ea5e9', borderRadius: 12, paddingVertical: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  buttonText: { color: '#fff', fontWeight: '700' },
  secondary: { marginTop: 10, borderWidth: 1, borderColor: '#BAE6FD', backgroundColor: '#F0F9FF', borderRadius: 12, paddingVertical: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  secondaryText: { color: '#0ea5e9', fontWeight: '700' },
  preview: { marginTop: 10, color: '#334155' },
  helper: { marginTop: 8, color: '#64748B', fontSize: 12 }
});
