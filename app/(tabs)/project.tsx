import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '@/components/AppHeader';
import { useUser } from '@/context/UserContext';
import { canManage, canViewBudget, isAdmin, isOwner, mergeOwnedRecords } from '@/services/permissions';
import { api, getApiErrorMessage } from '@/services/api';
import { confirmAction } from '@/services/confirm';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as XLSX from 'xlsx';

const STATUS_LIST = ['กำลังดำเนินการ', 'อนุมัติแล้ว', 'เสร็จสิ้น', 'ยกเลิก'];
const emptyForm = { title: '', researcher: '', research_type_id: '1', budget: '', year: '', status: 'กำลังดำเนินการ' };

const statusColor = (s: string) => {
  if (s === 'เสร็จสิ้น')       return { bg: '#dcfce7', text: '#16a34a' };
  if (s === 'กำลังดำเนินการ') return { bg: '#dbeafe', text: '#2563eb' };
  if (s === 'อนุมัติแล้ว')    return { bg: '#fef9c3', text: '#ca8a04' };
  return { bg: '#fee2e2', text: '#dc2626' };
};

export default function ProjectScreen() {
  const { user } = useUser();
  const [projects, setProjects]     = useState<any[]>([]);
  const [ownedProjects, setOwnedProjects] = useState<any[]>([]);
  const [search, setSearch]         = useState('');
  const [viewMode, setViewMode]     = useState<'mine' | 'all'>('all');
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId]   = useState<number | null>(null);
  const [form, setForm]             = useState(emptyForm);
  const [researchTypes, setResearchTypes] = useState<any[]>([]);

  useEffect(() => {
    loadProjects();
    api.getResearchTypes().then(setResearchTypes).catch(() => setResearchTypes([]));
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const [all, mine] = await Promise.all([api.getProjects('all'), api.getProjects('mine')]);
      const owned = mine.map((p: any) => ({ ...p, is_owner: true }));
      setProjects(mergeOwnedRecords(all, owned));
      setOwnedProjects(owned);
    }
    catch { Alert.alert('Error', 'ไม่สามารถโหลดข้อมูลได้'); }
    finally { setLoading(false); }
  };

  const onRefresh = async () => { setRefreshing(true); await loadProjects(); setRefreshing(false); };

  const openAdd  = () => {
    setForm({ ...emptyForm, researcher: user.name, research_type_id: String(researchTypes[0]?.id || 1) });
    setEditingId(null); setModalVisible(true);
  };
  const openEdit = (p: any) => {
    setForm({ title: p.title, researcher: p.researcher, research_type_id: String(p.research_type_id || 1), budget: String(p.budget), year: String(p.year), status: p.status });
    setEditingId(p.id); setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.researcher || !form.research_type_id) return Alert.alert('กรุณากรอกข้อมูลให้ครบ');
    try {
      if (editingId) await api.updateProject(editingId, form);
      else await api.createProject(form);
      setModalVisible(false);
      setViewMode('all');
      loadProjects();
    } catch (error) { Alert.alert('บันทึกไม่สำเร็จ', getApiErrorMessage(error)); }
  };

  const handleDelete = (id: number) => confirmAction('ยืนยันการลบ', 'ต้องการลบโครงการนี้?', async () => {
      try {
        await api.deleteProject(id);
        loadProjects();
      } catch (error) {
        Alert.alert('ลบไม่สำเร็จ', getApiErrorMessage(error));
      }
    });

  const exportExcel = async () => {
    const data = projects.map(p => ({ 'ลำดับ': p.id, 'ชื่อโครงการ': p.title, 'นักวิจัย': p.researcher, 'งบประมาณ': canViewBudget(user, p) ? p.budget : '', 'ปี': p.year, 'สถานะ': p.status }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'โครงการวิจัย');
    if (Platform.OS === 'web') {
      const blob = new Blob([XLSX.write(wb, { type: 'array', bookType: 'xlsx' })]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'projects.xlsx'; a.click();
    } else {
      const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const FS = FileSystem as any;
      const path = FS.documentDirectory + 'projects.xlsx';
      await FS.writeAsStringAsync(path, base64, { encoding: 'base64' });
      await Sharing.shareAsync(path);
    }
  };

  const exportPDF = async () => {
    const now = new Date();
    const printDate = now.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
    const thYear = now.getFullYear() + 543;
    const docNo  = `วจ.${thYear}-${String(now.getMonth() + 1).padStart(2,'0')}-${String(projects.length).padStart(3,'0')}`;
    const totalBudget = projects.reduce((sum, p) => sum + (canViewBudget(user, p) ? Number(p.budget || 0) : 0), 0);

    const rows = projects.map((p, i) => `
      <tr>
        <td class="center">${i + 1}</td>
        <td>${p.title || '-'}</td>
        <td class="center">${p.researcher || '-'}</td>
        <td class="center">${p.year || '-'}</td>
        <td class="right">${canViewBudget(user, p) ? `฿${Number(p.budget || 0).toLocaleString()}` : ''}</td>
        <td class="center">${p.status || '-'}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="utf-8"/>
<title>รายงานสรุปโครงการวิจัย</title>
<style>
  @page { size: A4; margin: 20mm 18mm; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family: 'TH Sarabun New', 'Sarabun', 'Tahoma', sans-serif;
    font-size: 14px;
    color: #000;
    background: #fff;
    max-width: 760px;
    margin: 0 auto;
    padding: 28px 32px;
  }

  /* ═══ LETTERHEAD ═══════════════════════════════════ */
  .letterhead {
    display: flex;
    align-items: center;
    gap: 20px;
    padding-bottom: 14px;
    border-bottom: 3px double #1a1a1a;
    margin-bottom: 6px;
  }
  .logo-placeholder {
    width: 90px;
    height: 90px;
    border: 1.5px solid #999;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: #888;
    font-size: 9.5px;
    text-align: center;
    line-height: 1.5;
    background: #fafafa;
  }
  .logo-placeholder span { font-size: 24px; display:block; margin-bottom:4px; }
  .univ-block { flex: 1; text-align: center; }
  .univ-th  { font-size: 19px; font-weight: 700; letter-spacing: 0.5px; }
  .univ-en  { font-size: 12px; color: #444; margin-top: 2px; }
  .dept     { font-size: 13px; margin-top: 5px; color: #222; }
  .doc-meta { text-align: right; font-size: 11.5px; color: #333; line-height: 1.8; flex-shrink:0; }

  /* ═══ DOCUMENT TITLE BAND ═══════════════════════════ */
  .title-band {
    text-align: center;
    margin: 14px 0 16px;
    padding: 10px 0;
    border-top: 1px solid #000;
    border-bottom: 1px solid #000;
  }
  .title-band h1 { font-size: 17px; font-weight: 700; letter-spacing: 1px; }
  .title-band p  { font-size: 12px; color: #444; margin-top: 3px; }

  /* ═══ SUMMARY ROW ════════════════════════════════════ */
  .summary-strip {
    display: flex;
    border: 1px solid #bbb;
    margin-bottom: 18px;
    font-size: 12px;
  }
  .sum-cell {
    flex: 1;
    padding: 7px 12px;
    border-right: 1px solid #bbb;
  }
  .sum-cell:last-child { border-right: none; }
  .sum-label { color: #555; font-size: 10.5px; margin-bottom: 1px; }
  .sum-value { font-weight: 700; font-size: 15px; }

  /* ═══ TABLE ══════════════════════════════════════════ */
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12.5px;
    margin-bottom: 22px;
  }
  thead th {
    background: #1a1a1a;
    color: #fff;
    padding: 8px 10px;
    font-weight: 600;
    font-size: 12px;
    border: 1px solid #1a1a1a;
    letter-spacing: 0.3px;
  }
  td {
    padding: 7px 10px;
    border: 1px solid #ccc;
    vertical-align: middle;
    line-height: 1.5;
  }
  tbody tr:nth-child(even) td { background: #f7f7f7; }
  tbody tr:last-child td { border-bottom: 1px solid #ccc; }
  .center { text-align: center; }
  .right  { text-align: right; }
  .tfoot-row td {
    background: #ebebeb !important;
    font-weight: 700;
    border-top: 2px solid #1a1a1a;
  }

  /* ═══ REMARK BOX ═════════════════════════════════════ */
  .remark-box {
    border: 1px solid #bbb;
    padding: 10px 14px;
    margin-bottom: 28px;
    font-size: 12px;
  }
  .remark-box .label { font-weight: 700; margin-bottom: 30px; }

  /* ═══ SIGNATURES ═════════════════════════════════════ */
  .sig-section {
    display: flex;
    justify-content: space-around;
    margin-bottom: 32px;
    page-break-inside: avoid;
  }
  .sig-col { text-align: center; min-width: 160px; }
  .sig-label { font-size: 12px; color: #333; margin-bottom: 52px; }
  .sig-line  { border-top: 1px solid #333; margin: 0 20px 6px; }
  .sig-name  { font-size: 12.5px; font-weight: 600; }
  .sig-role  { font-size: 11px; color: #555; margin-top: 2px; }
  .sig-date  { font-size: 11px; color: #555; margin-top: 2px; }

  /* ═══ FOOTER ═════════════════════════════════════════ */
  .page-footer {
    border-top: 1px solid #aaa;
    padding-top: 8px;
    display: flex;
    justify-content: space-between;
    font-size: 10.5px;
    color: #555;
  }
</style>
</head>
<body>

<!-- ═══ LETTERHEAD ═══ -->
<div class="letterhead">
  <div class="logo-placeholder">
    <span>🏛</span>
    วางโลโก้<br/>มหาวิทยาลัย<br/>ที่นี่
  </div>
  <div class="univ-block">
    <div class="univ-th">มหาวิทยาลัยราชภัฏอุตรดิตถ์</div>
    <div class="univ-en">Uttaradit Rajabhat University</div>
    <div class="dept">สถาบันวิจัยและพัฒนา · ระบบฐานข้อมูลงานวิจัย</div>
  </div>
  <div class="doc-meta">
    เลขที่เอกสาร : <strong>${docNo}</strong><br/>
    วันที่พิมพ์ : <strong>${printDate}</strong><br/>
    จำนวนหน้า : <strong>1 หน้า</strong>
  </div>
</div>

<!-- ═══ TITLE ═══ -->
<div class="title-band">
  <h1>รายงานสรุปโครงการวิจัย</h1>
  <p>ประจำปีงบประมาณ พ.ศ. ${thYear} &nbsp;|&nbsp; สถาบันวิจัยและพัฒนา มหาวิทยาลัยราชภัฏอุตรดิตถ์</p>
</div>

<!-- ═══ SUMMARY STRIP ═══ -->
<div class="summary-strip">
  <div class="sum-cell">
    <div class="sum-label">จำนวนโครงการทั้งหมด</div>
    <div class="sum-value">${projects.length} โครงการ</div>
  </div>
  <div class="sum-cell">
    <div class="sum-label">กำลังดำเนินการ</div>
    <div class="sum-value">${projects.filter((p: any) => p.status === 'กำลังดำเนินการ').length} โครงการ</div>
  </div>
  <div class="sum-cell">
    <div class="sum-label">เสร็จสิ้นแล้ว</div>
    <div class="sum-value">${projects.filter((p: any) => p.status === 'เสร็จสิ้น').length} โครงการ</div>
  </div>
  <div class="sum-cell">
    <div class="sum-label">งบประมาณรวมทั้งสิ้น</div>
    <div class="sum-value">฿${totalBudget.toLocaleString()} บาท</div>
  </div>
</div>

<!-- ═══ TABLE ═══ -->
<table>
  <thead>
    <tr>
      <th style="width:36px;" class="center">ที่</th>
      <th>ชื่อโครงการวิจัย</th>
      <th style="width:150px;" class="center">หัวหน้าโครงการ</th>
      <th style="width:60px;" class="center">ปี พ.ศ.</th>
      <th style="width:100px;" class="right">งบประมาณ (บาท)</th>
      <th style="width:90px;" class="center">สถานะ</th>
    </tr>
  </thead>
  <tbody>
    ${rows}
    <tr class="tfoot-row">
      <td colspan="4" class="right" style="padding-right:12px;">รวมงบประมาณทั้งหมด</td>
      <td class="right">฿${totalBudget.toLocaleString()}</td>
      <td></td>
    </tr>
  </tbody>
</table>

<!-- ═══ REMARK ═══ -->
<div class="remark-box">
  <div class="label">หมายเหตุ / บันทึกเพิ่มเติม</div>
  <div>.............................................................................................................................................................................</div>
  <div style="margin-top:8px;">.............................................................................................................................................................................</div>
</div>

<!-- ═══ SIGNATURES ═══ -->
<div class="sig-section">
  <div class="sig-col">
    <div class="sig-label">ผู้จัดทำรายงาน</div>
    <div class="sig-line"></div>
    <div class="sig-name">(...................................)</div>
    <div class="sig-role">ตำแหน่ง ...................................</div>
    <div class="sig-date">วันที่ ........../........../..........&nbsp;&nbsp;&nbsp;</div>
  </div>
  <div class="sig-col">
    <div class="sig-label">ผู้ตรวจสอบ</div>
    <div class="sig-line"></div>
    <div class="sig-name">(...................................)</div>
    <div class="sig-role">ตำแหน่ง ...................................</div>
    <div class="sig-date">วันที่ ........../........../..........&nbsp;&nbsp;&nbsp;</div>
  </div>
  <div class="sig-col">
    <div class="sig-label">ผู้อำนวยการสถาบันวิจัยและพัฒนา</div>
    <div class="sig-line"></div>
    <div class="sig-name">(...................................)</div>
    <div class="sig-role">ตำแหน่ง ผู้อำนวยการสถาบันวิจัยฯ</div>
    <div class="sig-date">วันที่ ........../........../..........&nbsp;&nbsp;&nbsp;</div>
  </div>
</div>

<!-- ═══ FOOTER ═══ -->
<div class="page-footer">
  <span>เอกสารนี้พิมพ์จากระบบ URU Research · มหาวิทยาลัยราชภัฏอุตรดิตถ์</span>
  <span>เลขที่ ${docNo} &nbsp;|&nbsp; ${printDate}</span>
</div>

</body>
</html>`;

    if (Platform.OS === 'web') {
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } else {
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
    }
  };

  const myProjects = ownedProjects.length > 0 ? ownedProjects : projects.filter(p => isOwner(user, p));
  const myBudget = myProjects.reduce((sum, p) => sum + Number(p.budget || 0), 0);

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
              <Ionicons name="folder-outline" size={20} color="#16a34a" />
              <Text style={s.pageTitle}>โครงการวิจัย</Text>
            </View>
            <Text style={s.pageSub}>ทั้งหมด {projects.length} โครงการ</Text>
          </View>
          <TouchableOpacity style={s.addBtn} onPress={openAdd}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={s.addTxt}>เพิ่ม</Text>
          </TouchableOpacity>
        </View>

        <View style={s.summaryCard}>
          <View style={s.summaryIcon}><Ionicons name="wallet-outline" size={22} color="#fff" /></View>
          <View style={s.summaryBody}>
            <Text style={s.summaryLabel}>งบประมาณโครงการของฉัน</Text>
            <Text style={s.summaryAmount}>฿{myBudget.toLocaleString()}</Text>
            <Text style={s.summaryHint}>{myProjects.length} โครงการที่คุณเป็นเจ้าของ</Text>
          </View>
        </View>

        <View style={s.segment}>
          <TouchableOpacity style={[s.segmentBtn, viewMode === 'mine' && s.segmentBtnActive]} onPress={() => setViewMode('mine')}>
            <Ionicons name="person-outline" size={14} color={viewMode === 'mine' ? '#fff' : '#64748b'} />
            <Text style={[s.segmentTxt, viewMode === 'mine' && s.segmentTxtActive]}>ของฉัน</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.segmentBtn, viewMode === 'all' && s.segmentBtnActive]} onPress={() => setViewMode('all')}>
            <Ionicons name="search-outline" size={14} color={viewMode === 'all' ? '#fff' : '#64748b'} />
            <Text style={[s.segmentTxt, viewMode === 'all' && s.segmentTxtActive]}>ค้นหาทั้งหมด</Text>
          </TouchableOpacity>
        </View>

        <View style={s.searchWrap}>
          <Ionicons name="search-outline" size={16} color="#9ca3af" />
          <TextInput style={s.searchInput} placeholder="ค้นหาโครงการ, นักวิจัย..." placeholderTextColor="#9ca3af" value={search} onChangeText={setSearch} returnKeyType="search" />
          {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={16} color="#9ca3af" /></TouchableOpacity> : null}
        </View>

        <View style={s.exportRow}>
          <TouchableOpacity style={s.excelBtn} onPress={exportExcel}>
            <Ionicons name="bar-chart-outline" size={14} color="#fff" />
            <Text style={s.exportTxt}>Excel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.pdfBtn} onPress={exportPDF}>
            <Ionicons name="document-outline" size={14} color="#fff" />
            <Text style={s.exportTxt}>PDF</Text>
          </TouchableOpacity>
        </View>

        {loading ? <ActivityIndicator color="#16a34a" style={{ marginTop: 40 }} /> :
          (() => {
            const scoped = viewMode === 'mine' ? myProjects : projects;
            const filtered = search.trim()
              ? scoped.filter(p => p.title?.includes(search) || p.researcher?.includes(search) || p.status?.includes(search))
              : scoped;
            return filtered.length === 0 ? (
              <View style={s.empty}>
                <Ionicons name="folder-open-outline" size={52} color="#d1d5db" />
                <Text style={s.emptyTxt}>{search ? 'ไม่พบโครงการที่ค้นหา' : 'ยังไม่มีโครงการวิจัย'}</Text>
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
                    {p.year ? <><Text style={s.dot}>·</Text><Text style={s.cardMeta}>ปี {p.year}</Text></> : null}
                  </View>
                  <View style={s.cardFooter}>
                    <View style={[s.badge, { backgroundColor: sc.bg }]}>
                      <Text style={[s.badgeTxt, { color: sc.text }]}>{p.status}</Text>
                    </View>
                    <Text style={s.budgetTxt}>{canViewBudget(user, p) ? `฿${Number(p.budget || 0).toLocaleString()}` : ''}</Text>
                  </View>
                </View>
                {canManage(user, p) && (
                  <View style={s.actions}>
                    <TouchableOpacity onPress={() => openEdit(p)} style={s.editBtn}><Ionicons name="pencil" size={14} color="#ca8a04" /></TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(p.id)} style={s.delBtn}><Ionicons name="trash-outline" size={14} color="#dc2626" /></TouchableOpacity>
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
              <Text style={s.modalTitle}>{editingId ? 'แก้ไขโครงการ' : 'เพิ่มโครงการวิจัย'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={s.closeBtn}><Ionicons name="close" size={20} color="#6b7280" /></TouchableOpacity>
            </View>
            {([
              { k: 'title',      ph: 'ชื่อโครงการ *',     icon: 'folder-outline',   num: false },
              { k: 'researcher', ph: 'นักวิจัย *',         icon: 'person-outline',   num: false },
              { k: 'budget',     ph: 'งบประมาณ (บาท)',     icon: 'cash-outline',     num: true  },
              { k: 'year',       ph: 'ปีงบประมาณ',         icon: 'calendar-outline', num: true  },
            ] as const).map(({ k, ph, icon, num }) => (
              <View key={k} style={s.inputWrap}>
                <Ionicons name={icon} size={16} color="#9ca3af" />
                <TextInput style={s.input} placeholder={ph} placeholderTextColor="#9ca3af" value={(form as any)[k]} onChangeText={v => setForm(f => ({ ...f, [k]: v }))} keyboardType={num ? 'numeric' : 'default'} editable={isAdmin(user) || k !== 'researcher'} />
              </View>
            ))}
            <Text style={s.pickerLabel}>ประเภทงานวิจัย *</Text>
            <View style={s.chips}>
              {(researchTypes.length ? researchTypes : [{ id: 1, name: 'ประเภททั่วไป' }]).map(t => (
                <TouchableOpacity key={String(t.id)} style={[s.chip, form.research_type_id === String(t.id) && s.chipActive]} onPress={() => setForm(f => ({ ...f, research_type_id: String(t.id) }))}>
                  <Text style={[s.chipTxt, form.research_type_id === String(t.id) && s.chipTxtActive]}>{t.name}</Text>
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

  summaryCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#173f2a', borderRadius: 20, padding: 18, marginBottom: 12, shadowColor: '#173f2a', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 5 },
  summaryIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2f6f49', marginRight: 14 },
  summaryBody: { flex: 1 },
  summaryLabel: { color: '#cfe8d8', fontSize: 11, fontWeight: '600' },
  summaryAmount: { color: '#fff', fontSize: 24, fontWeight: '800', marginVertical: 2 },
  summaryHint: { color: '#9fc5ad', fontSize: 10 },
  segment: { flexDirection: 'row', backgroundColor: '#e2ebe5', padding: 4, borderRadius: 13, marginBottom: 12 },
  segmentBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 9, borderRadius: 10 },
  segmentBtnActive: { backgroundColor: '#2d5a3d' },
  segmentTxt: { fontSize: 12, color: '#64748b', fontWeight: '700' },
  segmentTxtActive: { color: '#fff' },

  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 12, backgroundColor: '#fff', marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 13, color: '#111827', paddingVertical: 10 },

  exportRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  excelBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, backgroundColor: '#16a34a', borderRadius: 10, paddingVertical: 10 },
  pdfBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, backgroundColor: '#dc2626', borderRadius: 10, paddingVertical: 10 },
  exportTxt: { color: '#fff', fontWeight: '600', fontSize: 12 },

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
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 6 },
  cancelBtn: { flex: 1, borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  cancelTxt: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  saveBtn: { flex: 2, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, backgroundColor: '#2d5a3d', borderRadius: 12, paddingVertical: 13 },
  saveTxt: { fontSize: 13, color: '#fff', fontWeight: '700' },
});
