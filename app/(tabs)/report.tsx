import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '@/components/AppHeader';
import { useUser, type UserProfile } from '@/context/UserContext';
import { canDelete, canEdit, mergeOwnedRecords } from '@/services/permissions';
import { api, getApiErrorMessage } from '@/services/api';
import { confirmAction } from '@/services/confirm';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

// report ไม่มี researcher field — ใช้ชื่อโครงการ match กับ project ที่ user เป็นเจ้าของ
// fallback: user เห็นแค่ record ที่เคยสร้างเอง (ถ้า backend ไม่ส่ง owner มา ให้ admin จัดการ)
function canOwnReport(user: UserProfile, record: any): boolean {
  return canEdit(user, record);
}
const STATUSES = ['ร่างรายงาน', 'ส่งแล้ว', 'ผ่านการตรวจ', 'แก้ไข'];
const empty = { project: '', title: '', abstract: '', date: '', status: 'ร่างรายงาน' };

const statusColor = (s: string) => {
  if (s === 'ผ่านการตรวจ') return { bg: '#dcfce7', text: '#16a34a' };
  if (s === 'ส่งแล้ว')     return { bg: '#dbeafe', text: '#2563eb' };
  if (s === 'แก้ไข')       return { bg: '#fee2e2', text: '#dc2626' };
  return { bg: '#f3f4f6', text: '#374151' };
};

