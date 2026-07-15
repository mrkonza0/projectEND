import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '@/components/AppHeader';
import { useUser } from '@/context/UserContext';
import { api } from '@/services/api';
import * as Print from 'expo-print';
import { useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function PrintHistoryScreen() {
  const { user } = useUser();
  const [myProjects,    setMyProjects]    = useState<any[]>([]);
  const [myCoProjects,  setMyCoProjects]  = useState<any[]>([]);
  const [myArticles,    setMyArticles]    = useState<any[]>([]);
  const [myProposals,   setMyProposals]   = useState<any[]>([]);
  const [loading,       setLoading]       = useState(true);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const load = async () => {
    const name = user.name?.trim() || '';
    const [pr, ar, po] = await Promise.all([
      api.getProjects('mine'), api.getArticles('mine'), api.getProposals('mine'),
    ]);
    // หัวหน้าโครงการ = researcher ตรงกับชื่อ user
    setMyProjects(pr.filter((p: any) => name && p.researcher?.includes(name)));
    // ผู้ร่วมโครงการ = co_researcher หรือ researcher ที่เป็น list มี user (ถ้า API ไม่รองรับ fallback ว่างเปล่า)
    setMyCoProjects(pr.filter((p: any) => name && p.co_researcher?.includes(name)));
    setMyArticles(ar.filter((a: any) => name && a.author?.includes(name)));
    setMyProposals(po.filter((p: any) => name && p.researcher?.includes(name)));
    setLoading(false);
  };

  const handlePrint = async () => {
    try {
      const now = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });

      const projectRows = myProjects.map((p, i) =>
        `<tr><td>${i + 1}</td><td>${p.title}</td><td>${p.year || '-'}</td><td>${Number(p.budget || 0).toLocaleString()} บาท</td><td>${p.status}</td></tr>`
      ).join('');

      const coProjectRows = myCoProjects.map((p, i) =>
        `<tr><td>${i + 1}</td><td>${p.title}</td><td>${p.researcher}</td><td>${p.year || '-'}</td><td>${p.status}</td></tr>`
      ).join('');

      const articleRows = myArticles.map((a, i) =>
        `<tr><td>${i + 1}</td><td>${a.title}</td><td>${a.journal || '-'}</td><td>${a.year || '-'}</td><td>${a.cited || 0}</td></tr>`
      ).join('');

      const eduList = (user.education || []);
      const expList = (user.expertise || []);

      const expertiseTH = expList.map(e => e.nameTH).filter(Boolean).join(', ') || '-';

      const expRows = expList.map((e, i) =>
        `<tr><td>${i + 1}</td><td>${e.nameTH}</td><td>${e.nameEN || '-'}</td><td>${e.group || '-'}</td><td>${e.field || '-'}</td></tr>`
      ).join('');

      const thYear = new Date().getFullYear() + 543;

      const html = `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="utf-8"/>
<title>ประวัตินักวิจัย - ${user.name || ''}</title>
<script>
  window.onload = function() {
    var wrap = document.getElementById('page-wrap');
    var A4_H = 1050; // usable px at 96dpi with 8mm margins
    var actual = wrap.scrollHeight;
    if (actual > A4_H) {
      var scale = A4_H / actual;
      wrap.style.transform = 'scale(' + scale + ')';
      wrap.style.transformOrigin = 'top left';
      wrap.style.width = Math.round(100 / scale) + '%';
    }
    setTimeout(function() { window.print(); }, 350);
  };
</script>
<style>
  @page { size: A4 portrait; margin: 8mm 10mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'TH Sarabun New','Sarabun','Tahoma',sans-serif; font-size: 11.5px; color: #000; background: #fff; }
  #page-wrap { width: 100%; }

  /* LETTERHEAD */
  .lh { display:flex; align-items:center; gap:12px; padding-bottom:8px; border-bottom:2.5px double #000; margin-bottom:8px; }
  .logo-box { width:64px; height:64px; border:1px solid #999; display:flex; flex-direction:column; align-items:center; justify-content:center; font-size:8px; color:#999; text-align:center; background:#fafafa; flex-shrink:0; gap:2px; }
  .logo-box span { font-size:18px; }
  .univ-c { flex:1; text-align:center; }
  .univ-th { font-size:14px; font-weight:700; }
  .univ-en { font-size:9.5px; color:#555; margin-top:1px; }
  .univ-dept { font-size:10.5px; margin-top:2px; }
  .doc-right { text-align:right; font-size:10px; color:#333; line-height:1.7; flex-shrink:0; }

  /* TITLE */
  .title-band { text-align:center; padding:5px 0; border-top:1px solid #000; border-bottom:1px solid #000; margin-bottom:8px; }
  .title-band h1 { font-size:14px; font-weight:700; letter-spacing:0.5px; }
  .title-band p { font-size:10px; color:#555; }

  /* PERSONAL */
  .personal { display:flex; gap:10px; margin-bottom:8px; border:1px solid #bbb; padding:8px; }
  .photo-box { width:70px; height:90px; border:1px solid #999; display:flex; flex-direction:column; align-items:center; justify-content:center; font-size:8px; color:#aaa; text-align:center; background:#f5f5f5; flex-shrink:0; }
  .photo-box span { font-size:20px; display:block; margin-bottom:2px; }
  .info-tbl { border-collapse:collapse; width:100%; font-size:11px; }
  .info-tbl td { padding:2px 6px; vertical-align:top; }
  .info-tbl td:first-child { width:100px; color:#444; font-weight:600; border-right:1px solid #e0e0e0; white-space:nowrap; }
  .info-tbl tr { border-bottom:1px solid #f0f0f0; }

  /* SECTION */
  .sec { font-size:11px; font-weight:700; background:#1a1a1a; color:#fff; padding:3px 8px; margin:6px 0 0; }
  .sec-sub { font-size:9.5px; font-weight:normal; float:right; color:#ccc; margin-top:1px; }

  /* TABLE */
  table.d { width:100%; border-collapse:collapse; font-size:10.5px; }
  table.d th { background:#333; color:#fff; padding:4px 7px; font-weight:600; border:1px solid #333; font-size:10px; }
  table.d td { padding:3px 7px; border:1px solid #ccc; vertical-align:top; line-height:1.4; }
  table.d tbody tr:nth-child(even) td { background:#f7f7f7; }
  .none td { color:#999; font-style:italic; text-align:center; padding:5px; font-size:10px; }
  .c { text-align:center; } .r { text-align:right; }

  /* SIGNATURE */
  .sigs { display:flex; justify-content:space-between; margin-top:14px; gap:12px; }
  .sig { text-align:center; flex:1; }
  .sig-lbl { font-size:10.5px; color:#444; margin-bottom:28px; }
  .sig-line { border-top:1px solid #333; margin:0 12px 4px; }
  .sig-name { font-size:11px; font-weight:600; }
  .sig-role { font-size:9.5px; color:#555; margin-top:1px; }
  .sig-date { font-size:9.5px; color:#555; }

  /* FOOTER */
  .footer { margin-top:10px; padding-top:5px; border-top:1px solid #aaa; display:flex; justify-content:space-between; font-size:9px; color:#777; }
</style>
</head>
<body>

<div id="page-wrap">

<!-- LETTERHEAD -->
<div class="lh">
  <div class="logo-box"><span>🏛</span>วางโลโก้<br/>มหาวิทยาลัย</div>
  <div class="univ-c">
    <div class="univ-th">มหาวิทยาลัยราชภัฏอุตรดิตถ์</div>
    <div class="univ-en">Uttaradit Rajabhat University</div>
    <div class="univ-dept">สถาบันวิจัยและพัฒนา</div>
  </div>
  <div class="doc-right">วันที่พิมพ์ : <strong>${now}</strong><br/>ปีงบประมาณ : <strong>พ.ศ. ${thYear}</strong></div>
</div>

<!-- TITLE -->
<div class="title-band">
  <h1>แบบสรุปประวัตินักวิจัย</h1>
  <p>ระบบฐานข้อมูลงานวิจัย · มหาวิทยาลัยราชภัฏอุตรดิตถ์</p>
</div>

<!-- PERSONAL -->
<div class="personal">
  <div class="photo-box"><span>👤</span>รูปถ่าย<br/>1 นิ้ว</div>
  <table class="info-tbl">
    <tr><td>ชื่อ - นามสกุล</td><td><strong>${user.name || '-'}</strong></td><td>ตำแหน่ง</td><td>${user.position || '-'}</td></tr>
    <tr><td>หน่วยงาน / คณะ</td><td colspan="3">${[user.major, user.faculty].filter(Boolean).join(' · ') || '-'}</td></tr>
    <tr><td>อีเมล</td><td>${user.email || '-'}</td><td>โทรศัพท์</td><td>${user.phone || '-'}</td></tr>
    <tr><td>ความเชี่ยวชาญ</td><td colspan="3">${expertiseTH}</td></tr>
  </table>
</div>

<!-- EDUCATION -->
<div class="sec">วุฒิการศึกษา <span class="sec-sub">(${eduList.length} รายการ)</span></div>
<table class="d">
  <thead><tr><th class="c" style="width:28px">ที่</th><th style="width:80px" class="c">ระดับ</th><th>วุฒิ / สาขา</th><th>สถาบัน</th><th class="c" style="width:52px">ปี</th></tr></thead>
  <tbody>${eduList.length === 0
    ? '<tr class="none"><td colspan="5">ไม่มีข้อมูล</td></tr>'
    : eduList.map((e: any, i: number) => `<tr><td class="c">${i+1}</td><td class="c">${e.level||'-'}</td><td>${e.degree||'-'}${e.field?` (${e.field})`:''}</td><td>${e.institution||'-'}</td><td class="c">${e.year||'-'}</td></tr>`).join('')
  }</tbody>
</table>

${expList.length > 0 ? `
<div class="sec">ความเชี่ยวชาญ <span class="sec-sub">(${expList.length} รายการ)</span></div>
<table class="d">
  <thead><tr><th class="c" style="width:28px">ที่</th><th>ความเชี่ยวชาญ (ไทย)</th><th>Expertise (EN)</th><th style="width:100px">กลุ่ม / สาขา</th></tr></thead>
  <tbody>${expRows}</tbody>
</table>` : ''}

<!-- PROJECTS HEAD -->
<div class="sec">โครงการวิจัย — หัวหน้าโครงการ <span class="sec-sub">(${myProjects.length} รายการ)</span></div>
<table class="d">
  <thead><tr><th class="c" style="width:28px">ที่</th><th>ชื่อโครงการวิจัย</th><th class="c" style="width:52px">ปี</th><th class="r" style="width:100px">งบประมาณ</th><th class="c" style="width:80px">สถานะ</th></tr></thead>
  <tbody>${myProjects.length === 0
    ? '<tr class="none"><td colspan="5">ไม่มีข้อมูล</td></tr>'
    : projectRows}</tbody>
</table>

<!-- PROJECTS CO -->
<div class="sec">โครงการวิจัย — ผู้ร่วมโครงการ <span class="sec-sub">(${myCoProjects.length} รายการ)</span></div>
<table class="d">
  <thead><tr><th class="c" style="width:28px">ที่</th><th>ชื่อโครงการวิจัย</th><th style="width:120px">หัวหน้าโครงการ</th><th class="c" style="width:52px">ปี</th><th class="c" style="width:80px">สถานะ</th></tr></thead>
  <tbody>${myCoProjects.length === 0
    ? '<tr class="none"><td colspan="5">ไม่มีข้อมูล</td></tr>'
    : coProjectRows}</tbody>
</table>

<!-- ARTICLES -->
<div class="sec">บทความวิจัย / วิชาการ <span class="sec-sub">(${myArticles.length} รายการ)</span></div>
<table class="d">
  <thead><tr><th class="c" style="width:28px">ที่</th><th>ชื่อบทความ</th><th style="width:140px">วารสาร</th><th class="c" style="width:52px">ปี</th><th class="c" style="width:60px">อ้างอิง</th></tr></thead>
  <tbody>${myArticles.length === 0
    ? '<tr class="none"><td colspan="5">ไม่มีข้อมูล</td></tr>'
    : articleRows}</tbody>
</table>

<!-- SIGNATURE -->
<div class="sigs">
  <div class="sig">
    <div class="sig-lbl">ผู้ยื่นเอกสาร</div>
    <div class="sig-line"></div>
    <div class="sig-name">(${user.name || '.....................'})</div>
    <div class="sig-role">${user.position || 'ตำแหน่ง .....................'}</div>
    <div class="sig-date">วันที่ ......./......./.......</div>
  </div>
  <div class="sig">
    <div class="sig-lbl">ผู้ตรวจสอบ</div>
    <div class="sig-line"></div>
    <div class="sig-name">(............................)</div>
    <div class="sig-role">ตำแหน่ง ......................</div>
    <div class="sig-date">วันที่ ......./......./.......</div>
  </div>
  <div class="sig">
    <div class="sig-lbl">ผู้อำนวยการสถาบันวิจัยและพัฒนา</div>
    <div class="sig-line"></div>
    <div class="sig-name">(............................)</div>
    <div class="sig-role">ผู้อำนวยการสถาบันวิจัยฯ</div>
    <div class="sig-date">วันที่ ......./......./.......</div>
  </div>
</div>

<!-- FOOTER -->
<div class="footer">
  <span>เอกสารจากระบบ URU Research · มหาวิทยาลัยราชภัฏอุตรดิตถ์</span>
  <span>พิมพ์เมื่อ ${now}</span>
</div>

</div>

</body></html>`;

      if (Platform.OS === 'web') {
        const blob = new Blob([html], { type: 'text/html' });
        const url  = URL.createObjectURL(blob);
        window.open(url, '_blank');
      } else {
        const { uri } = await Print.printToFileAsync({ html, base64: false });
        const Sharing = await import('expo-sharing');
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
      }
    } catch (e: any) {
      Alert.alert('ไม่สามารถพิมพ์ได้', e?.message || 'กรุณาลองใหม่');
    }
  };

  if (loading) return (
    <View style={s.container}>
      <AppHeader />
      <View style={s.loadingBox}>
        <Ionicons name="hourglass-outline" size={32} color="#16a34a" />
        <Text style={s.loadingTxt}>กำลังโหลด...</Text>
      </View>
    </View>
  );

  return (
    <View style={s.container}>
      <AppHeader />
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        <View style={s.titleRow}>
          <Ionicons name="print-outline" size={20} color="#16a34a" />
          <Text style={s.pageTitle}>พิมพ์ประวัตินักวิจัย</Text>
        </View>
        <Text style={s.pageSub}>แสดงเฉพาะข้อมูลของคุณ</Text>

        {/* Profile card */}
        <View style={s.profileCard}>
          <View style={s.avatar}>
            <Text style={s.avatarTxt}>{(user.name || 'ผ').charAt(0)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.profileName}>{user.name || 'ผู้ใช้ระบบ'}</Text>
            <Text style={s.profileRole}>{user.position || 'นักวิจัย'}</Text>
            {user.faculty ? <Text style={s.profileFaculty}>{user.faculty}</Text> : null}
            {user.email ? (
              <View style={s.profileEmailRow}>
                <Ionicons name="mail-outline" size={11} color="#bbf7d0" />
                <Text style={s.profileContact}>{user.email}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          {[
            { label: 'หัวหน้าโครงการ', value: myProjects.length,   bg: '#dcfce7', color: '#16a34a' },
            { label: 'ผู้ร่วมโครงการ', value: myCoProjects.length,  bg: '#dbeafe', color: '#2563eb' },
            { label: 'บทความ',          value: myArticles.length,    bg: '#ede9fe', color: '#7c3aed' },
            { label: 'ข้อเสนอ',         value: myProposals.length,   bg: '#fef9c3', color: '#ca8a04' },
          ].map(item => (
            <View key={item.label} style={[s.statCard, { backgroundColor: item.bg }]}>
              <Text style={[s.statVal, { color: item.color }]}>{item.value}</Text>
              <Text style={s.statLbl}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Section: งานวิจัย (หัวหน้า) */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <View style={[s.sectionIcon, { backgroundColor: '#dcfce7' }]}>
              <Ionicons name="folder-outline" size={14} color="#16a34a" />
            </View>
            <Text style={s.sectionTitle}>งานวิจัย (หัวหน้าโครงการ)</Text>
            <View style={s.countBadge}><Text style={s.countTxt}>{myProjects.length}</Text></View>
          </View>
          {myProjects.length === 0
            ? <Text style={s.empty}>ไม่มีข้อมูล — ชื่อนักวิจัยในโครงการต้องตรงกับชื่อบัญชีของคุณ</Text>
            : myProjects.map((p, i) => (
              <View key={p.id} style={[s.row, i === myProjects.length - 1 && s.rowLast]}>
                <View style={s.rowNum}><Text style={s.rowNumTxt}>{i + 1}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.rowTitle}>{p.title}</Text>
                  <Text style={s.rowSub}>ปี {p.year || '—'} · ฿{Number(p.budget || 0).toLocaleString()} · {p.status}</Text>
                </View>
              </View>
            ))
          }
        </View>

        {/* Section: งานวิจัย (ผู้ร่วม) */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <View style={[s.sectionIcon, { backgroundColor: '#dbeafe' }]}>
              <Ionicons name="people-outline" size={14} color="#2563eb" />
            </View>
            <Text style={s.sectionTitle}>งานวิจัย (ผู้ร่วมโครงการ)</Text>
            <View style={s.countBadge}><Text style={s.countTxt}>{myCoProjects.length}</Text></View>
          </View>
          {myCoProjects.length === 0
            ? <Text style={s.empty}>ไม่มีข้อมูล</Text>
            : myCoProjects.map((p, i) => (
              <View key={p.id} style={[s.row, i === myCoProjects.length - 1 && s.rowLast]}>
                <View style={s.rowNum}><Text style={s.rowNumTxt}>{i + 1}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.rowTitle}>{p.title}</Text>
                  <Text style={s.rowSub}>หัวหน้า: {p.researcher} · ปี {p.year || '—'} · {p.status}</Text>
                </View>
              </View>
            ))
          }
        </View>

        {/* Section: บทความ */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <View style={[s.sectionIcon, { backgroundColor: '#ede9fe' }]}>
              <Ionicons name="newspaper-outline" size={14} color="#7c3aed" />
            </View>
            <Text style={s.sectionTitle}>บทความวิจัย/วิชาการ</Text>
            <View style={s.countBadge}><Text style={s.countTxt}>{myArticles.length}</Text></View>
          </View>
          {myArticles.length === 0
            ? <Text style={s.empty}>ไม่มีข้อมูล — ชื่อผู้แต่งต้องตรงกับชื่อบัญชีของคุณ</Text>
            : myArticles.map((a, i) => (
              <View key={a.id} style={[s.row, i === myArticles.length - 1 && s.rowLast]}>
                <View style={s.rowNum}><Text style={s.rowNumTxt}>{i + 1}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.rowTitle}>{a.title}</Text>
                  <Text style={s.rowSub}>{a.journal || '—'} · ปี {a.year || '—'} · อ้างอิง {a.cited || 0} ครั้ง</Text>
                </View>
              </View>
            ))
          }
        </View>

        <TouchableOpacity style={s.printBtn} onPress={handlePrint}>
          <Ionicons name="print-outline" size={18} color="#fff" />
          <Text style={s.printTxt}>พิมพ์ / บันทึก PDF</Text>
        </TouchableOpacity>

        <Text style={s.hint}>ข้อมูลจะแสดงเฉพาะรายการที่ชื่อของคุณปรากฏในฐานะนักวิจัย/ผู้แต่ง</Text>

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eef7f0' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },

  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  loadingTxt: { fontSize: 14, color: '#6b7280' },

  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  pageTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  pageSub: { fontSize: 12, color: '#6b7280', marginBottom: 14 },

  profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#16a34a', borderRadius: 20, padding: 18, marginBottom: 14, gap: 14, shadowColor: '#2d5a3d', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 5 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  avatarTxt: { fontSize: 26, color: '#fff', fontWeight: '700' },
  profileName: { fontSize: 15, fontWeight: '800', color: '#fff', marginBottom: 2 },
  profileRole: { fontSize: 12, color: '#bbf7d0', marginBottom: 2 },
  profileFaculty: { fontSize: 11, color: '#bbf7d0', marginBottom: 4 },
  profileEmailRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  profileContact: { fontSize: 11, color: '#bbf7d0' },

  statsRow: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  statCard: { flex: 1, borderRadius: 12, padding: 10, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  statVal: { fontSize: 20, fontWeight: '800' },
  statLbl: { fontSize: 8, color: '#6b7280', marginTop: 2, textAlign: 'center' },

  section: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionIcon: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#111827', flex: 1 },
  countBadge: { backgroundColor: '#f3f4f6', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  countTxt: { fontSize: 11, fontWeight: '700', color: '#374151' },

  empty: { fontSize: 12, color: '#9ca3af', fontStyle: 'italic', lineHeight: 18 },

  row: { flexDirection: 'row', gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  rowLast: { borderBottomWidth: 0 },
  rowNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center', marginTop: 1 },
  rowNumTxt: { fontSize: 10, fontWeight: '700', color: '#6b7280' },
  rowTitle: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 2 },
  rowSub: { fontSize: 10, color: '#9ca3af', lineHeight: 15 },

  printBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: '#16a34a', borderRadius: 14, paddingVertical: 16, marginTop: 4, shadowColor: '#2d5a3d', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  printTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },

  hint: { textAlign: 'center', fontSize: 11, color: '#d1d5db', marginTop: 12 },
});
