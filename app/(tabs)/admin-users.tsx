import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '@/components/AppHeader';
import { useUser } from '@/context/UserContext';
import { isAdmin } from '@/services/permissions';
import { api, getApiErrorMessage } from '@/services/api';
import { confirmAction } from '@/services/confirm';
import { useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const COLORS = ['#16a34a', '#2563eb', '#7c3aed', '#d97706', '#db2777', '#0284c7'];

export default function AdminUsersScreen() {
  const { user } = useUser();
  const [users, setUsers]           = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const list = await api.getUsers();
    setUsers(list.sort((a: any, b: any) => (a.role === 'admin' ? -1 : 1)));
  };

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const toggleRole = (u: any) => {
    if (u.email === user.email) {
      Alert.alert('ไม่สามารถเปลี่ยนสิทธิ์ตัวเองได้');
      return;
    }
    const newRole: 'admin' | 'user' = u.role === 'admin' ? 'user' : 'admin';
    Alert.alert(
      'เปลี่ยนสิทธิ์',
      `เปลี่ยน ${u.name} เป็น ${newRole === 'admin' ? 'Admin' : 'User'}?`,
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ยืนยัน',
          onPress: async () => {
            try {
              await api.updateUserRole(u.email, newRole);
              load();
              Alert.alert('สำเร็จ', `${u.name} จะได้รับสิทธิ์ใหม่เมื่อ login ครั้งหน้า`);
            } catch (error) {
              Alert.alert('เปลี่ยนสิทธิ์ไม่สำเร็จ', getApiErrorMessage(error));
            }
          },
        },
      ],
    );
  };

  const deleteUser = (u: any) => {
    if (u.email === user.email) {
      Alert.alert('ไม่สามารถลบบัญชีตัวเองได้');
      return;
    }
    confirmAction('ลบผู้ใช้', `ลบ ${u.name} ออกจากระบบ?`, async () => {
        try {
          await api.deleteUser(u.email);
          load();
        } catch (error) {
          Alert.alert('ลบผู้ใช้ไม่สำเร็จ', getApiErrorMessage(error));
        }
      });
  };

  if (!isAdmin(user)) {
    return (
      <View style={s.container}>
        <AppHeader />
        <View style={s.denied}>
          <Ionicons name="lock-closed-outline" size={52} color="#d1d5db" />
          <Text style={s.deniedTxt}>เฉพาะ Admin เท่านั้น</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <AppHeader />
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#16a34a']} tintColor="#16a34a" />}
      >
        <View style={s.pageHeader}>
          <View style={s.titleRow}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#16a34a" />
            <Text style={s.pageTitle}>จัดการผู้ใช้</Text>
          </View>
          <Text style={s.pageSub}>ทั้งหมด {users.length} บัญชี · เปลี่ยน role จะมีผลเมื่อ login ครั้งถัดไป</Text>
        </View>

        {users.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="people-outline" size={52} color="#d1d5db" />
            <Text style={s.emptyTxt}>ยังไม่มีผู้ใช้ในระบบ</Text>
            <Text style={s.emptySub}>ผู้ใช้จะปรากฏที่นี่เมื่อมีการ login</Text>
          </View>
        ) : users.map((u, i) => {
          const isMe = u.email === user.email;
          const avatarColor = COLORS[i % COLORS.length];
          return (
            <View key={u.email} style={[s.card, isMe && s.cardMe]}>
              <View style={[s.avatar, { backgroundColor: avatarColor + '20' }]}>
                <Text style={[s.avatarTxt, { color: avatarColor }]}>{u.name?.charAt(0) || '?'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={s.nameRow}>
                  <Text style={s.name}>{u.name}</Text>
                  {isMe && <View style={s.meChip}><Text style={s.meChipTxt}>คุณ</Text></View>}
                </View>
                <Text style={s.email}>{u.email}</Text>
                {u.faculty ? <Text style={s.meta}>{u.faculty}{u.position ? ` · ${u.position}` : ''}</Text> : null}
                {u.createdAt ? (
                  <Text style={s.meta}>เข้าร่วม {new Date(u.createdAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}</Text>
                ) : null}
              </View>
              <View style={s.actions}>
                <TouchableOpacity
                  style={[s.roleBtn, u.role === 'admin' ? s.roleBtnAdmin : s.roleBtnUser]}
                  onPress={() => toggleRole(u)}
                  disabled={isMe}
                >
                  <Ionicons
                    name={u.role === 'admin' ? 'shield-checkmark' : 'person'}
                    size={12}
                    color={u.role === 'admin' ? '#f59e0b' : '#6b7280'}
                  />
                  <Text style={[s.roleTxt, u.role === 'admin' ? s.roleTxtAdmin : s.roleTxtUser]}>
                    {u.role === 'admin' ? 'Admin' : 'User'}
                  </Text>
                </TouchableOpacity>
                {!isMe && (
                  <TouchableOpacity style={s.delBtn} onPress={() => deleteUser(u)}>
                    <Ionicons name="trash-outline" size={14} color="#dc2626" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}

        <View style={s.hint}>
          <Ionicons name="information-circle-outline" size={14} color="#9ca3af" />
          <Text style={s.hintTxt}>ล็อกอินด้วย admin@admin.com จะได้สิทธิ์ Admin โดยอัตโนมัติ</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eef7f0' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },

  pageHeader: { marginBottom: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  pageTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  pageSub: { fontSize: 12, color: '#6b7280' },

  denied: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  deniedTxt: { fontSize: 14, color: '#9ca3af', fontWeight: '500' },

  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTxt: { fontSize: 14, color: '#374151', fontWeight: '600' },
  emptySub: { fontSize: 12, color: '#9ca3af' },

  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardMe: { borderWidth: 1.5, borderColor: '#bbf7d0' },
  avatar: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  avatarTxt: { fontSize: 20, fontWeight: '700' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  name: { fontSize: 14, fontWeight: '700', color: '#111827' },
  meChip: { backgroundColor: '#dcfce7', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  meChipTxt: { fontSize: 9, color: '#16a34a', fontWeight: '700' },
  email: { fontSize: 11, color: '#6b7280', marginBottom: 2 },
  meta: { fontSize: 10, color: '#9ca3af' },

  actions: { gap: 6, alignItems: 'center' },
  roleBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  roleBtnAdmin: { backgroundColor: '#fef9c3' },
  roleBtnUser: { backgroundColor: '#f3f4f6' },
  roleTxt: { fontSize: 11, fontWeight: '700' },
  roleTxtAdmin: { color: '#ca8a04' },
  roleTxtUser: { color: '#6b7280' },
  delBtn: { backgroundColor: '#fee2e2', borderRadius: 8, padding: 7 },

  hint: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 8, padding: 12, backgroundColor: '#eef7f0', borderRadius: 12 },
  hintTxt: { fontSize: 11, color: '#6b7280', flex: 1, lineHeight: 16 },
});
