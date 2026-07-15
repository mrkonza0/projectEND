import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '@/components/AppHeader';
import { useUser } from '@/context/UserContext';
import { filterOwned, isAdmin } from '@/services/permissions';
import { api } from '@/services/api';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface Notif {
  id: string;
  title: string;
  body: string;
  time: string;
  icon: IoniconName;
  color: string;
  bg: string;
  read: boolean;
  route: string;
}

const STORAGE_KEY = 'notif_read_ids';

const userStorageKey = (email: string) => `${STORAGE_KEY}:${email.trim().toLowerCase() || 'guest'}`;

async function getReadIds(email: string): Promise<string[]> {
  try {
    if (Platform.OS === 'web') {
      return JSON.parse(localStorage.getItem(userStorageKey(email)) || '[]');
    }
    const { default: AS } = await import('@react-native-async-storage/async-storage');
    const raw = await AS.getItem(userStorageKey(email));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

async function saveReadIds(email: string, ids: string[]): Promise<void> {
  try {
    const val = JSON.stringify(ids);
    if (Platform.OS === 'web') { localStorage.setItem(userStorageKey(email), val); return; }
    const { default: AS } = await import('@react-native-async-storage/async-storage');
    await AS.setItem(userStorageKey(email), val);
  } catch {}
}

export default function NotificationsScreen() {
  const { user } = useUser();
  const [notifs, setNotifs]       = useState<Notif[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [remoteMode, setRemoteMode] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const serverNotifications = await api.getNotifications();
      if (serverNotifications !== null) {
        setRemoteMode(true);
        setNotifs(serverNotifications.map((n: any) => ({
          id: String(n.id),
          title: n.title || 'แจ้งเตือน',
          body: n.body || n.message || '',
          time: n.time || n.created_at || '',
          icon: 'notifications-outline' as IoniconName,
          color: '#2563eb',
          bg: '#dbeafe',
          read: Boolean(n.read ?? n.read_at),
          route: n.route || '/(tabs)/notifications',
        })));
        setLoading(false);
        return;
      }
      setRemoteMode(false);
      const readIds = await getReadIds(user.email);
      const [allProjects, allArticles, allProposals, allResearchers] = await Promise.all([
        api.getProjects(isAdmin(user) ? 'all' : 'mine'),
        api.getArticles(isAdmin(user) ? 'all' : 'mine'),
        api.getProposals(isAdmin(user) ? 'all' : 'mine'),
        api.getResearchers(),
      ]);

      const myProjects   = filterOwned(user, allProjects)   as any[];
      const myArticles   = filterOwned(user, allArticles)   as any[];
      const myProposals  = filterOwned(user, allProposals)  as any[];

      const items: Notif[] = [];

      // ข้อเสนอรอพิจารณา (admin เห็นทั้งหมด, user เห็นของตัวเอง)
      const pendingProposals = (isAdmin(user) ? allProposals : myProposals).filter(
        (p: any) => p.status === 'รอพิจารณา'
      );
      if (pendingProposals.length > 0) {
        items.push({
          id: 'pending_proposals',
          title: 'ข้อเสนอรอพิจารณา',
          body: `มีข้อเสนอโครงการรอการพิจารณา ${pendingProposals.length} รายการ`,
          time: '',
          icon: 'document-text-outline',
          color: '#ca8a04',
          bg: '#fef9c3',
          read: readIds.includes('pending_proposals'),
          route: '/(tabs)/proposal',
        });
      }

      // โครงการกำลังดำเนินการ
      const activeProjects = myProjects.filter((p: any) => p.status === 'กำลังดำเนินการ');
      if (activeProjects.length > 0) {
        items.push({
          id: 'active_projects',
          title: 'โครงการกำลังดำเนินการ',
          body: `คุณมีโครงการที่กำลังดำเนินการอยู่ ${activeProjects.length} โครงการ`,
          time: '',
          icon: 'folder-open-outline',
          color: '#2563eb',
          bg: '#dbeafe',
          read: readIds.includes('active_projects'),
          route: '/(tabs)/project',
        });
      }

      // บทความรอตีพิมพ์
      const pendingArticles = myArticles.filter((a: any) => a.status === 'รอตีพิมพ์' || a.status === 'อยู่ระหว่างรีวิว');
      if (pendingArticles.length > 0) {
        items.push({
          id: 'pending_articles',
          title: 'บทความอยู่ระหว่างดำเนินการ',
          body: `มีบทความที่อยู่ระหว่างรอตีพิมพ์ / รีวิว ${pendingArticles.length} บทความ`,
          time: '',
          icon: 'newspaper-outline',
          color: '#7c3aed',
          bg: '#ede9fe',
          read: readIds.includes('pending_articles'),
          route: '/(tabs)/article',
        });
      }

      // ข้อเสนอที่อนุมัติแล้ว
      const approved = myProposals.filter((p: any) => p.status === 'อนุมัติ');
      if (approved.length > 0) {
        items.push({
          id: 'approved_proposals',
          title: 'ข้อเสนอได้รับการอนุมัติ',
          body: `ข้อเสนอโครงการของคุณได้รับการอนุมัติแล้ว ${approved.length} รายการ`,
          time: '',
          icon: 'checkmark-circle-outline',
          color: '#16a34a',
          bg: '#dcfce7',
          read: readIds.includes('approved_proposals'),
          route: '/(tabs)/proposal',
        });
      }

      // admin: สรุปภาพรวมระบบ
      if (isAdmin(user)) {
        items.push({
          id: 'system_summary',
          title: 'สรุปภาพรวมระบบ',
          body: `โครงการ ${allProjects.length} | บทความ ${allArticles.length} | นักวิจัย ${allResearchers.length} คน`,
          time: '',
          icon: 'analytics-outline',
          color: '#0284c7',
          bg: '#e0f2fe',
          read: readIds.includes('system_summary'),
          route: '/(tabs)',
        });
      }

      // บทความที่ตีพิมพ์แล้ว
      const published = myArticles.filter((a: any) => a.status === 'ตีพิมพ์แล้ว');
      if (published.length > 0) {
        items.push({
          id: 'published_articles',
          title: 'บทความตีพิมพ์แล้ว',
          body: `คุณมีบทความที่ตีพิมพ์แล้ว ${published.length} บทความ`,
          time: '',
          icon: 'ribbon-outline',
          color: '#db2777',
          bg: '#fce7f3',
          read: readIds.includes('published_articles'),
          route: '/(tabs)/article',
        });
      }

      setNotifs(items);
    } catch {}
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const markRead = async (id: string) => {
    if (remoteMode) {
      try { await api.markNotificationRead(id); } catch {}
    }
    const readIds = await getReadIds(user.email);
    if (!readIds.includes(id)) {
      const updated = [...readIds, id];
      await saveReadIds(user.email, updated);
    }
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = async () => {
    if (remoteMode) {
      try { await api.markAllNotificationsRead(); } catch {}
    }
    const ids = notifs.map(n => n.id);
    await saveReadIds(user.email, ids);
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  };

  const dismiss = async (id: string) => {
    if (remoteMode) {
      try { await api.deleteNotification(id); } catch { return; }
    }
    const readIds = await getReadIds(user.email);
    await saveReadIds(user.email, [...readIds, id]);
    setNotifs(prev => prev.filter(n => n.id !== id));
  };

  const unreadCount = notifs.filter(n => !n.read).length;

  const openNotification = async (notification: Notif) => {
    await markRead(notification.id);
    router.push(notification.route as any);
  };

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
              <Ionicons name="notifications-outline" size={20} color="#16a34a" />
              <Text style={s.pageTitle}>การแจ้งเตือน</Text>
            </View>
            <Text style={s.pageSub}>
              {unreadCount > 0 ? `ยังไม่ได้อ่าน ${unreadCount} รายการ` : 'อ่านทั้งหมดแล้ว'}
            </Text>
          </View>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={markAllRead} style={s.markAllBtn}>
              <Ionicons name="checkmark-done-outline" size={14} color="#16a34a" />
              <Text style={s.markAllTxt}>อ่านทั้งหมด</Text>
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <ActivityIndicator color="#16a34a" style={{ marginTop: 40 }} />
        ) : notifs.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="notifications-off-outline" size={52} color="#d1d5db" />
            <Text style={s.emptyTxt}>ไม่มีการแจ้งเตือน</Text>
            <Text style={s.emptySub}>ระบบจะแจ้งเตือนเมื่อมีการเปลี่ยนแปลง</Text>
          </View>
        ) : (
          <>
            {notifs.map((n) => (
              <TouchableOpacity
                key={n.id}
                style={[s.card, !n.read && s.cardUnread]}
                onPress={() => openNotification(n)}
                onLongPress={() => dismiss(n.id)}
                activeOpacity={0.75}
              >
                <View style={[s.iconWrap, { backgroundColor: n.bg }]}>
                  <Ionicons name={n.icon} size={22} color={n.color} />
                </View>
                <View style={s.cardContent}>
                  <View style={s.cardTop}>
                    <Text style={[s.cardTitle, n.read && s.cardTitleRead]}>{n.title}</Text>
                    {!n.read && <View style={[s.dot, { backgroundColor: n.color }]} />}
                  </View>
                  <Text style={s.cardBody}>{n.body}</Text>
                  <View style={s.openRow}>
                    <Text style={s.openTxt}>ดูรายละเอียด</Text>
                    <Ionicons name="chevron-forward" size={13} color="#16a34a" />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
            <Text style={s.hint}>กดค้างเพื่อปิดการแจ้งเตือน</Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eef7f0' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },

  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  pageTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  pageSub: { fontSize: 12, color: '#6b7280' },
  markAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#dcfce7', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  markAllTxt: { color: '#16a34a', fontSize: 12, fontWeight: '600' },

  card: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16,
    padding: 14, marginBottom: 10, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  cardUnread: { backgroundColor: '#eef7f0', borderLeftWidth: 3, borderLeftColor: '#16a34a' },
  iconWrap: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  cardContent: { flex: 1, justifyContent: 'center' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#111827', flex: 1 },
  cardTitleRead: { color: '#6b7280', fontWeight: '600' },
  dot: { width: 8, height: 8, borderRadius: 4, marginLeft: 6 },
  cardBody: { fontSize: 12, color: '#6b7280', lineHeight: 18 },
  openRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 6 },
  openTxt: { fontSize: 11, color: '#16a34a', fontWeight: '700' },

  empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyTxt: { fontSize: 15, color: '#374151', fontWeight: '600' },
  emptySub: { fontSize: 12, color: '#9ca3af' },

  hint: { textAlign: 'center', fontSize: 11, color: '#d1d5db', marginTop: 12 },
});
