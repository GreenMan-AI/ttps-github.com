import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl, Modal, Alert, ScrollView,
  Animated, Easing, Dimensions, AppState, Image,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { useApp, API } from '../AppContext';
import { Lang } from '../i18n';
import MoodScreen from './MoodScreen';

const { width: SW, height: SH } = Dimensions.get('window');
const INACTIVITY_MS = 2 * 60 * 1000;

const COLORS = ['#00cfff','#a855f7','#22d3ee','#f59e0b','#10b981','#ef4444','#6366f1','#ec4899'];
const TRACK_COLORS = ['#00cfff','#a855f7','#f59e0b','#10b981','#ef4444','#6366f1','#ec4899','#22d3ee'];

function useChameleon(ms = 3000) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI(x => (x + 1) % COLORS.length), ms);
    return () => clearInterval(t);
  }, []);
  return COLORS[i];
}

// ════════════════════════════════
//  BANNER
// ════════════════════════════════
function Banner() {
  const { banner, setBanner } = useApp() as any;
  const anim = useRef(new Animated.Value(SW)).current;
  const loop = useRef<any>(null);

  useEffect(() => {
    loop.current?.stop();
    if (!banner) return;
    anim.setValue(SW);
    loop.current = Animated.loop(
      Animated.timing(anim, { toValue: -SW * 2.2, duration: 13000, easing: Easing.linear, useNativeDriver: true })
    );
    loop.current.start();
    return () => loop.current?.stop();
  }, [banner]);

  if (!banner) return null;
  return (
    <View style={bn.wrap}>
      <Animated.Text style={[bn.txt, { transform: [{ translateX: anim }] }]}>
        {'📢  ' + banner + '     •     📢  ' + banner + '     •     📢  ' + banner}
      </Animated.Text>
      <TouchableOpacity style={bn.x} onPress={() => { loop.current?.stop(); setBanner(''); }}>
        <Ionicons name="close-circle" size={16} color="#a855f7" />
      </TouchableOpacity>
    </View>
  );
}
const bn = StyleSheet.create({
  wrap: { backgroundColor: '#160a28', height: 32, overflow: 'hidden', justifyContent: 'center' },
  txt: { color: '#c084fc', fontSize: 13, fontWeight: '700', position: 'absolute', paddingHorizontal: 8 },
  x: { position: 'absolute', right: 8, zIndex: 10 },
});

// ════════════════════════════════
//  PLAYER BAR — ar progress joslu, shuffle, repeat
// ════════════════════════════════
function PlayerBar() {
  const {
    playing, setPlaying, isPlaying, setIsPlaying,
    playNext, playPrev, shuffle, setShuffle, repeat, setRepeat,
  } = useApp();
  const sound = useRef<Audio.Sound | null>(null);
  const curId = useRef('');
  const color = useChameleon(4000);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [barWidth, setBarWidth] = useState(0);

  useEffect(() => {
    if (!playing) return;
    if (curId.current === playing._id && sound.current) {
      isPlaying ? sound.current.playAsync() : sound.current.pauseAsync();
      return;
    }
    load();
  }, [playing]);

  useEffect(() => () => { sound.current?.unloadAsync(); }, []);

  const load = async () => {
    try {
      if (sound.current) { await sound.current.unloadAsync(); sound.current = null; }
      if (!playing?.cloudUrl) return;
      curId.current = playing._id;
      setPosition(0); setDuration(0);
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound: s } = await Audio.Sound.createAsync(
        { uri: playing.cloudUrl },
        { shouldPlay: true },
        (st: any) => {
          if (!st.isLoaded) return;
          setPosition(st.positionMillis || 0);
          setDuration(st.durationMillis || 0);
          if (st.didJustFinish) {
            if (repeat) s.replayAsync();
            else playNext();
          }
        }
      );
      sound.current = s;
      setIsPlaying(true);
    } catch {}
  };

  const toggle = async () => {
    if (!sound.current) return;
    if (isPlaying) { await sound.current.pauseAsync(); setIsPlaying(false); }
    else { await sound.current.playAsync(); setIsPlaying(true); }
  };

  const seekTo = async (x: number) => {
    if (!sound.current || !duration || !barWidth) return;
    const ratio = Math.max(0, Math.min(1, x / barWidth));
    await sound.current.setPositionAsync(ratio * duration);
  };

  const fmt = (ms: number) => {
    if (!ms || isNaN(ms)) return '0:00';
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  const progress = duration > 0 ? position / duration : 0;

  if (!playing) return null;
  return (
    <View style={[pb.bar, { borderTopColor: color + '44' }]}>
      {/* Info rinda */}
      <View style={pb.infoRow}>
        <View style={[pb.icon, { backgroundColor: color + '22', overflow: 'hidden' }]}>
          {playing.coverUrl
            ? <Image source={{ uri: playing.coverUrl }} style={{ width: 34, height: 34 }} />
            : <Ionicons name="musical-note" size={18} color={color} />
          }
        </View>
        <View style={pb.info}>
          <Text style={pb.title} numberOfLines={1}>{playing.title || '—'}</Text>
          <Text style={[pb.artist, { color: color + '99' }]} numberOfLines={1}>{playing.artist || '—'}</Text>
        </View>
        <TouchableOpacity onPress={() => setShuffle(!shuffle)} style={pb.modeBtn}>
          <Ionicons name="shuffle" size={16} color={shuffle ? color : '#444'} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setRepeat(!repeat)} style={pb.modeBtn}>
          <Ionicons name="repeat" size={16} color={repeat ? color : '#444'} />
        </TouchableOpacity>
        <TouchableOpacity onPress={playPrev} style={pb.btn}>
          <Ionicons name="play-skip-back" size={20} color="#bbb" />
        </TouchableOpacity>
        <TouchableOpacity onPress={toggle} style={[pb.play, { backgroundColor: color }]}>
          <Ionicons name={isPlaying ? 'pause' : 'play'} size={22} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity onPress={playNext} style={pb.btn}>
          <Ionicons name="play-skip-forward" size={20} color="#bbb" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { sound.current?.unloadAsync(); setPlaying(null); setIsPlaying(false); }} style={pb.btn}>
          <Ionicons name="close" size={20} color="#ff4466" />
        </TouchableOpacity>
      </View>

      {/* Progress josla */}
      <View style={pb.progressRow}>
        <Text style={pb.time}>{fmt(position)}</Text>
        <TouchableOpacity
          style={pb.progressTrack}
          onLayout={e => setBarWidth(e.nativeEvent.layout.width)}
          onPress={e => seekTo(e.nativeEvent.locationX)}
          activeOpacity={1}
        >
          <View style={pb.progressBg}>
            <View style={[pb.progressFill, { width: `${progress * 100}%`, backgroundColor: color }]} />
            <View style={[pb.progressThumb, { left: `${progress * 100}%` as any, backgroundColor: color }]} />
          </View>
        </TouchableOpacity>
        <Text style={pb.time}>{fmt(duration)}</Text>
      </View>
    </View>
  );
}
const pb = StyleSheet.create({
  bar: { backgroundColor: '#13131f', borderTopWidth: 1, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 6 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  icon: { width: 34, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  info: { flex: 1 },
  title: { color: '#fff', fontSize: 13, fontWeight: '600' },
  artist: { fontSize: 11 },
  modeBtn: { padding: 5 },
  btn: { padding: 5 },
  play: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginHorizontal: 3 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  time: { color: '#555', fontSize: 10, width: 30, textAlign: 'center' },
  progressTrack: { flex: 1, paddingVertical: 6 },
  progressBg: { height: 3, backgroundColor: '#2a2a35', borderRadius: 2, position: 'relative' },
  progressFill: { height: 3, borderRadius: 2 },
  progressThumb: { position: 'absolute', top: -4, width: 11, height: 11, borderRadius: 6, marginLeft: -5 },
});

// ════════════════════════════════
//  FLOATING NOTES
// ════════════════════════════════
const NOTES = ['♪','♫','♬','♩','🎵','🎶','🎸','🎹','🎺','🎻'];
function FloatingNotes() {
  const notes = useRef(
    Array.from({ length: 18 }, (_, i) => ({
      anim: new Animated.Value(0),
      x: Math.random() * SW,
      size: 14 + Math.random() * 22,
      duration: 3500 + Math.random() * 4000,
      delay: i * 280,
      note: NOTES[i % NOTES.length],
      color: COLORS[i % COLORS.length],
    }))
  ).current;

  useEffect(() => {
    notes.forEach(n => {
      const run = () => {
        n.anim.setValue(0);
        Animated.timing(n.anim, {
          toValue: 1, duration: n.duration,
          easing: Easing.linear, useNativeDriver: true, delay: n.delay,
        }).start(({ finished }) => { if (finished) run(); });
      };
      run();
    });
  }, []);

  return (
    <View style={fn.container} pointerEvents="none">
      {notes.map((n, i) => (
        <Animated.Text key={i} style={{
          position: 'absolute', left: n.x, fontSize: n.size, color: n.color,
          opacity: n.anim.interpolate({ inputRange: [0, 0.1, 0.8, 1], outputRange: [0, 1, 0.7, 0] }),
          transform: [{
            translateY: n.anim.interpolate({ inputRange: [0, 1], outputRange: [SH * 0.7, -80] }),
          }, {
            rotate: n.anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['0deg', '20deg', '-15deg'] }),
          }],
        }}>{n.note}</Animated.Text>
      ))}
    </View>
  );
}
const fn = StyleSheet.create({
  container: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' },
});

