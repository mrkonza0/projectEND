import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@/context/UserContext';
import { filterOwned, isAdmin } from '@/services/permissions';
import { checkBackendOnline, api } from '@/services/api';
import { router, usePathname } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '@/constants/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const MENUS: { icon: IoniconName; label: string; route: string | null }[] = [
  { icon: 'home-outline',              label: 'หน้าแรก',        route: '/(tabs)' },
  { icon: 'person-outline',            label: 'นักวิจัย',       route: '/(tabs)/researcher' },
  { icon: 'document-text-outline',     label: 'ข้อเสนอโครงการ', route: '/(tabs)/proposal' },
  { icon: 'cloud-upload-outline',      label: 'ส่งเล่มรายงาน',  route: '/(tabs)/report' },
  { icon: 'folder-outline',            label: 'โครงการวิจัย',   route: '/(tabs)/project' },
  { icon: 'newspaper-outline',         label: 'บทความวิจัย',    route: '/(tabs)/article' },
  { icon: 'albums-outline',            label: 'จัดการไฟล์',     route: '/(tabs)/files' },
  { icon: 'print-outline',             label: 'พิมพ์ประวัติ',   route: '/(tabs)/print-history' },
  { icon: 'shield-checkmark-outline',  label: 'จัดการผู้ใช้',   route: '/(tabs)/admin-users' },
  { icon: 'settings-outline',          label: 'โปรไฟล์',        route: '/(tabs)/profile' },
  { icon: 'log-out-outline',           label: 'ออกจากระบบ',     route: null },
];

const NOTIF_KEY = 'notif_read_ids';
const userNotificationKey = (email: string) => `${NOTIF_KEY}:${email.trim().toLowerCase() || 'guest'}`;
async function getReadIds(email: string): Promise<string[]> {
  try {
    if (Platform.OS === 'web') return JSON.parse(localStorage.getItem(userNotificationKey(email)) || '[]');
    const { default: AS } = await import('@react-native-async-storage/async-storage');
    return JSON.parse((await AS.getItem(userNotificationKey(email))) || '[]');
  } catch { return []; }
}

