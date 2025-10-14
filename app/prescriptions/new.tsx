import { loadUser, saveUser, type Medication, type UserData } from '@/lib/storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

type ManualMed = {
  name: string;
  times: string; // numeric string
  days: string; // numeric string
  duration: string; // numeric string
  timeStr: string;
};

const Pastel = {
  blue: '#1D8CF8',
  grayText: '#6B7280',
  text: '#0F172A',
  border: '#EAECF0',
  chipBg: '#F3F4F6',
  white: '#FFFFFF',
};

export default function NewPrescription() {
  const router = useRouter();
  const [tab, setTab] = useState<'upload' | 'manual'>('manual');
  const [doctor, setDoctor] = useState('');
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [date, setDate] = useState<string>(today);
  const [rows, setRows] = useState<ManualMed[]>([
    { name: '', times: '', days: '1', duration: '', timeStr: '' },
  ]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // ensure user exists locally for save (noop if exists)
    loadUser().then((u) => { if (!u) saveUser({ name: 'User' } as UserData); });
  }, []);

  const addRow = () => setRows((r) => [...r, { name: '', times: '', days: '1', duration: '', timeStr: '' }]);
  const removeRow = (idx: number) => setRows((r) => r.filter((_, i) => i !== idx));
  const updateRow = (idx: number, patch: Partial<ManualMed>) => setRows((r) => r.map((row, i) => i === idx ? { ...row, ...patch } : row));

  const onSave = async () => {
    setError(null);
    if (tab === 'upload') {
      // Stub: in future integrate file picker and parsing
      setError('Upload flow not implemented yet. Please use Manual tab.');
      return;
    }
    const cleaned = rows.map((r) => ({
      ...r,
      name: r.name.trim(),
      times: r.times.trim(),
      days: r.days.trim() || '1',
      duration: r.duration.trim(),
      timeStr: r.timeStr.trim(),
    }));
    if (!cleaned.length) return setError('Add at least one medication.');
    for (const r of cleaned) {
      if (!r.name) return setError('Each medication requires a name.');
      if (!r.times || !r.days) return setError('Each medication needs frequency (times and days).');
      if (!r.duration) return setError('Each medication needs duration in days.');
      if (!r.timeStr) return setError('Each medication needs a time.');
    }

    const medsToAdd: Medication[] = cleaned.map((r) => ({
      name: r.name,
      frequency: `${Number(r.times)}/${Number(r.days)}d`,
      next_dose: r.timeStr,
      status: 'upcoming',
    }));

    const u = await loadUser();
    const base = u ?? ({ name: 'User' } as UserData);
    const next: UserData = {
      ...base,
      medications: [...(base.medications ?? []), ...medsToAdd],
      prescriptions: [
        ...((base.prescriptions ?? [])),
        { doctor: doctor.trim() || 'Unknown', date: date || today, medicine_count: medsToAdd.length },
      ],
    };
    await saveUser(next);
    router.replace('/dashboard' as any);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Add Prescription</Text>

        <View style={styles.segmentedContainer}>
          <Pressable onPress={() => setTab('upload')} style={[styles.segment, tab === 'upload' && styles.segmentActive]}>
            <Text style={[styles.segmentText, tab === 'upload' && styles.segmentTextActive]}>Upload</Text>
          </Pressable>
          <Pressable onPress={() => setTab('manual')} style={[styles.segment, tab === 'manual' && styles.segmentActive]}>
            <Text style={[styles.segmentText, tab === 'manual' && styles.segmentTextActive]}>Manual</Text>
          </Pressable>
        </View>

        {tab === 'upload' ? (
          <View style={styles.uploadCard}>
            <Text style={styles.uploadTitle}>Upload prescription file</Text>
            <Text style={styles.hint}>PDF/Image parsing coming soon.</Text>
            <Pressable style={({ pressed }) => [styles.uploadBtn, pressed && { opacity: 0.9 }]} onPress={() => setError('Upload flow not implemented yet.') }>
              <Text style={styles.uploadBtnText}>Pick File</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.manualCard}>
            <Text style={styles.sectionTitle}>Prescription info</Text>
            <View style={styles.rowWrap}>
              <View style={styles.field}> 
                <Text style={styles.label}>Doctor name</Text>
                <TextInput value={doctor} onChangeText={setDoctor} placeholder="Dr. Sharma" style={styles.input} />
              </View>
              <View style={styles.field}> 
                <Text style={styles.label}>Date</Text>
                <TextInput value={date} onChangeText={setDate} placeholder={today} style={styles.input} inputMode={Platform.OS === 'web' ? 'text' as any : undefined} />
              </View>
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Medications</Text>
            {rows.map((r, idx) => (
              <View key={idx} style={styles.medRow}> 
                <View style={styles.rowWrap}>
                  <View style={styles.fieldWide}> 
                    <Text style={styles.label}>Name</Text>
                    <TextInput value={r.name} onChangeText={(v) => updateRow(idx, { name: v })} placeholder="Metformin" style={styles.input} />
                  </View>
                </View>
                <View style={styles.rowWrap}>
                  <View style={styles.fieldSmall}> 
                    <Text style={styles.label}>Times</Text>
                    <TextInput value={r.times} onChangeText={(v) => updateRow(idx, { times: v.replace(/[^0-9]/g, '') })} placeholder="2" keyboardType="numeric" style={styles.input} />
                  </View>
                  <View style={styles.fieldSmall}> 
                    <Text style={styles.label}>Days</Text>
                    <TextInput value={r.days} onChangeText={(v) => updateRow(idx, { days: v.replace(/[^0-9]/g, '') })} placeholder="1" keyboardType="numeric" style={styles.input} />
                  </View>
                  <View style={styles.fieldSmall}> 
                    <Text style={styles.label}>Duration (days)</Text>
                    <TextInput value={r.duration} onChangeText={(v) => updateRow(idx, { duration: v.replace(/[^0-9]/g, '') })} placeholder="7" keyboardType="numeric" style={styles.input} />
                  </View>
                  <View style={styles.field}> 
                    <Text style={styles.label}>Time of day</Text>
                    <TextInput value={r.timeStr} onChangeText={(v) => updateRow(idx, { timeStr: v })} placeholder="8:00 PM" style={styles.input} />
                  </View>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 6 }}>
                  <Pressable onPress={() => removeRow(idx)} style={({ pressed }) => [styles.removeBtn, pressed && { opacity: 0.9 }]}>
                    <Text style={styles.removeText}>Remove</Text>
                  </Pressable>
                </View>
              </View>
            ))}
            <Pressable onPress={addRow} style={({ pressed }) => [styles.addRowBtn, pressed && { opacity: 0.9 }]}>
              <Text style={styles.addRowText}>+ Add another medication</Text>
            </Pressable>
          </View>
        )}

        {error ? <Text style={{ color: '#b91c1c', marginTop: 8 }}>{error}</Text> : null}

        <View style={{ height: 10 }} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.9 }]}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Pressable onPress={onSave} style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.9 }]}>
            <Text style={styles.saveText}>Save Prescription</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { padding: 16 },
  title: { fontSize: 20, fontWeight: '800', color: Pastel.text, marginBottom: 10 },
  segmentedContainer: { flexDirection: 'row', backgroundColor: Pastel.chipBg, borderRadius: 12, padding: 4, marginBottom: 12 },
  segment: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  segmentActive: { backgroundColor: Pastel.white, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  segmentText: { color: Pastel.grayText, fontWeight: '600' },
  segmentTextActive: { color: Pastel.text, fontWeight: '800' },

  uploadCard: { backgroundColor: Pastel.white, borderRadius: 16, padding: 14, borderWidth: Platform.OS === 'web' ? (1 as any) : 0, borderColor: Pastel.border },
  uploadTitle: { fontSize: 16, fontWeight: '700', color: Pastel.text, marginBottom: 6 },
  uploadBtn: { marginTop: 10, backgroundColor: Pastel.blue, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  uploadBtnText: { color: '#fff', fontWeight: '800' },
  hint: { color: Pastel.grayText },

  manualCard: { backgroundColor: Pastel.white, borderRadius: 16, padding: 14, borderWidth: Platform.OS === 'web' ? (1 as any) : 0, borderColor: Pastel.border },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Pastel.text, marginBottom: 8 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  field: { flexGrow: 1, flexBasis: 200 },
  fieldWide: { flexGrow: 1, flexBasis: 260 },
  fieldSmall: { flexGrow: 1, flexBasis: 120 },
  label: { marginBottom: 6, color: Pastel.text, fontWeight: '700' },
  input: { borderWidth: Platform.OS === 'web' ? (1 as any) : StyleSheet.hairlineWidth, borderColor: Pastel.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: Platform.OS === 'web' ? 10 : 12, fontSize: 16, backgroundColor: '#fff', color: Pastel.text },

  medRow: { padding: 12, borderRadius: 12, borderWidth: Platform.OS === 'web' ? (1 as any) : 0, borderColor: Pastel.border, backgroundColor: '#F8FAFC', marginBottom: 10 },
  removeBtn: { paddingVertical: 10, paddingHorizontal: 12, backgroundColor: '#FEE2E2', borderRadius: 10 },
  removeText: { color: '#B91C1C', fontWeight: '700' },
  addRowBtn: { paddingVertical: 12, backgroundColor: Pastel.chipBg, borderRadius: 10, alignItems: 'center' },
  addRowText: { color: Pastel.blue, fontWeight: '800' },

  cancelBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 10, paddingVertical: 12, backgroundColor: '#F3F4F6', borderWidth: Platform.OS === 'web' ? (1 as any) : 0, borderColor: Pastel.border },
  cancelText: { color: Pastel.text, fontWeight: '700' },
  saveBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 10, paddingVertical: 12, backgroundColor: Pastel.blue },
  saveText: { color: '#fff', fontWeight: '800' },
});
