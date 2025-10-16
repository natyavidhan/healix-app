import { createMedication, createPrescription, getAccessToken, uploadPrescriptionFormData, type OCRExtracted } from '@/lib/api';
import { loadUser, saveUser, type Medication, type UserData } from '@/lib/storage';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useTranslation } = require('react-i18next/dist/commonjs');

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
  const { t } = useTranslation();
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
  const [uploading, setUploading] = useState(false);

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
      // If user is on upload tab and hasn't populated fields yet, prompt to switch to Manual after upload.
      setError(t('prescriptions.switchToManual'));
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
    if (!cleaned.length) return setError(t('prescriptions.atLeastOneMed'));
    for (const r of cleaned) {
      if (!r.name) return setError(t('prescriptions.medNameRequired'));
      if (!r.frequency_per_day) return setError(t('prescriptions.frequencyRequired'));
      if (!r.times) return setError(t('prescriptions.timesRequired'));
      if (!r.duration_days) return setError(t('prescriptions.durationRequired'));
      if (!r.start_date) return setError(t('prescriptions.startDateRequired'));
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
        <Text style={styles.title}>{t('prescriptions.newPrescription')}</Text>

        <View style={styles.segmentedContainer}>
          <Pressable onPress={() => setTab('upload')} style={[styles.segment, tab === 'upload' && styles.segmentActive]}>
            <Text style={[styles.segmentText, tab === 'upload' && styles.segmentTextActive]}>{t('prescriptions.uploadTab')}</Text>
          </Pressable>
          <Pressable onPress={() => setTab('manual')} style={[styles.segment, tab === 'manual' && styles.segmentActive]}>
            <Text style={[styles.segmentText, tab === 'manual' && styles.segmentTextActive]}>{t('prescriptions.manualTab')}</Text>
          </Pressable>
        </View>

        {tab === 'upload' ? (
          <View style={styles.uploadCard}>
            <Text style={styles.uploadTitle}>{t('prescriptions.uploadAndExtract')}</Text>
            <Text style={styles.hint}>{t('prescriptions.extracting')}</Text>
            <Pressable
              style={({ pressed }) => [styles.uploadBtn, pressed && { opacity: 0.9 }, uploading && { opacity: 0.7 }]}
              disabled={uploading}
              onPress={async () => {
                setError(null);
                try {
                  const res = await DocumentPicker.getDocumentAsync({
                    type: ['application/pdf', 'image/*'],
                    multiple: false,
                    copyToCacheDirectory: true,
                  });
                  if (res.canceled) return;
                  const file = res.assets?.[0];
                  if (!file) {
                    setError(t('prescriptions.noFileSelected'));
                    return;
                  }

                  setUploading(true);
                  // Build FormData - behavior differs web vs native
                  const form = new FormData();
                  // For web, file is a File; for native, need to pass uri + name + type
                  if (Platform.OS === 'web') {
                    // @ts-ignore - web File is fine
                    form.append('file', file?.file ?? (file as any));
                  } else {
                    form.append('file', {
                      // @ts-ignore - RN FormData file object
                      uri: file.uri,
                      name: file.name || 'upload',
                      type: file.mimeType || 'application/octet-stream',
                    } as any);
                  }

                  const resp = await uploadPrescriptionFormData(form as any);
                  if (!resp.success || !resp.extracted) {
                    setError(resp.error || t('prescriptions.failedToParse'));
                    return;
                  }

                  const extracted: OCRExtracted = resp.extracted;
                  // Populate doctor/date
                  if (extracted.doctor) setDoctor(extracted.doctor);
                  if (extracted.date) setDate(extracted.date);

                  // Map medicines to manual rows shape
                  const mapped: ManualMed[] = (extracted.medicines || []).map((m) => ({
                    name: (m.name || '').trim(),
                    brand_name: '',
                    form: (m.form as any) || 'tablet',
                    strength: (m.strength || '').trim(),
                    dosage: (m.dosage || '').trim(),
                    frequency_per_day: (m.frequency_per_day != null ? String(m.frequency_per_day) : ''),
                    times: '',
                    duration_days: (m.duration_days != null ? String(m.duration_days) : ''),
                    start_date: today,
                    instructions: (m.instructions || '').trim(),
                  }));

                  if (mapped.length) setRows(mapped);

                  // Switch to manual tab so user can edit
                  setTab('manual');
                } catch (e: any) {
                  console.warn('Upload parse error', e);
                  setError(t('prescriptions.failedToUpload'));
                } finally {
                  setUploading(false);
                }
              }}
            >
              <Text style={styles.uploadBtnText}>{uploading ? t('prescriptions.extracting') : t('common.chooseFile')}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.manualCard}>
            <Text style={styles.sectionTitle}>{t('prescriptions.title')}</Text>
            <View style={styles.rowWrap}>
              <View style={styles.field}> 
                <Text style={styles.label}>{t('prescriptions.doctorName')}</Text>
                <TextInput value={doctor} onChangeText={setDoctor} placeholder="Dr. Sharma" style={styles.input} />
              </View>
              <View style={styles.field}> 
                <Text style={styles.label}>{t('prescriptions.prescriptionDate')}</Text>
                <TextInput value={date} onChangeText={setDate} placeholder={today} style={styles.input} inputMode={Platform.OS === 'web' ? 'text' as any : undefined} />
              </View>
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 12 }]}>{t('prescriptions.medicines')}</Text>
            {rows.map((r, idx) => (
              <View key={idx} style={styles.medRow}> 
                <View style={styles.rowWrap}>
                  <View style={styles.fieldWide}> 
                    <Text style={styles.label}>{t('prescriptions.medicineName')} *</Text>
                    <TextInput value={r.name} onChangeText={(v) => updateRow(idx, { name: v })} placeholder="Paracetamol" style={styles.input} />
                  </View>
                  <View style={styles.field}> 
                    <Text style={styles.label}>{t('prescriptions.brandName')}</Text>
                    <TextInput value={r.brand_name} onChangeText={(v) => updateRow(idx, { brand_name: v })} placeholder="Calpol 500" style={styles.input} />
                  </View>
                </View>
                <View style={styles.rowWrap}>
                  <View style={styles.fieldSmall}> 
                    <Text style={styles.label}>{t('prescriptions.form')}</Text>
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
                            {t(`prescriptions.${f}`)}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                </View>
                <View style={styles.rowWrap}>
                  <View style={styles.fieldSmall}> 
                    <Text style={styles.label}>{t('prescriptions.strength')}</Text>
                    <TextInput value={r.strength} onChangeText={(v) => updateRow(idx, { strength: v })} placeholder="500mg" style={styles.input} />
                  </View>
                  <View style={styles.fieldSmall}> 
                    <Text style={styles.label}>{t('prescriptions.dosage')}</Text>
                    <TextInput value={r.dosage} onChangeText={(v) => updateRow(idx, { dosage: v })} placeholder="1 tablet" style={styles.input} />
                  </View>
                  <View style={styles.fieldSmall}> 
                    <Text style={styles.label}>{t('prescriptions.frequencyPerDay')} *</Text>
                    <TextInput value={r.frequency_per_day} onChangeText={(v) => updateRow(idx, { frequency_per_day: v.replace(/[^0-9]/g, '') })} placeholder="2" keyboardType="numeric" style={styles.input} />
                  </View>
                </View>
                <View style={styles.rowWrap}>
                  <View style={styles.field}> 
                    <Text style={styles.label}>{t('prescriptions.times')} *</Text>
                    <TextInput value={r.times} onChangeText={(v) => updateRow(idx, { times: v })} placeholder="08:00, 20:00" style={styles.input} />
                  </View>
                  <View style={styles.fieldSmall}> 
                    <Text style={styles.label}>{t('prescriptions.durationDays')} *</Text>
                    <TextInput value={r.duration_days} onChangeText={(v) => updateRow(idx, { duration_days: v.replace(/[^0-9]/g, '') })} placeholder="5" keyboardType="numeric" style={styles.input} />
                  </View>
                  <View style={styles.field}> 
                    <Text style={styles.label}>{t('prescriptions.startDate')} *</Text>
                    <TextInput value={r.start_date} onChangeText={(v) => updateRow(idx, { start_date: v })} placeholder="YYYY-MM-DD" style={styles.input} />
                  </View>
                </View>
                <View style={styles.rowWrap}>
                  <View style={styles.fieldWide}> 
                    <Text style={styles.label}>{t('prescriptions.instructions')}</Text>
                    <TextInput value={r.instructions} onChangeText={(v) => updateRow(idx, { instructions: v })} placeholder="After food" style={styles.input} multiline />
                  </View>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 6 }}>
                  <Pressable onPress={() => removeRow(idx)} style={({ pressed }) => [styles.removeBtn, pressed && { opacity: 0.9 }]}>
                    <Text style={styles.removeText}>{t('prescriptions.removeMedicine')}</Text>
                  </Pressable>
                </View>
              </View>
            ))}
            <Pressable onPress={addRow} style={({ pressed }) => [styles.addRowBtn, pressed && { opacity: 0.9 }]}>
              <Text style={styles.addRowText}>{t('prescriptions.addMedicine')}</Text>
            </Pressable>
          </View>
        )}

        {error ? <Text style={{ color: '#b91c1c', marginTop: 8 }}>{error}</Text> : null}

        <View style={{ height: 10 }} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.9 }]}>
            <Text style={styles.cancelText}>{t('common.cancel')}</Text>
          </Pressable>
          <Pressable onPress={onSave} style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.9 }]}>
            <Text style={styles.saveText}>{t('prescriptions.savePrescription')}</Text>
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
