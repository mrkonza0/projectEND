import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '@/components/AppHeader';
import { useUser } from '@/context/UserContext';
import { api } from '@/services/api';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert, Image, Platform, ScrollView, StyleSheet,
  Switch, Text, TouchableOpacity, View,
} from 'react-native';
import { C } from '@/constants/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export default function ProfileScreen() {
  const { user, saveUser, clearUser } = useUser();
  const [myProjects,   setMyProjects]   = useState<any[]>([]);
  const [coProjects,   setCoProjects]   = useState<any[]>([]);
  const [myArticles,   setMyArticles]   = useState<any[]>([]);
  const [sharePhone,   setSharePhone]   = useState(false);
  const [shareLine,    setShareLine]    = useState(false);
  const [sharePublish, setSharePublish] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [pr, ar] = await Promise.all([api.getProjects('mine'), api.getArticles('mine')]);
      setMyProjects(pr);
      setCoProjects([]);
      setMyArticles(ar);
    } catch {}
  };

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('ต้องการสิทธิ์', 'กรุณาอนุญาตการเข้าถึงรูปภาพ'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7,
    });
    if (!result.canceled) {
      let uri = result.assets[0].uri;
      if (Platform.OS !== 'web') {
        const dest = (FileSystem as any).documentDirectory + 'avatar.jpg';
        await (FileSystem as any).copyAsync({ from: uri, to: dest });
        uri = dest + '?t=' + Date.now();
      }
      try {
        const uploadedUri = await api.uploadProfilePhoto(uri, result.assets[0].fileName || 'avatar.jpg', result.assets[0].mimeType || 'image/jpeg');
        await saveUser({ avatar: uploadedUri });
      } catch {
        await saveUser({ avatar: uri });
        Alert.alert('แจ้งเตือน', 'บันทึกรูปไว้ในเครื่องแล้ว แต่ยังอัปโหลดไปยังเซิร์ฟเวอร์ไม่สำเร็จ');
      }
    }
  };

  const handleLogout = () => Alert.alert('ออกจากระบบ', 'ต้องการออกจากระบบ?', [
    { text: 'ยกเลิก', style: 'cancel' },
    { text: 'ออกจากระบบ', style: 'destructive', onPress: async () => {
      await api.logout(); await clearUser(); router.replace('/login');
    }},
  ]);

  const affiliations = [
    user.major, user.faculty, 'มหาวิทยาลัยราชภัฏอุตรดิตถ์',
  ].filter(Boolean) as string[];

  const INFO: { label: string; key: string; sharable?: boolean }[] = [
    { label: 'ชื่อ - สกุล',        key: 'name'     },
    { label: 'วัน/เดือน/ปี เกิด',  key: 'birthday' },
    { label: 'อีเมล',               key: 'email'    },
    { label: 'เบอร์โทรศัพท์',      key: 'phone',    sharable: true },
    { label: 'ไลน์ไอดี',            key: 'lineId',   sharable: true },
    { label: 'เลขบัตรประชาชน',     key: 'national_id' },
    { label: 'ที่อยู่',              key: 'address'  },
  ];

  const shareState: Record<string, [boolean, (v: boolean) => void]> = {
    phone:  [sharePhone,  setSharePhone],
    lineId: [shareLine,   setShareLine],
  };

  return (
    <View style={s.root}>
      <AppHeader />
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* ── Banner ── */}
        <View style={s.banner}>
          <View style={s.bannerLogoWrap}>
            <View style={s.bannerLogo}>
              <Ionicons name="school" size={22} color={C.primary} />
            </View>
          </View>
          <View>
            <Text style={s.bannerTitle}>ประวัตินักวิจัย</Text>
            <Text style={s.bannerSub}>มหาวิทยาลัยราชภัฏอุตรดิตถ์</Text>
          </View>
        </View>

        {/* ── Two-panel layout ── */}
        <View style={s.panels}>

          {/* LEFT PANEL */}
          <View style={s.leftPanel}>
            {/* Photo */}
            <TouchableOpacity style={s.photoWrap} onPress={pickAvatar} activeOpacity={0.8}>
              {user.avatar
                ? <Image source={{ uri: user.avatar }} style={s.photo} />
                : (
                  <View style={s.photoPlaceholder}>
                    <Ionicons name="image-outline" size={28} color="#bbb" />
                    <Text style={s.photoTxt}>NO IMAGE{'\n'}AVAILABLE</Text>
                  </View>
                )
              }
              <View style={s.cameraOverlay}>
                <Ionicons name="camera-outline" size={12} color="#fff" />
              </View>
            </TouchableOpacity>

            <Text style={s.photoName}>{user.name || 'ผู้ใช้ระบบ'}</Text>
            {user.position ? <Text style={s.photoPos}>{user.position}</Text> : null}
            {user.role === 'admin' && (
              <View style={s.adminChip}>
                <Ionicons name="shield-checkmark" size={10} color="#f59e0b" />
                <Text style={s.adminChipTxt}>Admin</Text>
              </View>
            )}

            {/* Affiliation list */}
            <View style={s.affiliList}>
              {affiliations.map((a, i) => (
                <View key={i} style={s.affiliItem}>
                  <Text style={s.affiliTxt}>{a}</Text>
                </View>
              ))}
            </View>

            {/* Quick links */}
            <TouchableOpacity style={s.quickLink} onPress={() => router.replace('/(tabs)/researcher')}>
              <Ionicons name="school-outline" size={13} color={C.accent} />
              <Text style={s.quickLinkTxt}>วุฒิการศึกษา</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.quickLink} onPress={() => router.replace('/(tabs)/researcher')}>
              <Ionicons name="bulb-outline" size={13} color={C.accent} />
              <Text style={s.quickLinkTxt}>ความเชี่ยวชาญ</Text>
            </TouchableOpacity>
          </View>

          {/* RIGHT PANEL */}
          <View style={s.rightPanel}>
            {INFO.map((f, i) => {
              const val = (user as any)[f.key] || '';
              const sharable = f.sharable && shareState[f.key];
              return (
                <View key={f.key} style={[s.infoRow, i < INFO.length - 1 && s.infoRowBorder]}>
                  <Text style={s.infoLabel}>{f.label}</Text>
                  <View style={s.infoRight}>
                    <Text style={[s.infoVal, !val && s.infoValEmpty]} numberOfLines={1}>
                      {val || (f.key === 'birthday' ? '__/__/____' : '-')}
                    </Text>
                    {sharable && (
                      <Switch
                        value={sharable[0]}
                        onValueChange={sharable[1]}
                        trackColor={{ false: '#e5e7eb', true: C.accentLight }}
                        thumbColor={sharable[0] ? C.accent : '#d1d5db'}
                        style={{ transform: [{ scale: 0.7 }] }}
                      />
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* ── Research sections ── */}
        <ResearchSection
          icon="folder-outline"
          title="งานวิจัย"
          count={myProjects.length}
          items={myProjects}
          renderItem={(p, i) => (
            <View key={i} style={s.resRow}>
              <Text style={s.resNum}>{i + 1}.</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.resTitle}>{p.title}</Text>
                <Text style={s.resMeta}>ปี {p.year || '—'} · ฿{Number(p.budget || 0).toLocaleString()} · {p.status}</Text>
              </View>
            </View>
          )}
        />

        <ResearchSection
          icon="people-outline"
          title="งานวิจัย (ผู้ร่วมโครงการ)"
          count={coProjects.length}
          items={coProjects}
          renderItem={(p, i) => (
            <View key={i} style={s.resRow}>
              <Text style={s.resNum}>{i + 1}.</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.resTitle}>{p.title}</Text>
                <Text style={s.resMeta}>หัวหน้า: {p.researcher} · ปี {p.year || '—'}</Text>
              </View>
            </View>
          )}
        />

        <ResearchSection
          icon="newspaper-outline"
          title="บทความวิจัย/วิชาการ"
          count={myArticles.length}
          items={myArticles}
          renderItem={(a, i) => (
            <View key={i} style={s.resRow}>
              <Text style={s.resNum}>{i + 1}.</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.resTitle}>{a.title}</Text>
                <Text style={s.resMeta}>{a.journal || '—'} · ปี {a.year || '—'} · อ้างอิง {a.cited || 0} ครั้ง</Text>
              </View>
            </View>
          )}
        />

        {/* ── Sharing settings ── */}
        <View style={s.shareCard}>
          <View style={s.shareHeader}>
            <Ionicons name="share-social-outline" size={15} color={C.primary} />
            <Text style={s.shareTitle}>จัดการข้อมูลเผยแพร่</Text>
          </View>
          <View style={s.shareRow}>
            <Switch
              value={sharePublish}
              onValueChange={setSharePublish}
              trackColor={{ false: '#e5e7eb', true: C.accentLight }}
              thumbColor={sharePublish ? C.accent : '#d1d5db'}
              style={{ transform: [{ scale: 0.8 }] }}
            />
            <Text style={s.shareTxt}>เผยแพร่ข้อมูลให้สาธารณะ</Text>
          </View>
          <View style={s.shareRow}>
            <Switch
              value={sharePhone}
              onValueChange={setSharePhone}
              trackColor={{ false: '#e5e7eb', true: C.accentLight }}
              thumbColor={sharePhone ? C.accent : '#d1d5db'}
              style={{ transform: [{ scale: 0.8 }] }}
            />
            <Text style={s.shareTxt}>เผยแพร่เบอร์โทรศัพท์</Text>
          </View>
          <View style={s.shareRow}>
            <Switch
              value={shareLine}
              onValueChange={setShareLine}
              trackColor={{ false: '#e5e7eb', true: C.accentLight }}
              thumbColor={shareLine ? C.accent : '#d1d5db'}
              style={{ transform: [{ scale: 0.8 }] }}
            />
            <Text style={s.shareTxt}>เผยแพร่ Line ID</Text>
          </View>
          <Text style={s.shareHint}>กำหนดโดยหัวหน้าโครงการ</Text>
        </View>

        {/* ── Actions ── */}
        <TouchableOpacity style={s.editBtn} onPress={() => router.push('/(tabs)/edit-profile')}>
          <Ionicons name="pencil-outline" size={15} color="#fff" />
          <Text style={s.editTxt}>แก้ไขข้อมูล</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={15} color={C.error} />
          <Text style={s.logoutTxt}>ออกจากระบบ</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

function ResearchSection({ icon, title, count, items, renderItem }: {
  icon: IoniconName; title: string; count: number;
  items: any[]; renderItem: (item: any, i: number) => React.ReactNode;
}) {
  return (
    <View style={s.resSection}>
      <View style={s.resSectionHeader}>
        <Ionicons name={icon} size={14} color={C.accent} />
        <Text style={s.resSectionTitle}>{title}</Text>
        <View style={s.resBadge}><Text style={s.resBadgeTxt}>{count}</Text></View>
      </View>
      {items.length === 0
        ? <Text style={s.resEmpty}>ไม่มีข้อมูล</Text>
        : items.map((item, i) => renderItem(item, i))
      }
    </View>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: C.bg },
  scroll:  { flex: 1 },
  content: { padding: 14, paddingBottom: 40 },

  // Banner
  banner:       { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  bannerLogoWrap:{ },
  bannerLogo:   { width: 44, height: 44, borderRadius: 22, backgroundColor: C.accentLight, justifyContent: 'center', alignItems: 'center' },
  bannerTitle:  { fontSize: 16, fontWeight: '700', color: C.text },
  bannerSub:    { fontSize: 11, color: C.textMuted, marginTop: 1 },

  // Panels
  panels:     { flexDirection: 'row', gap: 12, marginBottom: 12, alignItems: 'flex-start' },
  leftPanel:  { width: 110, backgroundColor: '#fff', borderRadius: 14, padding: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  rightPanel: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },

  // Photo
  photoWrap:       { width: 74, height: 96, marginBottom: 8, position: 'relative' },
  photo:           { width: 74, height: 96, borderRadius: 4, resizeMode: 'cover' },
  photoPlaceholder:{ width: 74, height: 96, borderRadius: 4, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb', justifyContent: 'center', alignItems: 'center', gap: 4 },
  photoTxt:        { fontSize: 8, color: '#aaa', textAlign: 'center', lineHeight: 12 },
  cameraOverlay:   { position: 'absolute', bottom: 3, right: 3, backgroundColor: C.primary, borderRadius: 8, padding: 3 },
  photoName:  { fontSize: 11, fontWeight: '700', color: C.text, textAlign: 'center', marginBottom: 2 },
  photoPos:   { fontSize: 9, color: C.textMuted, textAlign: 'center', marginBottom: 4 },
  adminChip:  { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#fef9c3', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, marginBottom: 6 },
  adminChipTxt: { fontSize: 9, color: '#ca8a04', fontWeight: '700' },

  affiliList: { width: '100%', gap: 4, marginBottom: 8 },
  affiliItem: { backgroundColor: C.bgSection, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 4 },
  affiliTxt:  { fontSize: 9, color: C.textSub, textAlign: 'center', lineHeight: 13 },

  quickLink:    { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  quickLinkTxt: { fontSize: 10, color: C.accent, fontWeight: '600' },

  // Info rows (right panel)
  infoRow:       { paddingVertical: 8 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: C.borderLight },
  infoLabel:     { fontSize: 10, color: C.textMuted, marginBottom: 3 },
  infoRight:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  infoVal:       { fontSize: 12, fontWeight: '600', color: C.text, flex: 1 },
  infoValEmpty:  { color: C.textLight, fontWeight: '400' },

  // Research sections
  resSection:       { backgroundColor: '#fff', borderRadius: 14, padding: 12, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  resSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  resSectionTitle:  { fontSize: 13, fontWeight: '700', color: C.text, flex: 1 },
  resBadge:         { backgroundColor: C.bgSection, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  resBadgeTxt:      { fontSize: 11, fontWeight: '700', color: C.primary },
  resEmpty:         { fontSize: 11, color: C.textLight, fontStyle: 'italic', paddingVertical: 4 },
  resRow:           { flexDirection: 'row', gap: 6, paddingVertical: 5, borderTopWidth: 1, borderTopColor: C.borderLight },
  resNum:           { fontSize: 11, color: C.textMuted, width: 18, marginTop: 1 },
  resTitle:         { fontSize: 12, fontWeight: '600', color: C.text, marginBottom: 1 },
  resMeta:          { fontSize: 10, color: C.textMuted },

  // Sharing
  shareCard:   { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  shareHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  shareTitle:  { fontSize: 13, fontWeight: '700', color: C.text },
  shareRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  shareTxt:    { fontSize: 12, color: C.textSub },
  shareHint:   { fontSize: 10, color: C.textLight, marginTop: 6, fontStyle: 'italic' },

  // Buttons
  editBtn:   { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: C.primary, borderRadius: 14, paddingVertical: 15, marginBottom: 10, shadowColor: C.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 4 },
  editTxt:   { color: '#fff', fontWeight: '700', fontSize: 14 },
  logoutBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, borderColor: '#fca5a5', paddingVertical: 14 },
  logoutTxt: { color: C.error, fontWeight: '700', fontSize: 14 },
});