// ════════════════════════════════
//  HOME SCREEN
// ════════════════════════════════
function HomeScreen({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { t, user, tracks, setPlaying } = useApp();
  const color = useChameleon(2500);

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ paddingBottom: 30 }}>
      <View style={[hm.hero, { borderBottomColor: color + '33', borderBottomWidth: 1 }]}>
        <FloatingNotes />
        <View style={hm.heroInner}>
          <Text style={[hm.greeting, { color: color + 'cc' }]}>👋 {user?.username}</Text>
          <Text style={[hm.heroTitle, { color, textShadowColor: color, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 20 }]}>
            SoundForge
          </Text>
          <Text style={hm.heroSub}>{t.appDesc}</Text>
        </View>
      </View>

      <View style={hm.grid}>
        {[
          { icon: 'musical-notes', label: t.music, tab: 'music', i: 0 },
          { icon: 'chatbubbles-outline', label: t.chat, tab: 'chat', i: 1 },
          { icon: 'information-circle-outline', label: t.info, tab: 'info', i: 2 },
          { icon: 'person-outline', label: t.profile, tab: 'profile', i: 3 },
        ].map(item => (
          <TouchableOpacity
            key={item.tab}
            style={[hm.gridCard, { borderColor: COLORS[item.i] + '55', backgroundColor: COLORS[item.i] + '0d' }]}
            onPress={() => onNavigate(item.tab)}
          >
            <Ionicons name={item.icon as any} size={28} color={COLORS[item.i]} />
            <Text style={[hm.gridLabel, { color: COLORS[item.i] }]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ paddingHorizontal: 16, marginTop: 4 }}>
        <Text style={[hm.secTitle, { color }]}>🔥 {t.welcomeTitle}</Text>
        {[
          { e: '🎵', tit: t.welcomeCard1Title, txt: t.welcomeCard1Text, c: COLORS[0] },
          { e: '💬', tit: t.welcomeCard2Title, txt: t.welcomeCard2Text, c: COLORS[1] },
          { e: '📋', tit: t.welcomeCard3Title, txt: t.welcomeCard3Text, c: COLORS[3] },
        ].map((card, i) => (
          <View key={i} style={[hm.card, { borderLeftColor: card.c }]}>
            <Text style={{ fontSize: 26 }}>{card.e}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[hm.cardTit, { color: card.c }]}>{card.tit}</Text>
              <Text style={hm.cardTxt}>{card.txt}</Text>
            </View>
          </View>
        ))}

        {tracks.length > 0 && (() => {
          const featured = tracks[Math.floor(tracks.length / 2)];
          return (
            <View style={[hm.featuredCard, { borderColor: color + '55' }]}>
              <Text style={[hm.featuredLabel, { color }]}>🏆 {t.featuredTrack}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={[hm.featuredIcon, { backgroundColor: color + '22', overflow: 'hidden' }]}>
                  {featured.coverUrl
                    ? <Image source={{ uri: featured.coverUrl }} style={{ width: 52, height: 52 }} />
                    : <Text style={{ fontSize: 28 }}>🎵</Text>
                  }
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[hm.featuredTitle, { color }]} numberOfLines={1}>{featured.title || t.noTitle}</Text>
                  <Text style={hm.featuredArtist}>{featured.artist || t.noArtist}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => { setPlaying(featured); onNavigate('music'); }}
                  style={[hm.featuredBtn, { backgroundColor: color }]}
                >
                  <Ionicons name="play" size={18} color="#000" />
                </TouchableOpacity>
              </View>
            </View>
          );
        })()}

        <View style={hm.statsRow}>
          {[
            { v: tracks.length, l: t.songs, e: '🎵', c: COLORS[0] },
            { v: '∞', l: t.chat, e: '💬', c: COLORS[1] },
            { v: '24/7', l: 'Online', e: '🟢', c: COLORS[2] },
          ].map((st, i) => (
            <View key={i} style={[hm.statBox, { borderColor: st.c + '44' }]}>
              <Text style={hm.statE}>{st.e}</Text>
              <Text style={[hm.statV, { color: st.c }]}>{st.v}</Text>
              <Text style={hm.statL}>{st.l}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
const hm = StyleSheet.create({
  hero: { height: 200, justifyContent: 'flex-end', backgroundColor: '#0d0d18', overflow: 'hidden' },
  featuredCard: { backgroundColor: '#111118', borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1 },
  featuredLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 10 },
  featuredIcon: { width: 52, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  featuredTitle: { fontSize: 15, fontWeight: '700' },
  featuredArtist: { color: '#666', fontSize: 12, marginTop: 2 },
  featuredBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 6 },
  statBox: { flex: 1, backgroundColor: '#111118', borderRadius: 14, padding: 12, alignItems: 'center', gap: 3, borderWidth: 1 },
  statE: { fontSize: 20 },
  statV: { fontSize: 18, fontWeight: '900' },
  statL: { color: '#555', fontSize: 9, fontWeight: '600' },
  heroInner: { paddingHorizontal: 22, paddingBottom: 22, zIndex: 2 },
  greeting: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  heroTitle: { fontSize: 36, fontWeight: '900', letterSpacing: 2 },
  heroSub: { color: '#555', fontSize: 13, marginTop: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 10 },
  gridCard: { width: (SW - 44) / 2, alignItems: 'center', padding: 18, borderRadius: 16, borderWidth: 1, gap: 8 },
  gridLabel: { fontSize: 12, fontWeight: '700' },
  secTitle: { fontSize: 16, fontWeight: '800', marginBottom: 14, marginTop: 8 },
  card: { flexDirection: 'row', backgroundColor: '#111118', borderRadius: 14, padding: 14, marginBottom: 10, borderLeftWidth: 3, gap: 12 },
  cardTit: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  cardTxt: { color: '#666', fontSize: 12, lineHeight: 18 },
});

// ════════════════════════════════
//  MUSIC SCREEN
// ════════════════════════════════
function MusicScreen() {
  const { tracks, setTracks, playlist, removeFromPlaylist, namedPlaylists, createNamedPlaylist,
    deleteNamedPlaylist, removeTrackFromNamedPlaylist, setPlaying, addToPlaylist,
    playing, isPlaying, t, likes, toggleLike } = useApp() as any;
  const [tab, setTab] = useState<'all' | 'quick' | 'named'>('all');
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [openPl, setOpenPl] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user, token } = useApp() as any;
  const color = useChameleon();

  const loadTracks = async () => {
    try {
      setLoading(true);
      const r = await fetch(`${API}/api/tracks`);
      const d = await r.json();
      setTracks(Array.isArray(d) ? d : (d.tracks || []));
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => {
    if (tracks.length === 0) loadTracks();
  }, []);

  const filtered = tracks.filter((tr: any) =>
    tr.title?.toLowerCase().includes(search.toLowerCase()) ||
    tr.artist?.toLowerCase().includes(search.toLowerCase())
  );
  const list = search ? filtered : tracks;
  const selected = namedPlaylists.find((p: any) => p.id === openPl);

  const renderTrack = ({ item, index }: any, showRemove = false, plId = '') => {
    const active = playing?._id === item._id;
    const tc = TRACK_COLORS[index % TRACK_COLORS.length];
    const liked = likes?.includes(item._id);
    return (
      <View style={[ms.row, active && { backgroundColor: tc + '18', borderColor: tc + '55', borderWidth: 1 }]}>
        <View style={ms.num}>
          {active && isPlaying
            ? <Ionicons name="volume-high" size={14} color={tc} />
            : <Text style={[ms.numTxt, { color: tc + '88' }]}>{index + 1}</Text>}
        </View>
        <TouchableOpacity style={ms.rowLeft} onPress={() => setPlaying(item)}>
          <View style={[ms.dot, { backgroundColor: tc + '33', borderColor: tc + '66', borderWidth: 1, overflow: 'hidden' }]}>
            {item.coverUrl
              ? <Image source={{ uri: item.coverUrl }} style={{ width: 36, height: 36 }} />
              : <Ionicons name="musical-note" size={16} color={active ? tc : tc + '99'} />
            }
          </View>
          <View style={ms.info}>
            <Text style={[ms.title, active && { color: tc }]} numberOfLines={1}>{item.title || t.noTitle}</Text>
            <Text style={ms.artist} numberOfLines={1}>{item.artist || t.noArtist}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => toggleLike(item._id)} style={ms.btn}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={18} color={liked ? '#ef4444' : '#444'} />
        </TouchableOpacity>
        {showRemove
          ? <TouchableOpacity onPress={() => plId ? removeTrackFromNamedPlaylist(plId, item._id) : removeFromPlaylist(item._id)} style={ms.btn}>
              <Ionicons name="close-circle" size={20} color="#ff446666" />
            </TouchableOpacity>
          : <TouchableOpacity onPress={() => addToPlaylist(item)} style={ms.btn}>
              <Ionicons name="add-circle-outline" size={20} color={tc + '88'} />
            </TouchableOpacity>
        }
        <TouchableOpacity onPress={() => setPlaying(item)} style={ms.btn}>
          <Ionicons name={active && isPlaying ? 'pause-circle' : 'play-circle'} size={28} color={tc} />
        </TouchableOpacity>
      </View>
    );
  };

  if (selected) {
    return (
      <View style={s.screen}>
        <View style={[s.hdr, { borderBottomColor: color + '33' }]}>
          <TouchableOpacity onPress={() => setOpenPl(null)} style={{ marginRight: 10 }}>
            <Ionicons name="chevron-back" size={24} color={color} />
          </TouchableOpacity>
          <Text style={[s.logo, { color }]} numberOfLines={1}>{selected.name}</Text>
          <TouchableOpacity onPress={() => {
            Alert.alert(t.delete + '?', selected.name, [
              { text: t.cancel, style: 'cancel' },
              { text: t.delete, style: 'destructive', onPress: () => { deleteNamedPlaylist(selected.id); setOpenPl(null); } }
            ]);
          }}>
            <Ionicons name="trash-outline" size={20} color="#ff446688" />
          </TouchableOpacity>
        </View>
        <FlatList data={selected.tracks} keyExtractor={(x: any) => x._id}
          contentContainerStyle={{ padding: 12, paddingBottom: 20 }}
          renderItem={({ item, index }) => renderTrack({ item, index }, true, selected.id)}
          ListEmptyComponent={<View style={s.empty}><Text style={s.emptyTxt}>{t.playlistEmpty}</Text></View>}
        />
      </View>
    );
  }

  return (
    <View style={s.screen}>
      <View style={[s.hdr, { borderBottomColor: color + '33' }]}>
        <Text style={[s.logo, { color }]}>🎵 {t.music}</Text>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TouchableOpacity onPress={() => setShowSearch(v => !v)}>
            <Ionicons name="search" size={22} color={showSearch ? color : '#555'} />
          </TouchableOpacity>
          {tab === 'named' && (
            <TouchableOpacity onPress={() => setShowCreate(true)}>
              <Ionicons name="add-circle" size={24} color={color} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {showSearch && (
        <View style={[s.searchBox, { borderColor: color + '44' }]}>
          <Ionicons name="search" size={16} color={color} />
          <TextInput style={s.searchInp} placeholder={t.searchPlaceholder} placeholderTextColor="#444" value={search} onChangeText={setSearch} autoFocus />
          {search.length > 0 && <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={16} color="#555" /></TouchableOpacity>}
        </View>
      )}

      <View style={s.tabs}>
        {(['all', 'quick', 'named'] as const).map(id => (
          <TouchableOpacity key={id} style={[s.tabBtn, tab === id && { backgroundColor: color }]} onPress={() => setTab(id)}>
            <Text style={[s.tabTxt, tab === id && { color: '#000' }]}>
              {id === 'all' ? t.allMusic : id === 'quick' ? `⚡ (${playlist.length})` : `📋 (${namedPlaylists.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'all' && (
        <FlatList data={list} keyExtractor={(x: any) => x._id}
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 20 }}
          renderItem={renderTrack}
          refreshControl={
            <RefreshControl refreshing={refreshing} tintColor={color}
              onRefresh={async () => { setRefreshing(true); await loadTracks(); setRefreshing(false); }} />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="musical-notes-outline" size={48} color="#222" />
              <Text style={s.emptyTxt}>{loading ? t.loading : t.noTracks}</Text>
            </View>
          }
        />
      )}
      {tab === 'quick' && (
        <FlatList data={playlist} keyExtractor={(x: any) => x._id}
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 20 }}
          renderItem={({ item, index }) => renderTrack({ item, index }, true)}
          ListEmptyComponent={<View style={s.empty}><Text style={s.emptyTxt}>{t.playlistEmpty}</Text></View>}
        />
      )}
      {tab === 'named' && (
        <FlatList data={namedPlaylists} keyExtractor={(x: any) => x.id}
          contentContainerStyle={{ padding: 12, paddingBottom: 20 }}
          renderItem={({ item, index }: any) => {
            const tc = TRACK_COLORS[index % TRACK_COLORS.length];
            return (
              <TouchableOpacity style={[ms.plCard, { borderLeftColor: tc }]} onPress={() => setOpenPl(item.id)}>
                <View style={[ms.plArt, { backgroundColor: tc + '22' }]}><Ionicons name="musical-notes" size={22} color={tc} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={[ms.plName, { color: tc }]}>{item.name}</Text>
                  <Text style={ms.plCnt}>{item.tracks.length} {t.tracksCount}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#444" />
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={<View style={s.empty}><Text style={s.emptyTxt}>{t.playlistEmpty}</Text></View>}
        />
      )}

      <Modal visible={showCreate} transparent animationType="fade">
        <TouchableOpacity style={s.overlay} onPress={() => setShowCreate(false)} activeOpacity={1}>
          <View style={s.modal}>
            <Text style={[s.modalTit, { color }]}>{t.createPlaylist}</Text>
            <TextInput style={s.modalInp} placeholder={t.playlistName} placeholderTextColor="#444" value={newName} onChangeText={setNewName} autoFocus />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={s.modalCnl} onPress={() => { setShowCreate(false); setNewName(''); }}>
                <Text style={{ color: '#666', fontWeight: '700' }}>{t.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalOk, { backgroundColor: color }]} onPress={() => {
                if (newName.trim()) { createNamedPlaylist(newName.trim()); setNewName(''); setShowCreate(false); }
              }}>
                <Text style={{ color: '#000', fontWeight: '800' }}>{t.create}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
const ms = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 9, marginBottom: 5, backgroundColor: '#111118' },
  num: { width: 20, alignItems: 'center', marginRight: 5 },
  numTxt: { fontSize: 11 },
  rowLeft: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  dot: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  info: { flex: 1 },
  title: { color: '#ccc', fontSize: 13, fontWeight: '600' },
  artist: { color: '#555', fontSize: 11, marginTop: 2 },
  btn: { padding: 5 },
  plCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111118', borderRadius: 14, padding: 12, marginBottom: 8, borderLeftWidth: 3 },
  plArt: { width: 44, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  plName: { fontSize: 14, fontWeight: '700' },
  plCnt: { color: '#555', fontSize: 12, marginTop: 2 },
});

// ════════════════════════════════
//  CHAT
// ════════════════════════════════
interface Msg { id: string; user: string; text: string; time: string; color: string; avatarUri?: string; }
const CHAT_COLORS = ['#00cfff','#a855f7','#f59e0b','#10b981','#ef4444','#ec4899','#6366f1','#fff'];

function ChatScreen() {
  const { user, t, profileData } = useApp() as any;
  const nick = user?.username || 'Lietotājs';
  const avatarUri: string | null = profileData?.avatarUrl || null;

  const [msgs, setMsgs] = useState<Msg[]>([
    { id: '0', user: 'SoundForge', text: '👋 Laipni lūdzam čatā! Dalies ar idejām par mūziku!', time: '—', color: '#a855f7' },
  ]);
  const [text, setText] = useState('');
  const [myColor, setMyColor] = useState(CHAT_COLORS[0]);
  const [showColors, setShowColors] = useState(false);
  const listRef = useRef<FlatList>(null);
  const color = useChameleon();

  const send = () => {
    if (!text.trim()) return;
    const m: Msg = {
      id: Date.now().toString(),
      user: nick,
      text: text.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      color: myColor,
      avatarUri: avatarUri || undefined,
    };
    setMsgs(p => [...p, m]);
    setText('');
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#0a0a0f' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}>
      <View style={[s.hdr, { borderBottomColor: color + '33' }]}>
        <Text style={[s.logo, { color }]}>💬 {t.chat}</Text>
        <TouchableOpacity onPress={() => setShowColors(v => !v)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: myColor }} />
          <Ionicons name="color-palette-outline" size={20} color={color} />
        </TouchableOpacity>
      </View>

      {showColors && (
        <View style={ct.colorRow}>
          {CHAT_COLORS.map(c => (
            <TouchableOpacity key={c} onPress={() => { setMyColor(c); setShowColors(false); }}
              style={[ct.colorDot, { backgroundColor: c }, myColor === c && ct.colorDotActive]}>
              {myColor === c && <Ionicons name="checkmark" size={12} color="#000" />}
            </TouchableOpacity>
          ))}
        </View>
      )}

      <FlatList
        ref={listRef}
        data={msgs}
        keyExtractor={m => m.id}
        contentContainerStyle={{ padding: 12, paddingBottom: 8 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => {
          const isMe = item.user === nick;
          return (
            <View style={[ct.row, isMe && ct.rowMe]}>
              {!isMe && (
                <View style={[ct.av, { backgroundColor: item.color + '33', borderColor: item.color + '66', borderWidth: 1 }]}>
                  {item.avatarUri
                    ? <Image source={{ uri: item.avatarUri }} style={ct.avImg} />
                    : <Text style={[ct.avLetter, { color: item.color }]}>{item.user.charAt(0).toUpperCase()}</Text>}
                </View>
              )}
              <View style={[ct.bubble, isMe ? { backgroundColor: item.color + '28', borderColor: item.color + '66', borderWidth: 1 } : { backgroundColor: '#1a1a25' }, isMe ? ct.bubbleMe : ct.bubbleOther]}>
                {!isMe && <Text style={[ct.bubbleUser, { color: item.color }]}>{item.user}</Text>}
                <Text style={[ct.bubbleTxt, isMe && { color: item.color }]}>{item.text}</Text>
                <Text style={ct.bubbleTime}>{item.time}</Text>
              </View>
            </View>
          );
        }}
      />

      <View style={[ct.inp, { borderTopColor: myColor + '33' }]}>
        <View style={[ct.colorIndicator, { backgroundColor: myColor }]} />
        <TextInput
          style={[ct.input, { borderColor: myColor + '55', color: myColor === '#fff' ? '#fff' : myColor }]}
          placeholder={t.chatPlaceholder}
          placeholderTextColor="#444"
          value={text}
          onChangeText={setText}
          onSubmitEditing={send}
          returnKeyType="send"
          multiline
        />
        <TouchableOpacity onPress={send} style={[ct.sendBtn, { backgroundColor: text.trim() ? myColor : '#222' }]}>
          <Ionicons name="send" size={18} color={text.trim() ? '#000' : '#555'} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
const ct = StyleSheet.create({
  colorRow: { flexDirection: 'row', backgroundColor: '#111118', paddingHorizontal: 14, paddingVertical: 10, gap: 10, flexWrap: 'wrap' },
  colorDot: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  colorDotActive: { borderWidth: 2, borderColor: '#fff' },
  row: { flexDirection: 'row', marginBottom: 10, gap: 8 },
  rowMe: { flexDirection: 'row-reverse' },
  av: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', alignSelf: 'flex-end' },
  avImg: { width: 30, height: 30, borderRadius: 15 },
  avLetter: { fontSize: 13, fontWeight: '700' },
  bubble: { maxWidth: SW * 0.7, padding: 10, gap: 3 },
  bubbleMe: { borderRadius: 16, borderBottomRightRadius: 4 },
  bubbleOther: { borderRadius: 16, borderBottomLeftRadius: 4 },
  bubbleUser: { fontSize: 11, fontWeight: '700' },
  bubbleTxt: { color: '#ddd', fontSize: 14, lineHeight: 20 },
  bubbleTime: { color: '#555', fontSize: 10, textAlign: 'right' },
  inp: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 10, paddingTop: 10, paddingBottom: 12, backgroundColor: '#111118', borderTopWidth: 1, gap: 8 },
  colorIndicator: { width: 4, borderRadius: 2, alignSelf: 'stretch', marginRight: 2 },
  input: { flex: 1, backgroundColor: '#1a1a25', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, maxHeight: 100, borderWidth: 1 },
  sendBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
});

// ════════════════════════════════
//  INFO SCREEN
// ════════════════════════════════
function InfoScreen() {
  const { t } = useApp();
  const color = useChameleon();
  const sections = [
    { e: '🎵', tit: t.infoAboutTitle, txt: t.infoAboutText },
    { e: '📋', tit: t.infoRulesTitle, txt: t.infoRulesText },
    { e: '🔒', tit: t.infoSecurityTitle, txt: t.infoSecurityText },
    { e: '⚡', tit: t.infoQuickPlTitle, txt: t.infoQuickPlText },
    { e: '📂', tit: t.infoNamedPlTitle, txt: t.infoNamedPlText },
    { e: '👤', tit: t.infoProfileTitle, txt: t.infoProfileText },
    { e: '📞', tit: t.infoContactTitle, txt: t.infoContactText },
  ];
  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: 18, paddingBottom: 40 }}>
      <View style={[s.hdr, { borderBottomColor: color + '33', marginHorizontal: -18, paddingHorizontal: 18, marginBottom: 18 }]}>
        <Text style={[s.logo, { color }]}>ℹ️ {t.infoTitle}</Text>
      </View>
      {sections.map((sec, i) => {
        const tc = COLORS[i % COLORS.length];
        return (
          <View key={i} style={[inf.card, { borderLeftColor: tc }]}>
            <Text style={{ fontSize: 22, marginBottom: 4 }}>{sec.e}</Text>
            <Text style={[inf.tit, { color: tc }]}>{sec.tit}</Text>
            <Text style={inf.txt}>{sec.txt}</Text>
          </View>
        );
      })}
      <Text style={[inf.foot, { color: color + '55' }]}>{t.infoFooter}</Text>
    </ScrollView>
  );
}
const inf = StyleSheet.create({
  card: { backgroundColor: '#111118', borderRadius: 14, padding: 14, marginBottom: 10, borderLeftWidth: 3 },
  tit: { fontSize: 14, fontWeight: '800', marginBottom: 5 },
  txt: { color: '#777', fontSize: 12, lineHeight: 19 },
  foot: { textAlign: 'center', fontSize: 11, marginTop: 8, letterSpacing: 1 },
});

// ════════════════════════════════
//  PROFILE SCREEN — ar ĪSTU avatar saglabāšanu
// ════════════════════════════════
const LANGS = [
  { code: 'lv' as Lang, flag: '🇱🇻', name: 'Latviešu' },
  { code: 'en' as Lang, flag: '🇬🇧', name: 'English' },
  { code: 'ru' as Lang, flag: '🇷🇺', name: 'Русский' },
];

function ProfileScreen() {
  const ctx = useApp() as any;
  const { user, logout, t, lang, setLang, tracks, playlist, namedPlaylists, likes,
    banner, setBanner, token, profileData, saveProfile, uploadAvatar } = ctx;

  // Lokāli tikai priekš UI
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showLang, setShowLang] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [bannerText, setBannerText] = useState('');
  const [showPwModal, setShowPwModal] = useState(false);
  const [pwVisible, setPwVisible] = useState(false);
  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [repPw, setRepPw] = useState('');
  const [pwErr, setPwErr] = useState('');
  const [pwOk, setPwOk] = useState('');
  const [nickEdit, setNickEdit] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const color = useChameleon();

  // Izmanto profileData no AppContext — tas paliek pāri ekrāniem!
  const displayName = profileData?.nick || user?.username;
  const avatarUrl = profileData?.avatarUrl || null;

  const pickAndUploadAvatar = async (fromCamera = false) => {
    try {
      let res;
      if (fromCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) { Alert.alert(t.error, 'Vajag atļauju kamerai'); return; }
        res = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.7 });
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) { Alert.alert(t.error, 'Vajag atļauju galerijai'); return; }
        res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.7 });
      }
      if (!res.canceled && res.assets[0]) {
        setAvatarUploading(true);
        const url = await uploadAvatar(res.assets[0].uri);
        setAvatarUploading(false);
        if (!url) Alert.alert(t.error, 'Neizdevās augšupielādēt bildi');
      }
    } catch { setAvatarUploading(false); }
  };

  const showAvatarOptions = () => {
    Alert.alert(t.avatarLabel, '', [
      { text: '📷 ' + t.fromCamera, onPress: () => pickAndUploadAvatar(true) },
      { text: '🖼️ ' + t.fromGallery, onPress: () => pickAndUploadAvatar(false) },
      { text: t.cancel, style: 'cancel' },
    ]);
  };

  const handleSaveProfile = async () => {
    await saveProfile({ nick: nickEdit.trim() || undefined });
    setShowEditProfile(false);
  };

  const handleLogout = () => {
    Alert.alert(t.logoutConfirmTitle, t.logoutConfirmMsg, [
      { text: t.stay, style: 'cancel' },
      { text: t.logoutBtn, style: 'destructive', onPress: logout },
    ]);
  };

  const saveBanner = async () => {
    try {
      if (bannerText.trim()) {
        await fetch(`${API}/api/admin/ticker`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ text: bannerText.trim() }) });
        setBanner(bannerText.trim());
      } else {
        await fetch(`${API}/api/admin/ticker`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
        setBanner('');
      }
      setShowBanner(false);
      Alert.alert('✓', bannerText.trim() ? t.bannerActivated : t.bannerDeactivated);
    } catch { Alert.alert(t.error, t.serverError); }
  };

  const changePw = async () => {
    setPwErr(''); setPwOk('');
    if (!curPw || !newPw || !repPw) { setPwErr(t.fillAll); return; }
    if (newPw !== repPw) { setPwErr(t.pwNoMatch); return; }
    if (newPw.length < 8 || !/[A-Z]/.test(newPw) || !/[0-9]/.test(newPw)) { setPwErr(t.passMin); return; }
    try {
      const r = await fetch(`${API}/api/change-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: curPw, newPassword: newPw }),
      });
      const d = await r.json();
      if (d.ok) { setPwOk(t.pwChanged); setCurPw(''); setNewPw(''); setRepPw(''); setTimeout(() => setShowPwModal(false), 1500); }
      else setPwErr(d.error || t.error);
    } catch { setPwErr(t.serverError); }
  };

  const curLang = LANGS.find(l => l.code === lang);

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={[s.hdr, { borderBottomColor: color + '33' }]}>
        <Text style={[s.logo, { color }]}>👤 {t.profile}</Text>
      </View>

      {/* Avatar — tagad saglabājas serverī! */}
      <View style={pr.avatarWrap}>
        <TouchableOpacity onPress={showAvatarOptions} style={pr.avatarBtn}>
          <View style={[pr.avatar, { borderColor: color }]}>
            {avatarUploading
              ? <Text style={{ color }}>⏳</Text>
              : avatarUrl
                ? <Image source={{ uri: avatarUrl }} style={pr.avatarImg} />
                : <Text style={[pr.avatarLetter, { color }]}>{displayName?.charAt(0)?.toUpperCase() || '?'}</Text>
            }
          </View>
          <View style={[pr.camBadge, { backgroundColor: color }]}>
            <Ionicons name="camera" size={12} color="#000" />
          </View>
        </TouchableOpacity>
        <Text style={pr.name}>{displayName}</Text>
        {profileData?.nick && profileData.nick !== user?.username && (
          <Text style={pr.username}>@{user?.username}</Text>
        )}
        <View style={[pr.badge, { backgroundColor: color + '22', borderColor: color + '55' }]}>
          <Text style={[pr.badgeTxt, { color }]}>{user?.isAdmin ? t.admin : `👤 ${t.user}`}</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={pr.stats}>
        {[
          { v: tracks.length, l: t.songs, i: 'musical-notes', c: COLORS[0] },
          { v: namedPlaylists.length, l: t.playlists, i: 'list', c: COLORS[1] },
          { v: (likes || []).length, l: t.likes, i: 'heart', c: COLORS[4] },
          { v: playlist.length, l: t.quickPl, i: 'bookmark', c: COLORS[3] },
        ].map(st => (
          <View key={st.l} style={[pr.statCard, { borderTopColor: st.c }]}>
            <Ionicons name={st.i as any} size={15} color={st.c} />
            <Text style={[pr.statV, { color: st.c }]}>{st.v}</Text>
            <Text style={pr.statL}>{st.l}</Text>
          </View>
        ))}
      </View>

      <View style={{ paddingHorizontal: 16 }}>
        <Text style={[s.secLbl, { color: color + '77' }]}>{t.settings.toUpperCase()}</Text>

        <TouchableOpacity style={s.menuItem} onPress={() => { setNickEdit(profileData?.nick || ''); setShowEditProfile(true); }}>
          <Ionicons name="person-outline" size={19} color={color} />
          <Text style={s.menuTxt}>{t.editProfile}</Text>
          <Ionicons name="chevron-forward" size={15} color="#333" style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>

        <TouchableOpacity style={s.menuItem} onPress={() => setShowLang(true)}>
          <Ionicons name="globe-outline" size={19} color={color} />
          <Text style={s.menuTxt}>{t.changeLanguage}</Text>
          <Text style={[s.menuVal, { color }]}>{curLang?.flag} {curLang?.name}</Text>
          <Ionicons name="chevron-forward" size={15} color="#333" />
        </TouchableOpacity>

        <TouchableOpacity style={s.menuItem} onPress={() => { setShowPwModal(true); setPwErr(''); setPwOk(''); }}>
          <Ionicons name="lock-closed-outline" size={19} color={color} />
          <Text style={s.menuTxt}>{t.changePw}</Text>
          <Ionicons name="chevron-forward" size={15} color="#333" style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>

        {user?.isAdmin && (
          <TouchableOpacity style={[s.menuItem, { borderColor: color + '44', borderWidth: 1 }]} onPress={() => { setBannerText(banner || ''); setShowBanner(true); }}>
            <Ionicons name="megaphone-outline" size={19} color={color} />
            <View style={{ flex: 1 }}>
              <Text style={s.menuTxt}>📢 {t.bannerTitle}</Text>
              <Text style={{ fontSize: 10, color: banner ? color + '88' : '#444', marginTop: 2 }} numberOfLines={1}>{banner || t.bannerInactive}</Text>
            </View>
            <Ionicons name="chevron-forward" size={15} color="#333" />
          </TouchableOpacity>
        )}

        <TouchableOpacity style={[s.menuItem, { borderColor: '#ff446633', borderWidth: 1 }]} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={19} color="#ff4466" />
          <Text style={[s.menuTxt, { color: '#ff4466' }]}>{t.logout}</Text>
          <Ionicons name="chevron-forward" size={15} color="#333" style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>
      </View>

      {/* Edit profile modal */}
      <Modal visible={showEditProfile} transparent animationType="slide">
        <TouchableOpacity style={s.overlay} onPress={() => setShowEditProfile(false)} activeOpacity={1}>
          <View style={[s.modal, { width: '90%' }]}>
            <Text style={[s.modalTit, { color }]}>{t.editProfile}</Text>
            <Text style={s.modalLbl}>{t.nickLabel}</Text>
            <TextInput style={s.modalInp} placeholder={user?.username} placeholderTextColor="#444" value={nickEdit} onChangeText={setNickEdit} autoCapitalize="none" />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={s.modalCnl} onPress={() => setShowEditProfile(false)}>
                <Text style={{ color: '#666', fontWeight: '700' }}>{t.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalOk, { backgroundColor: color }]} onPress={handleSaveProfile}>
                <Text style={{ color: '#000', fontWeight: '800' }}>{t.save}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Valodas modal */}
      <Modal visible={showLang} transparent animationType="fade">
        <TouchableOpacity style={s.overlay} onPress={() => setShowLang(false)} activeOpacity={1}>
          <View style={s.modal}>
            <Text style={[s.modalTit, { color }]}>{t.changeLanguage}</Text>
            {LANGS.map(l => (
              <TouchableOpacity key={l.code}
                style={[s.langOpt, lang === l.code && { backgroundColor: color + '22', borderColor: color + '44', borderWidth: 1 }]}
                onPress={() => { setLang(l.code); setShowLang(false); }}>
                <Text style={{ fontSize: 22 }}>{l.flag}</Text>
                <Text style={[s.langNm, lang === l.code && { color }]}>{l.name}</Text>
                {lang === l.code && <Ionicons name="checkmark" size={16} color={color} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Banner modal */}
      <Modal visible={showBanner} transparent animationType="slide">
        <TouchableOpacity style={s.overlay} onPress={() => setShowBanner(false)} activeOpacity={1}>
          <View style={[s.modal, { width: '92%' }]}>
            <Text style={[s.modalTit, { color }]}>📢 {t.bannerTitle}</Text>
            <TextInput style={[s.modalInp, { minHeight: 70, borderColor: color + '55' }]} placeholder={t.bannerPlaceholder} placeholderTextColor="#444" value={bannerText} onChangeText={setBannerText} multiline autoFocus />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={s.modalCnl} onPress={() => setShowBanner(false)}>
                <Text style={{ color: '#666', fontWeight: '700' }}>{t.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalOk, { backgroundColor: color }]} onPress={saveBanner}>
                <Text style={{ color: '#000', fontWeight: '800' }}>{t.save}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Paroles modal */}
      <Modal visible={showPwModal} transparent animationType="slide">
        <TouchableOpacity style={s.overlay} onPress={() => setShowPwModal(false)} activeOpacity={1}>
          <View style={[s.modal, { width: '92%' }]}>
            <Text style={[s.modalTit, { color }]}>🔒 {t.changePw}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 }}>
              <TextInput style={[s.modalInp, { flex: 1, marginBottom: 0 }]} placeholder={t.curPw} placeholderTextColor="#444" value={curPw} onChangeText={setCurPw} secureTextEntry={!pwVisible} />
              <TouchableOpacity onPress={() => setPwVisible(v => !v)} style={{ padding: 8 }}>
                <Ionicons name={pwVisible ? 'eye-off' : 'eye'} size={18} color="#555" />
              </TouchableOpacity>
            </View>
            <TextInput style={s.modalInp} placeholder={t.newPw} placeholderTextColor="#444" value={newPw} onChangeText={setNewPw} secureTextEntry={!pwVisible} />
            <TextInput style={s.modalInp} placeholder={t.repPw} placeholderTextColor="#444" value={repPw} onChangeText={setRepPw} secureTextEntry={!pwVisible} />
            {pwErr ? <Text style={{ color: '#ef4444', fontSize: 12, marginBottom: 8 }}>{pwErr}</Text> : null}
            {pwOk ? <Text style={{ color: '#22c55e', fontSize: 12, marginBottom: 8 }}>{pwOk}</Text> : null}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={s.modalCnl} onPress={() => setShowPwModal(false)}>
                <Text style={{ color: '#666', fontWeight: '700' }}>{t.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalOk, { backgroundColor: color }]} onPress={changePw}>
                <Text style={{ color: '#000', fontWeight: '800' }}>{t.changePwBtn}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}
