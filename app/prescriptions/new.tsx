import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function NewPrescription() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add Prescription</Text>
      <Text style={styles.hint}>Form coming soon…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 6, color: '#0F172A' },
  hint: { color: '#6B7280' },
});