export function AppHeader() {
  const { user, clearUser } = useUser();
  const [online, setOnline]     = useState<boolean | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [headerH, setHeaderH]   = useState(80);
  const [unread, setUnread]     = useState(0);
  const pathname = usePathname();
  const insets   = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const drawerWidth = Math.min(300, Math.max(240, width - 48));
  const drawerMaxHeight = Math.max(260, height - headerH - insets.bottom - 16);

  useEffect(() => { checkBackendOnline().then(setOnline); }, []);

  const loadUnread = useCallback(async () => {
    try {
      const readIds = await getReadIds(user.email);
      const [allProjects, allArticles, allProposals] = await Promise.all([
        api.getProjects(), api.getArticles(), api.getProposals(),
      ]);
      const myProjects  = filterOwned(user, allProjects)  as any[];
      const myArticles  = filterOwned(user, allArticles)  as any[];
      const myProposals = filterOwned(user, allProposals) as any[];

      const ids: string[] = [];
      if ((isAdmin(user) ? allProposals : myProposals).filter((p: any) => p.status === 'รอพิจารณา').length > 0) ids.push('pending_proposals');
      if (myProjects.filter((p: any) => p.status === 'กำลังดำเนินการ').length > 0) ids.push('active_projects');
      if (myArticles.filter((a: any) => a.status === 'รอตีพิมพ์' || a.status === 'อยู่ระหว่างรีวิว').length > 0) ids.push('pending_articles');
      if (myProposals.filter((p: any) => p.status === 'อนุมัติ').length > 0) ids.push('approved_proposals');
      if (isAdmin(user)) ids.push('system_summary');
      if (myArticles.filter((a: any) => a.status === 'ตีพิมพ์แล้ว').length > 0) ids.push('published_articles');
      setUnread(ids.filter(id => !readIds.includes(id)).length);
    } catch {}
  }, [user]);

  useEffect(() => { loadUnread(); }, [pathname, loadUnread]);

  const handleMenu = async (menu: typeof MENUS[0]) => {
    setMenuOpen(false);
    if (!menu.route) {
      await api.logout(); await clearUser(); router.replace('/login'); return;
    }
    router.replace(menu.route as any);
  };

  const isActive = (route: string | null) => {
    if (!route) return false;
    if (route === '/(tabs)') return pathname === '/(tabs)' || pathname === '/';
    return pathname === route;
  };

  const initial = (user.name || 'U').charAt(0).toUpperCase();
  const isHome = pathname === '/(tabs)' || pathname === '/';

  return (
    <>
      <View style={[s.header, { paddingTop: insets.top + 8 }]} onLayout={e => setHeaderH(e.nativeEvent.layout.height)}>
        {/* Left: avatar (opens menu) */}
        <View style={s.leftActions}>
          <TouchableOpacity onPress={() => setMenuOpen(v => !v)} style={s.avatarBtn} activeOpacity={0.8}>
            <View style={s.avatar}>
              <Text style={s.avatarTxt}>{initial}</Text>
            </View>
          </TouchableOpacity>
          {!isHome && (
            <TouchableOpacity
              onPress={() => router.replace('/(tabs)')}
              style={s.homeBtn}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="กลับหน้าหลัก"
            >
              <Ionicons name="home-outline" size={19} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        {/* Center: brand */}
        <View style={s.center}>
          <Text style={s.brand} numberOfLines={1}>URU Research</Text>
          <View style={s.onlineRow}>
            <View style={[s.dot, online === true ? s.dotOn : online === false ? s.dotOff : s.dotWait]} />
            <Text style={s.onlineTxt}>{online === null ? '...' : online ? 'Online' : 'Offline'}</Text>
          </View>
        </View>

        {/* Right: notifications + logout */}
        <View style={s.right}>
          <TouchableOpacity style={s.iconBtn} onPress={() => router.push('/(tabs)/notifications' as any)}>
            <Ionicons name="notifications-outline" size={22} color="#fff" />
            {unread > 0 && (
              <View style={s.badge}>
                <Text style={s.badgeTxt}>{unread > 9 ? '9+' : unread}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn} onPress={async () => {
            await api.logout(); await clearUser(); router.replace('/login');
          }}>
            <Ionicons name="log-out-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Sidebar overlay */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <View style={StyleSheet.absoluteFill}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setMenuOpen(false)}>
            <View style={[s.backdrop, { paddingTop: headerH }]} />
          </TouchableOpacity>
          <View style={[s.drawer, { top: headerH, width: drawerWidth, maxHeight: drawerMaxHeight }]} onStartShouldSetResponder={() => true}>
            {/* User info top */}
            <View style={s.drawerUser}>
              <View style={s.drawerAvatar}>
                <Text style={s.drawerAvatarTxt}>{initial}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.drawerName} numberOfLines={1}>{user.name || 'ผู้ใช้ระบบ'}</Text>
                <Text style={s.drawerRole}>{user.role === 'admin' ? 'ผู้ดูแลระบบ' : 'ผู้ใช้ทั่วไป'}</Text>
              </View>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              {MENUS.map((menu, i) => {
                const active   = isActive(menu.route);
                const isLogout = menu.label === 'ออกจากระบบ';
                return (
                  <TouchableOpacity
                    key={i}
                    style={[s.menuItem, active && s.menuItemActive, isLogout && s.menuItemLogout]}
                    onPress={() => handleMenu(menu)}
                  >
                    <View style={[s.menuIconWrap, active && s.menuIconWrapActive]}>
                      <Ionicons name={menu.icon} size={17} color={active ? '#fff' : isLogout ? C.error : C.primary} />
                    </View>
                    <Text style={[s.menuLabel, active && s.menuLabelActive, isLogout && s.menuLabelLogout]}>
                      {menu.label}
                    </Text>
                    {active && <Ionicons name="chevron-forward" size={13} color={C.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.primary,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
    gap: 12,
  },

  // Avatar (left)
  leftActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  avatarBtn:  {},
  avatar:     { width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)' },
  avatarTxt:  { fontSize: 18, fontWeight: '700', color: '#fff' },
  homeBtn: { width: 34, height: 34, borderRadius: 11, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' },

  // Brand (center)
  center:    { flex: 1, alignItems: 'center', minWidth: 0 },
  brand:     { fontSize: 18, fontWeight: '800', color: '#fff' },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  dot:       { width: 6, height: 6, borderRadius: 3 },
  dotOn:     { backgroundColor: '#a3e6b5' },
  dotOff:    { backgroundColor: '#fca5a5' },
  dotWait:   { backgroundColor: 'rgba(255,255,255,0.4)' },
  onlineTxt: { fontSize: 9, color: 'rgba(255,255,255,0.7)' },

  // Right icons
  right:    { flexDirection: 'row', gap: 4, flexShrink: 0 },
  iconBtn:  { padding: 6, position: 'relative' },
  badge: {
    position: 'absolute', top: 2, right: 2,
    minWidth: 15, height: 15, borderRadius: 8,
    backgroundColor: '#ef4444', borderWidth: 1.5, borderColor: C.primary,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 2,
  },
  badgeTxt: { fontSize: 8, color: '#fff', fontWeight: '800' },

  // Drawer
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  drawer: {
    position: 'absolute', left: 0,
    backgroundColor: '#fff',
    borderBottomRightRadius: 20,
    elevation: 16, shadowColor: '#000', shadowOffset: { width: 2, height: 8 }, shadowOpacity: 0.2, shadowRadius: 12,
  },
  drawerUser: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, backgroundColor: C.primary, borderTopRightRadius: 0,
  },
  drawerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center' },
  drawerAvatarTxt: { fontSize: 18, fontWeight: '700', color: '#fff' },
  drawerName: { fontSize: 13, fontWeight: '700', color: '#fff' },
  drawerRole: { fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 1 },

  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.borderLight },
  menuItemActive: { backgroundColor: C.accentLight },
  menuItemLogout: { marginTop: 4, borderTopWidth: 1, borderTopColor: C.borderLight },
  menuIconWrap: { width: 32, height: 32, borderRadius: 9, backgroundColor: C.bgSection, justifyContent: 'center', alignItems: 'center' },
  menuIconWrapActive: { backgroundColor: C.accentLight },
  menuLabel: { fontSize: 13, color: C.textSub, flex: 1 },
  menuLabelActive: { color: C.primary, fontWeight: '700' },
  menuLabelLogout: { color: C.error },
});
