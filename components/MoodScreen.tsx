import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  Easing, Dimensions, ScrollView, Image,
} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../AppContext';

const { width: SW } = Dimensions.get('window');

// ════════════════════════════════
//  MOOD KONFIGURĀCIJA
// ════════════════════════════════
const MOODS = {
  focus: {
    label: 'Focus',
    emoji: '🔵',
    color: '#3b82f6',
    bg: '#0d1a3a',
    desc: 'Koncentrācija & Produktivitāte',
    keywords: ['study', 'focus', 'ambient', 'lofi', 'piano', 'instrumental', 'calm', 'deep'],
    bpm: 'vidējs',
    icon: 'brain-outline' as const,
  },
  energy: {
    label: 'Energy',
    emoji: '🔴',
    color: '#ef4444',
    bg: '#3a0d0d',
    desc: 'Enerģija & Motivācija',
    keywords: ['rock', 'metal', 'energy', 'power', 'pump', 'workout', 'fast', 'hard', 'beat'],
    bpm: 'ātrs',
    icon: 'flash-outline' as const,
  },
  relax: {
    label: 'Relax',
    emoji: '🟢',
    color: '#22c55e',
    bg: '#0d3a1a',
    desc: 'Relaksācija & Miers',
    keywords: ['relax', 'chill', 'slow', 'sleep', 'soft', 'gentle', 'peaceful', 'nature', 'jazz'],
    bpm: 'lēns',
    icon: 'leaf-outline' as const,
  },
};

type MoodKey = keyof typeof MOODS;

// ════════════════════════════════
//  PULSS ANIMĀCIJA
// ════════════════════════════════
function PulseRing({ color, active }: { color: string; active: boolean }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) { anim.setValue(0); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 1200, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [active]);

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] });
  const opacity = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.6, 0.2, 0] });

  return (
    <Animated.View style={{
      position: 'absolute', width: 110, height: 110, borderRadius: 55,
      borderWidth: 2, borderColor: color,
      transform: [{ scale }], opacity,
    }} />
  );
}

