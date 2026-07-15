import { Ionicons } from '@expo/vector-icons';
import { useUser, type Education, type Expertise } from '@/context/UserContext';
import { api } from '@/services/api';
import { confirmAction } from '@/services/confirm';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Image, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const PREFIXES = ['นาย', 'นาง', 'นางสาว', 'ดร.', 'ผศ.ดร.', 'รศ.ดร.', 'ศ.ดร.', 'ผศ.', 'รศ.'];
const EDU_LEVELS = ['ปริญญาตรี', 'ปริญญาโท', 'ปริญญาเอก', 'ปวส.', 'ปวช.', 'อื่นๆ'];
const emptyEdu: Omit<Education, 'id'> = { level: 'ปริญญาตรี', degree: '', field: '', institution: '', year: '' };
const emptyExp: Omit<Expertise, 'id'> = { nameTH: '', nameEN: '', group: '', field: '' };

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

function SectionHeader({ icon, title, color, bg }: { icon: IoniconName; title: string; color: string; bg: string }) {
  return (
    <View style={[sh.wrap, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={15} color={color} />
      <Text style={[sh.txt, { color }]}>{title}</Text>
    </View>
  );
}
const sh = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginBottom: 12 },
  txt: { fontSize: 13, fontWeight: '700' },
});

