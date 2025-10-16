import Dropdown from '@/components/ui/dropdown';
import { getBasics, setDetails, type RegistrationDetails } from '@/lib/registration-store';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

const initialDetails: RegistrationDetails = {
  dob: '',
  gender: '',
  blood_group: '',
  height_cm: '',
  weight_kg: '',
  known_conditions: '',
  allergies: '',
  food_tolerance: '',
  smoking: '',
  alcohol: '',
  physical_activity: '',
  diet_type: '',
};

export default function RegisterDetails() {
  const router = useRouter();
  const [details, setDetailsState] = useState<RegistrationDetails>(initialDetails);
  const [error, setError] = useState<string | null>(null);
  const [anyDropdownOpen, setAnyDropdownOpen] = useState(false);
  const now = new Date();
  const currentYear = now.getFullYear();
  const years = Array.from({ length: 120 }, (_, i) => String(currentYear - i));
  const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  const [dobYear, setDobYear] = useState<string>('');
  const [dobMonth, setDobMonth] = useState<string>('');
  const [dobDay, setDobDay] = useState<string>('');

  const daysInMonth = (y: number, m: number) => new Date(y, m, 0).getDate();
  const dayCount = dobYear && dobMonth ? daysInMonth(Number(dobYear), Number(dobMonth)) : 31;
  const days = Array.from({ length: dayCount }, (_, i) => String(i + 1).padStart(2, '0'));

  useEffect(() => {
    // Redirect back if basics not filled
    const basics = getBasics();
    if (!basics) {
      router.replace('/register' as any);
    }
  }, [router]);

  useEffect(() => {
    // initialize DOB dropdowns from details if available
    if (details.dob && details.dob.includes('-')) {
      const [y, m, d] = details.dob.split('-');
      setDobYear(y);
      setDobMonth(m);
      setDobDay(d);
    }
  }, []);

  useEffect(() => {
    // when any DOB part changes, update composite date
    if (dobYear && dobMonth && dobDay) {
      const y = dobYear;
      const m = dobMonth.padStart(2, '0');
      const d = dobDay.padStart(2, '0');
      setDetailsState((s) => ({ ...s, dob: `${y}-${m}-${d}` }));
    }
  }, [dobYear, dobMonth, dobDay]);

  const onSubmit = () => {
    setError(null);
    // Minimal validation
    if (!details.dob || !details.gender || !details.blood_group) {
      setError('Please complete required basics (DOB, gender, blood group).');
      return;
    }
    setDetails(details);
    router.replace('/register/complete' as any);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} style={{ width: '100%' }} scrollEnabled={!anyDropdownOpen}>
        <View style={styles.card}>
          <Text style={styles.title}>Your details</Text>

          <Text style={styles.sectionTitle}>Basics</Text>
          <View style={styles.rowWrap}>
            <View style={[styles.field, { minWidth: 250 }]}> 
              <Text style={styles.label}>DOB</Text>
              {Platform.OS === 'web' ? (
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  <Dropdown
                    value={dobYear}
                    onChange={(v) => setDobYear(v)}
                    options={years.map((y) => ({ label: y, value: y }))}
                    placeholder="Year"
                    menuMaxHeight={200}
                    containerStyle={{ flexGrow: 1, flexBasis: 100, zIndex: 30 }}
                    onOpenChange={setAnyDropdownOpen}
                  />
                  <Dropdown
                    value={dobMonth}
                    onChange={(v) => {
                      setDobMonth(v);
                      // adjust day if overflow when month changes
                      if (dobYear && dobDay) {
                        const max = daysInMonth(Number(dobYear), Number(v));
                        const dayNum = Number(dobDay);
                        if (dayNum > max) setDobDay(String(max).padStart(2, '0'));
                      }
                    }}
                    options={months.map((m) => ({ label: m, value: m }))}
                    placeholder="Month"
                    containerStyle={{ flexGrow: 1, flexBasis: 100, zIndex: 29 }}
                    menuMaxHeight={200}
                    onOpenChange={setAnyDropdownOpen}
                  />
                  <Dropdown
                    value={dobDay}
                    onChange={(v) => setDobDay(v)}
                    options={days.map((d) => ({ label: d, value: d }))}
                    placeholder="Day"
                    containerStyle={{ flexGrow: 1, flexBasis: 100, zIndex: 28 }}
                    menuMaxHeight={200}
                    onOpenChange={setAnyDropdownOpen}
                  />
                </View>
              ) : (
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  {/* Native platforms: use simple three dropdowns still, but Modal-backed ensures smooth scroll; keep same controls for now */}
                  <Dropdown
                    value={dobYear}
                    onChange={(v) => setDobYear(v)}
                    options={years.map((y) => ({ label: y, value: y }))}
                    placeholder="Year"
                    menuMaxHeight={300}
                    containerStyle={{ flexGrow: 1, flexBasis: 100, zIndex: 30 }}
                    onOpenChange={setAnyDropdownOpen}
                  />
                  <Dropdown
                    value={dobMonth}
                    onChange={(v) => {
                      setDobMonth(v);
                      if (dobYear && dobDay) {
                        const max = daysInMonth(Number(dobYear), Number(v));
                        const dayNum = Number(dobDay);
                        if (dayNum > max) setDobDay(String(max).padStart(2, '0'));
                      }
                    }}
                    options={months.map((m) => ({ label: m, value: m }))}
                    placeholder="Month"
                    containerStyle={{ flexGrow: 1, flexBasis: 100, zIndex: 29 }}
                    menuMaxHeight={300}
                    onOpenChange={setAnyDropdownOpen}
                  />
                  <Dropdown
                    value={dobDay}
                    onChange={(v) => setDobDay(v)}
                    options={days.map((d) => ({ label: d, value: d }))}
                    placeholder="Day"
                    containerStyle={{ flexGrow: 1, flexBasis: 100, zIndex: 28 }}
                    menuMaxHeight={300}
                    onOpenChange={setAnyDropdownOpen}
                  />
                </View>
              )}
            </View>
            <View style={styles.field}> 
              <Text style={styles.label}>Gender</Text>
              <Dropdown
                value={details.gender}
                onChange={(v) => setDetailsState((s) => ({ ...s, gender: v as any }))}
                options={[
                  { label: 'Male', value: 'male' },
                  { label: 'Female', value: 'female' },
                  { label: 'Other', value: 'other' },
                ]}
                placeholder="Select gender"
                containerStyle={{ zIndex: 20 }}
                onOpenChange={setAnyDropdownOpen}
              />
            </View>
            <View style={styles.field}> 
              <Text style={styles.label}>Blood group</Text>
              <Dropdown
                value={details.blood_group}
                onChange={(v) => setDetailsState((s) => ({ ...s, blood_group: v as any }))}
                options={[
                  'A+','A-','B+','B-','AB+','AB-','O+','O-'
                ].map((bg) => ({ label: bg, value: bg }))}
                placeholder="Select blood group"
                containerStyle={{ zIndex: 19 }}
                menuMaxHeight={260}
                onOpenChange={setAnyDropdownOpen}
              />
            </View>
          </View>

          <Text style={styles.sectionTitle}>Body metrics</Text>
          <View style={styles.row}>
            <View style={styles.field}> 
              <Text style={styles.label}>Height (cm)</Text>
              <TextInput value={details.height_cm} onChangeText={(v)=>setDetailsState(s=>({...s, height_cm: v}))} keyboardType="numeric" placeholder="175" style={styles.input} />
            </View>
            <View style={styles.field}> 
              <Text style={styles.label}>Weight (kg)</Text>
              <TextInput value={details.weight_kg} onChangeText={(v)=>setDetailsState(s=>({...s, weight_kg: v}))} keyboardType="numeric" placeholder="70" style={styles.input} />
            </View>
          </View>

          <Text style={styles.sectionTitle}>History & allergies</Text>
          <View style={styles.field}> 
            <Text style={styles.label}>Known conditions</Text>
            <TextInput value={details.known_conditions} onChangeText={(v)=>setDetailsState(s=>({...s, known_conditions: v}))} placeholder="e.g., Hypertension" style={styles.input} />
          </View>
          <View style={styles.field}> 
            <Text style={styles.label}>Allergies</Text>
            <TextInput value={details.allergies} onChangeText={(v)=>setDetailsState(s=>({...s, allergies: v}))} placeholder="e.g., Penicillin" style={styles.input} />
          </View>
          <View style={styles.field}> 
            <Text style={styles.label}>Food tolerance</Text>
            <TextInput value={details.food_tolerance} onChangeText={(v)=>setDetailsState(s=>({...s, food_tolerance: v}))} placeholder="e.g., Lactose intolerance" style={styles.input} />
          </View>

          <Text style={styles.sectionTitle}>Lifestyle</Text>
          <View style={styles.rowWrap}>
            <View style={styles.field}> 
              <Text style={styles.label}>Smoking</Text>
              <Dropdown
                value={details.smoking}
                onChange={(v) => setDetailsState((s) => ({ ...s, smoking: v as any }))}
                options={[{label:'Yes', value:'yes'}, {label:'No', value:'no'}]}
                placeholder="Select"
                containerStyle={{ zIndex: 18 }}
                onOpenChange={setAnyDropdownOpen}
              />
            </View>
            <View style={styles.field}> 
              <Text style={styles.label}>Alcohol</Text>
              <Dropdown
                value={details.alcohol}
                onChange={(v) => setDetailsState((s) => ({ ...s, alcohol: v as any }))}
                options={[{label:'Yes', value:'yes'}, {label:'No', value:'no'}]}
                placeholder="Select"
                containerStyle={{ zIndex: 17 }}
                onOpenChange={setAnyDropdownOpen}
              />
            </View>
            <View style={styles.field}> 
              <Text style={styles.label}>Physical activity</Text>
              <Dropdown
                value={details.physical_activity}
                onChange={(v) => setDetailsState((s) => ({ ...s, physical_activity: v as any }))}
                options={[
                  { label: 'Low - < 30 min/week', value: 'low' },
                  { label: 'Moderate - 30-60 min/week', value: 'moderate' },
                  { label: 'High - > 60 min/week', value: 'high' },
                ]}
                placeholder="Select activity"
                containerStyle={{ zIndex: 16 }}
                onOpenChange={setAnyDropdownOpen}
              />
            </View>
            <View style={styles.field}> 
              <Text style={styles.label}>Diet type</Text>
              <Dropdown
                value={details.diet_type}
                onChange={(v) => setDetailsState((s) => ({ ...s, diet_type: v as any }))}
                options={[
                  { label: 'Vegetarian', value: 'veg' },
                  { label: 'Non-vegetarian', value: 'nonveg' },
                  { label: 'Vegan', value: 'vegan' },
                ]}
                placeholder="Select diet"
                containerStyle={{ zIndex: 15 }}
                onOpenChange={setAnyDropdownOpen}
              />
            </View>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={{ height: 8 }} />
          <Pressable onPress={onSubmit} style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
            <Text style={styles.buttonText}>Register</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 820, backgroundColor: '#fff', borderRadius: 12, padding: 20, borderWidth: 1, borderColor: '#eee', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 1, overflow: 'visible' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 16, color: '#11181C' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 8, marginBottom: 8, color: '#11181C' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'flex-start' },
  field: { flexGrow: 1, flexBasis: 250 },
  label: { marginBottom: 6, color: '#11181C', fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: Platform.OS === 'web' ? 10 : 12, fontSize: 16, backgroundColor: '#fff', color: '#11181C' },
  error: { color: '#b91c1c', marginTop: 8 },
  button: { backgroundColor: '#0a7ea4', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 10, alignItems: 'center', marginTop: 12 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  buttonPressed: { opacity: 0.9 },
});
