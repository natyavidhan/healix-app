import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function PrescriptionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Prescription</Text>
      <Text style={styles.hint}>ID: {id}</Text>
      <Text style={styles.hint}>Detail view coming soon…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 6, color: '#0F172A' },
  hint: { color: '#6B7280' },
});
