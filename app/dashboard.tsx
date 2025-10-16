import { createMedication, deleteMedication as deleteMedicationAPI, deletePrescription as deletePrescriptionAPI, deleteReport as deleteReportAPI, getAccessToken, getMedications, getPrescriptions, getReports, syncUserFromBackend } from '@/lib/api';
import i18n from '@/lib/i18n';
import { calcBMI, clearUser, loadUser, saveUser, type Medication, type Prescription, type Reminder, type Report, type UserData } from '@/lib/storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInUp, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useTranslation } = require('react-i18next/dist/commonjs');

// (removed duplicate import)

const Pastel = {
  cardBg: '#E6F4F1', // soft mint
  blue: '#1D8CF8',
  teal: '#00B5AD',
  green: '#22C55E',
  yellow: '#F59E0B',
  grayText: '#6B7280',
  text: '#0F172A',
  white: '#FFFFFF',
  border: '#EAECF0',
  chipBg: '#F3F4F6',
};

export default function Dashboard() {
  const { t } = useTranslation();
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [activeTab, setActiveTab] = useState<'prescriptions' | 'reports'>('prescriptions');
  const [refreshing, setRefreshing] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [medModalVisible, setMedModalVisible] = useState(false);
  const [medName, setMedName] = useState('');
  const [medBrandName, setMedBrandName] = useState('');
  const [medForm, setMedForm] = useState<'tablet' | 'syrup' | 'capsule' | 'injection'>('tablet');
  const [medStrength, setMedStrength] = useState('');
  const [medDosage, setMedDosage] = useState('');
  const [freqPerDay, setFreqPerDay] = useState('');
  const [medTimes, setMedTimes] = useState('');
  const [durationDays, setDurationDays] = useState('');
  const [startDate, setStartDate] = useState('');
  const [medInstructions, setMedInstructions] = useState('');
  const [medError, setMedError] = useState<string | null>(null);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [rxDeleteConfirmVisible, setRxDeleteConfirmVisible] = useState(false);
  const [rxDeleteIndex, setRxDeleteIndex] = useState<number | null>(null);
  const [repDeleteConfirmVisible, setRepDeleteConfirmVisible] = useState(false);
  const [repDeleteIndex, setRepDeleteIndex] = useState<number | null>(null);

  // FAB bounce animation
  const bounce = useSharedValue(0);
  useEffect(() => {
    bounce.value = withRepeat(withSequence(withTiming(-6, { duration: 700 }), withTiming(0, { duration: 700 })), -1, true);
  }, [bounce]);
  const fabStyle = useAnimatedStyle(() => ({ transform: [{ translateY: bounce.value }] }));

  const load = useCallback(async () => {
    try {
      console.log('Dashboard: Starting data load...');
      // First, try to sync from backend if we have a token
      const token = await getAccessToken();
      console.log('Dashboard: Token present?', !!token);
      let backendUser = null;
      
      if (token) {
        console.log('Dashboard: Syncing from backend...');
        backendUser = await syncUserFromBackend();
        console.log('Dashboard: Backend data received?', !!backendUser);
      }

      // If we got backend data, use it and save it locally
      if (backendUser) {
        console.log('Dashboard: Processing backend data...');
        // Map backend data to local UserData format
        let age: number | undefined;
        if (backendUser.dob) {
          const dob = new Date(backendUser.dob);
          const now = new Date();
          age = now.getFullYear() - dob.getFullYear();
          const m = now.getMonth() - dob.getMonth();
          if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
        }

        const height = backendUser.height_cm ? Number(backendUser.height_cm) : undefined;
        const weight = backendUser.weight_kg ? Number(backendUser.weight_kg) : undefined;
        
        // Calculate BMI
        let bmi: number | undefined;
        if (height && weight) {
          const h = height / 100;
          bmi = Number((weight / (h * h)).toFixed(2));
        }

        const allergies = backendUser.allergies ? backendUser.allergies.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
        const conditions = backendUser.known_conditions ? backendUser.known_conditions.split(',').map((s: string) => s.trim()).filter(Boolean) : [];

        // Load existing local data to preserve medications, prescriptions, reports, reminders
        const existingLocal = await loadUser();

        // Fetch medications from backend
        console.log('Dashboard: Fetching medications from backend...');
        const medsResult = await getMedications();
        const backendMedications = medsResult.success ? medsResult.medications || [] : [];
        console.log('Dashboard: Backend medications count:', backendMedications.length);

        // Fetch prescriptions from backend
        console.log('Dashboard: Fetching prescriptions from backend...');
        const rxResult = await getPrescriptions();
        const backendPrescriptionsRaw = rxResult.success ? (rxResult.prescriptions || []) : [];
        const backendPrescriptions = backendPrescriptionsRaw.map((p, i) => ({
          id: p._id || `rx-${i}`,
          doctor: p.doctor,
          date: p.date,
          medicine_count: Array.isArray(p.medications) ? p.medications.length : 0,
        }));

        // Fetch reports from backend
        console.log('Dashboard: Fetching reports from backend...');
        const repResult = await getReports();
        const backendReportsRaw = repResult.success ? (repResult.reports || []) : [];
        const backendReports = backendReportsRaw.map((r: any, i: number) => ({
          id: r._id || `rep-${i}`,
          name: r.name,
          date: r.date,
          summary: r.summary,
          file_uri: r.file_uri,
          mime_type: r.mime_type,
          size_bytes: r.size_bytes,
          // If backend later stores structured values, map them
          values: Array.isArray(r.tests)
            ? r.tests.map((t: any) => ({ name: t.name, value: String(t.result ?? ''), unit: t.units ?? undefined, ref: t.reference ?? undefined }))
            : undefined,
        }));

  const enriched: UserData = {
          name: backendUser.full_name || backendUser.email || 'User',
          age,
          gender: backendUser.gender ? (backendUser.gender.charAt(0).toUpperCase() + backendUser.gender.slice(1)) : undefined,
          blood_group: backendUser.blood_group || undefined,
          height_cm: height,
          weight_kg: weight,
          bmi,
          allergies,
          conditions,
          // Prefer backend data; fall back to existing local
          medications: backendMedications.length > 0 ? backendMedications : (existingLocal?.medications || []),
          prescriptions: backendPrescriptions.length > 0 ? backendPrescriptions : (existingLocal?.prescriptions || []),
          reports: backendReports.length > 0 ? backendReports : (existingLocal?.reports || []),
          reminders: existingLocal?.reminders || [],
          last_sync: new Date().toISOString(),
        };

        await saveUser(enriched);
        setUser(enriched);
        console.log('Dashboard: Backend data loaded successfully');
        return;
      }

      // Fallback to local storage
      console.log('Dashboard: No backend data, checking local storage...');
      const u = await loadUser();
      console.log('Dashboard: Local data present?', !!u);
      if (!u) {
        // No data available - redirect to sign in
        console.log('Dashboard: No data found, redirecting to landing page...');
        router.replace('/' as any);
        return;
      }
      
      console.log('Dashboard: Loading from local storage...');
      // make sure we have a couple of demo prescriptions if none exist
    let enriched = { ...u } as UserData;
    if (!enriched.prescriptions || enriched.prescriptions.length === 0) {
      enriched = {
        ...enriched,
        prescriptions: [
          { id: 'rx-1', doctor: 'Dr. Mehta', date: '2025-10-12', medicine_count: 3 },
          { id: 'rx-2', doctor: 'Dr. Kapoor', date: '2025-09-28', medicine_count: 2 },
        ],
      };
    }
    // do not inject default demo lab reports
    // fill calculated BMI if possible
    const bmi = calcBMI(enriched.height_cm, enriched.weight_kg);
    const next = bmi && enriched.bmi !== bmi ? { ...enriched, bmi } : enriched;
    setUser(next);
    if (JSON.stringify(next) !== JSON.stringify(u)) await saveUser(next);
    console.log('Dashboard: Local data loaded successfully');
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // On error, try to redirect to landing page
      router.replace('/' as any);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    
    // Try to sync from backend
    const token = await getAccessToken();
    if (token) {
      const backendUser = await syncUserFromBackend();
      
      if (backendUser) {
        // Map backend data to local format
        let age: number | undefined;
        if (backendUser.dob) {
          const dob = new Date(backendUser.dob);
          const now = new Date();
          age = now.getFullYear() - dob.getFullYear();
          const m = now.getMonth() - dob.getMonth();
          if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
        }

        const height = backendUser.height_cm ? Number(backendUser.height_cm) : undefined;
        const weight = backendUser.weight_kg ? Number(backendUser.weight_kg) : undefined;
        
        let bmi: number | undefined;
        if (height && weight) {
          const h = height / 100;
          bmi = Number((weight / (h * h)).toFixed(2));
        }

        const allergies = backendUser.allergies ? backendUser.allergies.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
        const conditions = backendUser.known_conditions ? backendUser.known_conditions.split(',').map((s: string) => s.trim()).filter(Boolean) : [];

        // Fetch medications from backend
        const medsResult = await getMedications();
        const backendMedications = medsResult.success ? medsResult.medications || [] : [];
        // Fetch prescriptions from backend
        const rxResult = await getPrescriptions();
        const backendPrescriptionsRaw = rxResult.success ? (rxResult.prescriptions || []) : [];
        const backendPrescriptions = backendPrescriptionsRaw.map((p, i) => ({
          id: p._id || `rx-${i}`,
          doctor: p.doctor,
          date: p.date,
          medicine_count: Array.isArray(p.medications) ? p.medications.length : 0,
        }));

        const synced: UserData = {
          ...user,
          name: backendUser.full_name || backendUser.email || user?.name || 'User',
          age,
          gender: backendUser.gender ? (backendUser.gender.charAt(0).toUpperCase() + backendUser.gender.slice(1)) : user?.gender,
          blood_group: backendUser.blood_group || user?.blood_group,
          height_cm: height,
          weight_kg: weight,
          bmi,
          allergies,
          conditions,
            medications: backendMedications.length > 0 ? backendMedications : user?.medications,
          prescriptions: backendPrescriptions.length > 0 ? backendPrescriptions : user?.prescriptions,
          last_sync: new Date().toISOString(),
        } as UserData;

        await saveUser(synced);
        setUser(synced);
        setRefreshing(false);
        return;
      }
    }

    // Fallback: just update last_sync timestamp
    const now = new Date().toISOString();
    const next = { ...(user ?? {}), last_sync: now } as UserData;
    await saveUser(next);
    setUser(next);
    setRefreshing(false);
  }, [user]);

  const meds: Medication[] = user?.medications ?? [];
  const prescriptions: Prescription[] = user?.prescriptions ?? [];
  const reports: Report[] = user?.reports ?? [];
  const reminders: Reminder[] = user?.reminders ?? [];

  const offlineChip = useMemo(() => {
    if (!user?.last_sync) return { text: 'Offline Mode: Never synced', color: Pastel.yellow };
    const last = new Date(user.last_sync);
    const diffMs = Date.now() - last.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const text = diffMin < 2 ? 'Synced just now' : `Offline Mode: Last synced ${diffMin}m ago`;
    const color = diffMin < 2 ? Pastel.green : Pastel.yellow;
    return { text, color };
  }, [user?.last_sync]);

  const markReminderDone = (id?: string) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = (prev.reminders ?? []).map((r) => (r.id === id ? { ...r, done: true } : r));
      const next = { ...prev, reminders: updated };
      saveUser(next);
      return next;
    });
  };


  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.appTitle}>Healix</Text>
        <Text style={styles.loadingText}>Loading your health dashboard…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Pastel.teal} />}
      >
        {/* Top Section: Health Overview */}
        <Animated.View entering={FadeInUp.duration(400)} style={[styles.overviewCard, { backgroundColor: Pastel.cardBg }]}> 
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.greeting}>{t('app.hi')}{user.name ? `, ${user.name.split(' ')[0]}` : ''}</Text>
              <Text style={styles.sectionSubtitle}>{t('app.welcome')}</Text>
            </View>
            <Pressable
              onPress={() => setDetailsVisible(true)}
              style={({ pressed }) => [styles.avatarButton, pressed && { opacity: 0.8 }]}>
              <Text style={styles.avatarText}>{user.name?.[0]?.toUpperCase() ?? 'U'}</Text>
            </Pressable>
            <Pressable
                onPress={() => {
                  const order = ['en','hi','ta'] as const;
                  const idx = order.indexOf(i18n.language as any);
                  const next = order[(idx + 1) % order.length];
                  i18n.changeLanguage(next);
                }}
                style={({ pressed }) => [styles.langChip, { marginLeft: 12 }, pressed && { opacity: 0.85 }]}>
                <Text style={{ color: Pastel.text, fontWeight: '700' }}>{(i18n.language || 'en').toUpperCase()}</Text>
            </Pressable>
            <Pressable
                onPress={async () => { await clearUser(); router.replace('/' as any); }}
                style={({ pressed }) => [styles.logoutChip, { marginLeft: 12 }, pressed && { opacity: 0.85 }]}>
                <Ionicons name="log-out-outline" size={18} color="#EF4444" />
            </Pressable>
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metricActions}>
            </View>
          </View>
        </Animated.View>

        {/* Active Medications */}
  <SectionHeader title={t('dashboard.activeMeds')} actionLabel={t('common.add')} onAction={() => setMedModalVisible(true)} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
          {meds.map((m, i) => (
            <Animated.View key={`${m.name}-${i}`} entering={FadeInUp.delay(60 * i)} style={styles.medCard}>
              <View style={styles.medHeader}>
                <Text style={styles.medName}>{m.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={[styles.statusDot, { backgroundColor: m.status === 'active' ? Pastel.green : m.status === 'completed' ? Pastel.blue : Pastel.yellow }]} />
                  <Pressable accessibilityLabel={`Delete ${m.name}`} onPress={() => { setDeleteIndex(i); setDeleteConfirmVisible(true); }} style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.8 }]}>
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </Pressable>
                </View>
              </View>
              <Text style={styles.medMeta}>
                {m.dosage || m.strength} • {m.frequency_per_day}x/day{m.form ? ` • ${m.form}` : ''}
              </Text>
              <View style={styles.nextDoseRow}>
                <Ionicons name="time-outline" size={16} color={Pastel.grayText} />
                <Text style={styles.nextDoseText}>Next: {m.times[0] || 'N/A'}</Text>
              </View>
            </Animated.View>
          ))}
          <Pressable onPress={() => setMedModalVisible(true)} style={({ pressed }) => [styles.addMedCard, pressed && { opacity: 0.9 }]}>
            <Ionicons name="add" size={28} color={Pastel.blue} />
            <Text style={{ color: Pastel.blue, fontWeight: '600' }}>Add</Text>
          </Pressable>
        </ScrollView>

        {/* Reports & Prescriptions */}
        <View style={styles.segmentedContainer}>
          <Pressable onPress={() => setActiveTab('prescriptions')} style={[styles.segment, activeTab === 'prescriptions' && styles.segmentActive]}>
            <Text style={[styles.segmentText, activeTab === 'prescriptions' && styles.segmentTextActive]}>{t('dashboard.prescriptions')}</Text>
          </Pressable>
          <Pressable onPress={() => setActiveTab('reports')} style={[styles.segment, activeTab === 'reports' && styles.segmentActive]}>
            <Text style={[styles.segmentText, activeTab === 'reports' && styles.segmentTextActive]}>{t('dashboard.labReports')}</Text>
          </Pressable>
        </View>
        {activeTab === 'prescriptions' ? (
          <View style={styles.vList}>
            <Pressable onPress={() => router.push('/prescriptions/new' as any)} style={({ pressed }) => [styles.listCard, styles.addFirstCard, pressed && { opacity: 0.9 }]}>
              <Text style={[styles.listTitle, { color: Pastel.blue }]}>{t('dashboard.addPrescription')}</Text>
              <Text style={styles.listSubtitle}>{t('dashboard.addPrescriptionDesc')}</Text>
            </Pressable>
            {prescriptions.map((p, i) => (
              <View key={p.id ?? `rx-${i}`} style={styles.listCard}>
                <Pressable onPress={() => router.push(`/prescriptions/${p.id ?? i}` as any)} style={({ pressed }) => [pressed && { opacity: 0.9 }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.listTitle}>Dr. {p.doctor}</Text>
                    <Text style={styles.listDate}>{p.date}</Text>
                  </View>
                  <Text style={styles.listSubtitle}>{p.medicine_count} medicines</Text>
                </Pressable>
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
                  <Pressable accessibilityLabel={`Delete prescription ${p.doctor}`} onPress={() => { setRxDeleteIndex(i); setRxDeleteConfirmVisible(true); }} style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.8 }]}>
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.vList}>
            <Pressable onPress={() => router.push('/reports/new' as any)} style={({ pressed }) => [styles.listCard, styles.addFirstCard, pressed && { opacity: 0.9 }]}>
              <Text style={[styles.listTitle, { color: Pastel.blue }]}>{t('dashboard.addReport')}</Text>
              <Text style={styles.listSubtitle}>{t('dashboard.addReportDesc')}</Text>
            </Pressable>
            {reports.map((r, i) => (
              <View key={r.id ?? `rep-${i}`} style={styles.listCard}>
                <Pressable onPress={() => router.push(`/reports/${r.id ?? i}` as any)} style={({ pressed }) => [pressed && { opacity: 0.9 }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.listTitle}>{r.name}</Text>
                    <Text style={styles.listDate}>{r.date}</Text>
                  </View>
                  <Text style={styles.listSubtitle}>{r.summary}</Text>
                </Pressable>
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
                  <Pressable accessibilityLabel={`Delete report ${r.name}`} onPress={() => { setRepDeleteIndex(i); setRepDeleteConfirmVisible(true); }} style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.8 }]}>
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Reminders */}
  <Text style={styles.sectionTitle}>{t('dashboard.remindersToday')}</Text>
        <View style={styles.remindersPanel}>
          {(reminders.length ? reminders : [{ id: 'none', type: 'medication', message: t('dashboard.noReminders'), time: '', done: false }]).map((r) => (
            <View key={r.id} style={styles.reminderRow}>
              <View style={styles.reminderLeft}>
                <ReminderIcon type={r.type} />
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.reminderMsg}>{r.message}{r.time ? ` at ${r.time}` : ''}</Text>
                </View>
              </View>
              {r.id !== 'none' ? (
                <Pressable onPress={() => markReminderDone(r.id)} style={({ pressed }) => [styles.doneBtn, r.done && styles.doneBtnDone, pressed && { opacity: 0.85 }]}>
                  <Text style={[styles.doneBtnText, r.done && styles.doneBtnTextDone]}>{r.done ? t('dashboard.done') : t('dashboard.markDone')}</Text>
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>

        <View style={{ height: 84 }} />
      </ScrollView>

      {/* Sync chip */}
      <View style={[styles.syncChip, { backgroundColor: offlineChip.color }]}> 
        <Ionicons name={offlineChip.color === Pastel.green ? 'cloud-done' : 'cloud-offline'} size={14} color="#fff" />
        <Text style={styles.syncText}>{offlineChip.text}</Text>
      </View>

      {/* Floating AI Assistant Button */}
      <Animated.View style={[styles.fabWrapper, fabStyle]}> 
        <Pressable onPress={() => router.push('/chat' as any)} style={({ pressed }) => [styles.fab, pressed && { transform: [{ scale: 0.98 }] }]}>
          <LinearGradient colors={[Pastel.teal, Pastel.blue]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <Ionicons name="chatbubble-ellipses" size={24} color="#fff" />
        </Pressable>
      </Animated.View>

      {/* Details Modal */}
      <Modal visible={detailsVisible} animationType="fade" transparent onRequestClose={() => setDetailsVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.modalTitle}>Health Details</Text>
              <Pressable onPress={() => setDetailsVisible(false)} style={({ pressed }) => [styles.modalClose, pressed && { opacity: 0.8 }]}>
                <Ionicons name="close" size={20} color={Pastel.text} />
              </Pressable>
            </View>
            <ScrollView style={{ marginTop: 8 }} contentContainerStyle={{ paddingBottom: 8 }}>
              <DetailRow label="Name" value={user.name} />
              <DetailRow label="Age" value={user.age != null ? String(user.age) : '-'} />
              <DetailRow label="Gender" value={user.gender ?? '-'} />
              <DetailRow label="Blood group" value={user.blood_group ?? '-'} />
              <DetailRow label="Height" value={user.height_cm ? `${user.height_cm} cm` : '-'} />
              <DetailRow label="Weight" value={user.weight_kg ? `${user.weight_kg} kg` : '-'} />
              <DetailRow label="BMI" value={user.bmi != null ? String(user.bmi) : '-'} />
              <DetailRow label="Allergies" value={(user.allergies && user.allergies.length) ? user.allergies.join(', ') : 'None'} />
              <DetailRow label="Conditions" value={(user.conditions && user.conditions.length) ? user.conditions.join(', ') : 'None'} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Delete Report Confirm Modal */}
      <Modal visible={repDeleteConfirmVisible} animationType="fade" transparent onRequestClose={() => setRepDeleteConfirmVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete report?</Text>
            <Text style={{ color: Pastel.grayText, marginTop: 6 }}>This action can’t be undone.</Text>
            {repDeleteIndex != null && reports[repDeleteIndex] ? (
              <View style={{ marginTop: 10, padding: 10, backgroundColor: '#F8FAFC', borderRadius: 10, borderWidth: Platform.OS === 'web' ? (1 as any) : 0, borderColor: Pastel.border }}>
                <Text style={{ color: Pastel.text, fontWeight: '700' }}>{reports[repDeleteIndex].name}</Text>
                <Text style={{ color: Pastel.grayText }}>{reports[repDeleteIndex].date}</Text>
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <Pressable onPress={() => { setRepDeleteConfirmVisible(false); setRepDeleteIndex(null); }} style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.9 }]}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={async () => {
                if (repDeleteIndex == null) return;
                const rep = reports[repDeleteIndex];
                const token = await getAccessToken();
                if (token && rep.id) {
                  console.log('Dashboard: Deleting report from backend...');
                  const result = await deleteReportAPI(rep.id);
                  if (!result.success) {
                    console.warn('Dashboard: Failed to delete report backend:', result.error);
                  }
                }
                setUser((prev) => {
                  if (!prev) return prev;
                  const nextReports = (prev.reports ?? []).filter((_, idx) => idx !== repDeleteIndex);
                  const next = { ...prev, reports: nextReports } as UserData;
                  saveUser(next);
                  return next;
                });
                setRepDeleteConfirmVisible(false);
                setRepDeleteIndex(null);
              }} style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.9 }]}>
                <Text style={styles.deleteText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Prescription Confirm Modal */}
      <Modal visible={rxDeleteConfirmVisible} animationType="fade" transparent onRequestClose={() => setRxDeleteConfirmVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete prescription?</Text>
            <Text style={{ color: Pastel.grayText, marginTop: 6 }}>This action can’t be undone.</Text>
            {rxDeleteIndex != null && prescriptions[rxDeleteIndex] ? (
              <View style={{ marginTop: 10, padding: 10, backgroundColor: '#F8FAFC', borderRadius: 10, borderWidth: Platform.OS === 'web' ? (1 as any) : 0, borderColor: Pastel.border }}>
                <Text style={{ color: Pastel.text, fontWeight: '700' }}>Dr. {prescriptions[rxDeleteIndex].doctor}</Text>
                <Text style={{ color: Pastel.grayText }}>{prescriptions[rxDeleteIndex].date} • {prescriptions[rxDeleteIndex].medicine_count} medicines</Text>
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <Pressable onPress={() => { setRxDeleteConfirmVisible(false); setRxDeleteIndex(null); }} style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.9 }]}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={async () => {
                if (rxDeleteIndex == null) return;
                const rx = prescriptions[rxDeleteIndex];
                const token = await getAccessToken();
                if (token && rx.id) {
                  console.log('Dashboard: Deleting prescription from backend...');
                  const result = await deletePrescriptionAPI(rx.id);
                  if (!result.success) {
                    console.warn('Dashboard: Failed to delete prescription backend:', result.error);
                  }
                }
                setUser((prev) => {
                  if (!prev) return prev;
                  const nextRx = (prev.prescriptions ?? []).filter((_, idx) => idx !== rxDeleteIndex);
                  const next = { ...prev, prescriptions: nextRx } as UserData;
                  saveUser(next);
                  return next;
                });
                setRxDeleteConfirmVisible(false);
                setRxDeleteIndex(null);
              }} style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.9 }]}>
                <Text style={styles.deleteText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      {/* Delete Medication Confirm Modal */}
      <Modal visible={deleteConfirmVisible} animationType="fade" transparent onRequestClose={() => setDeleteConfirmVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete medication?</Text>
            <Text style={{ color: Pastel.grayText, marginTop: 6 }}>This action can’t be undone.</Text>
            {deleteIndex != null && meds[deleteIndex] ? (
              <View style={{ marginTop: 10, padding: 10, backgroundColor: '#F8FAFC', borderRadius: 10, borderWidth: Platform.OS === 'web' ? (1 as any) : 0, borderColor: Pastel.border }}>
                <Text style={{ color: Pastel.text, fontWeight: '700' }}>{meds[deleteIndex].name}</Text>
                <Text style={{ color: Pastel.grayText }}>
                  {meds[deleteIndex].dosage || meds[deleteIndex].strength} • {meds[deleteIndex].frequency_per_day}x/day
                </Text>
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <Pressable onPress={() => { setDeleteConfirmVisible(false); setDeleteIndex(null); }} style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.9 }]}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
                <Pressable onPress={async () => {
                if (deleteIndex == null) return;
                  const medToDelete = meds[deleteIndex];

                  // Try to delete from backend if it has an _id
                  const token = await getAccessToken();
                  if (token && medToDelete._id) {
                    console.log('Dashboard: Deleting medication from backend...');
                    const result = await deleteMedicationAPI(medToDelete._id);
                    if (result.success) {
                      console.log('Dashboard: Medication deleted from backend');
                    } else {
                      console.warn('Dashboard: Failed to delete from backend:', result.error);
                    }
                  }

                setUser((prev) => {
                  if (!prev) return prev;
                  const nextMeds = (prev.medications ?? []).filter((_, idx) => idx !== deleteIndex);
                  const next = { ...prev, medications: nextMeds } as UserData;
                  saveUser(next);
                  return next;
                });
                setDeleteConfirmVisible(false);
                setDeleteIndex(null);
              }} style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.9 }]}>
                <Text style={styles.deleteText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Medication Modal */}
      <Modal visible={medModalVisible} animationType="slide" transparent onRequestClose={() => setMedModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.modalTitle}>Add Medication</Text>
              <Pressable onPress={() => setMedModalVisible(false)} style={({ pressed }) => [styles.modalClose, pressed && { opacity: 0.8 }]}>
                <Ionicons name="close" size={20} color={Pastel.text} />
              </Pressable>
            </View>
            <ScrollView style={{ marginTop: 8 }} contentContainerStyle={{ gap: 12, paddingBottom: 8 }}>
              <View>
                <Text style={styles.inputLabel}>Medicine name *</Text>
                <TextInput
                  value={medName}
                  onChangeText={setMedName}
                  placeholder="e.g., Paracetamol"
                  style={styles.input}
                />
              </View>

              <View>
                <Text style={styles.inputLabel}>Brand name (optional)</Text>
                <TextInput
                  value={medBrandName}
                  onChangeText={setMedBrandName}
                  placeholder="e.g., Calpol 500"
                  style={styles.input}
                />
              </View>

              <View style={styles.rowInline}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Form</Text>
                  <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                    {(['tablet', 'syrup', 'capsule', 'injection'] as const).map((f) => (
                      <Pressable
                        key={f}
                        onPress={() => setMedForm(f)}
                        style={({ pressed }) => [
                          styles.formChip,
                          medForm === f && styles.formChipActive,
                          pressed && { opacity: 0.8 }
                        ]}
                      >
                        <Text style={[styles.formChipText, medForm === f && styles.formChipTextActive]}>
                          {f.charAt(0).toUpperCase() + f.slice(1)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.rowInline}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Strength</Text>
                  <TextInput
                    value={medStrength}
                    onChangeText={setMedStrength}
                    placeholder="e.g., 500mg"
                    style={styles.input}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Dosage</Text>
                  <TextInput
                    value={medDosage}
                    onChangeText={setMedDosage}
                    placeholder="e.g., 1 tablet"
                    style={styles.input}
                  />
                </View>
              </View>

              <View>
                <Text style={styles.inputLabel}>Frequency per day *</Text>
                <TextInput
                  value={freqPerDay}
                  onChangeText={(t) => setFreqPerDay(t.replace(/[^0-9]/g, ''))}
                  placeholder="e.g., 2"
                  keyboardType="numeric"
                  style={styles.input}
                />
              </View>

              <View>
                <Text style={styles.inputLabel}>Times (comma-separated) *</Text>
                <TextInput
                  value={medTimes}
                  onChangeText={setMedTimes}
                  placeholder="e.g., 08:00, 20:00"
                  style={styles.input}
                />
                <Text style={styles.inputSublabel}>Enter times in HH:MM format, separated by commas</Text>
              </View>

              <View style={styles.rowInline}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Duration (days) *</Text>
                  <TextInput
                    value={durationDays}
                    onChangeText={(t) => setDurationDays(t.replace(/[^0-9]/g, ''))}
                    placeholder="e.g., 5"
                    keyboardType="numeric"
                    style={styles.input}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Start date *</Text>
                  <TextInput
                    value={startDate}
                    onChangeText={setStartDate}
                    placeholder="YYYY-MM-DD"
                    style={styles.input}
                  />
                </View>
              </View>

              <View>
                <Text style={styles.inputLabel}>Instructions (optional)</Text>
                <TextInput
                  value={medInstructions}
                  onChangeText={setMedInstructions}
                  placeholder="e.g., After food"
                  style={styles.input}
                  multiline
                />
              </View>

              {medError ? <Text style={{ color: '#b91c1c' }}>{medError}</Text> : null}

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                <Pressable onPress={() => setMedModalVisible(false)} style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.9 }]}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                    onPress={async () => {
                    setMedError(null);
                    if (!medName.trim()) return setMedError('Please enter a medicine name.');
                    if (!freqPerDay) return setMedError('Please enter frequency per day.');
                    if (!medTimes.trim()) return setMedError('Please enter intake times.');
                    if (!durationDays) return setMedError('Please enter duration in days.');
                    if (!startDate.trim()) return setMedError('Please enter start date.');

                    // Parse times
                    const timesArray = medTimes.split(',').map(t => t.trim()).filter(Boolean);
                    if (timesArray.length === 0) return setMedError('Please enter at least one time.');

                    // Calculate end date
                    const start = new Date(startDate);
                    const end = new Date(start);
                    end.setDate(end.getDate() + Number(durationDays));
                    const endDateStr = end.toISOString().slice(0, 10);

                    const newMed: Medication = {
                      name: medName.trim(),
                      brand_name: medBrandName.trim() || undefined,
                      form: medForm,
                      strength: medStrength.trim() || undefined,
                      dosage: medDosage.trim() || undefined,
                      frequency_per_day: Number(freqPerDay),
                      times: timesArray,
                      duration_days: Number(durationDays),
                      start_date: startDate.trim(),
                      end_date: endDateStr,
                      instructions: medInstructions.trim() || undefined,
                      source: 'manual_add',
                      status: 'active',
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                    };

                      // Try to save to backend first
                      const token = await getAccessToken();
                      let savedMed = newMed;
                      if (token) {
                        console.log('Dashboard: Saving medication to backend...');
                        const result = await createMedication(newMed);
                        if (result.success && result.medication) {
                          console.log('Dashboard: Medication saved to backend');
                          savedMed = result.medication;
                        } else {
                          console.warn('Dashboard: Failed to save to backend:', result.error);
                        }
                      }

                    setUser((prev) => {
                      if (!prev) return prev;
                        const next: UserData = { ...prev, medications: [...(prev.medications ?? []), savedMed] };
                      saveUser(next);
                      return next;
                    });
                    setMedModalVisible(false);
                    setMedName(''); setMedBrandName(''); setMedForm('tablet'); setMedStrength('');
                    setMedDosage(''); setFreqPerDay(''); setMedTimes(''); setDurationDays('');
                    setStartDate(''); setMedInstructions('');
                  }}
                  style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.9 }]}>
                  <Text style={styles.saveText}>Save</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricItem}>
      <Text style={styles.metricLabel}>{label}: </Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function Dot() {
  return <Text style={styles.metricDot}> • </Text>;
}

