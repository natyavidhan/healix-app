import { loadUser, saveUser, type Report, type UserData } from '@/lib/storage';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

export default function NewReport() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0,10));
  const [picked, setPicked] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pickFile = async () => {
    setError(null);
    const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true, multiple: false });
    if (res.canceled) return;
    setPicked(res.assets[0]);
    if (!name) setName(res.assets[0].name ?? 'Lab Report');
  };

  const save = async () => {
    setError(null);
    if (!picked) { setError('Please choose a PDF or image of the report.'); return; }
    const u = await loadUser();
    const base = u ?? ({ name: 'User' } as UserData);
    const report: Report = {
      id: `rep-${Date.now()}`,
      name: name || (picked.name ?? 'Lab Report'),
      date: date || new Date().toISOString().slice(0,10),
      summary: 'Uploaded report',
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
        <Text style={styles.title}>Upload Lab Report</Text>
        <Text style={styles.hint}>Only uploads are allowed for lab reports.</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Report name</Text>
          <TextInput value={name} onChangeText={setName} placeholder="e.g., CBC (Complete Blood Count)" style={styles.input} />
          <View style={{ height: 10 }} />
          <Text style={styles.label}>Date</Text>
          <TextInput value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" style={styles.input} />

          <Pressable onPress={pickFile} style={({ pressed }) => [styles.pickBtn, pressed && { opacity: 0.9 }]}>
            <Text style={styles.pickBtnText}>{picked ? 'Change file' : 'Choose file (PDF/Image)'}</Text>
          </Pressable>
          {picked ? (
            <View style={styles.fileRow}>
              <Text style={styles.fileName}>{picked.name ?? 'Selected file'}</Text>
              <Text style={styles.fileMeta}>{picked.mimeType ?? 'file'} • {picked.size ? `${Math.round(picked.size/1024)} KB` : ''}</Text>
            </View>
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.9 }]}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Pressable onPress={save} style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.9 }]}>
            <Text style={styles.saveText}>Save Report</Text>
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
