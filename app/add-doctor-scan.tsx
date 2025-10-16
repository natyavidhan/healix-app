import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { WEB_BASE_URL } from '@/lib/api';

export default function AddDoctorScan() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!permission) requestPermission();
  }, [permission, requestPermission]);

  const buildLink = (text: string) => {
    const t = text.trim();
    if (/^https?:\/\//i.test(t)) return t;
    if (/^[a-f0-9]{8}$/i.test(t)) return `${WEB_BASE_URL}/link/doctor/${t}`;
    return '';
  };

  const onBarcodeScanned = useCallback(async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    try {
      const link = buildLink(data);
      if (!link) throw new Error('Not a valid Healix doctor link or code');
      await Linking.openURL(link);
      router.back();
    } catch (e) {
      Alert.alert('Scan failed', String(e), [
        { text: 'Try again', onPress: () => setScanned(false) },
        { text: 'Cancel', style: 'cancel', onPress: () => router.back() },
      ]);
    }
  }, [scanned, router]);

  if (!permission) {
    return (
      <View style={styles.center}> 
        <Text>Requesting camera permission…</Text>
      </View>
    );
  }
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={{ marginBottom: 8 }}>We need your permission to use the camera</Text>
        <Pressable onPress={requestPermission} style={({ pressed }) => [styles.btn, pressed && { opacity: 0.9 }]}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Grant permission</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView style={StyleSheet.absoluteFill} onBarcodeScanned={onBarcodeScanned} barcodeScannerSettings={{ barcodeTypes: ['qr'] }} />
      <View style={styles.overlay}>
        <Text style={styles.title}>Scan doctor's QR</Text>
        <View style={styles.frame} />
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.fab, pressed && { opacity: 0.9 }]}>
          <Ionicons name="close" size={24} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  btn: { backgroundColor: '#0ea5e9', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 },
  overlay: { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' },
  title: { position: 'absolute', top: 60, color: '#fff', fontSize: 18, fontWeight: '700' },
  frame: { width: 240, height: 240, borderColor: '#0ea5e9', borderWidth: 3, borderRadius: 16, backgroundColor: 'transparent' },
  fab: { position: 'absolute', bottom: 40, right: 20, width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#475569' }
});
