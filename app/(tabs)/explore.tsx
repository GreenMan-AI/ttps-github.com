import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../AppContext';

const GENRES = ['Visi', 'Hip-Hop', 'Metal', 'Pop', 'Electronic', 'Rock', 'Jazz'];

export default function ExploreScreen() {
  const { tracks, setPlaying, playing, isPlaying, addToPlaylist, t } = useApp();
  const [search, setSearch] = useState('');
  const [genre, setGenre] = useState('Visi');

  const filtered = tracks.filter((tr: any) => {
    const matchSearch =
      tr.title?.toLowerCase().includes(search.toLowerCase()) ||
      tr.artist?.toLowerCase().includes(search.toLowerCase());
    const matchGenre = genre === 'Visi' || tr.folder === genre;
    return matchSearch && matchGenre;
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🔍 {t.search}</Text>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color="#555" />
        <TextInput
          style={styles.input}
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
        horizontal
        data={GENRES}
        keyExtractor={(i) => i}
        contentContainerStyle={styles.genres}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.genreBtn, genre === item && styles.genreBtnActive]}
            onPress={() => setGenre(item)}
          >
            <Text style={[styles.genreTxt, genre === item && styles.genreTxtActive]}>{item}</Text>
          </TouchableOpacity>
        )}
      />

      <FlatList
        data={filtered}
        keyExtractor={(tr: any) => tr._id}
        contentContainerStyle={{ padding: 14, paddingBottom: 130 }}
        renderItem={({ item }: any) => {
          const isActive = playing?._id === item._id;
          return (
            <View style={[styles.track, isActive && styles.trackActive]}>
              <TouchableOpacity style={styles.trackLeft} onPress={() => setPlaying(item)}>
                <View style={styles.trackIcon}>
                  <Ionicons name="musical-note" size={20} color={isActive ? '#00cfff' : '#555'} />
                </View>
                <View style={styles.info}>
                  <Text style={[styles.trackTitle, isActive && styles.trackTitleActive]} numberOfLines={1}>
                    {item.title || t.noTitle}
                  </Text>
                  <Text style={styles.trackArtist}>{item.artist || t.noArtist}</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => addToPlaylist(item)} style={styles.addBtn}>
                <Ionicons name="add-circle-outline" size={22} color="#00cfff55" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setPlaying(item)}>
                <Ionicons
                  name={isActive && isPlaying ? 'pause-circle' : 'play-circle-outline'}
                  size={30}
                  color="#00cfff"
                />
              </TouchableOpacity>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={50} color="#222" />
            <Text style={styles.emptyText}>{t.noTracks}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  header: { paddingHorizontal: 20, paddingTop: 54, paddingBottom: 14, backgroundColor: '#111118' },
  title: { fontSize: 22, fontWeight: '800', color: '#00cfff' },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1a1a25', margin: 14, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: '#2a2a35',
  },
  input: { flex: 1, color: '#fff', marginLeft: 8, fontSize: 15 },
  genres: { paddingHorizontal: 14, paddingBottom: 10 },
  genreBtn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#1a1a25', marginRight: 8,
  },
  genreBtnActive: { backgroundColor: '#00cfff' },
  genreTxt: { color: '#555', fontWeight: '600' },
  genreTxtActive: { color: '#000' },
  track: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111118', borderRadius: 12, padding: 10, marginBottom: 6,
  },
  trackActive: { backgroundColor: '#0d1a2a', borderWidth: 1, borderColor: '#00cfff33' },
  trackLeft: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  trackIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#1a1a25', justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  info: { flex: 1 },
  trackTitle: { color: '#ccc', fontSize: 14, fontWeight: '600' },
  trackTitleActive: { color: '#00cfff' },
  trackArtist: { color: '#555', fontSize: 12, marginTop: 2 },
  addBtn: { padding: 6 },
  empty: { alignItems: 'center', marginTop: 60, gap: 10 },
  emptyText: { color: '#333', fontSize: 16 },
});
