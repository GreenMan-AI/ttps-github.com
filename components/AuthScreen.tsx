import {
  View, Text, StyleSheet, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../AppContext';
import { Lang } from '../i18n';

const LANGUAGES = [
  { code: 'lv' as Lang, flag: '🇱🇻' },
  { code: 'en' as Lang, flag: '🇬🇧' },
  { code: 'ru' as Lang, flag: '🇷🇺' },
];

export default function AuthScreen() {
  const { login, register, t, lang, setLang, setLangChosen } = useApp();
  const [mode, setMode]         = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  // Paroles stipruma indikators
  const pwStrength = () => {
    let s = 0;
    if (password.length >= 8)           s++;
    if (/[A-Z]/.test(password))         s++;
    if (/[0-9]/.test(password))         s++;
    if (/[^a-zA-Z0-9]/.test(password))  s++;
    return s;
  };
  const strengthColor = ['#333', '#ef4444', '#f59e0b', '#22c55e', '#3b82f6'];
  const strengthLabel = ['', 'Vāja', 'Vidēja', 'Laba', 'Droša'];

  const handleSubmit = async () => {
    if (!username.trim() || !password) {
      setError(t.fillAll);
      return;
    }
    if (mode === 'register' && password !== confirmPw) {
      setError(t.pwNoMatch);
      return;
    }
    setError('');
    setLoading(true);
    const err = mode === 'login'
      ? await login(username.trim(), password)
      : await register(username.trim(), password);
    setLoading(false);
    if (err) setError(err);
  };

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={s.inner}>

        {/* Valodu pārslēdzējs */}
        <View style={s.langRow}>
          {LANGUAGES.map((l) => (
            <TouchableOpacity
              key={l.code}
              style={[s.langBtn, lang === l.code && s.langBtnActive]}
              onPress={() => setLang(l.code)}
            >
              <Text style={s.langFlag}>{l.flag}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            onPress={() => setLangChosen(false)}
            style={s.langBtn}
          >
            <Ionicons name="globe-outline" size={20} color="#00cfff" />
          </TouchableOpacity>
        </View>

        {/* Logo */}
        <Text style={s.logo}>🎵 SoundForge</Text>
        <Text style={s.sub}>
          {mode === 'login' ? t.welcomeBack : t.createAccount}
        </Text>

        {/* Login / Register toggle */}
        <View style={s.toggle}>
          <TouchableOpacity
            style={[s.toggleBtn, mode === 'login' && s.toggleActive]}
            onPress={() => { setMode('login'); setError(''); setConfirmPw(''); }}
          >
            <Text style={[s.toggleTxt, mode === 'login' && s.toggleTxtActive]}>
              {t.login}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.toggleBtn, mode === 'register' && s.toggleActive]}
            onPress={() => { setMode('register'); setError(''); }}
          >
            <Text style={[s.toggleTxt, mode === 'register' && s.toggleTxtActive]}>
              {t.register}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Lietotājvārds */}
        <View style={s.inputWrap}>
          <Ionicons name="person-outline" size={18} color="#555" style={s.icon} />
          <TextInput
            style={s.input}
            placeholder={t.username}
            placeholderTextColor="#444"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Parole */}
        <View style={s.inputWrap}>
          <Ionicons name="lock-closed-outline" size={18} color="#555" style={s.icon} />
          <TextInput
            style={[s.input, { flex: 1 }]}
            placeholder={t.password}
            placeholderTextColor="#444"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPw}
            autoCapitalize="none"
          />
          <TouchableOpacity onPress={() => setShowPw(v => !v)} style={s.eyeBtn}>
            <Ionicons name={showPw ? 'eye-off' : 'eye'} size={18} color="#555" />
          </TouchableOpacity>
        </View>

        {/* Paroles stiprums (tikai reģistrācijai) */}
        {mode === 'register' && password.length > 0 && (
          <View style={s.strengthRow}>
            <View style={s.strengthBars}>
              {[1, 2, 3, 4].map(i => (
                <View
                  key={i}
                  style={[s.bar, { backgroundColor: i <= pwStrength() ? strengthColor[pwStrength()] : '#222' }]}
                />
              ))}
            </View>
            <Text style={[s.strengthLbl, { color: strengthColor[pwStrength()] }]}>
              {strengthLabel[pwStrength()]}
            </Text>
          </View>
        )}

        {/* Paroles apstiprināšana (tikai reģistrācijai) */}
        {mode === 'register' && (
          <View style={s.inputWrap}>
            <Ionicons name="lock-closed-outline" size={18} color="#555" style={s.icon} />
            <TextInput
              style={[s.input, { flex: 1 }]}
              placeholder={t.repPw || 'Atkārtot paroli'}
              placeholderTextColor="#444"
              value={confirmPw}
              onChangeText={setConfirmPw}
              secureTextEntry={!showPw}
              autoCapitalize="none"
            />
          </View>
        )}

        {/* Kļūdas ziņojums */}
        {error ? <Text style={s.error}>{error}</Text> : null}

        {/* Iesniegt */}
        <TouchableOpacity
          style={[s.btn, loading && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={s.btnTxt}>
            {loading ? '...' : mode === 'login' ? t.login : t.register}
          </Text>
        </TouchableOpacity>

        {/* Paroles prasības */}
        {mode === 'register' && (
          <Text style={s.hint}>{t.passMin}</Text>
        )}

      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 28, paddingBottom: 40 },
  langRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginBottom: 24 },
  langBtn: { padding: 6, borderRadius: 8, backgroundColor: '#1a1a25', borderWidth: 1, borderColor: 'transparent' },
  langBtnActive: { borderColor: '#00cfff' },
  langFlag: { fontSize: 22 },
  logo: { fontSize: 34, fontWeight: '800', color: '#00cfff', textAlign: 'center', marginBottom: 6 },
  sub: { color: '#444', fontSize: 15, textAlign: 'center', marginBottom: 28 },
  toggle: { flexDirection: 'row', backgroundColor: '#111118', borderRadius: 14, marginBottom: 22, padding: 4 },
  toggleBtn: { flex: 1, paddingVertical: 11, borderRadius: 12, alignItems: 'center' },
  toggleActive: { backgroundColor: '#00cfff' },
  toggleTxt: { color: '#444', fontWeight: '700', fontSize: 14 },
  toggleTxtActive: { color: '#000' },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111118', borderRadius: 14,
    marginBottom: 12, paddingHorizontal: 14, paddingVertical: 4,
    borderWidth: 1, borderColor: '#1e1e2a',
  },
  icon: { marginRight: 10 },
  input: { flex: 1, color: '#fff', fontSize: 15, paddingVertical: 12 },
  eyeBtn: { padding: 6 },
  strengthRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10, marginTop: -4 },
  strengthBars: { flexDirection: 'row', gap: 4, flex: 1 },
  bar: { flex: 1, height: 3, borderRadius: 2 },
  strengthLbl: { fontSize: 11, fontWeight: '700', width: 48 },
  error: { color: '#ff4466', fontSize: 13, textAlign: 'center', marginBottom: 10 },
  btn: { backgroundColor: '#00cfff', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 6 },
  btnTxt: { color: '#000', fontSize: 16, fontWeight: '800' },
  hint: { color: '#333', fontSize: 11, textAlign: 'center', marginTop: 12, lineHeight: 16 },
});
