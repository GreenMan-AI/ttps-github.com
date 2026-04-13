import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Easing, ScrollView, Dimensions,
} from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { useApp } from '../AppContext';
import { Lang } from '../i18n';

const { width: SW, height: SH } = Dimensions.get('window');

const LANGS = [
  { code: 'lv' as Lang, flag: '🇱🇻', name: 'Latviešu', sub: 'Latvian' },
  { code: 'en' as Lang, flag: '🇬🇧', name: 'English', sub: 'English' },
  { code: 'ru' as Lang, flag: '🇷🇺', name: 'Русский', sub: 'Russian' },
];

const COLORS = ['#00cfff','#a855f7','#22d3ee','#f59e0b','#10b981','#ef4444','#6366f1','#ec4899'];
const NOTES = ['♪','♫','♬','♩','🎵','🎶','🎸','🎹','🎺','🎻','🎼','🎷'];

// ── Peldošās notis — tikai transform + opacity (native driver atbalstīts) ──
function FloatingNotes() {
  const notes = useRef(
    Array.from({ length: 16 }, (_, i) => ({
      anim: new Animated.Value(0),
      x: (Math.random() * SW * 0.85) + SW * 0.05,
      size: 16 + Math.random() * 22,
      duration: 4500 + Math.random() * 4500,
      delay: i * 380,
      note: NOTES[i % NOTES.length],
      color: COLORS[i % COLORS.length],
    }))
  ).current;

  useEffect(() => {
    notes.forEach(n => {
      const run = () => {
        n.anim.setValue(0);
        Animated.timing(n.anim, {
          toValue: 1,
          duration: n.duration,
          easing: Easing.linear,
          useNativeDriver: true,
          delay: n.delay,
        }).start(({ finished }) => { if (finished) run(); });
      };
      run();
    });
  }, []);

  return (
    <View style={fl.wrap} pointerEvents="none">
      {notes.map((n, i) => (
        <Animated.Text
          key={i}
          style={{
            position: 'absolute',
            left: n.x,
            fontSize: n.size,
            color: n.color,
            opacity: n.anim.interpolate({
              inputRange: [0, 0.1, 0.8, 1],
              outputRange: [0, 1, 0.6, 0],
            }),
            transform: [
              {
                translateY: n.anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [SH * 0.75, -80],
                }),
              },
              {
                rotate: n.anim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: ['0deg', '18deg', '-14deg'],
                }),
              },
            ],
          }}
        >
          {n.note}
        </Animated.Text>
      ))}
    </View>
  );
}
const fl = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' },
});

