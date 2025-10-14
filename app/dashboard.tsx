import { calcBMI, clearUser, getSampleUser, loadUser, saveUser, type Medication, type Prescription, type Reminder, type Report, type UserData } from '@/lib/storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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
  const [medModalVisible, setMedModalVisible] = useState(false);
  const [medName, setMedName] = useState('');
  const [freqTimes, setFreqTimes] = useState('');
  const [freqDays, setFreqDays] = useState('');
  const [durationDays, setDurationDays] = useState('');
  const [timeStr, setTimeStr] = useState('');
  const [medError, setMedError] = useState<string | null>(null);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

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
              <Text style={styles.sectionSubtitle}>Welcome to Healix</Text>
            </View>
            <Pressable
              onPress={() => setDetailsVisible(true)}
              style={({ pressed }) => [styles.avatarButton, pressed && { opacity: 0.8 }]}>
              <Text style={styles.avatarText}>{user.name?.[0]?.toUpperCase() ?? 'U'}</Text>
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
  <SectionHeader title="Active Medications" actionLabel="Add" onAction={() => setMedModalVisible(true)} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
          {meds.map((m, i) => (
            <Animated.View key={`${m.name}-${i}`} entering={FadeInUp.delay(60 * i)} style={styles.medCard}>
              <View style={styles.medHeader}>
                <Text style={styles.medName}>{m.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={[styles.statusDot, { backgroundColor: m.status === 'taken' ? Pastel.green : Pastel.yellow }]} />
                  <Pressable accessibilityLabel={`Delete ${m.name}`} onPress={() => { setDeleteIndex(i); setDeleteConfirmVisible(true); }} style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.8 }]}>
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </Pressable>
                </View>
              </View>
              <Text style={styles.medMeta}>{m.dosage} • {m.frequency}</Text>
              <View style={styles.nextDoseRow}>
                <Ionicons name="time-outline" size={16} color={Pastel.grayText} />
                <Text style={styles.nextDoseText}>Next: {m.next_dose}</Text>
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
            <Text style={[styles.segmentText, activeTab === 'prescriptions' && styles.segmentTextActive]}>Prescriptions</Text>
          </Pressable>
          <Pressable onPress={() => setActiveTab('reports')} style={[styles.segment, activeTab === 'reports' && styles.segmentActive]}>
            <Text style={[styles.segmentText, activeTab === 'reports' && styles.segmentTextActive]}>Lab Reports</Text>
          </Pressable>
        </View>
        {activeTab === 'prescriptions' ? (
          <View style={styles.vList}>
            <Pressable onPress={() => router.push('/prescriptions/new' as any)} style={({ pressed }) => [styles.listCard, styles.addFirstCard, pressed && { opacity: 0.9 }]}>
              <Text style={[styles.listTitle, { color: Pastel.blue }]}>+ Add Prescription</Text>
              <Text style={styles.listSubtitle}>Create a new prescription entry</Text>
            </Pressable>
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
            <Pressable onPress={() => router.push('/reports/new' as any)} style={({ pressed }) => [styles.listCard, styles.addFirstCard, pressed && { opacity: 0.9 }]}>
              <Text style={[styles.listTitle, { color: Pastel.blue }]}>+ Add Report</Text>
              <Text style={styles.listSubtitle}>Upload or add a lab report</Text>
            </Pressable>
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
      {/* Delete Medication Confirm Modal */}
      <Modal visible={deleteConfirmVisible} animationType="fade" transparent onRequestClose={() => setDeleteConfirmVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete medication?</Text>
            <Text style={{ color: Pastel.grayText, marginTop: 6 }}>This action can’t be undone.</Text>
            {deleteIndex != null && meds[deleteIndex] ? (
              <View style={{ marginTop: 10, padding: 10, backgroundColor: '#F8FAFC', borderRadius: 10, borderWidth: Platform.OS === 'web' ? (1 as any) : 0, borderColor: Pastel.border }}>
                <Text style={{ color: Pastel.text, fontWeight: '700' }}>{meds[deleteIndex].name}</Text>
                <Text style={{ color: Pastel.grayText }}>{meds[deleteIndex].dosage} • {meds[deleteIndex].frequency}</Text>
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <Pressable onPress={() => { setDeleteConfirmVisible(false); setDeleteIndex(null); }} style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.9 }]}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={() => {
                if (deleteIndex == null) return;
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
                <Text style={styles.inputLabel}>Medicine name</Text>
                <TextInput
                  value={medName}
                  onChangeText={setMedName}
                  placeholder="e.g., Metformin"
                  style={styles.input}
                />
              </View>

              <View>
                <Text style={styles.inputLabel}>Frequency</Text>
                <View style={styles.rowInline}> 
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputSublabel}>Times</Text>
                    <TextInput
                      value={freqTimes}
                      onChangeText={(t) => setFreqTimes(t.replace(/[^0-9]/g, ''))}
                      placeholder="2"
                      keyboardType="numeric"
                      style={styles.input}
                    />
                  </View>
                  <Text style={{ paddingHorizontal: 8, alignSelf: 'flex-end', marginBottom: 10, color: Pastel.grayText }}>per</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputSublabel}>Days</Text>
                    <TextInput
                      value={freqDays}
                      onChangeText={(t) => setFreqDays(t.replace(/[^0-9]/g, ''))}
                      placeholder="1"
                      keyboardType="numeric"
                      style={styles.input}
                    />
                  </View>
                </View>
              </View>

              <View>
                <Text style={styles.inputLabel}>For how many days</Text>
                <TextInput
                  value={durationDays}
                  onChangeText={(t) => setDurationDays(t.replace(/[^0-9]/g, ''))}
                  placeholder="7"
                  keyboardType="numeric"
                  style={styles.input}
                />
              </View>

              <View>
                <Text style={styles.inputLabel}>Time of day</Text>
                <TextInput
                  value={timeStr}
                  onChangeText={setTimeStr}
                  placeholder="8:00 PM"
                  inputMode={Platform.OS === 'web' ? 'text' as any : undefined}
                  style={styles.input}
                />
              </View>

              {medError ? <Text style={{ color: '#b91c1c' }}>{medError}</Text> : null}

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                <Pressable onPress={() => setMedModalVisible(false)} style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.9 }]}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setMedError(null);
                    if (!medName.trim()) return setMedError('Please enter a medicine name.');
                    if (!freqTimes || !freqDays) return setMedError('Please enter frequency (times and days).');
                    if (!durationDays) return setMedError('Please enter duration in days.');
                    if (!timeStr.trim()) return setMedError('Please enter a time.');

                    const newMed: Medication = {
                      name: medName.trim(),
                      dosage: '—',
                      frequency: `${Number(freqTimes)}/${Number(freqDays)}d`,
                      next_dose: timeStr.trim(),
                      status: 'upcoming',
                    };
                    setUser((prev) => {
                      const base = prev ?? getSampleUser();
                      const next: UserData = { ...base, medications: [...(base.medications ?? []), newMed] };
                      saveUser(next);
                      return next;
                    });
                    setMedModalVisible(false);
                    setMedName(''); setFreqTimes(''); setFreqDays(''); setDurationDays(''); setTimeStr('');
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
});
