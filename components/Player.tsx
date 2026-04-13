import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useApp } from '../AppContext';

export default function Player() {
  const { playing, setPlaying, isPlaying, setIsPlaying, playNext, playPrev } = useApp();
  const sound = useRef<Audio.Sound | null>(null);
  const currentId = useRef<string>('');

  useEffect(() => {
    if (!playing) return;
    if (currentId.current === playing._id && sound.current) {
      isPlaying ? sound.current.playAsync() : sound.current.pauseAsync();
      return;
    }
    loadAndPlay();
  }, [playing, isPlaying]);

  useEffect(() => {
    return () => { sound.current?.unloadAsync(); };
  }, []);

  const loadAndPlay = async () => {
    try {
      if (sound.current) {
        await sound.current.unloadAsync();
        sound.current = null;
      }
      if (!playing?.cloudUrl) return;
      currentId.current = playing._id;
      const { sound: s } = await Audio.Sound.createAsync(
        { uri: playing.cloudUrl },
        { shouldPlay: true }
      );
      sound.current = s;
      setIsPlaying(true);
      s.setOnPlaybackStatusUpdate((status: any) => {
        if (status.didJustFinish) playNext();
      });
    } catch (e) {
      console.log('Player error:', e);
    }
  };

  const toggle = async () => {
    if (!sound.current) return;
    if (isPlaying) {
      await sound.current.pauseAsync();
      setIsPlaying(false);
    } else {
      await sound.current.playAsync();
      setIsPlaying(true);
    }
  };

  if (!playing) return null;

  return (
    <View style={styles.container}>
      <View style={styles.info}>
        <View style={styles.iconBox}>
          <Ionicons name="musical-note" size={18} color="#00cfff" />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.title} numberOfLines={1}>{playing.title || '—'}</Text>
          <Text style={styles.artist} numberOfLines={1}>{playing.artist || '—'}</Text>
        </View>
      </View>
      <View style={styles.controls}>
        <TouchableOpacity onPress={playPrev} style={styles.btn}>
          <Ionicons name="play-skip-back" size={22} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity onPress={toggle} style={styles.playBtn}>
          <Ionicons name={isPlaying ? 'pause' : 'play'} size={26} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity onPress={playNext} style={styles.btn}>
          <Ionicons name="play-skip-forward" size={22} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => { sound.current?.unloadAsync(); setPlaying(null); setIsPlaying(false); }}
          style={styles.btn}
        >
          <Ionicons name="close" size={22} color="#ff4466" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#161622',
    borderTopColor: '#00cfff33',
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  info: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  iconBox: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#0d1a2a',
    justifyContent: 'center', alignItems: 'center',
  },
  title: { color: '#fff', fontSize: 13, fontWeight: '600' },
  artist: { color: '#888', fontSize: 11 },
  controls: { flexDirection: 'row', alignItems: 'center' },
  btn: { padding: 6 },
  playBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#00cfff',
    justifyContent: 'center', alignItems: 'center',
    marginHorizontal: 6,
  },
});
