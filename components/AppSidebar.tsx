import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { useUser } from '@/context/UserContext';
import { router } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';

type Route = '/(tabs)' | '/(tabs)/researcher' | '/(tabs)/project' | '/(tabs)/article' | '/(tabs)/profile' | '/(tabs)/notifications' | '/(tabs)/proposal' | '/(tabs)/report' | '/(tabs)/files' | '/(tabs)/print-history';
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const MENUS: { icon: IoniconName; label: string; route: Route | null }[] = [
  { icon: 'home-outline',         label: 'หน้าแรก',        route: '/(tabs)' },
  { icon: 'person-outline',       label: 'นักวิจัย',       route: '/(tabs)/researcher' },
  { icon: 'document-text-outline',label: 'ข้อเสนอโครงการ', route: '/(tabs)/proposal' },
  { icon: 'cloud-upload-outline', label: 'ส่งเล่มรายงาน',  route: '/(tabs)/report' },
  { icon: 'folder-outline',       label: 'โครงการวิจัย',   route: '/(tabs)/project' },
  { icon: 'newspaper-outline',    label: 'บทความวิจัย',    route: '/(tabs)/article' },
  { icon: 'albums-outline',       label: 'จัดการไฟล์',     route: '/(tabs)/files' },
  { icon: 'print-outline',        label: 'พิมพ์ประวัติ',   route: '/(tabs)/print-history' },
  { icon: 'log-out-outline',      label: 'ออกจากระบบ',     route: null },
];

interface Props {
  active: Route;
}

export function AppSidebar({ active }: Props) {
  const { clearUser } = useUser();

  const handlePress = async (menu: typeof MENUS[0]) => {
    if (menu.label === 'ออกจากระบบ') {
      await api.logout();
      await clearUser();
      router.replace('/login');
      return;
    }
    if (menu.route) {
      router.replace(menu.route);
      return;
    }
    Alert.alert('กำลังพัฒนา', 'ฟีเจอร์นี้จะเปิดใช้งานเร็วๆ นี้ 🚧');
  };

  return (
    <ScrollView style={styles.sidebar} showsVerticalScrollIndicator={false}>
      {MENUS.map((menu, i) => {
        const isActive = menu.route === active;
        return (
          <TouchableOpacity
            key={i}
            style={[styles.item, isActive && styles.itemActive]}
            onPress={() => handlePress(menu)}
          >
            <Ionicons name={menu.icon} size={15} color={isActive ? '#fff' : '#374151'} />
            <Text style={[styles.label, isActive && styles.labelActive]}>{menu.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sidebar: { width: 80, backgroundColor: '#fff', borderRightWidth: 1, borderRightColor: '#e5e7eb' },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 6, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  itemActive: { backgroundColor: '#16a34a' },
  icon: { width: 16, alignItems: 'center' },
  label: { fontSize: 9, color: '#374151', flex: 1 },
  labelActive: { color: '#fff', fontWeight: '600' },
});