function Field({ label, value, onChangeText, keyboardType = 'default', secure = false, placeholder = '' }: any) {
  return (
    <View style={f.wrap}>
      <Text style={f.label}>{label}</Text>
      <TextInput
        style={f.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        secureTextEntry={secure}
        placeholder={placeholder || label}
        placeholderTextColor="#9ca3af"
        autoCapitalize="none"
      />
    </View>
  );
}
const f = StyleSheet.create({
  wrap: { marginBottom: 10 },
  label: { fontSize: 11, fontWeight: '600', color: '#374151', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.3 },
  input: { borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: '#111827', backgroundColor: '#fafafa' },
});

export default function EditProfileScreen() {
  const { user, saveUser } = useUser();
  const [saving, setSaving] = useState(false);

  // Personal info
  const [prefix,    setPrefix]    = useState(user.prefix || '');
  const [firstName, setFirstName] = useState(user.firstName || '');
  const [lastName,  setLastName]  = useState(user.lastName || '');
  const [group,     setGroup]     = useState(user.group || 'วิชาการ');
  const [faculty,   setFaculty]   = useState(user.faculty || '');
  const [major,     setMajor]     = useState(user.major || '');
  const [position,  setPosition]  = useState(user.position || '');
  const [address,   setAddress]   = useState(user.address || '');
  const [birthday,  setBirthday]  = useState(user.birthday || '');
  const [phone,     setPhone]     = useState(user.phone || '');
  const [email,     setEmail]     = useState(user.email || '');
  const [lineId,    setLineId]    = useState(user.lineId || '');
  const [idCard,    setIdCard]    = useState(user.idCard || '');

  // Password
  const [currentPassword,  setCurrentPassword]  = useState('');
  const [password,          setPassword]          = useState('');
  const [confirmPassword,   setConfirmPassword]   = useState('');

  // Education list
  const [educations,  setEducations]  = useState<Education[]>(user.education || []);
  const [eduModal,    setEduModal]    = useState(false);
  const [editEduId,   setEditEduId]   = useState<string | null>(null);
  const [eduForm,     setEduForm]     = useState(emptyEdu);

  // Expertise list
  const [expertises,  setExpertises]  = useState<Expertise[]>(user.expertise || []);
  const [expModal,    setExpModal]    = useState(false);
  const [editExpId,   setEditExpId]   = useState<string | null>(null);
  const [expForm,     setExpForm]     = useState(emptyExp);

  useEffect(() => {
    setPrefix(user.prefix || '');
    setFirstName(user.firstName || '');
    setLastName(user.lastName || '');
    setGroup(user.group || 'วิชาการ');
    setFaculty(user.faculty || '');
    setMajor(user.major || '');
    setPosition(user.position || '');
    setAddress(user.address || '');
    setBirthday(user.birthday || '');
    setPhone(user.phone || '');
    setEmail(user.email || '');
    setLineId(user.lineId || '');
    setIdCard(user.idCard || '');
    setEducations(user.education || []);
    setExpertises(user.expertise || []);
  }, [user]);

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert('ต้องการสิทธิ์', 'กรุณาอนุญาตการเข้าถึงรูปภาพในการตั้งค่า');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) {
      const src = result.assets[0].uri;
      let finalUri = src;
      if (Platform.OS !== 'web') {
        const dest = (FileSystem as any).documentDirectory + 'avatar.jpg';
        await (FileSystem as any).copyAsync({ from: src, to: dest });
        finalUri = dest + '?t=' + Date.now();
      }
      try {
        const uploadedUri = await api.uploadProfilePhoto(finalUri, result.assets[0].fileName || 'avatar.jpg', result.assets[0].mimeType || 'image/jpeg');
        await saveUser({ avatar: uploadedUri });
      } catch {
        await saveUser({ avatar: finalUri });
        Alert.alert('แจ้งเตือน', 'บันทึกรูปไว้ในเครื่องแล้ว แต่ยังอัปโหลดไปยังเซิร์ฟเวอร์ไม่สำเร็จ');
      }
    }
  };

  const handleSave = async () => {
    const fullName = [prefix, firstName, lastName].filter(Boolean).join(' ') || firstName || user.name;
    if (!firstName && !user.name) return Alert.alert('กรุณากรอกชื่อ');
    if (password && password !== confirmPassword) return Alert.alert('ผิดพลาด', 'รหัสผ่านใหม่ไม่ตรงกัน');
    setSaving(true);
    try {
      const updated = { name: fullName, prefix, firstName, lastName, group, email, faculty, major, position, address, birthday, phone, lineId, idCard, education: educations, expertise: expertises };
      const remoteProfile = await api.updateProfile({ name: fullName, email, faculty, major, position, phone });
      if (password) {
        const result = await api.changePassword(currentPassword, password);
        if (result?.success === false) {
          Alert.alert('ผิดพลาด', result.message || 'รหัสผ่านปัจจุบันไม่ถูกต้อง');
          setSaving(false);
          return;
        }
      }
      await saveUser({ ...updated, ...(remoteProfile || {}) });
      Alert.alert('สำเร็จ', 'บันทึกข้อมูลเรียบร้อยแล้ว', [
        { text: 'ตกลง', onPress: () => router.replace('/(tabs)/profile') },
      ]);
    } catch {
      Alert.alert('ผิดพลาด', 'บันทึกไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setSaving(false);
    }
  };

  // --- Education CRUD ---
  const openAddEdu  = () => { setEduForm(emptyEdu); setEditEduId(null); setEduModal(true); };
  const openEditEdu = (e: Education) => { setEduForm({ level: e.level, degree: e.degree, field: e.field, institution: e.institution, year: e.year }); setEditEduId(e.id); setEduModal(true); };
  const saveEdu = () => {
    if (!eduForm.degree) return Alert.alert('กรุณากรอกวุฒิการศึกษา');
    if (editEduId) {
      setEducations(prev => prev.map(e => e.id === editEduId ? { ...eduForm, id: editEduId } : e));
    } else {
      setEducations(prev => [...prev, { ...eduForm, id: uid() }]);
    }
    setEduModal(false);
  };
  const delEdu = (id: string) => confirmAction('ลบ?', 'ต้องการลบรายการนี้?', () => {
    setEducations(prev => prev.filter(e => e.id !== id));
  });

  // --- Expertise CRUD ---
  const openAddExp  = () => { setExpForm(emptyExp); setEditExpId(null); setExpModal(true); };
  const openEditExp = (e: Expertise) => { setExpForm({ nameTH: e.nameTH, nameEN: e.nameEN, group: e.group, field: e.field }); setEditExpId(e.id); setExpModal(true); };
  const saveExp = () => {
    if (!expForm.nameTH) return Alert.alert('กรุณากรอกความเชี่ยวชาญ');
    if (editExpId) {
      setExpertises(prev => prev.map(e => e.id === editExpId ? { ...expForm, id: editExpId } : e));
    } else {
      setExpertises(prev => [...prev, { ...expForm, id: uid() }]);
    }
    setExpModal(false);
  };
  const delExp = (id: string) => confirmAction('ลบ?', 'ต้องการลบรายการนี้?', () => {
    setExpertises(prev => prev.filter(e => e.id !== id));
  });

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>ข้อมูลนักวิจัย</Text>
        <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={s.homeBtn} accessibilityLabel="กลับหน้าหลัก">
          <Ionicons name="home-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* ===== รูปโปรไฟล์ ===== */}
        <View style={s.avatarSection}>
          <TouchableOpacity style={s.avatarWrap} onPress={pickAvatar} activeOpacity={0.85}>
            <View style={s.avatarRing}>
              {user.avatar ? (
                <Image source={{ uri: user.avatar }} style={s.avatarImg} />
              ) : (
                <View style={s.avatarPlaceholder}>
                  <Ionicons name="person" size={38} color="#9ca3af" />
                </View>
              )}
            </View>
            <View style={s.cameraBtn}>
              <Ionicons name="camera" size={13} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={s.avatarHint}>แตะเพื่อเปลี่ยนรูปโปรไฟล์</Text>
        </View>

        {/* ===== ข้อมูลส่วนตัว ===== */}
        <View style={s.card}>
          <SectionHeader icon="person-circle-outline" title="ข้อมูลส่วนตัว" color="#16a34a" bg="#f0fdf4" />

          {/* กลุ่มทาน */}
          <Text style={f.label}>กลุ่มทาน</Text>
          <View style={s.radioRow}>
            {['วิชาการ', 'สายสนับสนุน'].map(g => (
              <TouchableOpacity key={g} style={s.radioBtn} onPress={() => setGroup(g)}>
                <View style={[s.radioCircle, group === g && s.radioCircleActive]}>
                  {group === g && <View style={s.radioDot} />}
                </View>
                <Text style={s.radioTxt}>{g}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* คำนำหน้า */}
          <Text style={f.label}>คำนำหน้า</Text>
          <View style={s.prefixRow}>
            {PREFIXES.map(p => (
              <TouchableOpacity key={p} style={[s.prefixChip, prefix === p && s.prefixActive]} onPress={() => setPrefix(p)}>
                <Text style={[s.prefixTxt, prefix === p && s.prefixTxtActive]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ชื่อ / นามสกุล */}
          <View style={s.row2}>
            <View style={{ flex: 1 }}>
              <Field label="ชื่อ" value={firstName} onChangeText={setFirstName} placeholder="ชื่อ" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="นามสกุล" value={lastName} onChangeText={setLastName} placeholder="นามสกุล" />
            </View>
          </View>

          <Field label="สังกัด (คณะ)" value={faculty} onChangeText={setFaculty} />
          <Field label="หลักสูตร / สาขา" value={major} onChangeText={setMajor} />
          <Field label="ตำแหน่ง" value={position} onChangeText={setPosition} />
          <Field label="ที่อยู่" value={address} onChangeText={setAddress} />

          <View style={s.row2}>
            <View style={{ flex: 1 }}>
              <Field label="วันเกิด" value={birthday} onChangeText={setBirthday} placeholder="วว/ดด/ปปปป" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="เบอร์โทร" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            </View>
          </View>

          <Field label="อีเมล" value={email} onChangeText={setEmail} keyboardType="email-address" />

          <View style={s.row2}>
            <View style={{ flex: 1 }}>
              <Field label="Line ID" value={lineId} onChangeText={setLineId} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="เลขบัตรประชาชน" value={idCard} onChangeText={setIdCard} keyboardType="numeric" placeholder="13 หลัก" />
            </View>
          </View>

          <TouchableOpacity style={s.saveInfoBtn} onPress={handleSave} disabled={saving}>
            <Ionicons name="save-outline" size={15} color="#fff" />
            <Text style={s.saveInfoTxt}>{saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}</Text>
          </TouchableOpacity>
        </View>

        {/* ===== วุฒิการศึกษา ===== */}
        <View style={s.card}>
          <SectionHeader icon="school-outline" title="วุฒิการศึกษา" color="#2563eb" bg="#eff6ff" />

          {/* Table header */}
          <View style={s.tableHead}>
            <Text style={[s.th, { flex: 1.2 }]}>ระดับ</Text>
            <Text style={[s.th, { flex: 1.5 }]}>วุฒิ</Text>
            <Text style={[s.th, { flex: 1.5 }]}>สาขา</Text>
            <Text style={[s.th, { flex: 0.6 }]}>ปี</Text>
            <Text style={[s.th, { flex: 0.6 }]}></Text>
          </View>

          {educations.length === 0
            ? <Text style={s.emptyRow}>ยังไม่มีข้อมูล</Text>
            : educations.map((e) => (
              <View key={e.id} style={s.tableRow}>
                <Text style={[s.td, { flex: 1.2 }]} numberOfLines={1}>{e.level}</Text>
                <Text style={[s.td, { flex: 1.5 }]} numberOfLines={1}>{e.degree}</Text>
                <Text style={[s.td, { flex: 1.5 }]} numberOfLines={1}>{e.field}</Text>
                <Text style={[s.td, { flex: 0.6 }]}>{e.year}</Text>
                <View style={[{ flex: 0.6 }, s.rowActions]}>
                  <TouchableOpacity onPress={() => openEditEdu(e)} style={s.iconBtn}><Ionicons name="pencil" size={13} color="#ca8a04" /></TouchableOpacity>
                  <TouchableOpacity onPress={() => delEdu(e.id)} style={s.iconBtnDel}><Ionicons name="trash-outline" size={13} color="#dc2626" /></TouchableOpacity>
                </View>
              </View>
            ))
          }

          <TouchableOpacity style={s.addRowBtn} onPress={openAddEdu}>
            <Ionicons name="add-circle-outline" size={16} color="#2563eb" />
            <Text style={s.addRowTxt}>เพิ่มข้อมูล</Text>
          </TouchableOpacity>
        </View>

        {/* ===== ความเชี่ยวชาญ ===== */}
        <View style={s.card}>
          <SectionHeader icon="bulb-outline" title="ความเชี่ยวชาญ" color="#7c3aed" bg="#f5f3ff" />

          <View style={s.tableHead}>
            <Text style={[s.th, { flex: 1.5 }]}>ความเชี่ยวชาญ (TH)</Text>
            <Text style={[s.th, { flex: 1.5 }]}>ความเชี่ยวชาญ (EN)</Text>
            <Text style={[s.th, { flex: 1 }]}>กลุ่ม</Text>
            <Text style={[s.th, { flex: 0.6 }]}></Text>
          </View>

          {expertises.length === 0
            ? <Text style={s.emptyRow}>ยังไม่มีข้อมูล</Text>
            : expertises.map((e) => (
              <View key={e.id} style={s.tableRow}>
                <Text style={[s.td, { flex: 1.5 }]} numberOfLines={1}>{e.nameTH}</Text>
                <Text style={[s.td, { flex: 1.5 }]} numberOfLines={1}>{e.nameEN}</Text>
                <Text style={[s.td, { flex: 1 }]} numberOfLines={1}>{e.group}</Text>
                <View style={[{ flex: 0.6 }, s.rowActions]}>
                  <TouchableOpacity onPress={() => openEditExp(e)} style={s.iconBtn}><Ionicons name="pencil" size={13} color="#ca8a04" /></TouchableOpacity>
                  <TouchableOpacity onPress={() => delExp(e.id)} style={s.iconBtnDel}><Ionicons name="trash-outline" size={13} color="#dc2626" /></TouchableOpacity>
                </View>
              </View>
            ))
          }

          <TouchableOpacity style={s.addRowBtn} onPress={openAddExp}>
            <Ionicons name="add-circle-outline" size={16} color="#7c3aed" />
            <Text style={[s.addRowTxt, { color: '#7c3aed' }]}>เพิ่มข้อมูล</Text>
          </TouchableOpacity>
        </View>

        {/* ===== เปลี่ยนรหัสผ่าน ===== */}
        <View style={s.card}>
          <SectionHeader icon="lock-closed-outline" title="เปลี่ยนรหัสผ่าน" color="#374151" bg="#f3f4f6" />
          <Text style={s.pwHint}>เว้นว่างถ้าไม่ต้องการเปลี่ยน</Text>
          <Field label="รหัสผ่านปัจจุบัน" value={currentPassword} onChangeText={setCurrentPassword} secure placeholder="รหัสผ่านปัจจุบัน" />
          <Field label="รหัสผ่านใหม่" value={password} onChangeText={setPassword} secure placeholder="อย่างน้อย 6 ตัวอักษร" />
          <Field label="ยืนยันรหัสผ่าน" value={confirmPassword} onChangeText={setConfirmPassword} secure placeholder="ยืนยันรหัสผ่านใหม่" />
        </View>

        <TouchableOpacity style={[s.mainSaveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
          <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
          <Text style={s.mainSaveTxt}>{saving ? 'กำลังบันทึก...' : 'บันทึกทั้งหมด'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.cancelBtn} onPress={() => router.back()}>
          <Text style={s.cancelTxt}>ยกเลิก</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* ===== Modal: วุฒิการศึกษา ===== */}
      <Modal visible={eduModal} transparent animationType="slide">
        <View style={s.overlay}>
          <ScrollView contentContainerStyle={s.modalBox} keyboardShouldPersistTaps="handled">
            <View style={s.modalHandle} />
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{editEduId ? 'แก้ไขวุฒิการศึกษา' : 'เพิ่มวุฒิการศึกษา'}</Text>
              <TouchableOpacity onPress={() => setEduModal(false)} style={s.closeBtn}><Ionicons name="close" size={20} color="#6b7280" /></TouchableOpacity>
            </View>

            <Text style={f.label}>ระดับการศึกษา</Text>
            <View style={s.chips}>
              {EDU_LEVELS.map(l => (
                <TouchableOpacity key={l} style={[s.chip, eduForm.level === l && s.chipActive]} onPress={() => setEduForm(x => ({ ...x, level: l }))}>
                  <Text style={[s.chipTxt, eduForm.level === l && s.chipTxtActive]}>{l}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Field label="วุฒิการศึกษา *" value={eduForm.degree} onChangeText={(v: string) => setEduForm(x => ({ ...x, degree: v }))} placeholder="เช่น วิทยาศาสตรบัณฑิต" />
            <Field label="สาขาวิชา" value={eduForm.field} onChangeText={(v: string) => setEduForm(x => ({ ...x, field: v }))} placeholder="เช่น วิทยาการคอมพิวเตอร์" />
            <Field label="สถาบันการศึกษา" value={eduForm.institution} onChangeText={(v: string) => setEduForm(x => ({ ...x, institution: v }))} placeholder="ชื่อมหาวิทยาลัย" />
            <Field label="ปี พ.ศ. ที่สำเร็จ" value={eduForm.year} onChangeText={(v: string) => setEduForm(x => ({ ...x, year: v }))} keyboardType="numeric" placeholder="เช่น 2560" />

            <View style={s.modalBtns}>
              <TouchableOpacity style={s.modalCancelBtn} onPress={() => setEduModal(false)}><Text style={s.modalCancelTxt}>ยกเลิก</Text></TouchableOpacity>
              <TouchableOpacity style={s.modalSaveBtn} onPress={saveEdu}>
                <Ionicons name="checkmark" size={16} color="#fff" />
                <Text style={s.modalSaveTxt}>บันทึก</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* ===== Modal: ความเชี่ยวชาญ ===== */}
      <Modal visible={expModal} transparent animationType="slide">
        <View style={s.overlay}>
          <ScrollView contentContainerStyle={s.modalBox} keyboardShouldPersistTaps="handled">
            <View style={s.modalHandle} />
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{editExpId ? 'แก้ไขความเชี่ยวชาญ' : 'เพิ่มความเชี่ยวชาญ'}</Text>
              <TouchableOpacity onPress={() => setExpModal(false)} style={s.closeBtn}><Ionicons name="close" size={20} color="#6b7280" /></TouchableOpacity>
            </View>

            <Field label="ความเชี่ยวชาญ (ภาษาไทย) *" value={expForm.nameTH} onChangeText={(v: string) => setExpForm(x => ({ ...x, nameTH: v }))} placeholder="เช่น ปัญญาประดิษฐ์" />
            <Field label="ความเชี่ยวชาญ (English)" value={expForm.nameEN} onChangeText={(v: string) => setExpForm(x => ({ ...x, nameEN: v }))} placeholder="e.g. Artificial Intelligence" />
            <Field label="กลุ่มความเชี่ยวชาญ" value={expForm.group} onChangeText={(v: string) => setExpForm(x => ({ ...x, group: v }))} placeholder="เช่น วิทยาการคอมพิวเตอร์" />
            <Field label="สาขาความเชี่ยวชาญ" value={expForm.field} onChangeText={(v: string) => setExpForm(x => ({ ...x, field: v }))} placeholder="เช่น Machine Learning" />

            <View style={s.modalBtns}>
              <TouchableOpacity style={s.modalCancelBtn} onPress={() => setExpModal(false)}><Text style={s.modalCancelTxt}>ยกเลิก</Text></TouchableOpacity>
              <TouchableOpacity style={[s.modalSaveBtn, { backgroundColor: '#7c3aed' }]} onPress={saveExp}>
                <Ionicons name="checkmark" size={16} color="#fff" />
                <Text style={s.modalSaveTxt}>บันทึก</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eef7f0' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#16a34a', paddingHorizontal: 16, paddingTop: 48, paddingBottom: 14 },
  backBtn: { width: 36, height: 36, justifyContent: 'center' },
  homeBtn: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.14)' },
  headerTitle: { color: '#fff', fontWeight: '800', fontSize: 16 },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },

  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },

  avatarSection: { alignItems: 'center', marginBottom: 16 },
  avatarWrap: { position: 'relative', marginBottom: 8 },
  avatarRing: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#16a34a', justifyContent: 'center', alignItems: 'center' },
  avatarImg: { width: 92, height: 92, borderRadius: 46 },
  avatarPlaceholder: { width: 92, height: 92, borderRadius: 46, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },
  cameraBtn: { position: 'absolute', bottom: 2, right: 2, width: 28, height: 28, borderRadius: 14, backgroundColor: '#16a34a', borderWidth: 2, borderColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  avatarHint: { fontSize: 11, color: '#9ca3af' },

  // Radio
  radioRow: { flexDirection: 'row', gap: 20, marginBottom: 12 },
  radioBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  radioCircle: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#d1d5db', justifyContent: 'center', alignItems: 'center' },
  radioCircleActive: { borderColor: '#16a34a' },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#16a34a' },
  radioTxt: { fontSize: 13, color: '#374151' },

  // Prefix chips
  prefixRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  prefixChip: { borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  prefixActive: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  prefixTxt: { fontSize: 11, color: '#6b7280' },
  prefixTxtActive: { color: '#fff', fontWeight: '700' },

  // Row 2 columns
  row2: { flexDirection: 'row', gap: 10 },

  // Save info button
  saveInfoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#16a34a', borderRadius: 10, paddingVertical: 11, marginTop: 6 },
  saveInfoTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // Table
  tableHead: { flexDirection: 'row', backgroundColor: '#16a34a', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 8, marginBottom: 2 },
  th: { fontSize: 10, fontWeight: '700', color: '#fff', textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  td: { fontSize: 11, color: '#374151' },
  rowActions: { flexDirection: 'row', gap: 4 },
  iconBtn: { backgroundColor: '#fef9c3', borderRadius: 6, padding: 4 },
  iconBtnDel: { backgroundColor: '#fee2e2', borderRadius: 6, padding: 4 },
  emptyRow: { fontSize: 12, color: '#9ca3af', fontStyle: 'italic', paddingVertical: 8, paddingHorizontal: 4 },
  addRowBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingVertical: 8 },
  addRowTxt: { fontSize: 13, fontWeight: '600', color: '#2563eb' },

  pwHint: { fontSize: 11, color: '#9ca3af', marginBottom: 8 },

  // Bottom buttons
  mainSaveBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: '#16a34a', borderRadius: 14, paddingVertical: 15, marginBottom: 10, shadowColor: '#2d5a3d', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 4 },
  mainSaveTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
  cancelBtn: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, borderColor: '#e5e7eb', paddingVertical: 15, alignItems: 'center', marginBottom: 4 },
  cancelTxt: { color: '#6b7280', fontWeight: '600', fontSize: 14 },

  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 8 },
  modalHandle: { width: 36, height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, alignSelf: 'center', marginBottom: 8 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  closeBtn: { backgroundColor: '#f3f4f6', borderRadius: 8, padding: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  chip: { borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  chipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipTxt: { fontSize: 11, color: '#6b7280' },
  chipTxtActive: { color: '#fff', fontWeight: '700' },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 6 },
  modalCancelBtn: { flex: 1, borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  modalCancelTxt: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  modalSaveBtn: { flex: 2, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, backgroundColor: '#2d5a3d', borderRadius: 12, paddingVertical: 13 },
  modalSaveTxt: { fontSize: 13, color: '#fff', fontWeight: '700' },
});
