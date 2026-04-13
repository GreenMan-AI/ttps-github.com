import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, RefreshControl, Image } from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useApp, API } from '../../AppContext';

export default function HomeScreen() {
  const { tracks, setTracks, playing, isPlaying, setPlaying, addToPlaylist, t, user } = useApp();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadTracks = async () => {
    try {
      setLoading(true);
      const r = await fetch(`${API}/api/tracks`);
      const data = await r.json();
      setTracks(Array.isArray(data) ? data : (data.tracks || []));
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { loadTracks(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTracks();
    setRefreshing(false);
  };

  const filtered = tracks.filter((tr: any) =>
    tr.title?.toLowerCase().includes(search.toLowerCase()) ||
    tr.artist?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>👋 {user?.username || 'Viesis'}</Text>
          <Text style={styles.logo}>🎵 SoundForge</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.trackCount}>{tracks.length} dziesmas</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color="#555" />
        <TextInput
          style={styles.searchInput}
          placeholder={t.searchPlaceholder}
          placeholderTextColor="#444"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color="#555" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item: any) => item._id}
        contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 140 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00cfff" />
        }
        renderItem={({ item, index }: any) => {
          const isActive = playing?._id === item._id;
          return (
            <TouchableOpacity
              style={[styles.track, isActive && styles.trackActive]}
              onPress={() => setPlaying(item)}
            >
              <View style={styles.indexBox}>
                {isActive && isPlaying
                  ? <Ionicons name="volume-high" size={16} color="#00cfff" />
                  : <Text style={styles.indexNum}>{index + 1}</Text>
                }
              </View>
              {/* Cover art vai ikona */}
              <View style={styles.trackIcon}>
                {item.coverUrl ? (
                  <Image
                    source={{ uri: item.coverUrl }}
                    style={styles.coverImg}
                    resizeMode="cover"
                  />
                ) : (
                  <Ionicons name="musical-note" size={20} color={isActive ? '#00cfff' : '#555'} />
                )}
              </View>
              <View style={styles.trackInfo}>
                <Text style={[styles.trackTitle, isActive && styles.trackTitleActive]} numberOfLines={1}>
                  {item.title || t.noTitle}
                </Text>
                <Text style={styles.trackArtist} numberOfLines={1}>
                  {item.artist || t.noArtist}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => addToPlaylist(item)}
                style={styles.addBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="add-circle-outline" size={24} color="#00cfff55" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setPlaying(item)}>
                <Ionicons
                  name={isActive && isPlaying ? 'pause-circle' : 'play-circle'}
                  size={32}
                  color="#00cfff"
                />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="musical-notes-outline" size={60} color="#222" />
            <Text style={styles.emptyText}>
              {loading ? 'Ielādē...' : t.noTracks}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    paddingHorizontal: 20, paddingTop: 54, paddingBottom: 14,
    backgroundColor: '#111118',
  },
  greeting: { color: '#555', fontSize: 13 },
  logo: { fontSize: 22, fontWeight: '800', color: '#00cfff' },
  headerRight: { paddingBottom: 2 },
  trackCount: { color: '#333', fontSize: 12 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1a1a25', margin: 14, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: '#2a2a35',
  },
  searchInput: { flex: 1, color: '#fff', marginLeft: 8, fontSize: 15 },
  track: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111118', borderRadius: 12,
    padding: 10, marginBottom: 6,
  },
  trackActive: { backgroundColor: '#0d1a2a', borderWidth: 1, borderColor: '#00cfff33' },
  indexBox: { width: 24, alignItems: 'center', marginRight: 6 },
  indexNum: { color: '#333', fontSize: 12 },
  trackIcon: {
    width: 40, height: 40, borderRadius: 8,
    backgroundColor: '#1a1a25',
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
    overflow: 'hidden',
  },
  coverImg: { width: 40, height: 40, borderRadius: 8 },
  trackInfo: { flex: 1 },
  trackTitle: { color: '#ccc', fontSize: 14, fontWeight: '600' },
  trackTitleActive: { color: '#00cfff' },
  trackArtist: { color: '#555', fontSize: 12, marginTop: 2 },
  addBtn: { padding: 4, marginRight: 4 },
  empty: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText: { color: '#333', fontSize: 16 },
});