// ════════════════════════════════
//  MOOD POGA
// ════════════════════════════════
function MoodButton({ moodKey, active, onPress, playCount }: {
  moodKey: MoodKey; active: boolean; onPress: () => void; playCount: number;
}) {
  const mood = MOODS[moodKey];
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.92, duration: 80, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity onPress={handlePress} activeOpacity={0.85}>
        <View style={[
          mb.btn,
          { borderColor: active ? mood.color : mood.color + '44', backgroundColor: active ? mood.bg : '#111118' },
          active && { shadowColor: mood.color, shadowOpacity: 0.5, shadowRadius: 20, elevation: 10 },
        ]}>
          <PulseRing color={mood.color} active={active} />
          <Text style={mb.emoji}>{mood.emoji}</Text>
          <Text style={[mb.label, { color: active ? mood.color : '#888' }]}>{mood.label}</Text>
          <Text style={[mb.desc, { color: active ? mood.color + 'bb' : '#444' }]}>{mood.desc}</Text>
          {playCount > 0 && (
            <View style={[mb.badge, { backgroundColor: mood.color + '33' }]}>
              <Text style={[mb.badgeTxt, { color: mood.color }]}>{playCount}x</Text>
            </View>
          )}
          {active && (
            <View style={[mb.activeDot, { backgroundColor: mood.color }]} />
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}
const mb = StyleSheet.create({
  btn: {
    width: (SW - 48) / 3, aspectRatio: 0.85,
    borderRadius: 20, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingHorizontal: 6,
    position: 'relative', overflow: 'visible',
  },
  emoji: { fontSize: 28 },
  label: { fontSize: 15, fontWeight: '800' },
  desc: { fontSize: 9, textAlign: 'center', fontWeight: '600', lineHeight: 13 },
  badge: { position: 'absolute', top: 8, right: 8, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  badgeTxt: { fontSize: 10, fontWeight: '800' },
  activeDot: { position: 'absolute', bottom: 8, width: 6, height: 6, borderRadius: 3 },
});

// ════════════════════════════════
//  GALVENAIS EKRĀNS
// ════════════════════════════════
export default function MoodScreen() {
  const { tracks, setPlaying, playing, isPlaying, t } = useApp() as any;

  const [activeMood, setActiveMood] = useState<MoodKey | null>(null);
  const [moodPlaylist, setMoodPlaylist] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [djMode, setDjMode] = useState(false);
  const [history, setHistory] = useState<{ mood: MoodKey; trackId: string }[]>([]);

  // Statistika — cik reizes katrs mood izmantots
  const [moodCounts, setMoodCounts] = useState<Record<MoodKey, number>>({
    focus: 0, energy: 0, relax: 0,
  });

  // Iesaka mood pēc vēstures
  const suggestedMood = (): MoodKey | null => {
    const max = Math.max(...Object.values(moodCounts));
    if (max === 0) return null;
    return (Object.entries(moodCounts) as [MoodKey, number][])
      .find(([, v]) => v === max)?.[0] || null;
  };

  // Filtrē dziesmas pēc mood
  const filterByMood = (mood: MoodKey): any[] => {
    const keywords = MOODS[mood].keywords;
    const scored = tracks.map((tr: any) => {
      const text = `${tr.title || ''} ${tr.artist || ''} ${tr.genre || ''} ${(tr.tags || []).join(' ')}`.toLowerCase();
      const score = keywords.reduce((s: number, kw: string) => s + (text.includes(kw) ? 1 : 0), 0);
      return { ...tr, _score: score };
    });

    // Sakārto pēc score, tad pievieno nejaušas lai vienmēr ir ko klausīties
    const matched = scored.filter((t: any) => t._score > 0).sort((a: any, b: any) => b._score - a._score);
    const rest = scored.filter((t: any) => t._score === 0).sort(() => Math.random() - 0.5);

    return [...matched, ...rest];
  };

  const selectMood = (mood: MoodKey) => {
    if (activeMood === mood) {
      // Izslēdz mood
      setActiveMood(null);
      setMoodPlaylist([]);
      return;
    }

    const playlist = filterByMood(mood);
    if (playlist.length === 0) return;

    setActiveMood(mood);
    setMoodPlaylist(playlist);
    setCurrentIdx(0);
    setPlaying(playlist[0]);

    // Atjaunina statistiku
    setMoodCounts(prev => ({ ...prev, [mood]: prev[mood] + 1 }));
    setHistory(prev => [...prev.slice(-19), { mood, trackId: playlist[0]._id }]);
  };

  const playNext = () => {
    if (!moodPlaylist.length) return;
    const next = djMode
      ? Math.floor(Math.random() * moodPlaylist.length)
      : (currentIdx + 1) % moodPlaylist.length;
    setCurrentIdx(next);
    setPlaying(moodPlaylist[next]);
  };

  const playPrev = () => {
    if (!moodPlaylist.length) return;
    const prev = (currentIdx - 1 + moodPlaylist.length) % moodPlaylist.length;
    setCurrentIdx(prev);
    setPlaying(moodPlaylist[prev]);
  };

  const suggested = suggestedMood();
  const activeMoodCfg = activeMood ? MOODS[activeMood] : null;

  // Top mūzikas žanri pēc vēstures
  const topMood = suggested ? MOODS[suggested] : null;

  return (
    <ScrollView style={st.screen} contentContainerStyle={{ paddingBottom: 120 }}>
      {/* Header */}
      <View style={st.header}>
        <View>
          <Text style={st.title}>🎭 Mood Player</Text>
          <Text style={st.sub}>Izvēlies savu garastāvokli</Text>
        </View>
        {/* DJ Mode toggle */}
        <TouchableOpacity
          style={[st.djBtn, djMode && st.djBtnActive]}
          onPress={() => setDjMode(v => !v)}
        >
          <Ionicons name="radio-outline" size={16} color={djMode ? '#000' : '#a855f7'} />
          <Text style={[st.djTxt, djMode && st.djTxtActive]}>AI DJ</Text>
        </TouchableOpacity>
      </View>

      {/* AI ieteikums */}
      {topMood && (
        <View style={[st.suggestion, { borderColor: topMood.color + '55', backgroundColor: topMood.bg }]}>
          <Ionicons name="sparkles" size={16} color={topMood.color} />
          <Text style={[st.suggTxt, { color: topMood.color }]}>
            AI iesaka: <Text style={{ fontWeight: '800' }}>{topMood.label}</Text> — tu to klausies visvairāk!
          </Text>
          <TouchableOpacity onPress={() => selectMood(suggested!)}>
            <Text style={[st.suggBtn, { color: topMood.color }]}>▶</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 3 MOOD POGAS */}
      <View style={st.moodRow}>
        {(Object.keys(MOODS) as MoodKey[]).map(key => (
          <MoodButton
            key={key}
            moodKey={key}
            active={activeMood === key}
            onPress={() => selectMood(key)}
            playCount={moodCounts[key]}
          />
        ))}
      </View>

      {/* AKTĪVĀ MOOD INFO */}
      {activeMoodCfg && moodPlaylist.length > 0 && (
        <View style={[st.nowPlaying, { borderColor: activeMoodCfg.color + '44', backgroundColor: activeMoodCfg.bg }]}>
          <Text style={[st.npLabel, { color: activeMoodCfg.color }]}>
            {activeMoodCfg.emoji} {activeMoodCfg.label} Playlist
            {djMode && <Text style={{ fontSize: 11 }}> • AI DJ 🎛️</Text>}
          </Text>

          {/* Pašreizējā dziesma */}
          <View style={st.npTrack}>
            <View style={[st.npIcon, { backgroundColor: activeMoodCfg.color + '22', overflow: 'hidden' }]}>
              {moodPlaylist[currentIdx]?.coverUrl
                ? <Image source={{ uri: moodPlaylist[currentIdx].coverUrl }} style={{ width: 48, height: 48 }} />
                : <Text style={{ fontSize: 24 }}>{activeMoodCfg.emoji}</Text>
              }
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.npTitle} numberOfLines={1}>
                {moodPlaylist[currentIdx]?.title || '—'}
              </Text>
              <Text style={[st.npArtist, { color: activeMoodCfg.color + '88' }]} numberOfLines={1}>
                {moodPlaylist[currentIdx]?.artist || '—'}
              </Text>
              <Text style={st.npIdx}>
                {currentIdx + 1} / {moodPlaylist.length} dziesmām
              </Text>
            </View>
          </View>

          {/* Kontroles */}
          <View style={st.npControls}>
            <TouchableOpacity onPress={playPrev} style={st.npBtn}>
              <Ionicons name="play-skip-back" size={22} color="#bbb" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setPlaying(moodPlaylist[currentIdx])}
              style={[st.npPlay, { backgroundColor: activeMoodCfg.color }]}
            >
              <Ionicons name={isPlaying && playing?._id === moodPlaylist[currentIdx]?._id ? 'pause' : 'play'} size={26} color="#000" />
            </TouchableOpacity>
            <TouchableOpacity onPress={playNext} style={st.npBtn}>
              <Ionicons name="play-skip-forward" size={22} color="#bbb" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                const rand = Math.floor(Math.random() * moodPlaylist.length);
                setCurrentIdx(rand);
                setPlaying(moodPlaylist[rand]);
              }}
              style={st.npBtn}
            >
              <Ionicons name="shuffle" size={20} color={activeMoodCfg.color} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* PLAYLIST SARAKSTS */}
      {activeMoodCfg && moodPlaylist.length > 0 && (
        <View style={st.listSection}>
          <Text style={[st.listTitle, { color: activeMoodCfg.color }]}>
            📋 Playlist ({moodPlaylist.length})
          </Text>
          {moodPlaylist.slice(0, 10).map((tr: any, i: number) => {
            const isActive = i === currentIdx;
            return (
              <TouchableOpacity
                key={tr._id}
                style={[st.listRow, isActive && { backgroundColor: activeMoodCfg.bg, borderColor: activeMoodCfg.color + '55', borderWidth: 1 }]}
                onPress={() => { setCurrentIdx(i); setPlaying(tr); }}
              >
                <Text style={[st.listNum, { color: isActive ? activeMoodCfg.color : '#444' }]}>
                  {isActive ? '▶' : i + 1}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={[st.listName, isActive && { color: activeMoodCfg.color }]} numberOfLines={1}>
                    {tr.title || '—'}
                  </Text>
                  <Text style={st.listArtist} numberOfLines={1}>{tr.artist || '—'}</Text>
                </View>
                {tr._score > 0 && (
                  <View style={[st.matchBadge, { backgroundColor: activeMoodCfg.color + '22' }]}>
                    <Text style={[st.matchTxt, { color: activeMoodCfg.color }]}>✓ Piemērots</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
          {moodPlaylist.length > 10 && (
            <Text style={[st.moreText, { color: activeMoodCfg.color + '66' }]}>
              + vēl {moodPlaylist.length - 10} dziesmas...
            </Text>
          )}
        </View>
      )}

      {/* STATISTIKA */}
      <View style={st.statsSection}>
        <Text style={st.statsTitle}>📊 Tavs Mood Vēsturē</Text>
        <View style={st.statsRow}>
          {(Object.entries(moodCounts) as [MoodKey, number][]).map(([key, count]) => {
            const m = MOODS[key];
            const total = Object.values(moodCounts).reduce((a, b) => a + b, 0);
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <View key={key} style={[st.statCard, { borderTopColor: m.color }]}>
                <Text style={{ fontSize: 20 }}>{m.emoji}</Text>
                <Text style={[st.statVal, { color: m.color }]}>{pct}%</Text>
                <Text style={st.statLbl}>{m.label}</Text>
                <View style={st.statBar}>
                  <View style={[st.statFill, { width: `${pct}%` as any, backgroundColor: m.color }]} />
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* DJ MODE INFO */}
      {djMode && (
        <View style={st.djInfo}>
          <Ionicons name="radio" size={20} color="#a855f7" />
          <Text style={st.djInfoTxt}>
            AI DJ režīms aktīvs — dziesmas tiek izlases kārtībā, mācās no tava garastāvokļa! 🎛️
          </Text>
        </View>
      )}

      {/* Tukšs stāvoklis */}
      {tracks.length === 0 && (
        <View style={st.empty}>
          <Ionicons name="musical-notes-outline" size={50} color="#222" />
          <Text style={st.emptyTxt}>Nav dziesmu! Dodies uz Mūziku un ielādē.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0a0a0f' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 18, paddingTop: 14, paddingBottom: 14,
    backgroundColor: '#111118', borderBottomWidth: 1, borderBottomColor: '#1e1e2a',
  },
  title: { fontSize: 20, fontWeight: '800', color: '#fff' },
  sub: { color: '#555', fontSize: 12, marginTop: 2 },
  djBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#1a0a2a', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: '#a855f744',
  },
  djBtnActive: { backgroundColor: '#a855f7', borderColor: '#a855f7' },
  djTxt: { color: '#a855f7', fontSize: 12, fontWeight: '700' },
  djTxtActive: { color: '#000' },

  suggestion: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    margin: 14, borderRadius: 14, padding: 12, borderWidth: 1,
  },
  suggTxt: { flex: 1, fontSize: 13 },
  suggBtn: { fontSize: 20, fontWeight: '800', paddingHorizontal: 6 },

  moodRow: {
    flexDirection: 'row', justifyContent: 'center',
    gap: 10, paddingHorizontal: 14, paddingVertical: 16,
  },

  nowPlaying: {
    margin: 14, borderRadius: 20, padding: 16, borderWidth: 1, gap: 12,
  },
  npLabel: { fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  npTrack: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  npIcon: {
    width: 48, height: 48, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  npTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  npArtist: { fontSize: 12, marginTop: 2 },
  npIdx: { color: '#444', fontSize: 10, marginTop: 4 },
  npControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  npBtn: { padding: 8 },
  npPlay: {
    width: 48, height: 48, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center',
    marginHorizontal: 8,
  },

  listSection: { paddingHorizontal: 14, marginBottom: 8 },
  listTitle: { fontSize: 13, fontWeight: '700', marginBottom: 10 },
  listRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#111118', borderRadius: 12, padding: 10, marginBottom: 5,
  },
  listNum: { width: 20, fontSize: 12, textAlign: 'center' },
  listName: { color: '#ccc', fontSize: 13, fontWeight: '600' },
  listArtist: { color: '#555', fontSize: 11, marginTop: 2 },
  matchBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  matchTxt: { fontSize: 10, fontWeight: '700' },
  moreText: { textAlign: 'center', fontSize: 12, marginTop: 6, marginBottom: 4 },

  statsSection: { margin: 14, marginTop: 4 },
  statsTitle: { color: '#555', fontSize: 12, fontWeight: '700', marginBottom: 10, letterSpacing: 0.5 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1, backgroundColor: '#111118', borderRadius: 14,
    padding: 12, alignItems: 'center', gap: 4, borderTopWidth: 2,
  },
  statVal: { fontSize: 20, fontWeight: '900' },
  statLbl: { color: '#555', fontSize: 10 },
  statBar: { width: '100%', height: 3, backgroundColor: '#2a2a35', borderRadius: 2, marginTop: 4 },
  statFill: { height: 3, borderRadius: 2 },

  djInfo: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    margin: 14, marginTop: 0, backgroundColor: '#1a0a2a',
    borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#a855f733',
  },
  djInfoTxt: { flex: 1, color: '#a855f7', fontSize: 12, lineHeight: 18 },

  empty: { alignItems: 'center', marginTop: 60, gap: 10 },
  emptyTxt: { color: '#333', fontSize: 14, textAlign: 'center' },
});
