import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../AppContext';

export default function TabLayout() {
  const { t, user } = useApp();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#111118', borderTopColor: '#00cfff33', height: 62, paddingBottom: 8 },
        tabBarActiveTintColor: '#00cfff',
        tabBarInactiveTintColor: '#555',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t.home, tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="explore"
        options={{ title: t.search, tabBarIcon: ({ color, size }) => <Ionicons name="search" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="playlist"
        options={{ title: t.playlist, tabBarIcon: ({ color, size }) => <Ionicons name="list" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: t.profile, tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Admin',
          tabBarIcon: ({ color, size }) => <Ionicons name="shield-checkmark" size={size} color={color} />,
          tabBarItemStyle: user?.isAdmin ? {} : { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="diag"
        options={{
          title: 'Diag',
          tabBarIcon: ({ color, size }) => <Ionicons name="construct" size={size} color={color} />,
          tabBarItemStyle: user?.isAdmin ? {} : { display: 'none' },
        }}
      />
    </Tabs>
  );
}