const pr = StyleSheet.create({
  avatarWrap: { alignItems: 'center', paddingVertical: 22 },
  avatarBtn: { position: 'relative', marginBottom: 10 },
  avatar: { width: 82, height: 82, borderRadius: 41, borderWidth: 2, overflow: 'hidden', backgroundColor: '#1a1a25', justifyContent: 'center', alignItems: 'center' },
  avatarImg: { width: 82, height: 82 },
  avatarLetter: { fontSize: 34, fontWeight: '800' },
  camBadge: { position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#0a0a0f' },
  name: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 2 },
  username: { color: '#555', fontSize: 12, marginBottom: 6 },
  badge: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  badgeTxt: { fontSize: 12, fontWeight: '600' },
  stats: { flexDirection: 'row', paddingHorizontal: 14, gap: 8, marginBottom: 22 },
  statCard: { flex: 1, backgroundColor: '#111118', borderRadius: 12, padding: 10, alignItems: 'center', gap: 3, borderTopWidth: 2 },
  statV: { fontSize: 18, fontWeight: '800' },
  statL: { color: '#555', fontSize: 9 },
});

// ════════════════════════════════
//  MAIN APP
// ════════════════════════════════
export default function MainApp() {
  const [activeTab, setActiveTab] = useState('home');
  const { t, logout } = useApp();
  const color = useChameleon(3200);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(logout, INACTIVITY_MS);
  }, [logout]);

  useEffect(() => {
    resetTimer();
    const sub = AppState.addEventListener('change', state => {
      if (state === 'background' || state === 'inactive') {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(logout, 30000);
      } else {
        resetTimer();
      }
    });
    return () => { sub.remove(); if (timer.current) clearTimeout(timer.current); };
  }, []);

  const TABS = [
    { id: 'home',    icon: 'home-outline',               label: t.home },
    { id: 'music',   icon: 'musical-notes-outline',      label: t.music },
    { id: 'mood',    icon: 'color-palette-outline',      label: 'Mood' },
    { id: 'chat',    icon: 'chatbubbles-outline',        label: t.chat },
    { id: 'profile', icon: 'person-outline',             label: t.profile },
  ];

  const renderScreen = () => {
    switch (activeTab) {
      case 'home':    return <HomeScreen onNavigate={setActiveTab} />;
      case 'music':   return <MusicScreen />;
      case 'mood':    return <MoodScreen />;
      case 'chat':    return <ChatScreen />;
      case 'info':    return <InfoScreen />;
      case 'profile': return <ProfileScreen />;
      default:        return <HomeScreen onNavigate={setActiveTab} />;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0f' }} onTouchStart={resetTimer}>
      {/* TAB JOSLA AUGŠĀ */}
      <View style={[tb.bar, { borderBottomColor: color + '33' }]}>
        {TABS.map(tab => {
          const active = activeTab === tab.id;
          return (
            <TouchableOpacity key={tab.id} style={tb.item} onPress={() => { setActiveTab(tab.id); resetTimer(); }}>
              <Ionicons name={tab.icon as any} size={active ? 21 : 18} color={active ? color : '#444'} />
              <Text style={[tb.lbl, active && { color }]}>{tab.label}</Text>
              {active && <View style={[tb.dot, { backgroundColor: color }]} />}
            </TouchableOpacity>
          );
        })}
      </View>

      <Banner />

      <View style={{ flex: 1 }}>{renderScreen()}</View>

      <PlayerBar />
    </View>
  );
}

