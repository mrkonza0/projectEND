import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@/context/UserContext';
import { api } from '@/services/api';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { C } from '@/constants/theme';

import { API_URL as BASE_URL } from '@/config';

const FIELDS = [
  { key: 'name',     label: 'ชื่อ-สกุล *',        icon: 'person-outline'   as const, ph: 'ชื่อ นามสกุล',           secure: false, kb: 'default' as const },
  { key: 'email',    label: 'อีเมล *',              icon: 'mail-outline'     as const, ph: 'example@uru.ac.th',       secure: false, kb: 'email-address' as const },
  { key: 'faculty',  label: 'คณะ',                  icon: 'school-outline'   as const, ph: 'เช่น วิทยาศาสตร์และเทคโนโลยี', secure: false, kb: 'default' as const },
  { key: 'position', label: 'ตำแหน่ง',              icon: 'briefcase-outline'as const, ph: 'เช่น อาจารย์',             secure: false, kb: 'default' as const },
  { key: 'password', label: 'รหัสผ่าน *',           icon: 'lock-closed-outline' as const, ph: 'อย่างน้อย 6 ตัวอักษร', secure: true,  kb: 'default' as const },
  { key: 'confirm',  label: 'ยืนยันรหัสผ่าน *',    icon: 'lock-closed-outline' as const, ph: 'กรอกรหัสผ่านอีกครั้ง',   secure: true,  kb: 'default' as const },
] as const;

export default function RegisterScreen() {
  const { saveUser } = useUser();
  const [vals, setVals] = useState<Record<string, string>>({ name: '', email: '', faculty: '', position: '', password: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: string) => setVals(p => ({ ...p, [k]: v }));

  const handleRegister = async () => {
    if (!vals.name || !vals.email || !vals.password) { setError('กรุณากรอกข้อมูลที่จำเป็นให้ครบ'); return; }
    if (vals.password !== vals.confirm) { setError('รหัสผ่านไม่ตรงกัน'); return; }
    if (vals.password.length < 6) { setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'); return; }
    setLoading(true); setError('');
    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 5000);
      const res  = await fetch(`${BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ name: vals.name, email: vals.email, password: vals.password, faculty: vals.faculty, position: vals.position }),
        signal: ctrl.signal,
      });
      const data = await res.json();
      if (!res.ok) {
        const errVals = Object.values(data.errors || {}) as string[][];
        setError(String(data.message || errVals[0]?.[0] || 'สมัครไม่สำเร็จ'));
        return;
      }
      const token = data.token || data.access_token;
      if (!token) {
        setError('สมัครสำเร็จ กรุณาเข้าสู่ระบบด้วยบัญชีใหม่');
        router.replace('/login');
        return;
      }
      if (Platform.OS === 'web') localStorage.setItem('token', token);
      else { const { default: AS } = await import('@react-native-async-storage/async-storage'); await AS.setItem('token', token); }

      const savedName = data.user?.name || vals.name;
      await saveUser({
        id: data.user?.id,
        name: savedName,
        email: data.user?.email || vals.email,
        faculty: data.user?.faculty || vals.faculty,
        major: data.user?.major || '',
        position: data.user?.position || vals.position,
        phone: data.user?.phone || '',
        role: data.user?.role === 'admin' ? 'admin' : 'user',
        avatar: data.user?.photo_url || '',
      });
      await api.upsertUser({ email: data.user?.email || vals.email, name: savedName, role: 'user', faculty: vals.faculty, position: vals.position });
      router.replace('/(tabs)');
    } catch {
      setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง');
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Blobs */}
      <View style={[s.blob, s.blobTR]} />
      <View style={[s.blob, s.blobBL]} />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={s.logoWrap}>
          <View style={s.logoCircle}>
            <Ionicons name="leaf-outline" size={32} color={C.primary} />
            <Text style={s.logoText}>URU Research</Text>
          </View>
        </View>

        <Text style={s.title}>สร้างบัญชีใหม่</Text>
        <Text style={s.subtitle}>กรอกข้อมูลเพื่อเริ่มใช้งานระบบ</Text>

        <View style={s.card}>
          {error ? (
            <View style={s.errorBox}>
              <Ionicons name="warning-outline" size={14} color={C.error} />
              <Text style={s.errorTxt}>{error}</Text>
            </View>
          ) : null}

          {FIELDS.map(f => (
            <View key={f.key}>
              <Text style={s.label}>{f.label}</Text>
              <View style={s.inputWrap}>
                <Ionicons name={f.icon} size={17} color={C.accent} style={s.inputIcon} />
                <TextInput
                  style={s.input}
                  value={vals[f.key]}
                  onChangeText={v => set(f.key, v)}
                  placeholder={f.ph}
                  placeholderTextColor={C.textLight}
                  keyboardType={f.kb}
                  secureTextEntry={f.secure && !showPw}
                  autoCapitalize="none"
                />
                {f.secure && (
                  <TouchableOpacity onPress={() => setShowPw(v => !v)} style={{ padding: 4 }}>
                    <Ionicons name={showPw ? 'eye-outline' : 'eye-off-outline'} size={17} color={C.textLight} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}

          <TouchableOpacity
            style={[s.regBtn, loading && { opacity: 0.7 }]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.regBtnTxt}>สมัครสมาชิก</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={s.loginLink} onPress={() => router.replace('/login')}>
            <Text style={s.loginLinkTxt}>มีบัญชีอยู่แล้ว? <Text style={{ color: C.primary, fontWeight: '700' }}>เข้าสู่ระบบ</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root:  { flex: 1, backgroundColor: C.bg },
  blob:  { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(45,90,61,0.08)', zIndex: 0 },
  blobTR:{ top: -50, right: -70 },
  blobBL:{ bottom: -70, left: -70 },

  scroll:    { alignItems: 'center', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  logoWrap:  { alignItems: 'center', marginBottom: 16 },
  logoCircle:{ width: 90, height: 90, borderRadius: 45, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 6 },
  logoText:  { fontSize: 10, fontWeight: '700', color: C.primary, marginTop: 4 },

  title:    { fontSize: 22, fontWeight: '800', color: C.primary, marginBottom: 4, textAlign: 'center' },
  subtitle: { fontSize: 13, color: C.textMuted, marginBottom: 20, textAlign: 'center' },

  card:     { width: '100%', backgroundColor: '#fff', borderRadius: 22, padding: 22, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 5 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.errorLight, borderRadius: 10, padding: 11, marginBottom: 14 },
  errorTxt: { color: C.error, fontSize: 12, flex: 1 },
  label:    { fontSize: 12, fontWeight: '600', color: C.textSub, marginBottom: 6, marginTop: 10 },
  inputWrap:{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f6f8', borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: C.border },
  inputIcon:{ marginRight: 8 },
  input:    { flex: 1, fontSize: 13, color: C.text, paddingVertical: 12 },
  regBtn:   { backgroundColor: C.primary, borderRadius: 50, paddingVertical: 15, alignItems: 'center', marginTop: 20, marginBottom: 12, shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  regBtnTxt:{ color: '#fff', fontWeight: '700', fontSize: 16 },
  loginLink:{ alignItems: 'center', paddingVertical: 6 },
  loginLinkTxt:{ color: C.textMuted, fontSize: 13 },
});