function Pill({ text }: { text: string }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillText}>{text}</Text>
    </View>
  );
}

function SectionHeader({ title, actionLabel, onAction }: { title: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel ? (
        <Pressable onPress={onAction} style={({ pressed }) => [styles.sectionAction, pressed && { opacity: 0.8 }]}>
          <Text style={styles.sectionActionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function ReminderIcon({ type }: { type?: Reminder['type'] | string }) {
  const t = (type === 'medication' || type === 'appointment' || type === 'test') ? type : 'medication';
  const color = t === 'medication' ? Pastel.teal : t === 'appointment' ? Pastel.blue : Pastel.green;
  const name = t === 'medication' ? 'medkit-outline' : t === 'appointment' ? 'calendar-outline' : 'flask-outline';
  return (
    <View style={[styles.reminderIcon, { backgroundColor: '#fff', borderColor: Pastel.border }]}> 
      <Ionicons name={name as any} size={16} color={color} />
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent: { padding: 16 },
  appTitle: { fontSize: 28, fontWeight: '800', color: Pastel.text },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  loadingText: { marginTop: 8, color: Pastel.grayText },

  overviewCard: { borderRadius: 20, padding: 16, marginTop: 22, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 1, borderWidth: Platform.OS === 'web' ? (1 as any) : 0, borderColor: Pastel.border },
  greeting: { fontSize: 22, fontWeight: '800', color: Pastel.text },
  sectionSubtitle: { color: Pastel.grayText, marginTop: 2 },
  avatarButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: Pastel.white, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 2, borderWidth: Platform.OS === 'web' ? (1 as any) : 0, borderColor: Pastel.border },
  avatarText: { fontWeight: '700', color: Pastel.text },

  metricsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  metricsWrap: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  metricItem: { flexDirection: 'row', alignItems: 'baseline', paddingVertical: 2 },
  metricLabel: { fontSize: 12, color: Pastel.grayText },
  metricValue: { fontSize: 14, fontWeight: '700', color: Pastel.text },
  metricDot: { color: Pastel.grayText, marginHorizontal: 6 },
  metricActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoChip: { paddingHorizontal: 10, paddingVertical: 8, backgroundColor: Pastel.white, borderRadius: 999, borderWidth: Platform.OS === 'web' ? (1 as any) : 0, borderColor: Pastel.border },
  infoText: { color: Pastel.blue, fontWeight: '700' },
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  pill: { backgroundColor: Pastel.white, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, borderWidth: Platform.OS === 'web' ? (1 as any) : 0, borderColor: Pastel.border },
  pillText: { fontSize: 12, color: Pastel.text },

  sectionHeader: { marginTop: 18, marginBottom: 8, paddingHorizontal: 2, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: Pastel.text, marginTop: 12 },
  sectionAction: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: Pastel.chipBg, borderRadius: 999 },
  sectionActionText: { color: Pastel.blue, fontWeight: '700' },

  hScroll: { paddingVertical: 4, gap: 12 },
  medCard: { width: 220, backgroundColor: Pastel.white, borderRadius: 16, padding: 14, marginRight: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 2, borderWidth: Platform.OS === 'web' ? (1 as any) : 0, borderColor: Pastel.border },
  medHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  medName: { fontSize: 16, fontWeight: '700', color: Pastel.text },
  medMeta: { marginTop: 6, color: Pastel.grayText },
  nextDoseRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  nextDoseText: { color: Pastel.grayText },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  addMedCard: { width: 120, backgroundColor: '#F8FAFC', borderRadius: 16, padding: 14, marginRight: 12, alignItems: 'center', justifyContent: 'center', borderWidth: Platform.OS === 'web' ? (1 as any) : 0, borderColor: Pastel.border },
  iconBtn: { padding: 6, borderRadius: 8 },

  segmentedContainer: { flexDirection: 'row', backgroundColor: Pastel.chipBg, borderRadius: 12, padding: 4, marginTop: 10 },
  segment: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  segmentActive: { backgroundColor: Pastel.white, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  segmentText: { color: Pastel.grayText, fontWeight: '600' },
  segmentTextActive: { color: Pastel.text, fontWeight: '800' },

  vList: { marginTop: 10, gap: 10 },
  listCard: { backgroundColor: Pastel.white, borderRadius: 16, padding: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 1, borderWidth: Platform.OS === 'web' ? (1 as any) : 0, borderColor: Pastel.border },
  addFirstCard: { borderStyle: 'dashed', borderWidth: Platform.OS === 'web' ? (1 as any) : StyleSheet.hairlineWidth, borderColor: Pastel.blue, backgroundColor: '#F8FBFF' },
  listTitle: { fontSize: 16, fontWeight: '700', color: Pastel.text },
  listDate: { color: Pastel.grayText },
  listSubtitle: { color: Pastel.grayText, marginTop: 6 },

  remindersPanel: { backgroundColor: '#F5F6F8', borderRadius: 16, padding: 12, borderWidth: Platform.OS === 'web' ? (1 as any) : 0, borderColor: Pastel.border },
  reminderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  reminderLeft: { flexDirection: 'row', alignItems: 'center' },
  reminderIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: Platform.OS === 'web' ? (1 as any) : 0 },
  reminderMsg: { color: Pastel.text, fontWeight: '600' },
  doneBtn: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: Pastel.white, borderRadius: 999, borderWidth: Platform.OS === 'web' ? (1 as any) : 0, borderColor: Pastel.border },
  doneBtnDone: { backgroundColor: '#DCFCE7', borderColor: '#bbf7d0' },
  doneBtnText: { color: Pastel.blue, fontWeight: '700' },
  doneBtnTextDone: { color: Pastel.green },

  // Logout chip next to avatar
  logoutChip: { paddingHorizontal: 10, paddingVertical: 8, backgroundColor: Pastel.white, borderRadius: 999, borderWidth: Platform.OS === 'web' ? (1 as any) : 0, borderColor: Pastel.border },
  langChip: { paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#E5E7EB', borderRadius: 999, borderWidth: Platform.OS === 'web' ? (1 as any) : 0, borderColor: Pastel.border },
  logoutText: { color: '#EF4444', fontWeight: '700' },

  fabWrapper: { position: 'absolute', right: 16, bottom: 24 },
  fab: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, elevation: 4, overflow: 'hidden' },

  syncChip: { position: 'absolute', left: 16, bottom: 24, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 6 },
  syncText: { color: '#fff', fontWeight: '700' },

  // Modal styles
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modalCard: { width: '100%', maxWidth: 520, backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: Platform.OS === 'web' ? (1 as any) : 0, borderColor: Pastel.border, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, elevation: 4 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Pastel.text },
  modalClose: { padding: 6, borderRadius: 8 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: Platform.OS === 'web' ? (1 as any) : StyleSheet.hairlineWidth, borderColor: Pastel.border },
  detailLabel: { color: Pastel.grayText, fontWeight: '600' },
  detailValue: { color: Pastel.text, fontWeight: '700' },

  // Inputs and buttons
  inputLabel: { color: Pastel.text, fontWeight: '700', marginBottom: 6 },
  inputSublabel: { color: Pastel.grayText, fontWeight: '600', marginBottom: 6 },
  input: { borderWidth: Platform.OS === 'web' ? (1 as any) : StyleSheet.hairlineWidth, borderColor: Pastel.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: Platform.OS === 'web' ? 10 : 12, fontSize: 16, backgroundColor: '#fff', color: Pastel.text },
  rowInline: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  cancelBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 10, paddingVertical: 12, backgroundColor: '#F3F4F6', borderWidth: Platform.OS === 'web' ? (1 as any) : 0, borderColor: Pastel.border },
  cancelText: { color: Pastel.text, fontWeight: '700' },
  saveBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 10, paddingVertical: 12, backgroundColor: Pastel.blue },
  saveText: { color: '#fff', fontWeight: '800' },
  deleteBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 10, paddingVertical: 12, backgroundColor: '#EF4444' },
  deleteText: { color: '#fff', fontWeight: '800' },
  
  // Form chip styles
  formChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: Pastel.chipBg, borderWidth: Platform.OS === 'web' ? (1 as any) : 0, borderColor: Pastel.border },
  formChipActive: { backgroundColor: Pastel.blue, borderColor: Pastel.blue },
  formChipText: { color: Pastel.text, fontWeight: '600', fontSize: 14 },
  formChipTextActive: { color: '#fff', fontWeight: '700' },
});