// ════════════════════════════════
//  KOPĪGIE STILI
// ════════════════════════════════
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0a0a0f' },
  hdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingTop: 14, paddingBottom: 12, backgroundColor: '#111118', borderBottomWidth: 1 },
  logo: { fontSize: 20, fontWeight: '800' },
  secLbl: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 10, marginTop: 4 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a25', margin: 12, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1 },
  searchInp: { flex: 1, color: '#fff', marginLeft: 8, fontSize: 14 },
  tabs: { flexDirection: 'row', margin: 10, backgroundColor: '#111118', borderRadius: 12, padding: 4 },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  tabTxt: { color: '#444', fontWeight: '700', fontSize: 11 },
  empty: { alignItems: 'center', marginTop: 70, gap: 10 },
  emptyTxt: { color: '#333', fontSize: 14 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  modal: { backgroundColor: '#111118', borderRadius: 20, padding: 20, width: '85%' },
  modalTit: { fontSize: 16, fontWeight: '700', marginBottom: 14 },
  modalLbl: { color: '#666', fontSize: 12, fontWeight: '600', marginBottom: 6 },
  modalInp: { backgroundColor: '#0a0a0f', borderRadius: 12, padding: 12, color: '#fff', fontSize: 14, borderWidth: 1, borderColor: '#2a2a35', marginBottom: 12 },
  modalCnl: { flex: 1, backgroundColor: '#1a1a25', borderRadius: 12, padding: 12, alignItems: 'center' },
  modalOk: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#111118', borderRadius: 14, padding: 15, marginBottom: 10 },
  menuTxt: { flex: 1, color: '#ccc', fontSize: 14 },
  menuVal: { fontSize: 12 },
  langOpt: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, marginBottom: 4 },
  langNm: { flex: 1, color: '#888', fontSize: 15 },
});

const tb = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: '#111118', borderBottomWidth: 1, paddingTop: 46, paddingBottom: 7 },
  item: { flex: 1, alignItems: 'center', gap: 2 },
  lbl: { fontSize: 9, fontWeight: '600', color: '#444' },
  dot: { width: 4, height: 4, borderRadius: 2, marginTop: 1 },
});
