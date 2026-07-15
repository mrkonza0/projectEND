import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '@/components/AppHeader';
import { useUser } from '@/context/UserContext';
import { canManage } from '@/services/permissions';
import { api, getApiErrorMessage } from '@/services/api';
import { confirmAction } from '@/services/confirm';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform,
  RefreshControl, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';

// ─── Types ──────────────────────────────────────────────────────
type EduRow = { level: string; degree: string; field: string; institution: string; year: string };
type ExpRow = { name_th: string; name_en: string; group: string; field: string };

// ─── Constants ──────────────────────────────────────────────────
const PREFIXES    = ['นาย', 'นาง', 'นางสาว', 'ดร.', 'ผศ.', 'ผศ.ดร.', 'รศ.', 'รศ.ดร.', 'ศ.', 'ศ.ดร.'];
const EDU_LEVELS  = ['ปริญญาตรี', 'ปริญญาโท', 'ปริญญาเอก', 'ประกาศนียบัตร', 'อื่นๆ'];
const WORK_TYPES  = ['วิชาการ', 'สายสนับสนุน'];
const CARD_COLORS = ['#16a34a', '#2563eb', '#7c3aed', '#d97706', '#db2777', '#0284c7', '#dc2626', '#0d9488'];

const emptyForm = {
  prefix: 'นาย', first_name: '', last_name: '',
  work_type: 'วิชาการ', faculty: '', program: '', position: '',
  address: '', birthday: '', phone: '', email: '', line_id: '', national_id: '',
};
const emptyEdu: EduRow = { level: 'ปริญญาตรี', degree: '', field: '', institution: '', year: '' };
const emptyExp: ExpRow = { name_th: '', name_en: '', group: '', field: '' };

function parseRows<T>(val: any): T[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch { return []; }
}

