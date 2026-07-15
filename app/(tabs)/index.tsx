import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '@/components/AppHeader';
import { useUser } from '@/context/UserContext';
import { canViewBudget } from '@/services/permissions';
import { api } from '@/services/api';
import { C } from '@/constants/theme';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
type ChartBar    = { label: string; value: number; color: string };

// ─── Service grid ────────────────────────────────────────────────
const SERVICES: { icon: IoniconName; label: string; route: string; bg: string; color: string }[] = [
  { icon: 'folder-open-outline',      label: 'โครงการวิจัย',    route: '/(tabs)/project',       bg: '#e6f7ed', color: C.primary  },
  { icon: 'newspaper-outline',        label: 'บทความวิจัย',     route: '/(tabs)/article',       bg: '#e8f0fd', color: C.info     },
  { icon: 'document-text-outline',    label: 'ข้อเสนอโครงการ',  route: '/(tabs)/proposal',      bg: '#f3ebff', color: '#7c3aed'  },
  { icon: 'people-outline',           label: 'นักวิจัย',         route: '/(tabs)/researcher',    bg: '#fff3e8', color: '#d97706'  },
  { icon: 'cloud-upload-outline',     label: 'ส่งเล่มรายงาน',   route: '/(tabs)/report',        bg: '#e6f7ed', color: C.accent   },
  { icon: 'albums-outline',           label: 'จัดการไฟล์',      route: '/(tabs)/files',         bg: '#e8f0fd', color: C.info     },
  { icon: 'print-outline',            label: 'พิมพ์ประวัติ',    route: '/(tabs)/print-history', bg: '#f3ebff', color: '#7c3aed'  },
];

// ─── Mock news items ─────────────────────────────────────────────
const NEWS = [
  { tag: 'ประกาศ',    title: 'มรอ. ได้รับการรับรองมาตรฐานคุณภาพ', detail: 'ระดับอุดมศึกษา 5 ปี จาก สมศ.' },
  { tag: 'กำหนดการ', title: 'ปฏิทินการส่งเกรดภาคเรียนที่ 2',     detail: 'กำหนดส่ง 30 มิถุนายน' },
  { tag: 'ประชาสัมพันธ์', title: 'เปิดรับข้อเสนอโครงการวิจัย ปี 2568', detail: 'ยื่นได้ถึง 31 กรกฎาคม' },
];

