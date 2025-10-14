import { loadUser, type Report, type UserData } from '@/lib/storage';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useTranslation } = require('react-i18next/dist/commonjs');

const Pastel = {
  blue: '#1D8CF8',
  grayText: '#6B7280',
  text: '#0F172A',
  border: '#EAECF0',
  white: '#FFFFFF',
};

export default function ReportDetail() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [user, setUser] = useState<UserData | null>(null);
  const [report, setReport] = useState<Report | null>(null);

  useEffect(() => {
    (async () => {
      const u = await loadUser();
      setUser(u);
      if (!u || !u.reports || u.reports.length === 0) return;
      let rep: Report | undefined;
      if (id && isNaN(Number(id))) {
        rep = u.reports.find((r) => (r.id ?? '') === id);
      } else if (id && !isNaN(Number(id))) {
        const idx = Number(id);
        rep = u.reports[idx];
      }
      if (!rep) rep = u.reports[0];
      setReport(rep);
    })();
  }, [id]);

  // Hooks must not be called conditionally. Define memoized parsing here,
  // before any potential early returns below.
  const parsedFromSummary = React.useMemo(() => {
    if (!report?.summary) return [] as { name: string; value: string; unit?: string }[];
    const parts = report.summary.split(';').map((s) => s.trim()).filter(Boolean);
    const rows: { name: string; value: string; unit?: string }[] = [];
    const rx = /^([A-Za-z\-/\s]+?)\s*:?\s*([0-9]+(?:\.[0-9]+)?)\s*(.*)$/; // name, value, unit
    for (const p of parts) {
      const m = p.match(rx);
      if (m) {
        const name = m[1].trim();
        const value = m[2].trim();
        const unit = m[3]?.trim() || undefined;
        rows.push({ name, value, unit });
      }
    }
    return rows;
  }, [report?.summary]);

  const valueRows = (report?.values && report.values.length
    ? report.values.map(v => ({ name: v.name, value: v.value, unit: v.unit, ref: v.ref, flag: v.flag }))
    : parsedFromSummary) as Array<{ name: string; value: string; unit?: string; ref?: string; flag?: 'low' | 'high' | 'normal' }>;

  if (!user) {
    return (
      <View style={styles.center}>
  <Text style={styles.title}>{t('reports.title')}</Text>
        <Text style={styles.hint}>Loading…</Text>
      </View>
    );
  }

  if (!report) {
    return (
      <View style={styles.center}>
  <Text style={styles.title}>{t('reports.title')}</Text>
        <Text style={styles.hint}>Not found.</Text>
        <Pressable style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]} onPress={() => router.replace('/dashboard' as any)}>
          <Text style={styles.primaryBtnText}>Back to Dashboard</Text>
        </Pressable>
      </View>
    );
  }

  const isImage = (report?.mime_type ?? '').startsWith('image/');
  const isPdf = (report?.mime_type ?? '').includes('pdf');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.title}>{t('reports.title')}</Text>
          <Pressable style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.8 }]} onPress={() => router.push('/reports/new' as any)}>
            <Ionicons name="add" size={20} color={Pastel.blue} />
          </Pressable>
        </View>
        <View style={styles.rowBetween}>
          <Text style={styles.meta}><Text style={styles.metaLabel}>{t('reports.name')}: </Text>{report.name}</Text>
          <Text style={styles.meta}><Text style={styles.metaLabel}>{t('reports.date')}: </Text>{report.date}</Text>
        </View>
        {/* Only show summary when there are no structured values */}
        {!valueRows.length ? (
          <Text style={styles.meta}><Text style={styles.metaLabel}>{t('reports.summary')}: </Text>{report.summary}</Text>
        ) : null}
      </View>

      {valueRows.length ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('reports.results')}</Text>
          <View style={styles.tableHeader2Col}>
            <Text style={[styles.th]}>{t('reports.attribute')}</Text>
            <Text style={[styles.th, { textAlign: 'right' }]}>{t('reports.value')}</Text>
          </View>
          {valueRows.map((v, idx) => (
            <View key={`${v.name}-${idx}`} style={[styles.tableRow2Col, idx % 2 === 1 && styles.tableRowAlt]}>
              <Text style={[styles.tdAttr]} numberOfLines={1}>{v.name}</Text>
              <View style={{ flexShrink: 1 }}>
                <Text style={[styles.tdValue, { textAlign: 'right' }]}>{v.value}{v.unit ? ` ${v.unit}` : ''}</Text>
                {(v.ref || v.flag) ? (
                  <Text style={[styles.tdSub, { textAlign: 'right', color: v.flag === 'high' ? '#B91C1C' : v.flag === 'low' ? '#B45309' : Pastel.grayText }]}>
                    {v.ref ? `Ref: ${v.ref}` : ''}{v.ref && v.flag ? ' · ' : ''}{v.flag ? v.flag.toUpperCase() : ''}
                  </Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {report.file_uri ? (
        <View>
          <Text style={styles.sectionTitle}>{t('reports.reportFile')}</Text>
          {isImage ? (
            <Image source={{ uri: report.file_uri }} style={styles.imagePreview} resizeMode="contain" />
          ) : null}
          {isPdf ? (
            <Pressable onPress={() => Linking.openURL(report.file_uri!)} style={({ pressed }) => [styles.openBtn, pressed && { opacity: 0.9 }]}>
              <Text style={styles.openBtnText}>{t('common.openPdf')}</Text>
            </Pressable>
          ) : null}
          {!isImage && !isPdf ? (
            <View>
              <Text style={styles.hint}>Unsupported preview. Tap Open to view.</Text>
              <Pressable onPress={() => Linking.openURL(report.file_uri!)} style={({ pressed }) => [styles.openBtn, pressed && { opacity: 0.9 }]}>
                <Text style={styles.openBtnText}>{t('common.openFile')}</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.hint}>{t('reports.noFile')}</Text>
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
  iconBtn: { padding: 8, borderRadius: 8, borderWidth: Platform.OS === 'web' ? (1 as any) : 0, borderColor: Pastel.border },
  primaryBtn: { marginTop: 10, backgroundColor: Pastel.blue, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16 },
  primaryBtnText: { color: '#fff', fontWeight: '800' },
  tableHeader: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: Platform.OS === 'web' ? (1 as any) : StyleSheet.hairlineWidth, borderColor: Pastel.border },
  tableHeader2Col: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: Platform.OS === 'web' ? (1 as any) : StyleSheet.hairlineWidth, borderColor: Pastel.border },
  th: { color: Pastel.grayText, fontWeight: '700' },
  tableRow: { flexDirection: 'row', paddingVertical: 10 },
  tableRow2Col: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 10, gap: 10 },
  tableRowAlt: { backgroundColor: '#F9FAFB' },
  td: { color: Pastel.text },
  tdAttr: { color: Pastel.text, fontWeight: '600', flexShrink: 1 },
  tdValue: { color: Pastel.text, fontWeight: '700' },
  tdSub: { fontSize: 12 },
  imagePreview: { width: '100%', height: 360, backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: Platform.OS === 'web' ? (1 as any) : 0, borderColor: Pastel.border },
  openBtn: { marginTop: 10, backgroundColor: Pastel.blue, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  openBtnText: { color: '#fff', fontWeight: '800' },
});
