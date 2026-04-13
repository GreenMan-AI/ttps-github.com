import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useState } from 'react';
import { useApp } from '../../AppContext';

const API = 'https://greenman-ai.onrender.com';

export default function DiagScreen() {
  const { token } = useApp();
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const add = (name: string, ok: boolean, msg: string) => {
    setResults(prev => [...prev, { name, ok, msg }]);
  };

  const run = async () => {
    setResults([]);
    setLoading(true);

    // 1. Server ping + dziesmu skaits
    try {
      const r = await fetch(`${API}/api/tracks`);
      const d = await r.json();
      const count = d.tracks?.length || (Array.isArray(d) ? d.length : 0);
      add('Serveris', true, `✅ Strādā — ${count} dziesmas`);
    } catch (e: any) {
      add('Serveris', false, `❌ ${e.message}`);
    }

    // 2. /api/me ar esošo token
    if (token) {
      try {
        const r = await fetch(`${API}/api/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const d = await r.json();
        add('/api/me', r.ok, r.ok ? `✅ ${JSON.stringify(d).slice(0, 60)}` : `❌ ${JSON.stringify(d)}`);
      } catch (e: any) {
        add('/api/me', false, `❌ ${e.message}`);
      }

      // 3. Logout test
      try {
        const r2 = await fetch(`${API}/api/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        add('Logout API', r2.ok, r2.ok ? '✅ Strādā' : `❌ Status: ${r2.status}`);
      } catch (e: any) {
        add('Logout API', false, `❌ ${e.message}`);
      }
    } else {
      add('/api/me', false, '⚠️ Nav token — ienāc sistēmā');
    }

    // 4. Register test ar unikālu lietotājvārdu
    try {
      const r = await fetch(`${API}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: `test_${Date.now()}`, password: 'Test1234!' }),
      });
      const d = await r.json();
      add('Register', !!d.token, d.token ? '✅ Strādā' : `❌ ${JSON.stringify(d)}`);
    } catch (e: any) {
      add('Register', false, `❌ ${e.message}`);
    }

    setLoading(false);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🔧 Diagnostika</Text>
      </View>
      <TouchableOpacity style={styles.btn} onPress={run} disabled={loading}>
        <Text style={styles.btnText}>{loading ? 'Pārbauda...' : '▶ Sākt pārbaudi'}</Text>
      </TouchableOpacity>
      {results.map((r, i) => (
        <View key={i} style={[styles.result, r.ok ? styles.ok : styles.err]}>
          <Text style={styles.resultName}>{r.name}</Text>
          <Text style={styles.resultMsg}>{r.msg}</Text>
        </View>
      ))}
      {results.length > 0 && !loading && (
        <TouchableOpacity
          style={styles.copyBtn}
          onPress={() => Alert.alert('Rezultāti', results.map(r => `${r.name}: ${r.msg}`).join('\n'))}
        >
          <Text style={styles.copyText}>Rādīt visu</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  header: { paddingHorizontal: 20, paddingTop: 55, paddingBottom: 15, backgroundColor: '#111118' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#00cfff' },
  btn: { backgroundColor: '#00cfff', margin: 20, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  btnText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  result: { marginHorizontal: 15, marginBottom: 10, borderRadius: 12, padding: 14 },
  ok: { backgroundColor: '#0d2a1a' },
  err: { backgroundColor: '#2a0d0d' },
  resultName: { color: '#fff', fontWeight: 'bold', fontSize: 14, marginBottom: 4 },
  resultMsg: { color: '#ccc', fontSize: 13 },
  copyBtn: { margin: 20, backgroundColor: '#1a1a25', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  copyText: { color: '#00cfff', fontWeight: '600' },
});