// ─── SectionHeader helper ────────────────────────────────────────
function SectionHeader({ icon, title }: { icon: any; title: string }) {
  return (
    <View style={s.sectionHeader}>
      <View style={s.sectionIconWrap}><Ionicons name={icon} size={15} color="#16a34a" /></View>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.sectionLine} />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
export default function ResearcherScreen() {
  const { user } = useUser();

  // ── List state ──
  const [researchers, setResearchers] = useState<any[]>([]);
  const [search, setSearch]           = useState('');
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);

  // ── Form state ──
  const [view, setView]         = useState<'list' | 'form'>('list');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving]     = useState(false);
  const [form, setForm]         = useState(emptyForm);
  const [education, setEducation] = useState<EduRow[]>([]);
  const [expertise, setExpertise] = useState<ExpRow[]>([]);

  // ── Education sub-modal ──
  const [eduModal, setEduModal]     = useState(false);
  const [editEduIdx, setEditEduIdx] = useState<number | null>(null);
  const [eduForm, setEduForm]       = useState(emptyEdu);

  // ── Expertise sub-modal ──
  const [expModal, setExpModal]     = useState(false);
  const [editExpIdx, setEditExpIdx] = useState<number | null>(null);
  const [expForm, setExpForm]       = useState(emptyExp);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const all = await api.getResearchers();
      setResearchers(all);
    } catch { Alert.alert('ข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลได้'); }
    finally { setLoading(false); }
  };

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const openAdd = () => {
    setForm(emptyForm); setEditingId(null);
    setEducation([]); setExpertise([]);
    setView('form');
  };

  const openEdit = (r: any) => {
    setForm({
      prefix:      r.prefix      || 'นาย',
      first_name:  r.first_name  || '',
      last_name:   r.last_name   || '',
      work_type:   r.work_type   || 'วิชาการ',
      faculty:     r.faculty     || '',
      program:     r.program     || '',
      position:    r.position    || '',
      address:     r.address     || '',
      birthday:    r.birthday    || '',
      phone:       r.phone       || '',
      email:       r.email       || '',
      line_id:     r.line_id     || '',
      national_id: r.national_id || '',
    });
    setEducation(parseRows<EduRow>(r.education));
    setExpertise(parseRows<ExpRow>(r.expertise_detail));
    setEditingId(r.id);
    setView('form');
  };

  const handleSave = async () => {
    if (!form.first_name || !form.faculty) {
      Alert.alert('กรุณากรอกชื่อและสังกัด');
      return;
    }
    setSaving(true);
    try {
      const fullName = [form.prefix, form.first_name, form.last_name].filter(Boolean).join(' ');
      const payload = {
        ...form,
        name:             fullName,
        expertise:        expertise.map(e => e.name_th).filter(Boolean).join(', '),
        education:        education,
        expertise_detail: expertise,
      };
      if (editingId) {
        await api.updateResearcher(editingId, payload);
      } else {
        await api.createResearcher(payload);
      }
      setView('list');
      load();
    } catch (error) { Alert.alert('บันทึกไม่สำเร็จ', getApiErrorMessage(error)); }
    finally { setSaving(false); }
  };

  const handleDelete = (id: number) => confirmAction('ยืนยันการลบ', 'ต้องการลบนักวิจัยนี้?', async () => {
    try {
      await api.deleteResearcher(id);
      load();
    } catch (error) {
      Alert.alert('ลบไม่สำเร็จ', getApiErrorMessage(error));
    }
  });

  const fForm = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  // ── Education handlers ──
  const openAddEdu  = () => { setEduForm(emptyEdu); setEditEduIdx(null); setEduModal(true); };
  const openEditEdu = (i: number) => { setEduForm({ ...education[i] }); setEditEduIdx(i); setEduModal(true); };
  const saveEdu = () => {
    if (!eduForm.degree) { Alert.alert('กรุณากรอกวุฒิการศึกษา'); return; }
    setEducation(prev =>
      editEduIdx !== null ? prev.map((r, i) => i === editEduIdx ? { ...eduForm } : r)
                          : [...prev, { ...eduForm }],
    );
    setEduModal(false);
  };
  const deleteEdu = (i: number) => setEducation(prev => prev.filter((_, idx) => idx !== i));

  // ── Expertise handlers ──
  const openAddExp  = () => { setExpForm(emptyExp); setEditExpIdx(null); setExpModal(true); };
  const openEditExp = (i: number) => { setExpForm({ ...expertise[i] }); setEditExpIdx(i); setExpModal(true); };
  const saveExp = () => {
    if (!expForm.name_th) { Alert.alert('กรุณากรอกความเชี่ยวชาญ (ไทย)'); return; }
    setExpertise(prev =>
      editExpIdx !== null ? prev.map((r, i) => i === editExpIdx ? { ...expForm } : r)
                          : [...prev, { ...expForm }],
    );
    setExpModal(false);
  };
  const deleteExp = (i: number) => setExpertise(prev => prev.filter((_, idx) => idx !== i));

  // ═══════════════════ FORM VIEW ═══════════════════════
  if (view === 'form') {
    return (
      <View style={s.container}>
        {/* ── Form Header ── */}
        <View style={s.formHeader}>
          <TouchableOpacity onPress={() => setView('list')} style={s.fhBtn}>
            <Ionicons name="arrow-back" size={20} color="#374151" />
            <Text style={s.fhCancelTxt}>ยกเลิก</Text>
          </TouchableOpacity>
          <Text style={s.fhTitle}>{editingId ? 'แก้ไขนักวิจัย' : 'เพิ่มนักวิจัย'}</Text>
          <TouchableOpacity onPress={handleSave} style={s.fhSaveBtn} disabled={saving}>
            {saving
              ? <ActivityIndicator size="small" color="#fff" />
              : <><Ionicons name="checkmark" size={16} color="#fff" /><Text style={s.fhSaveTxt}>บันทึก</Text></>
            }
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView style={s.formScroll} contentContainerStyle={s.formContent} keyboardShouldPersistTaps="handled">

            {/* ── Section 1: ข้อมูลส่วนตัว ── */}
            <SectionHeader icon="person-outline" title="ข้อมูลส่วนตัว" />

            {/* กลุ่มงาน */}
            <View style={s.fieldBlock}>
              <Text style={s.label}>กลุ่มงาน</Text>
              <View style={s.chipRow}>
                {WORK_TYPES.map(t => (
                  <TouchableOpacity key={t}
                    style={[s.chip, form.work_type === t && s.chipActive]}
                    onPress={() => fForm('work_type', t)}
                  >
                    <Text style={[s.chipTxt, form.work_type === t && s.chipTxtActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* คำนำหน้า */}
            <View style={s.fieldBlock}>
              <Text style={s.label}>คำนำหน้า</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRowH}>
                {PREFIXES.map(p => (
                  <TouchableOpacity key={p}
                    style={[s.chip, form.prefix === p && s.chipActive]}
                    onPress={() => fForm('prefix', p)}
                  >
                    <Text style={[s.chipTxt, form.prefix === p && s.chipTxtActive]}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* ชื่อ | นามสกุล */}
            <View style={s.row2}>
              <View style={s.col2}>
                <Text style={s.label}>ชื่อ *</Text>
                <TextInput style={s.input} value={form.first_name} onChangeText={v => fForm('first_name', v)}
                  placeholder="ชื่อ" placeholderTextColor="#9ca3af" />
              </View>
              <View style={s.col2}>
                <Text style={s.label}>นามสกุล</Text>
                <TextInput style={s.input} value={form.last_name} onChangeText={v => fForm('last_name', v)}
                  placeholder="นามสกุล" placeholderTextColor="#9ca3af" />
              </View>
            </View>

            {/* สังกัด | หลักสูตร/ฝ่าย */}
            <View style={s.row2}>
              <View style={s.col2}>
                <Text style={s.label}>สังกัด *</Text>
                <TextInput style={s.input} value={form.faculty} onChangeText={v => fForm('faculty', v)}
                  placeholder="คณะ/หน่วยงาน" placeholderTextColor="#9ca3af" />
              </View>
              <View style={s.col2}>
                <Text style={s.label}>หลักสูตร/ฝ่าย</Text>
                <TextInput style={s.input} value={form.program} onChangeText={v => fForm('program', v)}
                  placeholder="สาขา/ฝ่าย" placeholderTextColor="#9ca3af" />
              </View>
            </View>

            {/* ตำแหน่ง | วันเกิด */}
            <View style={s.row2}>
              <View style={s.col2}>
                <Text style={s.label}>ตำแหน่ง</Text>
                <TextInput style={s.input} value={form.position} onChangeText={v => fForm('position', v)}
                  placeholder="เช่น อาจารย์" placeholderTextColor="#9ca3af" />
              </View>
              <View style={s.col2}>
                <Text style={s.label}>วันเกิด</Text>
                <TextInput style={s.input} value={form.birthday} onChangeText={v => fForm('birthday', v)}
                  placeholder="DD/MM/YYYY" placeholderTextColor="#9ca3af" keyboardType="numbers-and-punctuation" />
              </View>
            </View>

            {/* เบอร์โทร | อีเมล */}
            <View style={s.row2}>
              <View style={s.col2}>
                <Text style={s.label}>เบอร์โทร</Text>
                <TextInput style={s.input} value={form.phone} onChangeText={v => fForm('phone', v)}
                  placeholder="08x-xxx-xxxx" placeholderTextColor="#9ca3af" keyboardType="phone-pad" />
              </View>
              <View style={s.col2}>
                <Text style={s.label}>อีเมล</Text>
                <TextInput style={s.input} value={form.email} onChangeText={v => fForm('email', v)}
                  placeholder="email@uru.ac.th" placeholderTextColor="#9ca3af" keyboardType="email-address" autoCapitalize="none" />
              </View>
            </View>

            {/* Line ID | เลขบัตรประชาชน */}
            <View style={s.row2}>
              <View style={s.col2}>
                <Text style={s.label}>Line ID</Text>
                <TextInput style={s.input} value={form.line_id} onChangeText={v => fForm('line_id', v)}
                  placeholder="Line ID" placeholderTextColor="#9ca3af" autoCapitalize="none" />
              </View>
              <View style={s.col2}>
                <Text style={s.label}>เลขบัตรประชาชน</Text>
                <TextInput style={s.input} value={form.national_id} onChangeText={v => fForm('national_id', v)}
                  placeholder="13 หลัก" placeholderTextColor="#9ca3af" keyboardType="number-pad" maxLength={13} />
              </View>
            </View>

            {/* ที่อยู่ */}
            <View style={s.fieldBlock}>
              <Text style={s.label}>ที่อยู่</Text>
              <TextInput style={[s.input, s.inputMulti]} value={form.address} onChangeText={v => fForm('address', v)}
                placeholder="บ้านเลขที่, ถนน, ตำบล, อำเภอ, จังหวัด"
                placeholderTextColor="#9ca3af" multiline numberOfLines={3} textAlignVertical="top" />
            </View>

            {/* ── Section 2: วุฒิการศึกษา ── */}
            <SectionHeader icon="school-outline" title="วุฒิการศึกษา" />

            {education.map((e, i) => (
              <View key={i} style={s.rowCard}>
                <View style={{ flex: 1 }}>
                  <View style={s.rowBadge}><Text style={s.rowBadgeTxt}>{e.level}</Text></View>
                  <Text style={s.rowCardMain}>{e.degree}{e.field ? ` (${e.field})` : ''}</Text>
                  {(e.institution || e.year) && (
                    <Text style={s.rowCardSub}>{[e.institution, e.year].filter(Boolean).join(' · ')}</Text>
                  )}
                </View>
                <View style={s.rowActions}>
                  <TouchableOpacity onPress={() => openEditEdu(i)} style={s.rowEditBtn}>
                    <Ionicons name="pencil" size={13} color="#ca8a04" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteEdu(i)} style={s.rowDelBtn}>
                    <Ionicons name="trash-outline" size={13} color="#dc2626" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            <TouchableOpacity style={s.addRowBtn} onPress={openAddEdu}>
              <Ionicons name="add-circle-outline" size={16} color="#16a34a" />
              <Text style={s.addRowTxt}>เพิ่มข้อมูลการศึกษา</Text>
            </TouchableOpacity>

            {/* ── Section 3: ความเชี่ยวชาญ ── */}
            <SectionHeader icon="bulb-outline" title="ความเชี่ยวชาญ" />

            {expertise.map((e, i) => (
              <View key={i} style={s.rowCard}>
                <View style={{ flex: 1 }}>
                  <Text style={s.rowCardMain}>{e.name_th}</Text>
                  {e.name_en ? <Text style={s.rowCardSub}>{e.name_en}</Text> : null}
                  {(e.group || e.field) && (
                    <View style={s.rowTagRow}>
                      {e.group ? <View style={s.rowTag}><Text style={s.rowTagTxt}>{e.group}</Text></View> : null}
                      {e.field ? <View style={s.rowTag}><Text style={s.rowTagTxt}>{e.field}</Text></View> : null}
                    </View>
                  )}
                </View>
                <View style={s.rowActions}>
                  <TouchableOpacity onPress={() => openEditExp(i)} style={s.rowEditBtn}>
                    <Ionicons name="pencil" size={13} color="#ca8a04" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteExp(i)} style={s.rowDelBtn}>
                    <Ionicons name="trash-outline" size={13} color="#dc2626" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            <TouchableOpacity style={s.addRowBtn} onPress={openAddExp}>
              <Ionicons name="add-circle-outline" size={16} color="#16a34a" />
              <Text style={s.addRowTxt}>เพิ่มความเชี่ยวชาญ</Text>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>

        {/* ── Education sub-modal ── */}
        <Modal visible={eduModal} transparent animationType="slide">
          <View style={s.overlay}>
            <View style={s.subModal}>
              <View style={s.subHandle} />
              <Text style={s.subTitle}>{editEduIdx !== null ? 'แก้ไขวุฒิการศึกษา' : 'เพิ่มวุฒิการศึกษา'}</Text>
              <Text style={s.label}>ระดับการศึกษา</Text>
              <View style={s.chipRow}>
                {EDU_LEVELS.map(l => (
                  <TouchableOpacity key={l}
                    style={[s.chip, eduForm.level === l && s.chipActive]}
                    onPress={() => setEduForm(f => ({ ...f, level: l }))}
                  >
                    <Text style={[s.chipTxt, eduForm.level === l && s.chipTxtActive]}>{l}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {([
                { k: 'degree',      ph: 'วุฒิการศึกษา *  เช่น วท.บ.',     icon: 'ribbon-outline',   kb: 'default' },
                { k: 'field',       ph: 'สาขา เช่น วิทยาการคอมพิวเตอร์', icon: 'book-outline',     kb: 'default' },
                { k: 'institution', ph: 'สถานที่ศึกษา',                    icon: 'business-outline', kb: 'default' },
                { k: 'year',        ph: 'ปี พ.ศ. เช่น 2555',              icon: 'calendar-outline', kb: 'number-pad' },
              ] as const).map(({ k, ph, icon, kb }) => (
                <View key={k} style={s.subInputWrap}>
                  <Ionicons name={icon} size={15} color="#9ca3af" />
                  <TextInput style={s.subInput} placeholder={ph} placeholderTextColor="#9ca3af"
                    value={eduForm[k]} keyboardType={kb as any}
                    onChangeText={v => setEduForm(f => ({ ...f, [k]: v }))} />
                </View>
              ))}
              <View style={s.subBtns}>
                <TouchableOpacity style={s.subCancel} onPress={() => setEduModal(false)}>
                  <Text style={s.subCancelTxt}>ยกเลิก</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.subSave} onPress={saveEdu}>
                  <Ionicons name="checkmark" size={15} color="#fff" />
                  <Text style={s.subSaveTxt}>บันทึก</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ── Expertise sub-modal ── */}
        <Modal visible={expModal} transparent animationType="slide">
          <View style={s.overlay}>
            <View style={s.subModal}>
              <View style={s.subHandle} />
              <Text style={s.subTitle}>{editExpIdx !== null ? 'แก้ไขความเชี่ยวชาญ' : 'เพิ่มความเชี่ยวชาญ'}</Text>
              {([
                { k: 'name_th', ph: 'ความเชี่ยวชาญ (ไทย) *', icon: 'text-outline' },
                { k: 'name_en', ph: 'Expertise (English)',     icon: 'language-outline' },
                { k: 'group',   ph: 'คณุความเชี่ยวชาญ',        icon: 'grid-outline' },
                { k: 'field',   ph: 'สาขาความเชี่ยวชาญ',       icon: 'layers-outline' },
              ] as const).map(({ k, ph, icon }) => (
                <View key={k} style={s.subInputWrap}>
                  <Ionicons name={icon} size={15} color="#9ca3af" />
                  <TextInput style={s.subInput} placeholder={ph} placeholderTextColor="#9ca3af"
                    value={expForm[k]}
                    autoCapitalize={k === 'name_en' ? 'words' : 'none'}
                    onChangeText={v => setExpForm(f => ({ ...f, [k]: v }))} />
                </View>
              ))}
              <View style={s.subBtns}>
                <TouchableOpacity style={s.subCancel} onPress={() => setExpModal(false)}>
                  <Text style={s.subCancelTxt}>ยกเลิก</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.subSave} onPress={saveExp}>
                  <Ionicons name="checkmark" size={15} color="#fff" />
                  <Text style={s.subSaveTxt}>บันทึก</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // ═══════════════════ LIST VIEW ═══════════════════════
  const filtered = search.trim()
    ? researchers.filter(r =>
        r.name?.includes(search) || r.faculty?.includes(search) || r.expertise?.includes(search)
      )
    : researchers;

  return (
    <View style={s.container}>
      <AppHeader />
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#16a34a']} tintColor="#16a34a" />}
      >
        {/* Header */}
        <View style={s.pageHeader}>
          <View>
            <View style={s.titleRow}>
              <Ionicons name="people-outline" size={20} color="#16a34a" />
              <Text style={s.pageTitle}>นักวิจัย</Text>
            </View>
            <Text style={s.pageSub}>ทั้งหมด {researchers.length} คน</Text>
          </View>
          <TouchableOpacity style={s.addBtn} onPress={openAdd}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={s.addBtnTxt}>เพิ่ม</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={s.searchWrap}>
          <Ionicons name="search-outline" size={16} color="#9ca3af" />
          <TextInput style={s.searchInput} placeholder="ค้นหาชื่อ, คณะ, ความเชี่ยวชาญ..."
            placeholderTextColor="#9ca3af" value={search} onChangeText={setSearch} returnKeyType="search" />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color="#9ca3af" />
            </TouchableOpacity>
          ) : null}
        </View>

        {loading ? (
          <ActivityIndicator color="#16a34a" style={{ marginTop: 40 }} />
        ) : filtered.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="people-outline" size={52} color="#d1d5db" />
            <Text style={s.emptyTxt}>{search ? 'ไม่พบนักวิจัยที่ค้นหา' : 'ยังไม่มีนักวิจัย'}</Text>
            {!search && (
              <TouchableOpacity style={s.emptyBtn} onPress={openAdd}>
                <Text style={s.emptyBtnTxt}>+ เพิ่มนักวิจัยคนแรก</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : filtered.map((r, i) => {
          const color   = CARD_COLORS[i % CARD_COLORS.length];
          const eduList = parseRows<EduRow>(r.education);
          const expList = parseRows<ExpRow>(r.expertise_detail);
          const topExp  = expList.slice(0, 3);

          return (
            <View key={r.id} style={s.card}>
              {/* Card top row */}
              <View style={s.cardTop}>
                <View style={[s.avatar, { backgroundColor: color + '20' }]}>
                  <Text style={[s.avatarTxt, { color }]}>{r.name?.charAt(0) || '?'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardName}>{r.name}</Text>
                  {r.position ? <Text style={s.cardPosition}>{r.position}</Text> : null}
                  <View style={s.tagRow}>
                    <View style={s.facultyTag}>
                      <Ionicons name="school-outline" size={10} color="#6b7280" />
                      <Text style={s.tagTxt} numberOfLines={1}>{r.faculty}</Text>
                    </View>
                    {r.work_type ? (
                      <View style={[s.workTypeChip,
                        r.work_type === 'วิชาการ' ? s.workTypeA : s.workTypeB]}>
                        <Text style={[s.workTypeTxt,
                          r.work_type === 'วิชาการ' ? s.workTypeTxtA : s.workTypeTxtB]}>
                          {r.work_type}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
                {canManage(user, r) && (
                  <View style={s.cardActions}>
                    <TouchableOpacity onPress={() => openEdit(r)} style={s.editBtn}>
                      <Ionicons name="pencil" size={13} color="#ca8a04" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(r.id)} style={s.delBtn}>
                      <Ionicons name="trash-outline" size={13} color="#dc2626" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Expertise tags */}
              {(topExp.length > 0 || r.expertise) && (
                <View style={s.expRow}>
                  {topExp.length > 0
                    ? topExp.map((e, ei) => (
                        <View key={ei} style={s.expTag}>
                          <Ionicons name="bulb-outline" size={9} color="#7c3aed" />
                          <Text style={s.expTagTxt}>{e.name_th}</Text>
                        </View>
                      ))
                    : r.expertise ? (
                        <View style={s.expTag}>
                          <Ionicons name="bulb-outline" size={9} color="#7c3aed" />
                          <Text style={s.expTagTxt}>{r.expertise}</Text>
                        </View>
                      ) : null
                  }
                  {expList.length > 3 && (
                    <View style={s.expMore}>
                      <Text style={s.expMoreTxt}>+{expList.length - 3}</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Contact + Education row */}
              <View style={s.contactRow}>
                {r.email ? (
                  <View style={s.contactItem}>
                    <Ionicons name="mail-outline" size={10} color="#9ca3af" />
                    <Text style={s.contactTxt} numberOfLines={1}>{r.email}</Text>
                  </View>
                ) : null}
                {r.phone ? (
                  <View style={s.contactItem}>
                    <Ionicons name="call-outline" size={10} color="#9ca3af" />
                    <Text style={s.contactTxt}>{r.phone}</Text>
                  </View>
                ) : null}
                {eduList.length > 0 && (
                  <View style={s.contactItem}>
                    <Ionicons name="ribbon-outline" size={10} color="#9ca3af" />
                    <Text style={s.contactTxt}>{eduList[eduList.length - 1]?.level}</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ─── StyleSheet ─────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eef7f0' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },

  // ── List ──
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  titleRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  pageTitle:  { fontSize: 20, fontWeight: '800', color: '#111827' },
  pageSub:    { fontSize: 12, color: '#6b7280' },
  addBtn:     { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#16a34a', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, shadowColor: '#2d5a3d', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
  addBtnTxt:  { color: '#fff', fontWeight: '700', fontSize: 13 },

  searchWrap:  { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 12, backgroundColor: '#fff', marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 13, color: '#111827', paddingVertical: 10 },

  empty:      { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTxt:   { fontSize: 14, color: '#9ca3af', fontWeight: '500' },
  emptyBtn:   { marginTop: 4, backgroundColor: '#16a34a', borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10 },
  emptyBtnTxt:{ color: '#fff', fontWeight: '600', fontSize: 13 },

  // Card
  card:       { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardTop:    { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avatar:     { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  avatarTxt:  { fontSize: 22, fontWeight: '700' },
  cardName:   { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 2 },
  cardPosition:{ fontSize: 11, color: '#6b7280', marginBottom: 6 },
  tagRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  facultyTag: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#f3f4f6', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3, maxWidth: 150 },
  tagTxt:     { fontSize: 10, color: '#6b7280' },
  workTypeChip:   { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  workTypeA:  { backgroundColor: '#dcfce7' },
  workTypeB:  { backgroundColor: '#dbeafe' },
  workTypeTxt:{ fontSize: 10, fontWeight: '600' },
  workTypeTxtA:{ color: '#16a34a' },
  workTypeTxtB:{ color: '#2563eb' },
  cardActions:{ gap: 5 },
  editBtn:    { backgroundColor: '#fef9c3', borderRadius: 8, padding: 6 },
  delBtn:     { backgroundColor: '#fee2e2', borderRadius: 8, padding: 6 },

  expRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 10 },
  expTag:    { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f5f3ff', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  expTagTxt: { fontSize: 10, color: '#7c3aed' },
  expMore:   { backgroundColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  expMoreTxt:{ fontSize: 10, color: '#6b7280', fontWeight: '600' },

  contactRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 },
  contactItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  contactTxt:  { fontSize: 10, color: '#9ca3af', maxWidth: 130 },

  // ── Form view ──
  formHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 56 : 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  fhBtn:         { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 4, paddingVertical: 4 },
  fhCancelTxt:   { fontSize: 14, color: '#374151', fontWeight: '500' },
  fhTitle:       { fontSize: 16, fontWeight: '700', color: '#111827' },
  fhSaveBtn:     { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#16a34a', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  fhSaveTxt:     { fontSize: 13, color: '#fff', fontWeight: '700' },

  formScroll:  { flex: 1 },
  formContent: { padding: 16, paddingBottom: 40 },

  sectionHeader:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20, marginBottom: 14 },
  sectionIconWrap:{ backgroundColor: '#dcfce7', borderRadius: 8, padding: 6 },
  sectionTitle:   { fontSize: 12, fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionLine:    { flex: 1, height: 1, backgroundColor: '#e5e7eb' },

  fieldBlock: { marginBottom: 14 },
  row2:       { flexDirection: 'row', gap: 10, marginBottom: 14 },
  col2:       { flex: 1 },
  label:      { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input:      { borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: '#111827', backgroundColor: '#fafafa' },
  inputMulti: { minHeight: 80, paddingTop: 10 },

  chipRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chipRowH: { gap: 6, paddingBottom: 2 },
  chip:      { borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  chipActive:{ backgroundColor: '#16a34a', borderColor: '#16a34a' },
  chipTxt:   { fontSize: 12, color: '#6b7280', fontWeight: '500' },
  chipTxtActive:{ color: '#fff', fontWeight: '700' },

  // Education / Expertise row cards
  rowCard:    { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#fafafa', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 12, marginBottom: 8 },
  rowBadge:   { alignSelf: 'flex-start', backgroundColor: '#ede9fe', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 4 },
  rowBadgeTxt:{ fontSize: 10, color: '#7c3aed', fontWeight: '600' },
  rowCardMain:{ fontSize: 13, fontWeight: '600', color: '#111827', marginBottom: 2 },
  rowCardSub: { fontSize: 11, color: '#6b7280' },
  rowTagRow:  { flexDirection: 'row', gap: 5, marginTop: 5 },
  rowTag:     { backgroundColor: '#f3f4f6', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  rowTagTxt:  { fontSize: 10, color: '#6b7280' },
  rowActions: { gap: 5 },
  rowEditBtn: { backgroundColor: '#fef9c3', borderRadius: 7, padding: 6 },
  rowDelBtn:  { backgroundColor: '#fee2e2', borderRadius: 7, padding: 6 },

  addRowBtn:  { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: '#bbf7d0', borderStyle: 'dashed', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: '#eef7f0', marginBottom: 4 },
  addRowTxt:  { fontSize: 13, color: '#16a34a', fontWeight: '600' },

  // Sub-modals
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  subModal:    { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 10 },
  subHandle:   { width: 36, height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, alignSelf: 'center', marginBottom: 4 },
  subTitle:    { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
  subInputWrap:{ flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 12, backgroundColor: '#fafafa' },
  subInput:    { flex: 1, fontSize: 13, color: '#111827', paddingVertical: 10 },
  subBtns:     { flexDirection: 'row', gap: 10, marginTop: 6 },
  subCancel:   { flex: 1, borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  subCancelTxt:{ fontSize: 13, color: '#6b7280', fontWeight: '600' },
  subSave:     { flex: 2, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, backgroundColor: '#16a34a', borderRadius: 12, paddingVertical: 12 },
  subSaveTxt:  { fontSize: 13, color: '#fff', fontWeight: '700' },
});
