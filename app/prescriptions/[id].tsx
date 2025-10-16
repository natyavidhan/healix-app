import { loadUser, type Medication, type Prescription, type UserData } from '@/lib/storage';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useTranslation } = require('react-i18next/dist/commonjs');

const Pastel = {
  blue: '#1D8CF8',
  grayText: '#6B7280',
  text: '#0F172A',
  border: '#EAECF0',
  white: '#FFFFFF',
};

export default function PrescriptionDetail() {
  const { t } = useTranslation();
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
        <Text style={styles.title}>{t('prescriptions.title')}</Text>
        <Text style={styles.hint}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (!rx) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>{t('prescriptions.title')}</Text>
        <Text style={styles.hint}>{t('common.notFound')}</Text>
        <Pressable style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]} onPress={() => router.replace('/dashboard' as any)}>
          <Text style={styles.primaryBtnText}>{t('common.backToDashboard')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.title}>{t('prescriptions.title')}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.8 }]} onPress={() => router.push('/prescriptions/new' as any)}>
              <Ionicons name="add" size={20} color={Pastel.blue} />
            </Pressable>
          </View>
        </View>
        {(rx.doctor || rx.date) ? (
          <View style={styles.rowBetween}>
            {rx.doctor ? (
              <Text style={styles.meta}><Text style={styles.metaLabel}>{t('prescriptions.doctor')}: </Text>{rx.doctor}</Text>
            ) : <View />}
            {rx.date ? (
              <Text style={styles.meta}><Text style={styles.metaLabel}>{t('reports.date')}: </Text>{rx.date}</Text>
            ) : null}
          </View>
        ) : null}

        {typeof rx.medicine_count === 'number' ? (
          <Text style={styles.meta}><Text style={styles.metaLabel}>{t('prescriptions.totalMeds')}: </Text>{rx.medicine_count}</Text>
        ) : null}
      </View>

      <Text style={styles.sectionTitle}>{t('prescriptions.medicines')}</Text>
      {meds.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.hint}>{t('dashboard.noMedicationsFound')}</Text>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {meds.map((m, i) => (
            <View key={`${m.name}-${i}`} style={styles.medCard}>
              <View style={styles.medHeader}>
                <Text style={styles.medName}>
                  {m.name}
                  {m.brand_name ? <Text style={styles.medBrand}>  ·  {m.brand_name}</Text> : null}
                </Text>
              </View>
              {/* Strength / Form / Dosage */}
              {[m.strength, m.form, m.dosage].filter(Boolean).length > 0 ? (
                <Text style={styles.medMeta}>
                  {[m.strength, m.form, m.dosage].filter(Boolean).join(' • ')}
                </Text>
              ) : null}

              {/* Frequency per day and exact times */}
              {(typeof m.frequency_per_day === 'number' || (m.times && m.times.length > 0)) ? (
                <Text style={styles.medMeta}>
                  {[
                    typeof m.frequency_per_day === 'number' ? `${m.frequency_per_day}${t('prescriptions.perDay')}` : undefined,
                    (m.times && m.times.length > 0) ? m.times.join(', ') : undefined,
                  ].filter(Boolean).join(' • ')}
                </Text>
              ) : null}

              {/* Duration and date range */}
              {(typeof m.duration_days === 'number' || m.start_date || m.end_date) ? (
                <Text style={styles.medMeta}>
                  {[
                    typeof m.duration_days === 'number' ? `${m.duration_days} ${t('prescriptions.days')}` : undefined,
                    (m.start_date || m.end_date) ? [m.start_date, m.end_date].filter(Boolean).join(' → ') : undefined,
                  ].filter(Boolean).join(' • ')}
                </Text>
              ) : null}

              {/* Instructions */}
              {m.instructions ? (
                <Text style={styles.medMeta}>{t('prescriptions.notes')}: {m.instructions}</Text>
              ) : null}

              {/* Source / Status */}
              {[m.source, m.status].filter(Boolean).length > 0 ? (
                <Text style={styles.metaSmall}>
                  {[
                    m.source ? `${t('prescriptions.source')}: ${m.source}` : undefined,
                    m.status ? `${t('prescriptions.status')}: ${m.status}` : undefined,
                  ].filter(Boolean).join(' • ')}
                </Text>
              ) : null}
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
  medBrand: { color: Pastel.grayText, fontWeight: '400', fontSize: 14 },
  nextDoseRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  nextDoseText: { color: Pastel.grayText },
  metaSmall: { marginTop: 8, color: Pastel.grayText, fontSize: 12 },

  iconBtn: { padding: 8, borderRadius: 8, borderWidth: Platform.OS === 'web' ? (1 as any) : 0, borderColor: Pastel.border },
  primaryBtn: { marginTop: 10, backgroundColor: Pastel.blue, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16 },
  primaryBtnText: { color: '#fff', fontWeight: '800' },
});
