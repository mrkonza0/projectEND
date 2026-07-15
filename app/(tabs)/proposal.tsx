import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '@/components/AppHeader';
import { useUser } from '@/context/UserContext';
import { canDelete, canManage, canViewBudget, isAdmin, isOwner, mergeOwnedRecords } from '@/services/permissions';
import { api, getApiErrorMessage } from '@/services/api';
import { confirmAction } from '@/services/confirm';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const TYPES   = ['ทุนภายใน', 'ทุนภายนอก', 'ทุนต่างประเทศ'];
const STATUSES = ['รอพิจารณา', 'อนุมัติ', 'ปฏิเสธ'];
const empty   = { title: '', researcher: '', type: 'ทุนภายใน', budget: '', year: '', status: 'รอพิจารณา' };

const statusColor = (s: string) => {
  if (s === 'อนุมัติ')    return { bg: '#dcfce7', text: '#16a34a' };
  if (s === 'รอพิจารณา') return { bg: '#fef9c3', text: '#ca8a04' };
  return { bg: '#fee2e2', text: '#dc2626' };
};

export default function ProposalScreen() {
  const { user } = useUser();
  const [list, setList]           = useState<any[]>([]);
  const [ownedList, setOwnedList] = useState<any[]>([]);
  const [search, setSearch]       = useState('');
  const [viewMode, setViewMode]   = useState<'mine' | 'all'>('all');
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal]         = useState(false);
  const [editId, setEditId]       = useState<number | null>(null);
  const [form, setForm]           = useState(empty);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const [all, mine] = await Promise.all([api.getProposals('all'), api.getProposals('mine')]);
    const owned = mine.map((p: any) => ({ ...p, is_owner: true }));
    setList(mergeOwnedRecords(all, owned));
    setOwnedList(owned);
    setLoading(false);
  };

  const openAdd  = () => { setForm({ ...empty, researcher: user.name }); setEditId(null); setModal(true); };
  const openEdit = (p: any) => {
    setForm({ title: p.title, researcher: p.researcher, type: p.type, budget: p.budget, year: p.year, status: p.status });
    setEditId(p.id); setModal(true);
  };
  const save = async () => {
    if (!form.title || !form.researcher) return Alert.alert('กรุณากรอกข้อมูลให้ครบ');
    try {
      if (editId) await api.updateProposal(editId, form);
      else await api.createProposal(form);
      setModal(false);
      setViewMode('all');
      load();
    } catch (error) {
      Alert.alert('บันทึกไม่สำเร็จ', getApiErrorMessage(error));
    }
  };
  const del = (id: number) => confirmAction('ยืนยัน', 'ลบข้อเสนอโครงการนี้?', async () => {
      try {
        await api.deleteProposal(id);
        load();
      } catch (error) {
        Alert.alert('ลบไม่สำเร็จ', getApiErrorMessage(error));
      }
    });

  const f = (k: string, v: string) => setForm(x => ({ ...x, [k]: v }));
  const myProposals = ownedList.length > 0 ? ownedList : list.filter(p => isOwner(user, p));
  const myBudget = myProposals.reduce((sum, p) => sum + Number(p.budget || 0), 0);

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
              <Ionicons name="document-text-outline" size={20} color="#16a34a" />
              <Text style={s.pageTitle}>ข้อเสนอโครงการ</Text>
            </View>
            <Text style={s.pageSub}>ทั้งหมด {list.length} รายการ</Text>
          </View>
          <TouchableOpacity style={s.addBtn} onPress={openAdd}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={s.addTxt}>เพิ่ม</Text>
          </TouchableOpacity>
        </View>

        <View style={s.summaryCard}>
          <View style={s.summaryIcon}><Ionicons name="document-text-outline" size={22} color="#fff" /></View>
          <View style={s.summaryBody}>
            <Text style={s.summaryLabel}>วงเงินข้อเสนอของฉัน</Text>
            <Text style={s.summaryAmount}>฿{myBudget.toLocaleString()}</Text>
            <Text style={s.summaryHint}>{myProposals.length} ข้อเสนอของคุณ</Text>
          </View>
        </View>

        <View style={s.segment}>
          <TouchableOpacity style={[s.segmentBtn, viewMode === 'mine' && s.segmentBtnActive]} onPress={() => setViewMode('mine')}>
            <Text style={[s.segmentTxt, viewMode === 'mine' && s.segmentTxtActive]}>ของฉัน</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.segmentBtn, viewMode === 'all' && s.segmentBtnActive]} onPress={() => setViewMode('all')}>
            <Text style={[s.segmentTxt, viewMode === 'all' && s.segmentTxtActive]}>ค้นหาทั้งหมด</Text>
          </TouchableOpacity>
        </View>

        <View style={s.searchWrap}>
          <Ionicons name="search-outline" size={16} color="#9ca3af" />
          <TextInput style={s.searchInput} placeholder="ค้นหาข้อเสนอ, ผู้วิจัย..." placeholderTextColor="#9ca3af" value={search} onChangeText={setSearch} returnKeyType="search" />
          {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={16} color="#9ca3af" /></TouchableOpacity> : null}
        </View>

        {loading ? <ActivityIndicator color="#16a34a" style={{ marginTop: 40 }} /> :
          (() => {
            const scoped = viewMode === 'mine' ? myProposals : list;
            const filtered = search.trim()
              ? scoped.filter(p => p.title?.includes(search) || p.researcher?.includes(search) || p.type?.includes(search) || p.status?.includes(search))
              : scoped;
            return filtered.length === 0 ? (
              <View style={s.empty}>
                <Ionicons name="document-text-outline" size={52} color="#d1d5db" />
                <Text style={s.emptyTxt}>{search ? 'ไม่พบข้อเสนอที่ค้นหา' : 'ยังไม่มีข้อเสนอโครงการ'}</Text>
              </View>
            ) : filtered.map((p) => {
            const sc = statusColor(p.status);
            return (
              <View key={p.id} style={s.card}>
                <View style={[s.statusBar, { backgroundColor: sc.text }]} />
                <View style={{ flex: 1, paddingLeft: 12 }}>
                  <Text style={s.cardTitle} numberOfLines={2}>{p.title}</Text>
                  <View style={s.metaRow}>
                    <Ionicons name="person-outline" size={11} color="#9ca3af" />
                    <Text style={s.cardMeta}>{p.researcher}</Text>
                    <Text style={s.dot}>·</Text>
                    <Text style={s.cardMeta}>{p.type}</Text>
                    {p.year ? <><Text style={s.dot}>·</Text><Text style={s.cardMeta}>ปี {p.year}</Text></> : null}
                  </View>
                  <View style={s.cardFooter}>
                    <View style={[s.badge, { backgroundColor: sc.bg }]}>
                      <Text style={[s.badgeTxt, { color: sc.text }]}>{p.status}</Text>
                    </View>
                    <Text style={s.budgetTxt}>{canViewBudget(user, p) ? `฿${Number(p.budget || 0).toLocaleString()}` : ''}</Text>
                  </View>
                </View>
                {(canManage(user, p) || canDelete(user, p)) && (
                  <View style={s.actions}>
                    {canManage(user, p) && <TouchableOpacity onPress={() => openEdit(p)} style={s.editBtn}><Ionicons name="pencil" size={14} color="#ca8a04" /></TouchableOpacity>}
                    {canDelete(user, p) && <TouchableOpacity onPress={() => del(p.id)} style={s.delBtn}><Ionicons name="trash-outline" size={14} color="#dc2626" /></TouchableOpacity>}
                  </View>
                )}
              </View>
            );
            });
          })()
        }
      </ScrollView>

      <Modal visible={modal} transparent animationType="slide">
        <View style={s.overlay}>
          <ScrollView contentContainerStyle={s.modalBox} keyboardShouldPersistTaps="handled">
            <View style={s.modalHandle} />
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{editId ? 'แก้ไขข้อเสนอ' : 'เพิ่มข้อเสนอโครงการ'}</Text>
              <TouchableOpacity onPress={() => setModal(false)} style={s.closeBtn}><Ionicons name="close" size={20} color="#6b7280" /></TouchableOpacity>
            </View>
            {([
              { k: 'title',      ph: 'ชื่อโครงการ *',    icon: 'folder-outline',   num: false },
              { k: 'researcher', ph: 'ผู้วิจัย *',       icon: 'person-outline',   num: false },
              { k: 'budget',     ph: 'งบประมาณ (บาท)',   icon: 'cash-outline',     num: true  },
              { k: 'year',       ph: 'ปี พ.ศ.',          icon: 'calendar-outline', num: true  },
            ] as const).map(({ k, ph, icon, num }) => (
              <View key={k} style={s.inputWrap}>
                <Ionicons name={icon} size={16} color="#9ca3af" />
                <TextInput style={s.input} placeholder={ph} placeholderTextColor="#9ca3af" value={(form as any)[k]} onChangeText={v => f(k, v)} keyboardType={num ? 'numeric' : 'default'} editable={isAdmin(user) || k !== 'researcher'} />
              </View>
            ))}
            <Text style={s.pickerLabel}>ประเภททุน</Text>
            <View style={s.chips}>{TYPES.map(t => <TouchableOpacity key={t} style={[s.chip, form.type===t&&s.chipActive]} onPress={() => f('type',t)}><Text style={[s.chipTxt, form.type===t&&s.chipTxtActive]}>{t}</Text></TouchableOpacity>)}</View>
            <Text style={s.pickerLabel}>สถานะ</Text>
            <View style={s.chips}>{STATUSES.map(t => (
              <TouchableOpacity
                key={t}
                style={[s.chip, form.status===t&&s.chipActive, !isAdmin(user) && t !== 'รอพิจารณา' && { opacity: 0.35 }]}
                onPress={() => { if (isAdmin(user) || t === 'รอพิจารณา') f('status', t); }}
              >
                <Text style={[s.chipTxt, form.status===t&&s.chipTxtActive]}>{t}</Text>
              </TouchableOpacity>
            ))}</View>
            {!isAdmin(user) && <Text style={s.adminHint}>เฉพาะ Admin เท่านั้นที่เปลี่ยนสถานะเป็น อนุมัติ/ปฏิเสธ</Text>}
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
  main: { flex: 1 },

  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  pageTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  pageSub: { fontSize: 12, color: '#6b7280' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#16a34a', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, shadowColor: '#2d5a3d', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
  addTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },
  summaryCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#173f2a', borderRadius: 20, padding: 18, marginBottom: 12, shadowColor: '#173f2a', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 5 },
  summaryIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2f6f49', marginRight: 14 },
  summaryBody: { flex: 1 },
  summaryLabel: { color: '#cfe8d8', fontSize: 11, fontWeight: '600' },
  summaryAmount: { color: '#fff', fontSize: 24, fontWeight: '800', marginVertical: 2 },
  summaryHint: { color: '#9fc5ad', fontSize: 10 },
  segment: { flexDirection: 'row', backgroundColor: '#e2ebe5', padding: 4, borderRadius: 13, marginBottom: 12 },
  segmentBtn: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 10 },
  segmentBtnActive: { backgroundColor: '#2d5a3d' },
  segmentTxt: { fontSize: 12, color: '#64748b', fontWeight: '700' },
  segmentTxtActive: { color: '#fff' },

  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 12, backgroundColor: '#fff', marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 13, color: '#111827', paddingVertical: 10 },

  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTxt: { fontSize: 14, color: '#9ca3af', fontWeight: '500' },

  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, marginBottom: 10, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, padding: 14 },
  statusBar: { width: 4, borderRadius: 2, alignSelf: 'stretch', position: 'absolute', left: 0, top: 0, bottom: 0 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginBottom: 8 },
  cardMeta: { fontSize: 11, color: '#6b7280' },
  dot: { fontSize: 11, color: '#d1d5db' },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeTxt: { fontSize: 10, fontWeight: '700' },
  budgetTxt: { fontSize: 11, fontWeight: '700', color: '#374151' },
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
  adminHint: { fontSize: 10, color: '#9ca3af', fontStyle: 'italic', marginTop: 4 },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 6 },
  cancelBtn: { flex: 1, borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  cancelTxt: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  saveBtn: { flex: 2, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, backgroundColor: '#2d5a3d', borderRadius: 12, paddingVertical: 13 },
  saveTxt: { fontSize: 13, color: '#fff', fontWeight: '700' },
});
