import { loadUser, type Medication, type Prescription, type UserData } from '@/lib/storage';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const Pastel = {
  blue: '#1D8CF8',
  grayText: '#6B7280',
  text: '#0F172A',
  border: '#EAECF0',
  white: '#FFFFFF',
};

export default function PrescriptionDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [user, setUser] = useState<UserData | null>(null);
  const [rx, setRx] = useState<Prescription | null>(null);
  const [meds, setMeds] = useState<Medication[]>([]);

  useEffect(() => {
    (async () => {
      const u = await loadUser();
      setUser(u);
      if (!u || !u.prescriptions || u.prescriptions.length === 0) return;
      let presc: Prescription | undefined;
      if (id && isNaN(Number(id))) {
        presc = u.prescriptions.find((p) => (p.id ?? '') === id);
      } else if (id && !isNaN(Number(id))) {
        const idx = Number(id);
        presc = u.prescriptions[idx];
      }
      if (!presc) presc = u.prescriptions[0];
      setRx(presc);

      // Best-effort: take the most recently added N medications as associated
      const count = presc?.medicine_count ?? 0;
      const allMeds = u.medications ?? [];
      const assoc = count > 0 ? allMeds.slice(-count) : [];
      setMeds(assoc);
    })();
  }, [id]);

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Prescription</Text>
        <Text style={styles.hint}>Loading…</Text>
      </View>
    );
  }

  if (!rx) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Prescription</Text>
        <Text style={styles.hint}>Not found.</Text>
        <Pressable style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]} onPress={() => router.replace('/dashboard' as any)}>
          <Text style={styles.primaryBtnText}>Back to Dashboard</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.title}>Prescription</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.8 }]} onPress={() => router.push('/prescriptions/new' as any)}>
              <Ionicons name="add" size={20} color={Pastel.blue} />
            </Pressable>
          </View>
        </View>
        <View style={styles.rowBetween}>
          <Text style={styles.meta}><Text style={styles.metaLabel}>Doctor: </Text>{rx.doctor}</Text>
          <Text style={styles.meta}><Text style={styles.metaLabel}>Date: </Text>{rx.date}</Text>
        </View>
        <Text style={styles.meta}><Text style={styles.metaLabel}>Total medicines: </Text>{rx.medicine_count}</Text>
      </View>

      <Text style={styles.sectionTitle}>Medicines</Text>
      {meds.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.hint}>No associated medicines found.</Text>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {meds.map((m, i) => (
            <View key={`${m.name}-${i}`} style={styles.medCard}>
              <View style={styles.medHeader}>
                <Text style={styles.medName}>{m.name}</Text>
              </View>
              <Text style={styles.medMeta}>{m.frequency}</Text>
              <View style={styles.nextDoseRow}>
                <Ionicons name="time-outline" size={16} color={Pastel.grayText} />
                <Text style={styles.nextDoseText}>Next: {m.next_dose}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', padding: 16 },
  title: { fontSize: 20, fontWeight: '800', color: Pastel.text },
  hint: { color: Pastel.grayText, marginTop: 6 },

  card: { backgroundColor: Pastel.white, borderRadius: 16, padding: 14, borderWidth: Platform.OS === 'web' ? (1 as any) : 0, borderColor: Pastel.border },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  meta: { color: Pastel.text },
  metaLabel: { color: Pastel.grayText, fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: Pastel.text, marginTop: 16, marginBottom: 8 },
  emptyCard: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 14, borderWidth: Platform.OS === 'web' ? (1 as any) : 0, borderColor: Pastel.border, alignItems: 'center' },

  medCard: { backgroundColor: Pastel.white, borderRadius: 16, padding: 14, borderWidth: Platform.OS === 'web' ? (1 as any) : 0, borderColor: Pastel.border },
  medHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  medName: { fontSize: 16, fontWeight: '700', color: Pastel.text },
  medMeta: { marginTop: 6, color: Pastel.grayText },
  nextDoseRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  nextDoseText: { color: Pastel.grayText },

  iconBtn: { padding: 8, borderRadius: 8, borderWidth: Platform.OS === 'web' ? (1 as any) : 0, borderColor: Pastel.border },
  primaryBtn: { marginTop: 10, backgroundColor: Pastel.blue, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16 },
  primaryBtnText: { color: '#fff', fontWeight: '800' },
});