export default function ReportScreen() {
  const { user } = useUser();
  const [list, setList]             = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal]           = useState(false);
  const [editId, setEditId]         = useState<number | null>(null);
  const [form, setForm]             = useState(empty);

  useEffect(() => { load(); }, []);
  const load = async () => {
    setLoading(true);
    const [all, mine] = await Promise.all([api.getReports('all'), api.getReports('mine')]);
    const owned = mine.map((r: any) => ({ ...r, is_owner: true }));
    setList(mergeOwnedRecords(all, owned));
    setLoading(false);
  };

  const openAdd  = () => { setForm(empty); setEditId(null); setModal(true); };
  const openEdit = (r: any) => {
    setForm({ project: r.project, title: r.title, abstract: r.abstract, date: r.date, status: r.status });
    setEditId(r.id); setModal(true);
  };
  const save = async () => {
    if (!form.project || !form.title) return Alert.alert('กรุณากรอกชื่อโครงการและชื่อรายงาน');
    try {
      if (editId) {
        await api.updateReport(editId, form);
      } else {
        await api.createReport({ ...form, researcher: user.name });
      }
      setModal(false); load();
    } catch (error) {
      Alert.alert('บันทึกไม่สำเร็จ', getApiErrorMessage(error));
    }
  };
  const del = (id: number) => confirmAction('ยืนยัน', 'ลบรายงานนี้?', async () => {
      try {
        await api.deleteReport(id);
        load();
      } catch (error) {
        Alert.alert('ลบไม่สำเร็จ', getApiErrorMessage(error));
      }
    });

  const f = (k: string, v: string) => setForm(x => ({ ...x, [k]: v }));

  return (
    <View style={s.container}>
      <AppHeader />
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} colors={['#16a34a']} tintColor="#16a34a" />}
      >
        <View style={s.pageHeader}>
          <View>
            <View style={s.titleRow}>
              <Ionicons name="cloud-upload-outline" size={20} color="#16a34a" />
              <Text style={s.pageTitle}>ส่งเล่มรายงาน</Text>
            </View>
            <Text style={s.pageSub}>ทั้งหมด {list.length} รายงาน</Text>
          </View>
          <TouchableOpacity style={s.addBtn} onPress={openAdd}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={s.addTxt}>เพิ่ม</Text>
          </TouchableOpacity>
        </View>

        {loading ? <ActivityIndicator color="#16a34a" style={{ marginTop: 40 }} /> :
          list.length === 0 ? (
            <View style={s.empty}>
              <Ionicons name="cloud-upload-outline" size={52} color="#d1d5db" />
              <Text style={s.emptyTxt}>ยังไม่มีรายงาน</Text>
            </View>
          ) : list.map((r) => {
            const sc = statusColor(r.status);
            return (
              <View key={r.id} style={s.card}>
                <View style={[s.statusBar, { backgroundColor: sc.text }]} />
                <View style={{ flex: 1, paddingLeft: 12 }}>
                  <Text style={s.cardTitle} numberOfLines={2}>{r.title}</Text>
                  <View style={s.metaRow}>
                    <Ionicons name="folder-outline" size={11} color="#9ca3af" />
                    <Text style={s.cardMeta}>{r.project}</Text>
                  </View>
                  {r.date ? (
                    <View style={s.dateRow}>
                      <Ionicons name="calendar-outline" size={11} color="#9ca3af" />
                      <Text style={s.cardMeta}>{r.date}</Text>
                    </View>
                  ) : null}
                  {r.abstract ? <Text style={s.abstract} numberOfLines={2}>{r.abstract}</Text> : null}
                  <View style={[s.badge, { backgroundColor: sc.bg }]}>
                    <Text style={[s.badgeTxt, { color: sc.text }]}>{r.status}</Text>
                  </View>
                </View>
                {(canOwnReport(user, r) || canDelete(user, r)) && (
                  <View style={s.actions}>
                    {canOwnReport(user, r) && <TouchableOpacity onPress={() => openEdit(r)} style={s.editBtn}><Ionicons name="pencil" size={14} color="#ca8a04" /></TouchableOpacity>}
                    {canDelete(user, r) && <TouchableOpacity onPress={() => del(r.id)} style={s.delBtn}><Ionicons name="trash-outline" size={14} color="#dc2626" /></TouchableOpacity>}
                  </View>
                )}
              </View>
            );
          })
        }
      </ScrollView>

      <Modal visible={modal} transparent animationType="slide">
        <View style={s.overlay}>
          <ScrollView contentContainerStyle={s.modalBox} keyboardShouldPersistTaps="handled">
            <View style={s.modalHandle} />
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{editId ? 'แก้ไขรายงาน' : 'เพิ่มรายงาน'}</Text>
              <TouchableOpacity onPress={() => setModal(false)} style={s.closeBtn}><Ionicons name="close" size={20} color="#6b7280" /></TouchableOpacity>
            </View>
            <View style={s.inputWrap}>
              <Ionicons name="folder-outline" size={16} color="#9ca3af" />
              <TextInput style={s.input} placeholder="ชื่อโครงการ *" placeholderTextColor="#9ca3af" value={form.project} onChangeText={v => f('project', v)} />
            </View>
            <View style={s.inputWrap}>
              <Ionicons name="cloud-upload-outline" size={16} color="#9ca3af" />
              <TextInput style={s.input} placeholder="ชื่อรายงาน *" placeholderTextColor="#9ca3af" value={form.title} onChangeText={v => f('title', v)} />
            </View>
            <View style={[s.inputWrap, { alignItems: 'flex-start', paddingVertical: 8 }]}>
              <Ionicons name="document-text-outline" size={16} color="#9ca3af" style={{ marginTop: 2 }} />
              <TextInput style={[s.input, { minHeight: 70, textAlignVertical: 'top' }]} placeholder="บทคัดย่อ" placeholderTextColor="#9ca3af" value={form.abstract} onChangeText={v => f('abstract', v)} multiline />
            </View>
            <View style={s.inputWrap}>
              <Ionicons name="calendar-outline" size={16} color="#9ca3af" />
              <TextInput style={s.input} placeholder="วันที่ส่ง เช่น 2567-03-31" placeholderTextColor="#9ca3af" value={form.date} onChangeText={v => f('date', v)} />
            </View>
            <Text style={s.pickerLabel}>สถานะ</Text>
            <View style={s.chips}>
              {STATUSES.map(t => (
                <TouchableOpacity key={t} style={[s.chip, form.status === t && s.chipActive]} onPress={() => f('status', t)}>
                  <Text style={[s.chipTxt, form.status === t && s.chipTxtActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setModal(false)}><Text style={s.cancelTxt}>ยกเลิก</Text></TouchableOpacity>
              <TouchableOpacity style={s.saveBtn} onPress={save}>
                <Ionicons name="checkmark" size={16} color="#fff" />
                <Text style={s.saveTxt}>บันทึก</Text>
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
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },

  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  pageTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  pageSub: { fontSize: 12, color: '#6b7280' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#16a34a', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, shadowColor: '#2d5a3d', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
  addTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },

  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTxt: { fontSize: 14, color: '#9ca3af', fontWeight: '500' },

  card: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#fff', borderRadius: 16, marginBottom: 10, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, padding: 14 },
  statusBar: { width: 4, borderRadius: 2, alignSelf: 'stretch', position: 'absolute', left: 0, top: 0, bottom: 0 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  cardMeta: { fontSize: 11, color: '#6b7280' },
  abstract: { fontSize: 11, color: '#9ca3af', fontStyle: 'italic', marginBottom: 8, lineHeight: 16 },
  badge: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeTxt: { fontSize: 10, fontWeight: '700' },
  actions: { gap: 6, marginLeft: 8 },
  editBtn: { backgroundColor: '#fef9c3', borderRadius: 8, padding: 7 },
  delBtn: { backgroundColor: '#fee2e2', borderRadius: 8, padding: 7 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 10 },
  modalHandle: { width: 36, height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, alignSelf: 'center', marginBottom: 8 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  closeBtn: { backgroundColor: '#f3f4f6', borderRadius: 8, padding: 6 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 12, backgroundColor: '#fafafa' },
  input: { flex: 1, fontSize: 13, color: '#111827', paddingVertical: 11 },
  pickerLabel: { fontSize: 11, fontWeight: '700', color: '#374151', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  chipActive: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  chipTxt: { fontSize: 11, color: '#6b7280', fontWeight: '500' },
  chipTxtActive: { color: '#fff', fontWeight: '700' },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 6 },
  cancelBtn: { flex: 1, borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  cancelTxt: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  saveBtn: { flex: 2, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, backgroundColor: '#2d5a3d', borderRadius: 12, paddingVertical: 13 },
  saveTxt: { fontSize: 13, color: '#fff', fontWeight: '700' },
});
