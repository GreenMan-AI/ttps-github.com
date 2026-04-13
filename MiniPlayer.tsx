import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from './AppContext';

interface Props {
  onPress: () => void;
}

export default function MiniPlayer({ onPress }: Props) {
  const { playing, isPlaying, setIsPlaying, playNext, playPrev } = useApp();

  if (!playing) return null;

  const toggle = () => setIsPlaying(!isPlaying);

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.iconBox}>
        <Ionicons name="musical-note" size={18} color="#00cfff" />
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{playing.title || '---'}</Text>
        <Text style={styles.artist} numberOfLines={1}>{playing.artist || '---'}</Text>
      </View>
      <TouchableOpacity onPress={(e) => { e.stopPropagation(); playPrev(); }} style={styles.btn}>
        <Ionicons name="play-skip-back" size={20} color="#ccc" />
      </TouchableOpacity>
      <TouchableOpacity onPress={(e) => { e.stopPropagation(); toggle(); }} style={styles.playBtn}>
        <Ionicons name={isPlaying ? 'pause' : 'play'} size={20} color="#000" />
      </TouchableOpacity>
      <TouchableOpacity onPress={(e) => { e.stopPropagation(); playNext(); }} style={styles.btn}>
        <Ionicons name="play-skip-forward" size={20} color="#ccc" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute', bottom: 60, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#161622', borderTopColor: '#00cfff33', borderTopWidth: 1,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  iconBox: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#0d1a2a', justifyContent: 'center', alignItems: 'center',
    marginRight: 10,
  },
  info: { flex: 1 },
  title: { color: '#fff', fontSize: 13, fontWeight: '600' },
  artist: { color: '#888', fontSize: 11 },
  btn: { padding: 6 },
  playBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#00cfff', justifyContent: 'center', alignItems: 'center',
    marginHorizontal: 4,
  },
});
