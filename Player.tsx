import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  Dimensions, FlatList, Alert,
} from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useApp } from './AppContext';

const { width } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function Player({ visible, onClose }: Props) {
  const {
    playing, setPlaying, isPlaying, setIsPlaying,
    playNext, playPrev, isShuffle, toggleShuffle,
    isRepeat, toggleRepeat, progress, duration, seekTo,
    namedPlaylists, addTrackToNamedPlaylist, t,
  } = useApp();

  const [showAddPl, setShowAddPl] = useState(false);

  if (!playing) return null;

  const fmt = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  const toggle = () => setIsPlaying(!isPlaying);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
            <Ionicons name="chevron-down" size={28} color="#aaa" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t.nowPlaying}</Text>
          <TouchableOpacity onPress={() => setShowAddPl(true)} style={styles.headerBtn}>
            <Ionicons name="add-circle-outline" size={26} color="#00cfff" />
          </TouchableOpacity>
        </View>

        {/* Artwork */}
        <View style={styles.artworkContainer}>
          <View style={styles.artwork}>
            <Ionicons name="musical-notes" size={80} color="#00cfff44" />
          </View>
        </View>

        {/* Song info */}
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>{playing.title || t.noTitle}</Text>
          <Text style={styles.artist} numberOfLines={1}>{playing.artist || t.noArtist}</Text>
        </View>

        {/* Seek bar */}
        <View style={styles.seekContainer}>
          <Slider
            style={{ width: '100%', height: 40 }}
            minimumValue={0}
            maximumValue={duration || 1}
            value={progress}
            onSlidingComplete={seekTo}
            minimumTrackTintColor="#00cfff"
            maximumTrackTintColor="#2a2a35"
            thumbTintColor="#00cfff"
          />
          <View style={styles.timeRow}>
            <Text style={styles.time}>{fmt(progress)}</Text>
            <Text style={styles.time}>{fmt(duration)}</Text>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity onPress={toggleShuffle} style={styles.sideBtn}>
            <Ionicons
              name="shuffle"
              size={24}
              color={isShuffle ? '#00cfff' : '#444'}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={playPrev} style={styles.ctrlBtn}>
            <Ionicons name="play-skip-back" size={30} color="#ccc" />
          </TouchableOpacity>
          <TouchableOpacity onPress={toggle} style={styles.playBtn}>
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={32} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity onPress={playNext} style={styles.ctrlBtn}>
            <Ionicons name="play-skip-forward" size={30} color="#ccc" />
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleRepeat} style={styles.sideBtn}>
            <Ionicons
              name="repeat"
              size={24}
              color={isRepeat ? '#00cfff' : '#444'}
            />
          </TouchableOpacity>
        </View>

      </View>

      {/* Add to Named Playlist Modal */}
      <Modal visible={showAddPl} transparent animationType="fade">
        <TouchableOpacity
          style={styles.overlay}
          onPress={() => setShowAddPl(false)}
          activeOpacity={1}
        >
          <View style={styles.plModal}>
            <Text style={styles.plModalTitle}>{t.addToPlaylist}</Text>
            {namedPlaylists.length === 0 ? (
              <Text style={styles.plEmpty}>Nav spēlsarakstu. Izveido Playliste cilnē!</Text>
            ) : (
              <FlatList
                data={namedPlaylists}
                keyExtractor={(i) => i.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.plItem}
                    onPress={() => {
                      addTrackToNamedPlaylist(item.id, playing);
                      setShowAddPl(false);
                      Alert.alert('✓', `"${playing.title}" → "${item.name}"`);
                    }}
                  >
                    <Ionicons name="musical-notes" size={18} color="#00cfff" />
                    <Text style={styles.plItemName}>{item.name}</Text>
                    <Text style={styles.plItemCount}>{item.tracks.length}</Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f', paddingTop: 54, paddingHorizontal: 24 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 },
  headerBtn: { padding: 4 },
  headerTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  artworkContainer: { alignItems: 'center', marginBottom: 32 },
  artwork: {
    width: width - 64, height: width - 64, borderRadius: 20,
    backgroundColor: '#111118', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#00cfff22',
  },
  info: { alignItems: 'center', marginBottom: 24 },
  title: { color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center' },
  artist: { color: '#888', fontSize: 15, marginTop: 6 },
  seekContainer: { marginBottom: 16 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -8 },
  time: { color: '#555', fontSize: 12 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 },
  sideBtn: { padding: 12 },
  ctrlBtn: { padding: 10 },
  playBtn: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: '#00cfff', alignItems: 'center', justifyContent: 'center',
  },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  plModal: {
    backgroundColor: '#111118', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: 360,
  },
  plModalTitle: { color: '#fff', fontSize: 17, fontWeight: '700', marginBottom: 14 },
  plEmpty: { color: '#555', textAlign: 'center', padding: 20 },
  plItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1a1a25', gap: 12,
  },
  plItemName: { flex: 1, color: '#fff', fontSize: 15 },
  plItemCount: { color: '#555', fontSize: 13 },
});
