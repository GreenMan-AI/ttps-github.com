import { useState } from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../AppContext';
import MiniPlayer from '../../MiniPlayer';
import Player from '../../Player';

export default function TabLayout() {
  const { t, playing } = useApp();
  const [showPlayer, setShowPlayer] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0f' }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#111118',
            borderTopColor: '#00cfff33',
            height: 60,
            paddingBottom: 8,
          },
          tabBarActiveTintColor: '#00cfff',
          tabBarInactiveTintColor: '#555',
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t.home,
            tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: t.search,
            tabBarIcon: ({ color, size }) => <Ionicons name="search" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="playlist"
          options={{
            title: t.playlist,
            tabBarIcon: ({ color, size }) => <Ionicons name="list" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: t.profile,
            tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
          }}
        />
      </Tabs>

      {playing && <MiniPlayer onPress={() => setShowPlayer(true)} />}
      <Player visible={showPlayer} onClose={() => setShowPlayer(false)} />
    </View>
  );
}
