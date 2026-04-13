import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useApp } from '../AppContext';

export default function Player() {
  const {
    playing, setPlaying, isPlaying, setIsPlaying,
    playNext, playPrev, shuffle, setShuffle, repeat, setRepeat,
  } = useApp();

  const sound = useRef<Audio.Sound | null>(null);
  const currentId = useRef<string>('');

  const [position, setPosition] = useState(0);   // ms
  const [duration, setDuration] = useState(0);   // ms
  const [seeking, setSeeking] = useState(false);

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
      setPosition(0);
      setDuration(0);

      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });

      const { sound: s } = await Audio.Sound.createAsync(
        { uri: playing.cloudUrl },
        { shouldPlay: true },
        (status: any) => {
          if (!status.isLoaded) return;
          if (!seeking) setPosition(status.positionMillis || 0);
          setDuration(status.durationMillis || 0);
          if (status.didJustFinish) {
            if (repeat) {
              s.replayAsync();
            } else {
              playNext();
            }
          }
        }
      );
      sound.current = s;
      setIsPlaying(true);
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

  const seekTo = async (ratio: number) => {
    if (!sound.current || !duration) return;
    const ms = ratio * duration;
    setSeeking(true);
    await sound.current.setPositionAsync(ms);
    setPosition(ms);
    setSeeking(false);
  };

  const fmt = (ms: number) => {
    if (!ms || isNaN(ms)) return '0:00';
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  const progress = duration > 0 ? position / duration : 0;

  if (!playing) return null;

  return (
    <View style={styles.container}>
      {/* Info rinda */}
      <View style={styles.infoRow}>
        <View style={styles.iconBox}>
          {playing.coverUrl
            ? <Image source={{ uri: playing.coverUrl }} style={styles.cover} />
            : <Ionicons name="musical-note" size={18} color="#00cfff" />
          }
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.title} numberOfLines={1}>{playing.title || '—'}</Text>
          <Text style={styles.artist} numberOfLines={1}>{playing.artist || '—'}</Text>
        </View>

        {/* Shuffle + Repeat */}
        <TouchableOpacity onPress={() => setShuffle(!shuffle)} style={styles.modeBtn}>
          <Ionicons name="shuffle" size={18} color={shuffle ? '#00cfff' : '#444'} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setRepeat(!repeat)} style={styles.modeBtn}>
          <Ionicons name="repeat" size={18} color={repeat ? '#00cfff' : '#444'} />
        </TouchableOpacity>
      </View>

      {/* Progress josla */}
      <View style={styles.progressRow}>
        <Text style={styles.time}>{fmt(position)}</Text>
        <TouchableOpacity
          style={styles.progressTrack}
          onPress={(e) => {
            const { locationX, nativeEvent } = e;
            // Aprēķina platumu no layout
            seekTo(locationX / (nativeEvent.target as any));
          }}
          activeOpacity={1}
        >
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            <View style={[styles.progressThumb, { left: `${progress * 100}%` as any }]} />
          </View>
        </TouchableOpacity>
        <Text style={styles.time}>{fmt(duration)}</Text>
      </View>

      {/* Kontroles */}
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
    paddingTop: 10,
    paddingBottom: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconBox: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: '#0d1a2a',
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
  },
  cover: { width: 36, height: 36, borderRadius: 8 },
  title: { color: '#fff', fontSize: 13, fontWeight: '600' },
  artist: { color: '#888', fontSize: 11 },
  modeBtn: { padding: 6 },

  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  time: { color: '#555', fontSize: 10, width: 32, textAlign: 'center' },
  progressTrack: { flex: 1, paddingVertical: 8 },
  progressBg: {
    height: 3, backgroundColor: '#2a2a35',
    borderRadius: 2, position: 'relative',
  },
  progressFill: {
    height: 3, backgroundColor: '#00cfff',
    borderRadius: 2,
  },
  progressThumb: {
    position: 'absolute', top: -4,
    width: 11, height: 11, borderRadius: 6,
    backgroundColor: '#00cfff',
    marginLeft: -5,
  },

  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btn: { padding: 8 },
  playBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#00cfff',
    justifyContent: 'center', alignItems: 'center',
    marginHorizontal: 10,
  },
});