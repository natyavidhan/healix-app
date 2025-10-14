import { calcBMI, loadUser, type UserData } from '@/lib/storage';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

type Msg = { id: string; role: 'user' | 'assistant'; text: string; ts: number };

const Pastel = {
  blue: '#1D8CF8',
  teal: '#00B5AD',
  grayText: '#6B7280',
  text: '#0F172A',
  border: '#EAECF0',
  white: '#FFFFFF',
};

export default function Chat() {
  const [user, setUser] = useState<UserData | null>(null);
  const [messages, setMessages] = useState<Msg[]>([{
    id: 'm-hello', role: 'assistant', ts: Date.now(),
    text: "Hi, I’m your AI Health Assistant. Ask me about your medications, prescriptions, BMI, or lab reports.",
  }]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => { loadUser().then(setUser); }, []);

  const scrollToEnd = () => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  };

  const send = () => {
    const text = input.trim();
    if (!text || isTyping) return;
    const userMsg: Msg = { id: `m-${Date.now()}`, role: 'user', text, ts: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);
    scrollToEnd();

    setTimeout(() => {
      const reply = generateReply(text, user);
      const botMsg: Msg = { id: `m-${Date.now()}-bot`, role: 'assistant', text: reply, ts: Date.now() };
      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
      scrollToEnd();
    }, 700);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#fff' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}> 
        <Text style={styles.headerTitle}>AI Health Assistant</Text>
      </View>
      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={styles.chatContent} onContentSizeChange={scrollToEnd}>
        {messages.map((m) => (
          <View key={m.id} style={[styles.msgRow, m.role === 'user' ? styles.right : styles.left]}>
            <View style={[styles.bubble, m.role === 'user' ? styles.userBubble : styles.botBubble]}> 
              <Text style={[styles.msgText, m.role === 'user' ? { color: '#fff' } : { color: Pastel.text }]}>{m.text}</Text>
            </View>
          </View>
        ))}
        {isTyping ? (
          <View style={[styles.msgRow, styles.left]}>
            <View style={[styles.bubble, styles.botBubble]}> 
              <Text style={[styles.msgText, { color: Pastel.grayText }]}>Assistant is typing…</Text>
            </View>
          </View>
        ) : null}
      </ScrollView>
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Type a message"
          placeholderTextColor={Pastel.grayText}
          multiline
        />
        <Pressable onPress={send} disabled={!input.trim()} style={({ pressed }) => [styles.sendBtn, (!input.trim() || isTyping) && { opacity: 0.5 }, pressed && { opacity: 0.85 }]}>
          <Ionicons name="send" size={18} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function generateReply(text: string, user: UserData | null): string {
  const q = text.toLowerCase();
  if (q.includes('bmi') || q.includes('body mass')) {
    const bmi = calcBMI(user?.height_cm, user?.weight_kg);
    if (bmi != null) {
      return `Your BMI is ${bmi}. A normal BMI is between 18.5 and 24.9. Always consider other factors and consult your doctor for personalized advice.`;
    }
    return 'I can calculate your BMI if your height and weight are saved in your profile.';
  }
  if (q.includes('med') || q.includes('medicine') || q.includes('medication')) {
    const count = user?.medications?.length ?? 0;
    return count
  ? `You have ${count} active medication${count > 1 ? 's' : ''} listed. Remember to follow the prescribed schedule.`
      : 'I don’t see any active medications yet. You can add them from the dashboard.';
  }
  if (q.includes('report') || q.includes('lab')) {
    const count = user?.reports?.length ?? 0;
    return count
      ? `You have ${count} lab report${count > 1 ? 's' : ''} saved. Open the Reports tab on the dashboard to review details.`
      : 'I don’t see any lab reports yet. You can upload one from the Reports tab.';
  }
  if (q.includes('hello') || q.includes('hi')) {
    return 'Hello! How can I help with your health today? You can ask about BMI, medications, prescriptions, or lab reports.';
  }
  const generic = [
    'Thanks for your question. I’m a demo assistant right now, so I provide general guidance. Try asking about your BMI, medications, or reports.',
    'I’m here to help. You can ask things like “What’s my BMI?”, “List my medications”, or “Show lab reports.”',
    'Got it. For now, I can answer basic queries about your stored health data. Try asking about “BMI” or “medications.”',
  ];
  return generic[Math.floor(Math.random() * generic.length)];
}

const styles = StyleSheet.create({
  header: { paddingTop: Platform.OS === 'ios' ? 54 : 24, paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: Platform.OS === 'web' ? (1 as any) : StyleSheet.hairlineWidth, borderColor: Pastel.border, backgroundColor: '#fff' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: Pastel.text, marginTop: 18 },
  chatContent: { padding: 12, paddingBottom: 16 },
  msgRow: { flexDirection: 'row', marginVertical: 6 },
  left: { justifyContent: 'flex-start' },
  right: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '83%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14 },
  botBubble: { backgroundColor: '#F5F6F8', borderWidth: Platform.OS === 'web' ? (1 as any) : 0, borderColor: Pastel.border, borderTopLeftRadius: 4 },
  userBubble: { backgroundColor: Pastel.blue, borderTopRightRadius: 4 },
  msgText: { fontSize: 15 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: Platform.OS === 'web' ? (1 as any) : StyleSheet.hairlineWidth, borderColor: Pastel.border, backgroundColor: '#fff' },
  input: { flex: 1, maxHeight: 120, borderWidth: Platform.OS === 'web' ? (1 as any) : StyleSheet.hairlineWidth, borderColor: Pastel.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: Pastel.text },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: Pastel.teal },
});
