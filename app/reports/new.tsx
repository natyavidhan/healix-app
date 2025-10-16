import { createReport, uploadReportFormData, type OCRReport } from '@/lib/api';
import { loadUser, saveUser, type Report, type UserData } from '@/lib/storage';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useTranslation } = require('react-i18next/dist/commonjs');

export default function NewReport() {
  const { t } = useTranslation();
  const router = useRouter();
  const [name, setName] = useState('');
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0,10));
  const [picked, setPicked] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // OCR extracted (and editable) fields
  type TestRow = { name: string; result: string; units?: string; reference?: string };
  const [tests, setTests] = useState<TestRow[]>([]);

  const pickFile = async () => {
    setError(null);
    const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true, multiple: false });
    if (res.canceled) return;
    const asset = res.assets[0];
    setPicked(asset);
    if (!name) setName(asset.name ?? 'Lab Report');

    // Immediately attempt OCR upload and populate manual fields
    try {
      setUploading(true);
      const form = new FormData();
      if (Platform.OS === 'web') {
        // @ts-ignore - on web, asset.file may exist when using DocumentPicker
        form.append('file', asset.file ?? (asset as any));
      } else {
        form.append('file', {
          // @ts-ignore - RN FormData file shape
          uri: asset.uri,
          name: asset.name || 'report',
          type: asset.mimeType || 'application/octet-stream',
        } as any);
      }
      const resp = await uploadReportFormData(form as any);
      if (!resp.success || !resp.report) {
        setError(resp.error || 'Failed to parse report');
        return;
      }
  const r: OCRReport = resp.report;
  if (r.date) setDate(r.date);
  setTests((r.tests || []).map(t => ({ name: t.name || '', result: t.result || '', units: t.units || undefined, reference: t.reference || undefined })));
    } catch (e) {
      console.warn('Report OCR upload error', e);
      setError('Failed to upload or parse report');
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setError(null);
    if (!picked) { setError('Please choose a PDF or image of the report.'); return; }
    // Optionally, we can use the edited fields to build a summary
    const summaryFromOCR = `Tests: ${tests.length}`;
    const u = await loadUser();
    const base = u ?? ({ name: 'User' } as UserData);
    // Try saving to backend
    try {
      await createReport({
        name: name || (picked.name ?? 'Lab Report'),
        date: date || new Date().toISOString().slice(0,10),
        summary: summaryFromOCR,
        tests,
        file_uri: picked.uri,
        mime_type: picked.mimeType,
        size_bytes: picked.size,
      });
    } catch (e) {
      // Non-fatal: continue to local save
      console.warn('Failed to save report to backend, will store locally', e);
    }

    const report: Report = {
      id: `rep-${Date.now()}`,
      name: name || (picked.name ?? 'Lab Report'),
      date: date || new Date().toISOString().slice(0,10),
      summary: summaryFromOCR,
      file_uri: picked.uri,
      mime_type: picked.mimeType,
      size_bytes: picked.size,
    };
    const next: UserData = { ...base, reports: [...(base.reports ?? []), report] };
    await saveUser(next);
    router.replace('/dashboard' as any);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t('reports.uploadTitle')}</Text>
        <Text style={styles.hint}>{t('reports.onlyUploads')}</Text>

        <View style={styles.card}>
          <Text style={styles.label}>{t('reports.reportName')}</Text>
          <TextInput value={name} onChangeText={setName} placeholder="e.g., CBC (Complete Blood Count)" style={styles.input} />
          <View style={{ height: 10 }} />
          <Text style={styles.label}>{t('reports.reportDate')}</Text>
          <TextInput value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" style={styles.input} />

          <Pressable onPress={pickFile} style={({ pressed }) => [styles.pickBtn, pressed && { opacity: 0.9 }]}>
            <Text style={styles.pickBtnText}>{uploading ? 'Uploading...' : (picked ? 'Change file' : t('common.chooseFile'))}</Text>
          </Pressable>
          {picked ? (
            <View style={styles.fileRow}>
              <Text style={styles.fileName}>{picked.name ?? 'Selected file'}</Text>
              <Text style={styles.fileMeta}>{picked.mimeType ?? 'file'} • {picked.size ? `${Math.round(picked.size/1024)} KB` : ''}</Text>
            </View>
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>

        {/* Manual editing section populated from OCR */}
        {picked ? (
          <View style={styles.card}>
            <Text style={styles.label}>Review & Edit Extracted Details</Text>
            <Text style={[styles.hint, { marginBottom: 10 }]}>Fix any OCR mistakes below before saving.</Text>

            <Text style={styles.label}>Tests</Text>
            {tests.map((t, idx) => (
              <View key={idx} style={{ marginBottom: 10 }}>
                <TextInput
                  style={styles.input}
                  placeholder="Test name"
                  value={t.name}
                  onChangeText={(v) => setTests((arr) => arr.map((x, i) => i === idx ? { ...x, name: v } : x))}
                />
                <View style={{ height: 6 }} />
                <TextInput
                  style={styles.input}
                  placeholder="Result"
                  value={t.result}
                  onChangeText={(v) => setTests((arr) => arr.map((x, i) => i === idx ? { ...x, result: v } : x))}
                />
                <View style={{ height: 6 }} />
                <TextInput
                  style={styles.input}
                  placeholder="Units"
                  value={t.units ?? ''}
                  onChangeText={(v) => setTests((arr) => arr.map((x, i) => i === idx ? { ...x, units: v } : x))}
                />
                <View style={{ height: 6 }} />
                <TextInput
                  style={styles.input}
                  placeholder="Reference interval"
                  value={t.reference ?? ''}
                  onChangeText={(v) => setTests((arr) => arr.map((x, i) => i === idx ? { ...x, reference: v } : x))}
                />
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 6 }}>
                  <Pressable onPress={() => setTests((arr) => arr.filter((_, i) => i !== idx))} style={({ pressed }) => [{ paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#FEE2E2', borderRadius: 8 }, pressed && { opacity: 0.9 }]}>
                    <Text style={{ color: '#B91C1C', fontWeight: '700' }}>Remove</Text>
                  </Pressable>
                </View>
              </View>
            ))}
            <Pressable onPress={() => setTests((arr) => [...arr, { name: '', result: '', units: '', reference: '' }])} style={({ pressed }) => [{ paddingVertical: 12, backgroundColor: '#F3F4F6', borderRadius: 10, alignItems: 'center' }, pressed && { opacity: 0.9 }]}>
              <Text style={{ color: '#1D8CF8', fontWeight: '800' }}>+ Add another test</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.9 }]}>
            <Text style={styles.cancelText}>{t('common.cancel')}</Text>
          </Pressable>
          <Pressable onPress={save} style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.9 }]}>
            <Text style={styles.saveText}>{t('reports.saveReport')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16 },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 6, color: '#0F172A' },
  hint: { color: '#6B7280', marginBottom: 8 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: Platform.OS === 'web' ? (1 as any) : 0, borderColor: '#EAECF0', marginBottom: 12 },
  label: { color: '#0F172A', fontWeight: '700', marginBottom: 6 },
  input: { borderWidth: Platform.OS === 'web' ? (1 as any) : StyleSheet.hairlineWidth, borderColor: '#EAECF0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: Platform.OS === 'web' ? 10 : 12, fontSize: 16, backgroundColor: '#fff', color: '#0F172A' },
  pickBtn: { marginTop: 12, backgroundColor: '#1D8CF8', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  pickBtnText: { color: '#fff', fontWeight: '800' },
  fileRow: { marginTop: 8 },
  fileName: { color: '#0F172A', fontWeight: '700' },
  fileMeta: { color: '#6B7280', marginTop: 2 },
  error: { color: '#B91C1C', marginTop: 8 },

  cancelBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 10, paddingVertical: 12, backgroundColor: '#F3F4F6', borderWidth: Platform.OS === 'web' ? (1 as any) : 0, borderColor: '#EAECF0' },
  cancelText: { color: '#0F172A', fontWeight: '700' },
  saveBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 10, paddingVertical: 12, backgroundColor: '#1D8CF8' },
  saveText: { color: '#fff', fontWeight: '800' },
});
