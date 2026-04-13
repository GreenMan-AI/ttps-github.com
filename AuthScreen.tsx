import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform, Alert, ScrollView,
} from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from './AppContext';
import { Lang } from './i18n';

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

  const handleSubmit = async () => {
    if (!username || !password || (mode === 'register' && !confirmPw)) {
      return Alert.alert(t.error, t.fillAll);
    }
    if (mode === 'register' && password !== confirmPw) {
      return Alert.alert(t.error, t.passwordMismatch);
    }
    setLoading(true);
    const err = mode === 'login'
      ? await login(username, password)
      : await register(username, password);
    setLoading(false);
    if (err) Alert.alert(t.error, err);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Language switcher */}
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
            <TouchableOpacity onPress={() => setLangChosen(false)} style={styles.backLangBtn}>
              <Ionicons name="globe-outline" size={18} color="#00cfff" />
            </TouchableOpacity>
          </View>

          {/* Logo */}
          <Text style={styles.logo}>🎵</Text>
          <Text style={styles.appName}>SoundForge</Text>

          {/* Tabs */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, mode === 'login' && styles.tabActive]}
              onPress={() => { setMode('login'); setConfirmPw(''); }}
            >
              <Text style={[styles.tabTxt, mode === 'login' && styles.tabTxtActive]}>
                {t.login}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, mode === 'register' && styles.tabActive]}
              onPress={() => setMode('register')}
            >
              <Text style={[styles.tabTxt, mode === 'register' && styles.tabTxtActive]}>
                {t.register}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.label}>{t.username}</Text>
            <View style={styles.inputRow}>
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

            <Text style={styles.label}>{t.password}</Text>
            <View style={styles.inputRow}>
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
              <TouchableOpacity onPress={() => setShowPw((v) => !v)} style={styles.eyeBtn}>
                <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={20} color="#555" />
              </TouchableOpacity>
            </View>

            {mode === 'register' && (
              <>
                <Text style={styles.label}>{t.confirmPassword}</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="lock-closed-outline" size={18} color="#555" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder={t.confirmPassword}
                    placeholderTextColor="#444"
                    value={confirmPw}
                    onChangeText={setConfirmPw}
                    secureTextEntry={!showPw}
                    autoCapitalize="none"
                  />
                </View>
                <Text style={styles.hint}>{t.passMin}</Text>
              </>
            )}

            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.submitTxt}>
                {loading ? '...' : mode === 'login' ? t.login : t.register}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0a0a0f' },
  scroll: { flexGrow: 1, alignItems: 'center', padding: 24, paddingTop: 16 },
  langRow: { flexDirection: 'row', alignSelf: 'flex-end', gap: 8, marginBottom: 20 },
  langBtn: {
    padding: 6, borderRadius: 8, backgroundColor: '#1a1a25',
    borderWidth: 1, borderColor: 'transparent',
  },
  langBtnActive: { borderColor: '#00cfff' },
  langFlag: { fontSize: 22 },
  backLangBtn: { padding: 6, borderRadius: 8, backgroundColor: '#1a1a25', justifyContent: 'center' },
  logo: { fontSize: 48, marginBottom: 4 },
  appName: { fontSize: 28, fontWeight: '800', color: '#00cfff', letterSpacing: 2, marginBottom: 28 },
  tabs: {
    flexDirection: 'row', backgroundColor: '#1a1a25',
    borderRadius: 14, marginBottom: 24, width: '100%', maxWidth: 380,
  },
  tab: { flex: 1, paddingVertical: 13, alignItems: 'center', borderRadius: 14 },
  tabActive: { backgroundColor: '#00cfff' },
  tabTxt: { color: '#555', fontWeight: '700', fontSize: 15 },
  tabTxtActive: { color: '#000' },
  form: { width: '100%', maxWidth: 380 },
  label: { color: '#888', fontSize: 12, fontWeight: '600', marginBottom: 6, marginLeft: 4, letterSpacing: 0.5 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1a1a25', borderRadius: 12, marginBottom: 16,
    borderWidth: 1, borderColor: '#2a2a35',
    paddingHorizontal: 12,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, color: '#fff', fontSize: 15, paddingVertical: 14 },
  eyeBtn: { padding: 4 },
  hint: { color: '#555', fontSize: 11, marginBottom: 16, marginTop: -10, paddingHorizontal: 4 },
  submitBtn: {
    backgroundColor: '#00cfff', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
  },
  submitDisabled: { opacity: 0.5 },
  submitTxt: { color: '#000', fontSize: 17, fontWeight: '800' },
});
