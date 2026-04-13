import {
  View, Text, StyleSheet, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../AppContext';

export default function AuthScreen() {
  const { login, register, t } = useApp();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
  const strengthLabel = ['', 'Vāja', 'Vidēja', 'Laba', 'Droša'];

  const handleSubmit = async () => {
    if (!username.trim() || !password) {
      setError(t.fillAll);
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
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        {/* Logo */}
        <Text style={styles.logo}>🎵 SoundForge</Text>
        <Text style={styles.sub}>
          {mode === 'login' ? 'Laba atgriešanās!' : 'Izveido kontu'}
        </Text>

        {/* Mode toggle */}
        <View style={styles.toggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, mode === 'login' && styles.toggleActive]}
            onPress={() => { setMode('login'); setError(''); }}
          >
            <Text style={[styles.toggleTxt, mode === 'login' && styles.toggleTxtActive]}>
              {t.login}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, mode === 'register' && styles.toggleActive]}
            onPress={() => { setMode('register'); setError(''); }}
          >
            <Text style={[styles.toggleTxt, mode === 'register' && styles.toggleTxtActive]}>
              {t.register}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Username */}
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

        {/* Password */}
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

        {/* Password strength (register only) */}
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

        {/* Error */}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* Submit */}
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
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  inner: {
    flex: 1, justifyContent: 'center',
    paddingHorizontal: 28, paddingBottom: 40,
  },
  logo: {
    fontSize: 36, fontWeight: '800',
    color: '#00cfff', textAlign: 'center',
    marginBottom: 6,
  },
  sub: {
    color: '#444', fontSize: 15,
    textAlign: 'center', marginBottom: 32,
  },
  toggle: {
    flexDirection: 'row',
    backgroundColor: '#111118',
    borderRadius: 14, marginBottom: 24,
    padding: 4,
  },
  toggleBtn: {
    flex: 1, paddingVertical: 11,
    borderRadius: 12, alignItems: 'center',
  },
  toggleActive: { backgroundColor: '#00cfff' },
  toggleTxt: { color: '#444', fontWeight: '700', fontSize: 14 },
  toggleTxtActive: { color: '#000' },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111118',
    borderRadius: 14, marginBottom: 12,
    paddingHorizontal: 14, paddingVertical: 4,
    borderWidth: 1, borderColor: '#1e1e2a',
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1, color: '#fff',
    fontSize: 15, paddingVertical: 12,
  },
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
    backgroundColor: '#00cfff',
    borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 4,
  },
  submitTxt: { color: '#000', fontSize: 16, fontWeight: '800' },
  hint: {
    color: '#333', fontSize: 11,
    textAlign: 'center', marginTop: 14, lineHeight: 16,
  },
});
