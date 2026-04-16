import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ScrollView,
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
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const pwStrength = () => {
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^a-zA-Z0-9]/.test(password)) s++;
    return s;
  };

  const strengthColor = ['#333', '#ef4444', '#f59e0b', '#22c55e', '#3b82f6'];
  const strengthLabel = ['', t.pwWeak, t.pwMedium, t.pwGood, t.pwStrong];

  const handleSubmit = async () => {
    setError('');
    if (!username.trim() || !password) {
      setError(t.fillAll);
      return;
    }
    if (mode === 'register' && password !== confirmPw) {
      setError(t.pwNoMatch);
      return;
    }
    setLoading(true);
    const err = mode === 'login'
      ? await login(username.trim(), password)
      : await register(username.trim(), password);
    setLoading(false);
    if (err) setError(err);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Valodas pārslēdzējs */}
        <View style={styles.langRow}>
          {LANGUAGES.map((l) => (
            <TouchableOpacity
              key={l.code}
              style={[styles.langBtn, lang === l.code && styles.langBtnActive]}
              onPress={() => setLang(l.code)}
            >
              <Text style={styles.langFlag}>{l.flag}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            onPress={() => setLangChosen(false)}
            style={styles.backLangBtn}
          >
            <Ionicons name="globe-outline" size={18} color="#00cfff" />
          </TouchableOpacity>
        </View>

        {/* Logo */}
        <Text style={styles.logo}>🎵</Text>
        <Text style={styles.appName}>SoundForge</Text>
        <Text style={styles.sub}>
          {mode === 'login' ? t.welcomeBack : t.createAccount}
        </Text>

        {/* Login/Register tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, mode === 'login' && styles.tabActive]}
            onPress={() => { setMode('login'); setError(''); setConfirmPw(''); }}
          >
            <Text style={[styles.tabTxt, mode === 'login' && styles.tabTxtActive]}>
              {t.login}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, mode === 'register' && styles.tabActive]}
            onPress={() => { setMode('register'); setError(''); }}
          >
            <Text style={[styles.tabTxt, mode === 'register' && styles.tabTxtActive]}>
              {t.register}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Lietotājvārds */}
        <View style={styles.inputWrap}>
          <Ionicons name="person-outline" size={18} color="#555" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder={t.username}
            placeholderTextColor="#444"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Parole */}
        <View style={styles.inputWrap}>
          <Ionicons name="lock-closed-outline" size={18} color="#555" style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder={t.password}
            placeholderTextColor="#444"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPw}
            autoCapitalize="none"
          />
          <TouchableOpacity onPress={() => setShowPw(!showPw)} style={styles.eyeBtn}>
            <Ionicons name={showPw ? 'eye-off' : 'eye'} size={18} color="#555" />
          </TouchableOpacity>
        </View>

        {/* Paroles stiprums (tikai reģistrācijai) */}
        {mode === 'register' && password.length > 0 && (
          <View style={styles.strengthWrap}>
            <View style={styles.strengthBars}>
              {[1, 2, 3, 4].map(i => (
                <View
                  key={i}
                  style={[
                    styles.strengthBar,
                    { backgroundColor: i <= pwStrength() ? strengthColor[pwStrength()] : '#222' },
                  ]}
                />
              ))}
            </View>
            <Text style={[styles.strengthLabel, { color: strengthColor[pwStrength()] }]}>
              {strengthLabel[pwStrength()]}
            </Text>
          </View>
        )}

        {/* Paroles apstiprināšana (tikai reģistrācijai) */}
        {mode === 'register' && (
          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={18} color="#555" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder={t.repPw}
              placeholderTextColor="#444"
              value={confirmPw}
              onChangeText={setConfirmPw}
              secureTextEntry={!showPw}
              autoCapitalize="none"
            />
          </View>
        )}

        {/* Kļūdas ziņojums */}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* Iesniegt */}
        <TouchableOpacity
          style={[styles.submitBtn, loading && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitTxt}>
            {loading ? '...' : mode === 'login' ? t.login : t.register}
          </Text>
        </TouchableOpacity>

        {mode === 'register' && (
          <Text style={styles.hint}>{t.passMin}</Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  scroll: {
    flexGrow: 1, justifyContent: 'center',
    paddingHorizontal: 28, paddingBottom: 40, paddingTop: 20,
  },
  langRow: {
    flexDirection: 'row', justifyContent: 'flex-end',
    gap: 8, marginBottom: 24,
  },
  langBtn: {
    padding: 6, borderRadius: 8, backgroundColor: '#1a1a25',
    borderWidth: 1, borderColor: 'transparent',
  },
  langBtnActive: { borderColor: '#00cfff' },
  langFlag: { fontSize: 22 },
  backLangBtn: {
    padding: 6, borderRadius: 8, backgroundColor: '#1a1a25',
    justifyContent: 'center', alignItems: 'center',
  },
  logo: { fontSize: 48, textAlign: 'center', marginBottom: 4 },
  appName: {
    fontSize: 32, fontWeight: '900', color: '#00cfff',
    textAlign: 'center', letterSpacing: 2, marginBottom: 6,
  },
  sub: {
    color: '#444', fontSize: 15,
    textAlign: 'center', marginBottom: 28,
  },
  tabs: {
    flexDirection: 'row', backgroundColor: '#111118',
    borderRadius: 14, marginBottom: 20, padding: 4,
  },
  tab: { flex: 1, paddingVertical: 11, borderRadius: 12, alignItems: 'center' },
  tabActive: { backgroundColor: '#00cfff' },
  tabTxt: { color: '#444', fontWeight: '700', fontSize: 14 },
  tabTxtActive: { color: '#000' },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111118', borderRadius: 14, marginBottom: 12,
    paddingHorizontal: 14, paddingVertical: 4,
    borderWidth: 1, borderColor: '#1e1e2a',
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: '#fff', fontSize: 15, paddingVertical: 12 },
  eyeBtn: { padding: 6 },
  strengthWrap: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, marginBottom: 12, marginTop: -4,
  },
  strengthBars: { flexDirection: 'row', gap: 4, flex: 1 },
  strengthBar: { flex: 1, height: 3, borderRadius: 2 },
  strengthLabel: { fontSize: 11, fontWeight: '700', width: 48 },
  error: {
    color: '#ff4466', fontSize: 13,
    textAlign: 'center', marginBottom: 12,
  },
  submitBtn: {
    backgroundColor: '#00cfff', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 4,
  },
  submitTxt: { color: '#000', fontSize: 16, fontWeight: '800' },
  hint: {
    color: '#333', fontSize: 11,
    textAlign: 'center', marginTop: 14, lineHeight: 16,
  },
});