// ── Orbitējošas notis ap logo — tikai transform (native driver) ──
function OrbitNotes() {
  const orbit = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(orbit, {
        toValue: 1,
        duration: 5500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const R = 65;
  const orbitItems = [
    { note: '♪', color: COLORS[0] },
    { note: '🎵', color: COLORS[1] },
    { note: '♫', color: COLORS[2] },
    { note: '♬', color: COLORS[3] },
    { note: '🎶', color: COLORS[4] },
    { note: '♩', color: COLORS[5] },
  ];

  return (
    <View style={{ width: (R + 20) * 2, height: (R + 20) * 2, alignItems: 'center', justifyContent: 'center', position: 'absolute' }}>
      {orbitItems.map((item, i) => {
        const baseAngle = (i / orbitItems.length) * 2 * Math.PI;
        return (
          <Animated.Text
            key={i}
            style={{
              position: 'absolute',
              fontSize: 18,
              color: item.color,
              transform: [
                {
                  rotate: orbit.interpolate({
                    inputRange: [0, 1],
                    outputRange: [`${baseAngle}rad`, `${baseAngle + Math.PI * 2}rad`],
                  }),
                },
                { translateX: R },
                {
                  rotate: orbit.interpolate({
                    inputRange: [0, 1],
                    outputRange: [`${-baseAngle}rad`, `${-(baseAngle + Math.PI * 2)}rad`],
                  }),
                },
              ],
            }}
          >
            {item.note}
          </Animated.Text>
        );
      })}
    </View>
  );
}

export default function LangScreen() {
  const { setLang, setLangChosen } = useApp();
  const [colorIdx, setColorIdx] = useState(0);
  const [selected, setSelected] = useState<Lang | null>(null);

  // Logo animācijas — tikai transform (native driver)
  const spin = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  // Pulsa efekts logo — tikai opacity (native driver)
  const pulse = useRef(new Animated.Value(0.6)).current;

  const color = COLORS[colorIdx];

  // Hameleons krāsa (JS side — nav native driver)
  useEffect(() => {
    const t = setInterval(() => setColorIdx(i => (i + 1) % COLORS.length), 700);
    return () => clearInterval(t);
  }, []);

  // Logo rotācija — useNativeDriver: true ✓
  useEffect(() => {
    Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 7000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  // Pulss — useNativeDriver: true ✓ (tikai opacity)
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1100, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.5, duration: 1100, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const bounce = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.16, duration: 100, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 0.94, duration: 90, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1.05, duration: 70, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const spinDeg = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const handleSelect = (code: Lang) => {
    setSelected(code);
    bounce();
    setTimeout(() => { setLang(code); setLangChosen(true); }, 280);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#08080f' }}>
      <FloatingNotes />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.container}
        bounces={false}
      >
        {/* Logo sekcija */}
        <View style={s.logoSection}>
          <View style={{ width: 170, height: 170, alignItems: 'center', justifyContent: 'center' }}>
            <OrbitNotes />

            {/* Statisks neon rings — nav animated border */}
            <View style={[s.ringOuter, { borderColor: color + '44' }]}>
              <View style={[s.ringMid, { borderColor: color + '88' }]}>
                <Animated.View style={[
                  s.ringInner,
                  {
                    borderColor: color,
                    transform: [{ rotate: spinDeg }, { scale }],
                  }
                ]}>
                  <View style={[s.logoCore, { backgroundColor: '#0d0d1a', shadowColor: color, shadowOpacity: 0.9, shadowRadius: 16, elevation: 8 }]}>
                    {/* Pulss uz emoji — tikai opacity */}
                    <Animated.Text style={[s.logoEmoji, { opacity: pulse }]}>
                      🎵
                    </Animated.Text>
                  </View>
                </Animated.View>
              </View>
            </View>
          </View>

          <Text style={[s.logoText, { color, textShadowColor: color, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12 }]}>
            SoundForge
          </Text>
          <Text style={[s.logoSub, { color: color + '66' }]}>MUSIC PLATFORM</Text>
        </View>

        {/* Valodas izvēle */}
        <View style={s.titleWrap}>
          <View style={[s.line, { backgroundColor: color + '55' }]} />
          <Text style={[s.titleTxt, { color }]}>Izvēlies valodu</Text>
          <Text style={[s.titleSub, { color: color + '88' }]}>Choose your language</Text>
          <View style={[s.line, { backgroundColor: color + '55' }]} />
        </View>

        <View style={s.langs}>
          {LANGS.map((l, i) => {
            const isSel = selected === l.code;
            const lc = COLORS[(colorIdx + i * 2) % COLORS.length];
            return (
              <TouchableOpacity
                key={l.code}
                style={[
                  s.langBtn,
                  { borderColor: isSel ? lc : '#1e1e2e' },
                  isSel && { backgroundColor: lc + '18' },
                ]}
                onPress={() => handleSelect(l.code)}
                activeOpacity={0.8}
              >
                <Text style={s.flag}>{l.flag}</Text>
                <View style={s.langInfo}>
                  <Text style={[s.langName, isSel && { color: lc }]}>{l.name}</Text>
                  <Text style={s.langSub}>{l.sub}</Text>
                </View>
                <View style={[s.check, { borderColor: isSel ? lc : '#2a2a40', backgroundColor: isSel ? lc : 'transparent' }]}>
                  {isSel && <Text style={{ color: '#000', fontSize: 12, fontWeight: '900' }}>✓</Text>}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[s.footer, { color: color + '33' }]}>SoundForge v1.0</Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 26, paddingVertical: 36 },
  logoSection: { alignItems: 'center', marginBottom: 32 },
  ringOuter: {
    position: 'absolute', width: 158, height: 158, borderRadius: 79,
    borderWidth: 1, borderStyle: 'dashed',
  },
  ringMid: {
    position: 'absolute', width: 134, height: 134, borderRadius: 67,
    borderWidth: 1, borderStyle: 'dotted',
    alignItems: 'center', justifyContent: 'center',
  },
  ringInner: {
    width: 110, height: 110, borderRadius: 55,
    borderWidth: 2, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },
  logoCore: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  logoEmoji: { fontSize: 34 },
  logoText: { fontSize: 30, fontWeight: '900', letterSpacing: 3, marginTop: 12 },
  logoSub: { fontSize: 10, fontWeight: '600', letterSpacing: 5, marginTop: 4 },
  titleWrap: { alignItems: 'center', marginBottom: 24, gap: 5, width: '100%' },
  line: { height: 1, width: 48, borderRadius: 1 },
  titleTxt: { fontSize: 18, fontWeight: '700' },
  titleSub: { fontSize: 13, fontWeight: '500' },
  langs: { width: '100%', gap: 10 },
  langBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111120', borderRadius: 16, borderWidth: 1.5,
    paddingHorizontal: 18, paddingVertical: 15, gap: 14,
  },
  flag: { fontSize: 30 },
  langInfo: { flex: 1 },
  langName: { fontSize: 17, fontWeight: '700', color: '#bbb' },
  langSub: { fontSize: 12, color: '#444', marginTop: 2 },
  check: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  footer: { marginTop: 24, fontSize: 10, letterSpacing: 3 },
});