export default function HomeScreen() {
  const { user } = useUser();
  const { width } = useWindowDimensions();
  const compact = width < 390;
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState([
    { label: 'งานวิจัยทั้งหมด', value: '—' },
    { label: 'บทความวิจัย',    value: '—' },
    { label: 'นักวิจัย',        value: '—' },
    { label: 'กำลังดำเนินการ', value: '—' },
    { label: 'ตีพิมพ์แล้ว',   value: '—' },
    { label: 'เสร็จสิ้น',      value: '—' },
  ]);
  const [projectChart, setProjectChart] = useState<ChartBar[]>([]);
  const [articleChart, setArticleChart] = useState<ChartBar[]>([]);
  const [recentProjects, setRecentProjects] = useState<any[]>([]);
  const [loadingRecent, setLoadingRecent]   = useState(true);

  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    setLoadingRecent(true);
    try {
      const [projects, articles, researchers] = await Promise.all([
        api.getProjects(), api.getArticles(), api.getResearchers(),
      ]);
      const active    = projects.filter((p: any) => p.status === 'กำลังดำเนินการ').length;
      const done      = projects.filter((p: any) => p.status === 'เสร็จสิ้น').length;
      const approved  = projects.filter((p: any) => p.status === 'อนุมัติแล้ว').length;
      const published = articles.filter((a: any) => a.status === 'ตีพิมพ์แล้ว').length;
      const pending   = articles.filter((a: any) => a.status === 'รอตีพิมพ์').length;
      setStats([
        { label: 'งานวิจัยทั้งหมด', value: String(projects.length) },
        { label: 'บทความวิจัย',    value: String(articles.length) },
        { label: 'นักวิจัย',        value: String(researchers.length) },
        { label: 'กำลังดำเนินการ', value: String(active) },
        { label: 'ตีพิมพ์แล้ว',   value: String(published) },
        { label: 'เสร็จสิ้น',      value: String(done) },
      ]);
      setProjectChart([
        { label: 'กำลังดำเนินการ', value: active,   color: C.info },
        { label: 'อนุมัติแล้ว',    value: approved, color: C.accent },
        { label: 'เสร็จสิ้น',      value: done,     color: C.primary },
      ]);
      setArticleChart([
        { label: 'ตีพิมพ์แล้ว',   value: published,                             color: C.accent },
        { label: 'รอตีพิมพ์',     value: pending,                               color: C.warning },
        { label: 'อื่นๆ',          value: articles.length - published - pending, color: C.textLight },
      ]);
      setRecentProjects(projects.slice(0, 3));
    } catch {}
    finally { setLoadingRecent(false); }
  };

  const onRefresh = async () => { setRefreshing(true); await loadStats(); setRefreshing(false); };

  const initial = (user.name || 'ผ').charAt(0);

  const STAT_META = [
    { icon: 'folder-open-outline' as IoniconName,      color: C.primary, bg: '#e6f7ed' },
    { icon: 'newspaper-outline' as IoniconName,        color: C.info,    bg: '#e8f0fd' },
    { icon: 'people-outline' as IoniconName,           color: '#374151', bg: '#f3f4f6' },
    { icon: 'time-outline' as IoniconName,             color: C.warning, bg: C.warningLight },
    { icon: 'ribbon-outline' as IoniconName,           color: '#7c3aed', bg: '#f3ebff' },
    { icon: 'checkmark-circle-outline' as IoniconName, color: '#db2777', bg: '#fce8ef' },
  ];

  return (
    <View style={s.container}>
      <AppHeader />
      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.content, compact && s.contentCompact]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} tintColor={C.primary} />}
      >
        {/* Welcome strip */}
        <View style={s.welcomeStrip}>
          <View style={s.welcomeAvatarWrap}>
            <Text style={s.welcomeAvatarTxt}>{initial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.welcomeHi}>สวัสดี 👋</Text>
            <Text style={s.welcomeName} numberOfLines={1}>{user.name || 'ผู้ใช้ระบบ'}</Text>
          </View>
          <View style={s.roleChip}>
            <Text style={s.roleChipTxt}>{user.role === 'admin' ? 'Admin' : 'User'}</Text>
          </View>
        </View>

        {/* ── ข่าวสารและประกาศ ── */}
        <View style={s.sectionRow}>
          <View style={s.sectionLabelWrap}>
            <View style={s.sectionAccent} />
            <Text style={s.sectionLabel}>ข่าวสารและประกาศ</Text>
          </View>
          <TouchableOpacity style={s.seeAllBtn}>
            <Text style={s.seeAllTxt}>ดูทั้งหมด</Text>
            <Ionicons name="chevron-forward" size={12} color={C.textMuted} />
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.newsScroll}>
          {NEWS.map((n, i) => (
            <View key={i} style={[s.newsCard, compact && s.newsCardCompact]}>
              <View style={s.newsTagRow}>
                <View style={s.newsTagBadge}><Text style={s.newsTagTxt}>{n.tag}</Text></View>
                <Ionicons name="megaphone-outline" size={16} color="rgba(255,255,255,0.7)" />
              </View>
              <Text style={s.newsTitle}>{n.title}</Text>
              <View style={s.newsFooter}>
                <Text style={s.newsDetail}>{n.detail}</Text>
                <Ionicons name="arrow-forward-circle" size={18} color="rgba(255,255,255,0.6)" />
              </View>
            </View>
          ))}
        </ScrollView>

        {/* ── บริการหลัก ── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>บริการหลัก</Text>
          <View style={s.serviceGrid}>
            {SERVICES.map((svc, i) => (
              <TouchableOpacity key={i} style={[s.serviceItem, compact && s.serviceItemCompact]} onPress={() => router.replace(svc.route as any)} activeOpacity={0.75}>
                <View style={[s.serviceIconWrap, { backgroundColor: svc.bg }]}>
                  <Ionicons name={svc.icon} size={24} color={svc.color} />
                </View>
                <Text style={s.serviceLabel}>{svc.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── ผลงานวิชาการ ── */}
        <View style={s.card}>
          <View style={[s.cardHeaderRow, compact && s.cardHeaderRowCompact]}>
            <View style={s.sectionLabelWrap}>
              <View style={s.sectionAccent} />
              <Text style={s.cardTitle}>ผลงานวิชาการ (e-Research)</Text>
            </View>
            <TouchableOpacity style={s.addNewBtn} onPress={() => router.replace('/(tabs)/project' as any)}>
              <Text style={s.addNewTxt}>+ เพิ่มใหม่</Text>
            </TouchableOpacity>
          </View>

          {loadingRecent ? (
            <ActivityIndicator color={C.primary} style={{ marginVertical: 24 }} />
          ) : recentProjects.length === 0 ? (
            <View style={s.emptySection}>
              <Text style={s.emptySectionTxt}>โหลดข้อมูลไม่สำเร็จ</Text>
              <TouchableOpacity onPress={loadStats}><Text style={[s.emptySectionTxt, { color: C.accent, fontWeight: '700' }]}>แตะเพื่อลองใหม่</Text></TouchableOpacity>
            </View>
          ) : recentProjects.map((p, i) => (
            <View key={p.id || i} style={[s.projectRow, i < recentProjects.length - 1 && s.projectRowBorder]}>
              <View style={[s.projectDot, { backgroundColor: p.status === 'กำลังดำเนินการ' ? C.info : p.status === 'เสร็จสิ้น' ? C.accent : C.warning }]} />
              <View style={{ flex: 1 }}>
                <Text style={s.projectTitle} numberOfLines={1}>{p.title}</Text>
                <Text style={s.projectMeta}>{p.researcher} · ปี {p.year}</Text>
              </View>
              <View style={s.projectBudget}>
                <Text style={s.projectBudgetTxt}>{canViewBudget(user, p) ? `฿${Number(p.budget || 0).toLocaleString()}` : ''}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── Stats ── */}
        <Text style={s.statsSectionLabel}>สถิติภาพรวม</Text>
        <View style={s.statsGrid}>
          {stats.map((st, i) => {
            const m = STAT_META[i];
            return (
              <View key={i} style={[s.statCard, { backgroundColor: m.bg }]}>
                <Ionicons name={m.icon} size={20} color={m.color} style={{ marginBottom: 8 }} />
                <Text style={[s.statValue, { color: m.color }]}>{st.value}</Text>
                <Text style={s.statLabel}>{st.label}</Text>
              </View>
            );
          })}
        </View>

        {/* ── Charts ── */}
        {(projectChart.some(b => b.value > 0) || articleChart.some(b => b.value > 0)) && (
          <View style={[s.chartsRow, compact && s.chartsRowCompact]}>
            <BarChart title="โครงการ" bars={projectChart} />
            <BarChart title="บทความ" bars={articleChart} />
          </View>
        )}

        <Text style={s.footer}>ระบบฐานข้อมูลงานวิจัย · มหาวิทยาลัยราชภัฏอุตรดิตถ์</Text>
      </ScrollView>
    </View>
  );
}

