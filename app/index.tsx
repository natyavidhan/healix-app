import { loadUser } from '@/lib/storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

export default function Landing() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const user = await loadUser();
      if (!mounted) return;
      if (user) {
        router.replace('/dashboard' as any);
      } else {
        setChecking(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [router]);

  if (checking) {
    return (
      <View style={[styles.container, { backgroundColor: '#fff' }]}> 
        <Text style={[styles.title, { color: '#11181C' }]}>healix</Text>
        <Text style={{ color: '#6B7280' }}>Loading…</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: '#fff' }]}>
      <Text style={[styles.title, { color: '#11181C' }]}>healix</Text>

      <View style={styles.buttons}>
        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={() => router.push('/signin/email')}>
          <Text style={styles.buttonText}>Sign in with Email</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.button, styles.googleButton, pressed && styles.buttonPressed]}
          onPress={() => router.push('/signin/google')}>
          <Text style={[styles.buttonText, styles.googleText]}>Sign in with Google</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 48,
    fontWeight: '700',
    marginBottom: 40,
    textTransform: 'lowercase',
    letterSpacing: 2,
  },
  buttons: {
    width: '100%',
    maxWidth: 360,
    gap: 12,
  },
  button: {
    backgroundColor: '#0a7ea4',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  googleButton: {
    backgroundColor: '#fff',
    borderWidth: Platform.OS === 'web' ?  '1px' as any : 1,
    borderColor: '#ddd',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  googleText: {
    color: '#111',
  },
  buttonPressed: {
    opacity: 0.8,
  },
});
