import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { useEffect, useRef } from 'react';
import { useApp } from './AppContext';

const NEON = ['#00cfff', '#ff00ff', '#00ff88', '#ff6600', '#ffff00', '#ff0066', '#00ffff', '#ff00aa'];

const LANGS = [
  { code: 'lv', flag: '🇱🇻', name: 'Latviešu' },
  { code: 'en', flag: '🇬🇧', name: 'English' },
  { code: 'ru', flag: '🇷🇺', name: 'Русский' },
];

export default function LangScreen() {
  const { setLang, setLangChosen, t } = useApp();

  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnims = useRef(NEON.map(() => new Animated.Value(0.3))).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Spin ring
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 5000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Pulse each dot
    pulseAnims.forEach((anim, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 200),
          Animated.timing(anim, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.3, duration: 600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      ).start();
    });

    // Logo entrance
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, []);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const spinReverse = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-360deg'] });

  return (
    <View style={s.container}>
      {/* Spinning neon rings around logo */}
      <Animated.View style={[s.logoWrap, { transform: [{ scale: scaleAnim }] }]}>

        {/* Outer ring */}
        <Animated.View style={[s.ring, s.ringOuter, { transform: [{ rotate: spin }] }]}>
          {NEON.map((color, i) => (
            <Animated.View
              key={`outer-${i}`}
              style={[
                s.dot,
                s.dotOuter,
                {
                  backgroundColor: color,
                  opacity: pulseAnims[i],
                  shadowColor: color,
                  shadowRadius: 8,
                  shadowOpacity: 1,
                  transform: [
                    { rotate: `${i * 45}deg` },
                    { translateX: 80 },
                  ],
                },
              ]}
            />
          ))}
        </Animated.View>

        {/* Inner ring (reverse) */}
        <Animated.View style={[s.ring, s.ringInner, { transform: [{ rotate: spinReverse }] }]}>
          {NEON.map((color, i) => (
            <Animated.View
              key={`inner-${i}`}
              style={[
                s.dot,
                s.dotInner,
                {
                  backgroundColor: NEON[(i + 4) % NEON.length],
                  opacity: pulseAnims[(i + 2) % NEON.length],
                  shadowColor: color,
                  shadowRadius: 6,
                  shadowOpacity: 1,
                  transform: [
                    { rotate: `${i * 45}deg` },
                    { translateX: 55 },
                  ],
                },
              ]}
            />
          ))}
        </Animated.View>

        {/* Logo center */}
        <View style={s.logoCenter}>
          <Text style={s.logoEmoji}>🎵</Text>
          <Text style={s.logoText}>SoundForge</Text>
        </View>

      </Animated.View>

      <Text style={s.sub}>{t.chooseLanguage}</Text>

      {LANGS.map(l => (
        <TouchableOpacity
          key={l.code}
          style={s.btn}
          onPress={() => { setLang(l.code as any); setLangChosen(true); }}
        >
          <Text style={s.flag}>{l.flag}</Text>
          <Text style={s.name}>{l.name}</Text>
          <Text style={s.arrow}>›</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f', justifyContent: 'center', alignItems: 'center', padding: 30 },
  logoWrap: { width: 200, height: 200, justifyContent: 'center', alignItems: 'center', marginBottom: 30 },
  ring: { position: 'absolute', width: 200, height: 200, justifyContent: 'center', alignItems: 'center' },
  ringOuter: {},
  ringInner: {},
  dot: { position: 'absolute', borderRadius: 50 },
  dotOuter: { width: 12, height: 12 },
  dotInner: { width: 8, height: 8 },
  logoCenter: { alignItems: 'center', justifyContent: 'center' },
  logoEmoji: { fontSize: 52 },
  logoText: { fontSize: 22, fontWeight: 'bold', color: '#00cfff', marginTop: 6, textShadowColor: '#00cfff', textShadowRadius: 10 },
  sub: { fontSize: 16, color: '#888', marginBottom: 32, textAlign: 'center' },
  btn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a25', borderRadius: 16, paddingHorizontal: 24, paddingVertical: 16, marginBottom: 12, width: '100%' },
  flag: { fontSize: 26, marginRight: 14 },
  name: { fontSize: 17, color: '#fff', fontWeight: '600', flex: 1 },
  arrow: { fontSize: 20, color: '#555' },
});