function BarChart({ title, bars }: { title: string; bars: ChartBar[] }) {
  const max = Math.max(...bars.map(b => b.value), 1);
  return (
    <View style={s.chartCard}>
      <Text style={s.chartTitle}>{title}</Text>
      {bars.map(b => (
        <View key={b.label} style={s.barRow}>
          <Text style={s.barLabel} numberOfLines={1}>{b.label}</Text>
          <View style={s.barTrack}>
            <View style={[s.barFill, { width: `${(b.value / max) * 100}%` as any, backgroundColor: b.color }]} />
          </View>
          <Text style={[s.barVal, { color: b.color }]}>{b.value}</Text>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll:    { flex: 1 },
  content:   { padding: 16, paddingBottom: 40 },
  contentCompact: { paddingHorizontal: 12 },

  // Welcome
  welcomeStrip:      { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 16, shadowColor: C.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  welcomeAvatarWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.accentLight, justifyContent: 'center', alignItems: 'center' },
  welcomeAvatarTxt:  { fontSize: 20, fontWeight: '800', color: C.primary },
  welcomeHi:         { fontSize: 11, color: C.textMuted, marginBottom: 1 },
  welcomeName:       { fontSize: 15, fontWeight: '700', color: C.text },
  roleChip:          { backgroundColor: C.primary, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  roleChipTxt:       { fontSize: 10, fontWeight: '700', color: '#fff' },

  // Section header row
  sectionRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  sectionLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 },
  sectionAccent:    { width: 3, height: 16, backgroundColor: C.primary, borderRadius: 2 },
  sectionLabel:     { fontSize: 15, fontWeight: '700', color: C.text },
  seeAllBtn:        { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#f3f4f6', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  seeAllTxt:        { fontSize: 11, color: C.textMuted, fontWeight: '500' },

  // News cards
  newsScroll: { gap: 12, paddingBottom: 4, paddingRight: 4, marginBottom: 16 },
  newsCard:   { width: 200, backgroundColor: C.primary, borderRadius: 16, padding: 14, justifyContent: 'space-between', minHeight: 110, shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  newsCardCompact: { width: 178 },
  newsTagRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  newsTagBadge:{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  newsTagTxt: { fontSize: 10, color: '#fff', fontWeight: '600' },
  newsTitle:  { fontSize: 13, fontWeight: '700', color: '#fff', lineHeight: 18, flex: 1, marginBottom: 8 },
  newsFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  newsDetail: { fontSize: 10, color: 'rgba(255,255,255,0.7)', flex: 1 },

  // White cards
  card:      { backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 14 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 14 },
  cardHeaderRowCompact: { flexWrap: 'wrap', alignItems: 'flex-start' },
  addNewBtn: { backgroundColor: C.accentLight, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  addNewTxt: { fontSize: 11, color: C.accentText, fontWeight: '600' },

  // Service grid
  serviceGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  serviceItem:    { width: '21%', alignItems: 'center', gap: 6 },
  serviceItemCompact: { width: '30%' },
  serviceIconWrap:{ width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  serviceLabel:   { fontSize: 10, fontWeight: '500', color: C.textSub, textAlign: 'center' },

  // Recent projects
  projectRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  projectRowBorder: { borderBottomWidth: 1, borderBottomColor: C.borderLight },
  projectDot:       { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  projectTitle:     { fontSize: 13, fontWeight: '600', color: C.text, marginBottom: 2 },
  projectMeta:      { fontSize: 10, color: C.textMuted },
  projectBudget:    { backgroundColor: C.bgSection, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, flexShrink: 0 },
  projectBudgetTxt: { fontSize: 10, color: C.primary, fontWeight: '600' },

  emptySection:    { alignItems: 'center', paddingVertical: 24, gap: 6 },
  emptySectionTxt: { fontSize: 13, color: C.textMuted },

  // Stats
  statsSectionLabel: { fontSize: 13, fontWeight: '700', color: C.textSub, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  statsGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  statCard:   { width: '47%', borderRadius: 16, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  statValue:  { fontSize: 28, fontWeight: '800', marginBottom: 2 },
  statLabel:  { fontSize: 10, color: C.textMuted, fontWeight: '500' },

  // Charts
  chartsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  chartsRowCompact: { flexDirection: 'column' },
  chartCard: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  chartTitle:{ fontSize: 11, fontWeight: '700', color: C.textSub, marginBottom: 10, textTransform: 'uppercase' },
  barRow:    { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  barLabel:  { fontSize: 9, color: C.textMuted, width: 58 },
  barTrack:  { flex: 1, height: 7, backgroundColor: C.borderLight, borderRadius: 4, overflow: 'hidden' },
  barFill:   { height: 7, borderRadius: 4 },
  barVal:    { fontSize: 10, fontWeight: '700', width: 18, textAlign: 'right' },

  footer: { fontSize: 10, color: C.textLight, textAlign: 'center', marginTop: 4 },
});
