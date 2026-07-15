import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '@/constants/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, color, focused }: { name: IoniconName; color: string; focused: boolean }) {
  return (
    <View style={[s.iconWrap, focused && s.iconWrapActive]}>
      <Ionicons name={name} size={22} color={color} />
    </View>
  );
}

const s = StyleSheet.create({
  iconWrap:       { width: 44, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  iconWrapActive: { backgroundColor: C.accentLight },
});

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 8);

  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor:   C.primary,
      tabBarInactiveTintColor: C.textMuted,
      tabBarStyle: {
        backgroundColor: '#fff',
        borderTopWidth: 0,
        height: 66 + bottomPad,
        paddingBottom: bottomPad,
        paddingTop: 6,
        elevation: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      tabBarItemStyle: { paddingTop: 2, paddingBottom: 2 },
      tabBarLabelStyle: { fontSize: 11, lineHeight: 16, fontWeight: '700', marginTop: 1, marginBottom: 1 },
    }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'หน้าแรก',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'home' : 'home-outline'} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="project"
        options={{
          title: 'โครงการ',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'folder' : 'folder-outline'} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'แจ้งเตือน',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'notifications' : 'notifications-outline'} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'โปรไฟล์',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'settings' : 'settings-outline'} color={color} focused={focused} />
          ),
        }}
      />

      {/* Hidden — accessible via sidebar / header */}
      <Tabs.Screen name="researcher"    options={{ href: null }} />
      <Tabs.Screen name="article"       options={{ href: null }} />
      <Tabs.Screen name="explore"       options={{ href: null }} />
      <Tabs.Screen name="edit-profile"  options={{ href: null }} />
      <Tabs.Screen name="proposal"      options={{ href: null }} />
      <Tabs.Screen name="report"        options={{ href: null }} />
      <Tabs.Screen name="files"         options={{ href: null }} />
      <Tabs.Screen name="print-history" options={{ href: null }} />
      <Tabs.Screen name="admin-users"   options={{ href: null }} />
    </Tabs>
  );
}
