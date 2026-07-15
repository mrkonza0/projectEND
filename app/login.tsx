import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@/context/UserContext';
import { api } from '@/services/api';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { C } from '@/constants/theme';

export default function LoginScreen() {
  const { saveUser } = useUser();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleLogin = async () => {
    if (!email || !password) { setError('กรุณากรอกอีเมลและรหัสผ่าน'); return; }
    setLoading(true); setError('');
    try {
      const data = await api.login(email, password);
      if (data.token) {
        const backendRole  = data.user?.role === 'admin' ? 'admin' : data.user?.role === 'user' ? 'user' : null;
        const assignedRole = await api.getUserRole(email);
        const role: 'admin' | 'user' = backendRole || assignedRole;

        const loginUser = data.user;
        const existing = await api.getProfile();
        const sameAccount = existing?.email?.toLowerCase?.() === email.trim().toLowerCase();
        const profile = sameAccount ? { ...loginUser, ...existing } : loginUser;
        let userName = '';
        if (profile?.name) {
          const profileRole: 'admin' | 'user' = profile.role === 'admin' ? 'admin' : role;
          await saveUser({ ...profile, email: profile.email || email, role: profileRole });
          userName = profile.name;
        } else {
          const name = email.split('@')[0].replace(/[._]/g, ' ');
          await saveUser({ name, email, faculty: '', major: '', position: '', phone: '', role });
          userName = name;
        }
        await api.upsertUser({ email, name: userName, role });
        router.replace('/(tabs)');
      } else {
        setError(data.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      }
    } catch {
      setError('ไม่สามารถเชื่อมต่อ server ได้');
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Decorative circles */}
      <View style={[s.blob, s.blobTR]} />
      <View style={[s.blob, s.blobBL]} />

      {/* Logo */}
      <View style={s.logoWrap}>
        <View style={s.logoCircle}>
          <Ionicons name="leaf-outline" size={36} color={C.primary} />
          <Text style={s.logoText}>URU Research</Text>
        </View>
      </View>

      {/* Title */}
      <Text style={s.title}>Welcome to URU Research</Text>
      <Text style={s.subtitle}>Log in to your account</Text>

      {/* Card */}
      <View style={s.card}>
        {error ? (
          <View style={s.errorBox}>
            <Ionicons name="warning-outline" size={14} color={C.error} />
            <Text style={s.errorTxt}>{error}</Text>
          </View>
        ) : null}

        {/* Email */}
        <Text style={s.label}>Username / Email</Text>
        <View style={s.inputWrap}>
          <Ionicons name="person-outline" size={18} color={C.accent} style={s.inputIcon} />
          <TextInput
            style={s.input}
            placeholder="Enter your username"
            placeholderTextColor={C.textLight}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Password */}
        <Text style={s.label}>Password</Text>
        <View style={s.inputWrap}>
          <Ionicons name="lock-closed-outline" size={18} color={C.accent} style={s.inputIcon} />
          <TextInput
            style={s.input}
            placeholder="Enter your password"
            placeholderTextColor={C.textLight}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPw}
          />
          <TouchableOpacity onPress={() => setShowPw(v => !v)} style={s.eyeBtn}>
            <Ionicons name={showPw ? 'eye-outline' : 'eye-off-outline'} size={18} color={C.textLight} />
          </TouchableOpacity>
        </View>

        {/* Sign in button */}
        <TouchableOpacity
          style={[s.signInBtn, loading && { opacity: 0.7 }]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.signInTxt}>Sign in</Text>
          }
        </TouchableOpacity>

        <View style={s.hintRow}>
          <Ionicons name="shield-checkmark-outline" size={12} color={C.textLight} />
          <Text style={s.hintTxt}>เข้าสู่ระบบด้วยบัญชี URU Smart</Text>
        </View>
      </View>

      <Text style={s.footer}>© 2026 URU Research · Uttaradit Rajabhat University</Text>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },

  // Blobs
  blob:   { position: 'absolute', width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(45,90,61,0.10)' },
  blobTR: { top: -60, right: -80 },
  blobBL: { bottom: -80, left: -80 },

  // Logo
  logoWrap:   { alignItems: 'center', marginBottom: 16 },
  logoCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 8 },
  logoText:   { fontSize: 12, fontWeight: '700', color: C.primary, marginTop: 4 },

  // Title
  title:    { fontSize: 24, fontWeight: '800', color: C.primary, marginBottom: 4, textAlign: 'center' },
  subtitle: { fontSize: 14, color: C.textMuted, marginBottom: 20, textAlign: 'center' },

  // Card
  card: { width: '100%', maxWidth: 420, backgroundColor: '#fff', borderRadius: 24, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 6 },

  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.errorLight, borderRadius: 10, padding: 12, marginBottom: 16 },
  errorTxt: { color: C.error, fontSize: 13, flex: 1 },

  label:     { fontSize: 13, fontWeight: '600', color: C.textSub, marginBottom: 8 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f6f8', borderRadius: 14, paddingHorizontal: 14, marginBottom: 18, borderWidth: 1, borderColor: C.border },
  inputIcon: { marginRight: 10 },
  input:     { flex: 1, fontSize: 14, color: C.text, paddingVertical: 13 },
  eyeBtn:    { padding: 4 },

  signInBtn: { backgroundColor: C.primary, borderRadius: 50, paddingVertical: 16, alignItems: 'center', marginTop: 4, marginBottom: 14, shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 5 },
  signInTxt: { color: '#fff', fontWeight: '700', fontSize: 17 },

  hintRow:  { flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'center', marginBottom: 16 },
  hintTxt:  { fontSize: 11, color: C.textLight, flexShrink: 1, textAlign: 'center' },

  divider:  { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  divLine:  { flex: 1, height: 1, backgroundColor: C.border },
  divTxt:   { fontSize: 12, color: C.textLight, marginHorizontal: 10 },

  regBtn:   { borderWidth: 1.5, borderColor: C.primary, borderRadius: 50, paddingVertical: 14, alignItems: 'center' },
  regTxt:   { color: C.primary, fontWeight: '700', fontSize: 15 },

  footer: { position: 'absolute', bottom: 24, fontSize: 10, color: C.textLight },
});
