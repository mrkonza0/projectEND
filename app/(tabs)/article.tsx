import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '@/components/AppHeader';
import { useUser } from '@/context/UserContext';
import { canDelete, canManage, mergeOwnedRecords } from '@/services/permissions';
import { api, getApiErrorMessage } from '@/services/api';
import { confirmAction } from '@/services/confirm';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const STATUS_LIST = ['ตีพิมพ์แล้ว', 'รอตีพิมพ์', 'อยู่ระหว่างรีวิว', 'ถูกปฏิเสธ'];
const emptyForm = { title: '', author: '', journal_type_id: '1', journal: '', year: '', status: 'ตีพิมพ์แล้ว', cited: '0' };

const statusColor = (s: string) => {
  if (s === 'ตีพิมพ์แล้ว')       return { bg: '#dcfce7', text: '#16a34a' };
  if (s === 'รอตีพิมพ์')          return { bg: '#fef9c3', text: '#ca8a04' };
  if (s === 'อยู่ระหว่างรีวิว')  return { bg: '#dbeafe', text: '#2563eb' };
  return { bg: '#fee2e2', text: '#dc2626' };
};

export default function ArticleScreen() {
  const { user } = useUser();
  const [articles, setArticles]     = useState<any[]>([]);
  const [search, setSearch]         = useState('');
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId]   = useState<number | null>(null);
  const [form, setForm]             = useState(emptyForm);
  const [journalTypes, setJournalTypes] = useState<any[]>([]);

  useEffect(() => {
    loadArticles();
    api.getJournalTypes().then(setJournalTypes).catch(() => setJournalTypes([]));
  }, []);

  const loadArticles = async () => {
    setLoading(true);
    try {
      const [all, mine] = await Promise.all([api.getArticles('all'), api.getArticles('mine')]);
      const owned = mine.map((a: any) => ({ ...a, is_owner: true }));
      setArticles(mergeOwnedRecords(all, owned));
    }
    catch { Alert.alert('Error', 'ไม่สามารถโหลดข้อมูลได้'); }
    finally { setLoading(false); }
  };

  const onRefresh = async () => { setRefreshing(true); await loadArticles(); setRefreshing(false); };

  const openAdd  = () => { setForm({ ...emptyForm, author: user.name, journal_type_id: String(journalTypes[0]?.id || 1) }); setEditingId(null); setModalVisible(true); };
  const openEdit = (a: any) => {
    setForm({ title: a.title, author: a.author, journal_type_id: String(a.journal_type_id || 1), journal: a.journal, year: String(a.year), status: a.status, cited: String(a.cited ?? 0) });
    setEditingId(a.id); setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.author) return Alert.alert('กรุณากรอกข้อมูลให้ครบ');
    const payload = { ...form, cited: Number(form.cited) };
    try {
      if (editingId) await api.updateArticle(editingId, payload);
      else await api.createArticle(payload);
      setModalVisible(false); loadArticles();
    } catch (error) { Alert.alert('บันทึกไม่สำเร็จ', getApiErrorMessage(error)); }
  };

  const handleDelete = (id: number) => confirmAction('ยืนยันการลบ', 'ต้องการลบบทความนี้?', async () => {
      try {
        await api.deleteArticle(id);
        loadArticles();
      } catch (error) {
        Alert.alert('ลบไม่สำเร็จ', getApiErrorMessage(error));
      }
    });

  return (
    <View style={s.container}>
      <AppHeader />
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#16a34a']} tintColor="#16a34a" />}
      >
        <View style={s.pageHeader}>
          <View>
            <View style={s.titleRow}>
              <Ionicons name="newspaper-outline" size={20} color="#16a34a" />
              <Text style={s.pageTitle}>บทความวิจัย</Text>
            </View>
            <Text style={s.pageSub}>ทั้งหมด {articles.length} บทความ</Text>
          </View>
          <TouchableOpacity style={s.addBtn} onPress={openAdd}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={s.addTxt}>เพิ่ม</Text>
          </TouchableOpacity>
        </View>

        <View style={s.searchWrap}>
          <Ionicons name="search-outline" size={16} color="#9ca3af" />
          <TextInput style={s.searchInput} placeholder="ค้นหาบทความ, ผู้แต่ง..." placeholderTextColor="#9ca3af" value={search} onChangeText={setSearch} returnKeyType="search" />
          {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={16} color="#9ca3af" /></TouchableOpacity> : null}
        </View>

        {loading ? <ActivityIndicator color="#16a34a" style={{ marginTop: 40 }} /> :
          (() => {
            const filtered = search.trim()
              ? articles.filter(a => a.title?.includes(search) || a.author?.includes(search) || a.journal?.includes(search))
              : articles;
            return filtered.length === 0 ? (
              <View style={s.empty}>
                <Ionicons name="newspaper-outline" size={52} color="#d1d5db" />
                <Text style={s.emptyTxt}>{search ? 'ไม่พบบทความที่ค้นหา' : 'ยังไม่มีบทความวิจัย'}</Text>
              </View>
            ) : filtered.map((a) => {
            const sc = statusColor(a.status);
            return (
              <View key={a.id} style={s.card}>
                <View style={[s.statusBar, { backgroundColor: sc.text }]} />
                <View style={{ flex: 1, paddingLeft: 12 }}>
                  <Text style={s.cardTitle} numberOfLines={2}>{a.title}</Text>
                  <View style={s.metaRow}>
                    <Ionicons name="person-outline" size={11} color="#9ca3af" />
                    <Text style={s.cardMeta}>{a.author}</Text>
                    {a.year ? <><Text style={s.dot}>·</Text><Text style={s.cardMeta}>ปี {a.year}</Text></> : null}
                  </View>
                  {a.journal ? (
                    <View style={s.journalRow}>
                      <Ionicons name="library-outline" size={11} color="#9ca3af" />
                      <Text style={s.journalTxt} numberOfLines={1}>{a.journal}</Text>
                    </View>
                  ) : null}
                  <View style={s.cardFooter}>
                    <View style={[s.badge, { backgroundColor: sc.bg }]}>
                      <Text style={[s.badgeTxt, { color: sc.text }]}>{a.status}</Text>
                    </View>
                    <View style={s.citedBadge}>
                      <Ionicons name="bookmark-outline" size={10} color="#374151" />
                      <Text style={s.citedTxt}>{a.cited ?? 0} อ้างอิง</Text>
                    </View>
                  </View>
                </View>
                {(canManage(user, a) || canDelete(user, a)) && (
                  <View style={s.actions}>
                    {canManage(user, a) && <TouchableOpacity onPress={() => openEdit(a)} style={s.editBtn}><Ionicons name="pencil" size={14} color="#ca8a04" /></TouchableOpacity>}
                    {canDelete(user, a) && <TouchableOpacity onPress={() => handleDelete(a.id)} style={s.delBtn}><Ionicons name="trash-outline" size={14} color="#dc2626" /></TouchableOpacity>}
                  </View>
                )}
              </View>
            );
            });
          })()
        }
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={s.overlay}>
          <ScrollView contentContainerStyle={s.modalBox} keyboardShouldPersistTaps="handled">
            <View style={s.modalHandle} />
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{editingId ? 'แก้ไขบทความ' : 'เพิ่มบทความวิจัย'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={s.closeBtn}><Ionicons name="close" size={20} color="#6b7280" /></TouchableOpacity>
            </View>
            {([
              { k: 'title',   ph: 'ชื่อบทความ *',        icon: 'newspaper-outline', num: false },
              { k: 'author',  ph: 'ผู้แต่ง *',            icon: 'person-outline',    num: false },
              { k: 'journal', ph: 'วารสาร',               icon: 'library-outline',   num: false },
              { k: 'year',    ph: 'ปีที่ตีพิมพ์',         icon: 'calendar-outline',  num: true  },
              { k: 'cited',   ph: 'จำนวนอ้างอิง',         icon: 'bookmark-outline',  num: true  },
            ] as const).map(({ k, ph, icon, num }) => (
              <View key={k} style={s.inputWrap}>
                <Ionicons name={icon} size={16} color="#9ca3af" />
                <TextInput style={s.input} placeholder={ph} placeholderTextColor="#9ca3af" value={(form as any)[k]} onChangeText={v => setForm(f => ({ ...f, [k]: v }))} keyboardType={num ? 'numeric' : 'default'} />
              </View>
            ))}
            <Text style={s.pickerLabel}>ประเภทวารสาร *</Text>
            <View style={s.chips}>
              {(journalTypes.length ? journalTypes : [{ id: 1, name: 'ประเภททั่วไป' }]).map(t => (
                <TouchableOpacity key={String(t.id)} style={[s.chip, form.journal_type_id === String(t.id) && s.chipActive]} onPress={() => setForm(f => ({ ...f, journal_type_id: String(t.id) }))}>
                  <Text style={[s.chipTxt, form.journal_type_id === String(t.id) && s.chipTxtActive]}>{t.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={s.pickerLabel}>สถานะ</Text>
            <View style={s.chips}>
              {STATUS_LIST.map(t => (
                <TouchableOpacity key={t} style={[s.chip, form.status === t && s.chipActive]} onPress={() => setForm(f => ({ ...f, status: t }))}>
                  <Text style={[s.chipTxt, form.status === t && s.chipTxtActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setModalVisible(false)}><Text style={s.cancelTxt}>ยกเลิก</Text></TouchableOpacity>
              <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
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

  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 12, backgroundColor: '#fff', marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 13, color: '#111827', paddingVertical: 10 },

  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTxt: { fontSize: 14, color: '#9ca3af', fontWeight: '500' },

  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, marginBottom: 10, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, padding: 14 },
  statusBar: { width: 4, borderRadius: 2, alignSelf: 'stretch', position: 'absolute', left: 0, top: 0, bottom: 0 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  cardMeta: { fontSize: 11, color: '#6b7280' },
  dot: { fontSize: 11, color: '#d1d5db' },
  journalRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  journalTxt: { fontSize: 11, color: '#6b7280', flex: 1 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeTxt: { fontSize: 10, fontWeight: '700' },
  citedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#f3f4f6', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  citedTxt: { fontSize: 10, fontWeight: '600', color: '#374151' },
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
