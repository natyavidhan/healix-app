import { createMedication, createPrescription, getAccessToken } from '@/lib/api';
import { loadUser, saveUser, type Medication, type UserData } from '@/lib/storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

type ManualMed = {
  name: string;
  brand_name: string;
  form: 'tablet' | 'syrup' | 'capsule' | 'injection';
  strength: string;
  dosage: string;
  frequency_per_day: string; // numeric string
  times: string; // comma-separated times
  duration_days: string; // numeric string
  start_date: string;
  instructions: string;
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
    {
      name: '',
      brand_name: '',
      form: 'tablet',
      strength: '',
      dosage: '',
      frequency_per_day: '',
      times: '',
      duration_days: '',
      start_date: today,
      instructions: '',
    },
  ]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // ensure user exists locally for save (noop if exists)
    loadUser().then((u) => { if (!u) saveUser({ name: 'User' } as UserData); });
  }, []);

  const addRow = () => setRows((r) => [...r, {
    name: '',
    brand_name: '',
    form: 'tablet',
    strength: '',
    dosage: '',
    frequency_per_day: '',
    times: '',
    duration_days: '',
    start_date: today,
    instructions: '',
  }]);
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
      brand_name: r.brand_name.trim(),
      strength: r.strength.trim(),
      dosage: r.dosage.trim(),
      frequency_per_day: r.frequency_per_day.trim(),
      times: r.times.trim(),
      duration_days: r.duration_days.trim(),
      start_date: r.start_date.trim(),
      instructions: r.instructions.trim(),
    }));
    if (!cleaned.length) return setError('Add at least one medication.');
    for (const r of cleaned) {
      if (!r.name) return setError('Each medication requires a name.');
      if (!r.frequency_per_day) return setError('Each medication needs frequency per day.');
      if (!r.times) return setError('Each medication needs intake times.');
      if (!r.duration_days) return setError('Each medication needs duration in days.');
      if (!r.start_date) return setError('Each medication needs a start date.');
    }

    const medsToAdd: Medication[] = cleaned.map((r) => {
      // Parse times
      const timesArray = r.times.split(',').map(t => t.trim()).filter(Boolean);
      
      // Calculate end date
      const start = new Date(r.start_date);
      const end = new Date(start);
      end.setDate(end.getDate() + Number(r.duration_days));
      const endDateStr = end.toISOString().slice(0, 10);

      return {
        name: r.name,
        brand_name: r.brand_name || undefined,
        form: r.form,
        strength: r.strength || undefined,
        dosage: r.dosage || undefined,
        frequency_per_day: Number(r.frequency_per_day),
        times: timesArray,
        duration_days: Number(r.duration_days),
        start_date: r.start_date,
        end_date: endDateStr,
        instructions: r.instructions || undefined,
        source: 'manual_add',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });

      // Try to save medications to backend
      const token = await getAccessToken();
      const savedMeds: Medication[] = [];
    
      if (token) {
        console.log('Prescription: Saving medications to backend...');
        for (const med of medsToAdd) {
          const result = await createMedication(med);
          if (result.success && result.medication) {
            console.log('Prescription: Medication saved to backend');
            savedMeds.push(result.medication);
          } else {
            console.warn('Prescription: Failed to save medication:', result.error);
            savedMeds.push(med); // Fallback to local med if backend fails
          }
        }
      } else {
        // No token, use local meds
        savedMeds.push(...medsToAdd);
      }

    // Attempt to create a prescription on backend with the full list
    const token2 = await getAccessToken();
    if (token2) {
      const rxPayload = {
        doctor: doctor.trim() || 'Unknown',
        date: date || today,
        medications: savedMeds,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as const;
      try {
        const rxRes = await createPrescription(rxPayload as any);
        if (!rxRes.success) console.warn('Prescription: createPrescription failed:', rxRes.error);
      } catch (e) {
        console.warn('Prescription: createPrescription error', e);
      }
    }

    const u = await loadUser();
    const base = u ?? ({ name: 'User' } as UserData);
    const next: UserData = {
      ...base,
      medications: [...(base.medications ?? []), ...savedMeds],
      // don't append local prescriptions list here; dashboard will refresh from backend
      prescriptions: base.prescriptions ?? [],
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
                    <Text style={styles.label}>Name *</Text>
                    <TextInput value={r.name} onChangeText={(v) => updateRow(idx, { name: v })} placeholder="Paracetamol" style={styles.input} />
                  </View>
                  <View style={styles.field}> 
                    <Text style={styles.label}>Brand name</Text>
                    <TextInput value={r.brand_name} onChangeText={(v) => updateRow(idx, { brand_name: v })} placeholder="Calpol 500" style={styles.input} />
                  </View>
                </View>
                <View style={styles.rowWrap}>
                  <View style={styles.fieldSmall}> 
                    <Text style={styles.label}>Form</Text>
                    <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                      {(['tablet', 'syrup', 'capsule', 'injection'] as const).map((f) => (
                        <Pressable
                          key={f}
                          onPress={() => updateRow(idx, { form: f })}
                          style={({ pressed }) => [
                            styles.formChip,
                            r.form === f && styles.formChipActive,
                            pressed && { opacity: 0.8 }
                          ]}
                        >
                          <Text style={[styles.formChipText, r.form === f && styles.formChipTextActive]}>
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                </View>
                <View style={styles.rowWrap}>
                  <View style={styles.fieldSmall}> 
                    <Text style={styles.label}>Strength</Text>
                    <TextInput value={r.strength} onChangeText={(v) => updateRow(idx, { strength: v })} placeholder="500mg" style={styles.input} />
                  </View>
                  <View style={styles.fieldSmall}> 
                    <Text style={styles.label}>Dosage</Text>
                    <TextInput value={r.dosage} onChangeText={(v) => updateRow(idx, { dosage: v })} placeholder="1 tablet" style={styles.input} />
                  </View>
                  <View style={styles.fieldSmall}> 
                    <Text style={styles.label}>Freq/day *</Text>
                    <TextInput value={r.frequency_per_day} onChangeText={(v) => updateRow(idx, { frequency_per_day: v.replace(/[^0-9]/g, '') })} placeholder="2" keyboardType="numeric" style={styles.input} />
                  </View>
                </View>
                <View style={styles.rowWrap}>
                  <View style={styles.field}> 
                    <Text style={styles.label}>Times (HH:MM, comma-sep) *</Text>
                    <TextInput value={r.times} onChangeText={(v) => updateRow(idx, { times: v })} placeholder="08:00, 20:00" style={styles.input} />
                  </View>
                  <View style={styles.fieldSmall}> 
                    <Text style={styles.label}>Duration (days) *</Text>
                    <TextInput value={r.duration_days} onChangeText={(v) => updateRow(idx, { duration_days: v.replace(/[^0-9]/g, '') })} placeholder="5" keyboardType="numeric" style={styles.input} />
                  </View>
                  <View style={styles.field}> 
                    <Text style={styles.label}>Start date *</Text>
                    <TextInput value={r.start_date} onChangeText={(v) => updateRow(idx, { start_date: v })} placeholder="YYYY-MM-DD" style={styles.input} />
                  </View>
                </View>
                <View style={styles.rowWrap}>
                  <View style={styles.fieldWide}> 
                    <Text style={styles.label}>Instructions</Text>
                    <TextInput value={r.instructions} onChangeText={(v) => updateRow(idx, { instructions: v })} placeholder="After food" style={styles.input} multiline />
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
  
  // Form chip styles
  formChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: Pastel.chipBg, borderWidth: Platform.OS === 'web' ? (1 as any) : 0, borderColor: Pastel.border },
  formChipActive: { backgroundColor: Pastel.blue, borderColor: Pastel.blue },
  formChipText: { color: Pastel.text, fontWeight: '600', fontSize: 12 },
  formChipTextActive: { color: '#fff', fontWeight: '700' },
});
