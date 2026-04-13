import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, Alert,
} from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../AppContext';

export default function PlaylistScreen() {
  const {
    namedPlaylists, createNamedPlaylist,
    addTrackToNamedPlaylist, removeTrackFromNamedPlaylist,
    playlist, removeFromPlaylist,
    setPlaying, t,
  } = useApp();

  const [view, setView] = useState<'named' | 'quick'>('named');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [openPl, setOpenPl] = useState<string | null>(null);

  const handleCreate = () => {
    if (!newName.trim()) return;
    createNamedPlaylist(newName.trim());
    setNewName('');
    setShowCreate(false);
  };

  const selectedPl = namedPlaylists.find((p) => p.id === openPl);

  // Named playlist detail view
  if (selectedPl) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setOpenPl(null)} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#00cfff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{selectedPl.name}</Text>
          <Text style={styles.headerCount}>{selectedPl.tracks.length} {t.songs}</Text>
        </View>

        <FlatList
          data={selectedPl.tracks}
          keyExtractor={(tr: any) => tr._id}
          contentContainerStyle={{ padding: 14, paddingBottom: 130 }}
          renderItem={({ item }: any) => (
            <View style={styles.track}>
              <TouchableOpacity style={styles.trackLeft} onPress={() => setPlaying(item)}>
                <View style={styles.trackIcon}>
                  <Ionicons name="musical-note" size={18} color="#00cfff" />
                </View>
                <View style={styles.trackInfo}>
                  <Text style={styles.trackTitle} numberOfLines={1}>{item.title || t.noTitle}</Text>
                  <Text style={styles.trackArtist}>{item.artist || t.noArtist}</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  Alert.alert(t.removeFromPlaylist, `"${item.title}"?`, [
                    { text: t.cancel, style: 'cancel' },
                    { text: t.removeFromPlaylist, style: 'destructive', onPress: () => removeTrackFromNamedPlaylist(selectedPl.id, item._id) },
                  ])
                }
              >
                <Ionicons name="trash-outline" size={20} color="#ff4466" />
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="musical-notes-outline" size={50} color="#222" />
              <Text style={styles.emptyText}>{t.playlistEmpty}</Text>
              <Text style={styles.emptySub}>{t.playlistEmptySub}</Text>
            </View>
          }
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📋 {t.playlist}</Text>
        <TouchableOpacity onPress={() => setShowCreate(true)} style={styles.addPlBtn}>
          <Ionicons name="add" size={22} color="#00cfff" />
        </TouchableOpacity>
      </View>

      {/* Toggle */}
      <View style={styles.toggle}>
        <TouchableOpacity
          style={[styles.toggleBtn, view === 'named' && styles.toggleBtnActive]}
          onPress={() => setView('named')}
        >
          <Text style={[styles.toggleTxt, view === 'named' && styles.toggleTxtActive]}>
            {t.myPlaylists}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, view === 'quick' && styles.toggleBtnActive]}
          onPress={() => setView('quick')}
        >
          <Text style={[styles.toggleTxt, view === 'quick' && styles.toggleTxtActive]}>
            {t.myPlaylist} ({playlist.length})
          </Text>
        </TouchableOpacity>
      </View>

      {view === 'named' ? (
        <FlatList
          data={namedPlaylists}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: 14, paddingBottom: 130 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.plCard} onPress={() => setOpenPl(item.id)}>
              <View style={styles.plArt}>
                <Ionicons name="musical-notes" size={26} color="#00cfff55" />
              </View>
              <View style={styles.plInfo}>
                <Text style={styles.plName}>{item.name}</Text>
                <Text style={styles.plCount}>{item.tracks.length} {t.songs}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#333" />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="list-outline" size={50} color="#222" />
              <Text style={styles.emptyText}>{t.playlistEmpty}</Text>
              <TouchableOpacity style={styles.createBig} onPress={() => setShowCreate(true)}>
                <Text style={styles.createBigTxt}>+ {t.createPlaylist}</Text>
              </TouchableOpacity>
            </View>
          }
        />
      ) : (
        <FlatList
          data={playlist}
          keyExtractor={(tr: any) => tr._id}
          contentContainerStyle={{ padding: 14, paddingBottom: 130 }}
          renderItem={({ item }: any) => (
            <View style={styles.track}>
              <TouchableOpacity style={styles.trackLeft} onPress={() => setPlaying(item)}>
                <View style={styles.trackIcon}>
                  <Ionicons name="musical-note" size={18} color="#00cfff" />
                </View>
                <View style={styles.trackInfo}>
                  <Text style={styles.trackTitle} numberOfLines={1}>{item.title || t.noTitle}</Text>
                  <Text style={styles.trackArtist}>{item.artist || t.noArtist}</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => removeFromPlaylist(item._id)}>
                <Ionicons name="close-circle" size={22} color="#ff446688" />
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="musical-notes-outline" size={50} color="#222" />
              <Text style={styles.emptyText}>{t.playlistEmpty}</Text>
              <Text style={styles.emptySub}>{t.playlistEmptySub}</Text>
            </View>
          }
        />
      )}

      {/* Create Playlist Modal */}
      <Modal visible={showCreate} transparent animationType="fade">
        <TouchableOpacity style={styles.overlay} onPress={() => setShowCreate(false)} activeOpacity={1}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{t.createPlaylist}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder={t.playlistName}
              placeholderTextColor="#444"
              value={newName}
              onChangeText={setNewName}
              autoFocus
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowCreate(false); setNewName(''); }}>
                <Text style={styles.cancelTxt}>{t.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleCreate}>
                <Text style={styles.confirmTxt}>{t.create}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 54, paddingBottom: 14, backgroundColor: '#111118',
  },
  backBtn: { marginRight: 10 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#fff' },
  headerCount: { color: '#555', fontSize: 13 },
  title: { flex: 1, fontSize: 22, fontWeight: '800', color: '#00cfff' },
  addPlBtn: { padding: 4 },
  toggle: {
    flexDirection: 'row', margin: 14, backgroundColor: '#111118', borderRadius: 12,
  },
  toggleBtn: { flex: 1, paddingVertical: 11, alignItems: 'center', borderRadius: 12 },
  toggleBtnActive: { backgroundColor: '#00cfff' },
  toggleTxt: { color: '#444', fontWeight: '700', fontSize: 13 },
  toggleTxtActive: { color: '#000' },
  plCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111118', borderRadius: 12, padding: 12, marginBottom: 8,
  },
  plArt: {
    width: 52, height: 52, borderRadius: 10,
    backgroundColor: '#1a1a25', justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  plInfo: { flex: 1 },
  plName: { color: '#fff', fontSize: 15, fontWeight: '700' },
  plCount: { color: '#555', fontSize: 12, marginTop: 3 },
  track: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111118', borderRadius: 12, padding: 10, marginBottom: 6,
  },
  trackLeft: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  trackIcon: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#1a1a25', justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  trackInfo: { flex: 1 },
  trackTitle: { color: '#ccc', fontSize: 14, fontWeight: '600' },
  trackArtist: { color: '#555', fontSize: 12, marginTop: 2 },
  empty: { alignItems: 'center', marginTop: 60, gap: 10 },
  emptyText: { color: '#333', fontSize: 16 },
  emptySub: { color: '#222', fontSize: 13 },
  createBig: {
    marginTop: 10, backgroundColor: '#00cfff33', paddingHorizontal: 24,
    paddingVertical: 12, borderRadius: 20,
  },
  createBigTxt: { color: '#00cfff', fontWeight: '700' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center' },
  modal: { backgroundColor: '#111118', borderRadius: 20, padding: 24, width: '85%' },
  modalTitle: { color: '#fff', fontSize: 17, fontWeight: '700', marginBottom: 16 },
  modalInput: {
    backgroundColor: '#0a0a0f', borderRadius: 12, padding: 14,
    color: '#fff', fontSize: 15, borderWidth: 1, borderColor: '#2a2a35', marginBottom: 16,
  },
  modalBtns: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, backgroundColor: '#1a1a25', borderRadius: 12, padding: 13, alignItems: 'center' },
  cancelTxt: { color: '#888', fontWeight: '600' },
  confirmBtn: { flex: 1, backgroundColor: '#00cfff', borderRadius: 12, padding: 13, alignItems: 'center' },
  confirmTxt: { color: '#000', fontWeight: '800' },
});
