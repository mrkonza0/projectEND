import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '@/components/AppHeader';
import { useUser } from '@/context/UserContext';
import { canDelete, filterOwned } from '@/services/permissions';
import { api, getApiErrorMessage } from '@/services/api';
import { confirmAction } from '@/services/confirm';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useEffect, useState } from 'react';
import { Alert, Platform, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type TabType = 'ทั้งหมด' | 'ไฟล์' | 'รายงาน' | 'ข้อเสนอ';
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface Item {
  id: number;
  name: string;
  sub: string;
  date: string;
  status: string;
  kind: 'file' | 'report' | 'proposal';
  source_id: number;
  owner: string;
  owner_user_id?: number | string;
  owner_email?: string;
  is_owner?: boolean;
  uri?: string;
  mime?: string;
  size?: number;
}

const kindStyle = (k: Item['kind']): { bg: string; text: string; icon: IoniconName } => {
  if (k === 'file')     return { bg: '#fef9c3', text: '#ca8a04', icon: 'attach-outline' };
  if (k === 'report')   return { bg: '#dbeafe', text: '#2563eb', icon: 'document-text-outline' };
  return                       { bg: '#ede9fe', text: '#7c3aed', icon: 'clipboard-outline' };
};

const kindLabel: Record<Item['kind'], string> = { file: 'ไฟล์แนบ', report: 'รายงาน', proposal: 'ข้อเสนอ' };

function fmtSize(bytes?: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FilesScreen() {
  const { user } = useUser();
  const [items, setItems]           = useState<Item[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab]               = useState<TabType>('ทั้งหมด');
  const [uploading, setUploading]   = useState(false);

  // Initial load is intentionally tied to mounting; pull-to-refresh handles later updates.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const load = async () => {
    const [allReports, allProposals, allFiles] = await Promise.all([
      api.getReports('mine'), api.getProposals('mine'), api.getFiles(),
    ]);
    const myReports   = filterOwned(user, allReports)   as any[];
    const myProposals = filterOwned(user, allProposals) as any[];
    const myFiles     = filterOwned(user, allFiles) as any[];

    const result: Item[] = [
      ...myFiles.map((f: any) => ({
        id: f.id, name: f.name, sub: f.mime || 'ไฟล์แนบ', date: f.date, status: '',
        kind: 'file' as const, source_id: f.id, owner: f.owner, owner_user_id: f.owner_user_id, owner_email: f.owner_email, is_owner: f.is_owner,
        uri: f.uri, mime: f.mime, size: f.size,
      })),
      ...myReports.map((r: any) => ({
        id: r.id + 10000, name: r.title, sub: r.project, date: r.date || '', status: r.status,
        kind: 'report' as const, source_id: r.id, owner: r.researcher || r.owner_name || '',
        owner_user_id: r.owner_user_id, owner_email: r.owner_email, is_owner: r.is_owner,
      })),
      ...myProposals.map((p: any) => ({
        id: p.id + 20000, name: p.title, sub: p.type, date: p.year || '', status: p.status,
        kind: 'proposal' as const, source_id: p.id, owner: p.researcher || p.owner_name || '',
        owner_user_id: p.owner_user_id, owner_email: p.owner_email, is_owner: p.is_owner,
      })),
    ].sort((a, b) => b.id - a.id);

    setItems(result);
  };

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const pickFile = async () => {
    setUploading(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      let finalUri = asset.uri;

      if (Platform.OS !== 'web') {
        const dest = (FileSystem as any).documentDirectory + asset.name;
        await (FileSystem as any).copyAsync({ from: asset.uri, to: dest });
        finalUri = dest;
      }

      await api.addFile({
        name: asset.name,
        uri: finalUri,
        mime: asset.mimeType || 'application/octet-stream',
        size: asset.size || 0,
        date: new Date().toISOString().slice(0, 10),
        owner: user.name,
      });
      await load();
    } catch (error) {
      Alert.alert('ไม่สามารถเพิ่มไฟล์ได้', getApiErrorMessage(error));
    } finally {
      setUploading(false);
    }
  };

  const shareFile = async (item: Item) => {
    if (!item.uri) return;
    try {
      if (Platform.OS === 'web') {
        Alert.alert('ข้อมูล', `ชื่อไฟล์: ${item.name}`);
        return;
      }
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) await Sharing.shareAsync(item.uri);
    } catch {
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถเปิดไฟล์ได้');
    }
  };

  const delItem = (item: Item) => confirmAction('ยืนยัน', `ลบ "${item.name}"?`, async () => {
      try {
        if (item.kind === 'file')     await api.deleteFile(item.source_id);
        else if (item.kind === 'report')   await api.deleteReport(item.source_id);
        else                          await api.deleteProposal(item.source_id);
        load();
      } catch (error) {
        Alert.alert('ลบไม่สำเร็จ', getApiErrorMessage(error));
      }
    });

  const filtered = tab === 'ทั้งหมด' ? items
    : tab === 'ไฟล์'     ? items.filter(i => i.kind === 'file')
    : tab === 'รายงาน'   ? items.filter(i => i.kind === 'report')
    : items.filter(i => i.kind === 'proposal');

  const fileCount = items.filter(i => i.kind === 'file').length;

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
              <Ionicons name="albums-outline" size={20} color="#16a34a" />
              <Text style={s.pageTitle}>จัดการไฟล์</Text>
            </View>
            <Text style={s.pageSub}>เอกสารทั้งหมด {items.length} รายการ · ไฟล์แนบ {fileCount} ไฟล์</Text>
          </View>
          <TouchableOpacity style={s.addBtn} onPress={pickFile} disabled={uploading}>
            <Ionicons name={uploading ? 'hourglass-outline' : 'cloud-upload-outline'} size={16} color="#fff" />
            <Text style={s.addTxt}>{uploading ? 'กำลังเพิ่ม...' : 'อัปโหลด'}</Text>
          </TouchableOpacity>
        </View>

        <View style={s.tabRow}>
          {(['ทั้งหมด', 'ไฟล์', 'รายงาน', 'ข้อเสนอ'] as TabType[]).map(t => (
            <TouchableOpacity key={t} style={[s.tabBtn, tab === t && s.tabActive]} onPress={() => setTab(t)}>
              <Text style={[s.tabTxt, tab === t && s.tabTxtActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {filtered.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="albums-outline" size={52} color="#d1d5db" />
            <Text style={s.emptyTxt}>ยังไม่มีเอกสาร</Text>
            {tab === 'ทั้งหมด' || tab === 'ไฟล์' ? (
              <TouchableOpacity style={s.emptyBtn} onPress={pickFile}>
                <Ionicons name="cloud-upload-outline" size={14} color="#fff" />
                <Text style={s.emptyBtnTxt}>อัปโหลดไฟล์แรก</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : filtered.map((item) => {
          const ts = kindStyle(item.kind);
          const canDel = canDelete(user, item);
          return (
            <View key={item.id} style={s.card}>
              <TouchableOpacity
                style={[s.iconWrap, { backgroundColor: ts.bg }]}
                onPress={() => item.kind === 'file' ? shareFile(item) : null}
                activeOpacity={item.kind === 'file' ? 0.7 : 1}
              >
                <Ionicons name={ts.icon} size={22} color={ts.text} />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={s.fileName} numberOfLines={2}>{item.name}</Text>
                <View style={s.metaRow}>
                  <Ionicons name="layers-outline" size={11} color="#9ca3af" />
                  <Text style={s.fileSub}>{item.sub}</Text>
                  {item.size ? <Text style={s.sizeTag}>{fmtSize(item.size)}</Text> : null}
                </View>
                {item.date ? (
                  <View style={s.metaRow}>
                    <Ionicons name="calendar-outline" size={11} color="#9ca3af" />
                    <Text style={s.fileSub}>{item.date}</Text>
                  </View>
                ) : null}
                <View style={s.cardFooter}>
                  <View style={[s.kindBadge, { backgroundColor: ts.bg }]}>
                    <Text style={[s.kindTxt, { color: ts.text }]}>{kindLabel[item.kind]}</Text>
                  </View>
                  {item.status ? <Text style={s.statusTxt}>{item.status}</Text> : null}
                  {item.kind === 'file' && (
                    <TouchableOpacity style={s.shareBtn} onPress={() => shareFile(item)}>
                      <Ionicons name="share-outline" size={13} color="#2563eb" />
                      <Text style={s.shareTxt}>เปิด</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              {canDel && (
                <TouchableOpacity onPress={() => delItem(item)} style={s.delBtn}>
                  <Ionicons name="trash-outline" size={15} color="#dc2626" />
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>
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

  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  tabBtn: { borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: '#fff' },
  tabActive: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  tabTxt: { fontSize: 12, color: '#6b7280', fontWeight: '500' },
  tabTxtActive: { color: '#fff', fontWeight: '700' },

  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTxt: { fontSize: 14, color: '#9ca3af', fontWeight: '500' },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#16a34a', borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10 },
  emptyBtnTxt: { color: '#fff', fontWeight: '600', fontSize: 13 },

  card: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  iconWrap: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  fileName: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 5 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 },
  fileSub: { fontSize: 11, color: '#6b7280' },
  sizeTag: { fontSize: 10, color: '#9ca3af', backgroundColor: '#f3f4f6', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5, flexWrap: 'wrap' },
  kindBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  kindTxt: { fontSize: 10, fontWeight: '700' },
  statusTxt: { fontSize: 10, color: '#9ca3af', fontWeight: '500' },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#dbeafe', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  shareTxt: { fontSize: 10, color: '#2563eb', fontWeight: '600' },
  delBtn: { backgroundColor: '#fee2e2', borderRadius: 8, padding: 8, alignSelf: 'flex-start' },
});
