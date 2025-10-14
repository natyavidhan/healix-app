import { calcBMI, clearUser, getSampleUser, loadUser, saveUser, type Medication, type Prescription, type Reminder, type Report, type UserData } from '@/lib/storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

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
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [activeTab, setActiveTab] = useState<'prescriptions' | 'reports'>('prescriptions');
  const [refreshing, setRefreshing] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);

  // FAB bounce animation
  const bounce = useSharedValue(0);
  useEffect(() => {
    bounce.value = withRepeat(withSequence(withTiming(-6, { duration: 700 }), withTiming(0, { duration: 700 })), -1, true);
  }, [bounce]);
  const fabStyle = useAnimatedStyle(() => ({ transform: [{ translateY: bounce.value }] }));

  const load = useCallback(async () => {
    const u = (await loadUser()) ?? getSampleUser();
    // fill calculated BMI if possible
    const bmi = calcBMI(u.height_cm, u.weight_kg);
    const next = bmi && u.bmi !== bmi ? { ...u, bmi } : u;
    setUser(next);
    if (next !== u) await saveUser(next);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Simulate sync delay
    await new Promise((r) => setTimeout(r, 700));
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

  const addMedication = () => {
    // Dummy action: append a placeholder medication
    const draft: Medication = {
      name: 'Vitamin D3',
      dosage: '1000 IU',
      frequency: '1/day',
      next_dose: '8:00 AM',
      status: 'upcoming',
    };
    setUser((prev) => {
      const next: UserData = { ...(prev ?? getSampleUser()) };
      next.medications = [...(next.medications ?? []), draft];
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
              <Text style={styles.greeting}>Hi{user.name ? `, ${user.name.split(' ')[0]}` : ''}</Text>
              <Text style={styles.sectionSubtitle}>Here’s your health snapshot</Text>
            </View>
            <Pressable
              onPress={() => {}}
              style={({ pressed }) => [styles.avatarButton, pressed && { opacity: 0.8 }]}>
              <Text style={styles.avatarText}>{user.name?.[0]?.toUpperCase() ?? 'U'}</Text>
            </Pressable>
          </View>

          <View style={styles.metricsRow}>
            {/* <View style={styles.metricsWrap}>
              <Metric label="Age" value={String(user.age ?? '-')} />
              <Dot />
              <Metric label="Gender" value={user.gender ?? '-'} />
              <Dot />
              <Metric label="Blood" value={user.blood_group ?? '-'} />
              <Dot />
              <Metric label="Height" value={user.height_cm ? `${user.height_cm} cm` : '-'} />
              <Dot />
              <Metric label="Weight" value={user.weight_kg ? `${user.weight_kg} kg` : '-'} />
              <Dot />
              <Metric label="BMI" value={user.bmi ? String(user.bmi) : '-'} />
            </View> */}
            <View style={styles.metricActions}>
              <Pressable onPress={() => setDetailsVisible(true)} style={({ pressed }) => [styles.infoChip, pressed && { opacity: 0.85 }]}>
                <Text style={styles.infoText}>Details</Text>
              </Pressable>
              <Pressable
                onPress={async () => { await clearUser(); router.replace('/' as any); }}
                style={({ pressed }) => [styles.logoutChip, pressed && { opacity: 0.85 }]}>
                <Text style={styles.logoutText}>Logout</Text>
              </Pressable>
            </View>
          </View>

          {(user.allergies?.length || user.conditions?.length) ? (
            <View style={styles.pillsRow}>
              {(user.allergies ?? []).map((a, idx) => (
                <Pill key={`alg-${idx}`} text={`${a} Allergy`} />
              ))}
              {(user.conditions ?? []).map((c, idx) => (
                <Pill key={`cond-${idx}`} text={c} />
              ))}
            </View>
          ) : null}
        </Animated.View>

        {/* Active Medications */}
        <SectionHeader title="Active Medications" actionLabel="Add" onAction={addMedication} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
          {meds.map((m, i) => (
            <Animated.View key={`${m.name}-${i}`} entering={FadeInUp.delay(60 * i)} style={styles.medCard}>
              <View style={styles.medHeader}>
                <Text style={styles.medName}>{m.name}</Text>
                <View style={[styles.statusDot, { backgroundColor: m.status === 'taken' ? Pastel.green : Pastel.yellow }]} />
              </View>
              <Text style={styles.medMeta}>{m.dosage} • {m.frequency}</Text>
              <View style={styles.nextDoseRow}>
                <Ionicons name="time-outline" size={16} color={Pastel.grayText} />
                <Text style={styles.nextDoseText}>Next: {m.next_dose}</Text>
              </View>
            </Animated.View>
          ))}
          <Pressable onPress={addMedication} style={({ pressed }) => [styles.addMedCard, pressed && { opacity: 0.9 }]}>
            <Ionicons name="add" size={28} color={Pastel.blue} />
            <Text style={{ color: Pastel.blue, fontWeight: '600' }}>Add</Text>
          </Pressable>
        </ScrollView>

        {/* Reports & Prescriptions */}
        <View style={styles.segmentedContainer}>
          <Pressable onPress={() => setActiveTab('prescriptions')} style={[styles.segment, activeTab === 'prescriptions' && styles.segmentActive]}>
            <Text style={[styles.segmentText, activeTab === 'prescriptions' && styles.segmentTextActive]}>Prescriptions</Text>
          </Pressable>
          <Pressable onPress={() => setActiveTab('reports')} style={[styles.segment, activeTab === 'reports' && styles.segmentActive]}>
            <Text style={[styles.segmentText, activeTab === 'reports' && styles.segmentTextActive]}>Lab Reports</Text>
          </Pressable>
        </View>
        {activeTab === 'prescriptions' ? (
          <View style={styles.vList}>
            {prescriptions.map((p, i) => (
              <Pressable key={p.id ?? `rx-${i}`} onPress={() => router.push(`/prescriptions/${p.id ?? i}` as any)} style={({ pressed }) => [styles.listCard, pressed && { opacity: 0.9 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.listTitle}>Dr. {p.doctor}</Text>
                  <Text style={styles.listDate}>{p.date}</Text>
                </View>
                <Text style={styles.listSubtitle}>{p.medicine_count} medicines</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.vList}>
            {reports.map((r, i) => (
              <Pressable key={r.id ?? `rep-${i}`} onPress={() => router.push(`/reports/${r.id ?? i}` as any)} style={({ pressed }) => [styles.listCard, pressed && { opacity: 0.9 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.listTitle}>{r.name}</Text>
                  <Text style={styles.listDate}>{r.date}</Text>
                </View>
                <Text style={styles.listSubtitle}>{r.summary}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Reminders */}
        <Text style={styles.sectionTitle}>Today’s reminders</Text>
        <View style={styles.remindersPanel}>
          {(reminders.length ? reminders : [{ id: 'none', type: 'medication', message: 'No reminders for today', time: '', done: false }]).map((r) => (
            <View key={r.id} style={styles.reminderRow}>
              <View style={styles.reminderLeft}>
                <ReminderIcon type={r.type} />
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.reminderMsg}>{r.message}{r.time ? ` at ${r.time}` : ''}</Text>
                </View>
              </View>
              {r.id !== 'none' ? (
                <Pressable onPress={() => markReminderDone(r.id)} style={({ pressed }) => [styles.doneBtn, r.done && styles.doneBtnDone, pressed && { opacity: 0.85 }]}>
                  <Text style={[styles.doneBtnText, r.done && styles.doneBtnTextDone]}>{r.done ? 'Done' : 'Mark as Done'}</Text>
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
  sectionTitle: { fontSize: 18, fontWeight: '800', color: Pastel.text },
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

  segmentedContainer: { flexDirection: 'row', backgroundColor: Pastel.chipBg, borderRadius: 12, padding: 4, marginTop: 10 },
  segment: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  segmentActive: { backgroundColor: Pastel.white, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  segmentText: { color: Pastel.grayText, fontWeight: '600' },
  segmentTextActive: { color: Pastel.text, fontWeight: '800' },

  vList: { marginTop: 10, gap: 10 },
  listCard: { backgroundColor: Pastel.white, borderRadius: 16, padding: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 1, borderWidth: Platform.OS === 'web' ? (1 as any) : 0, borderColor: Pastel.border },
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
});
