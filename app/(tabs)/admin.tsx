import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Image } from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '../../AppContext';

const API = 'https://greenman-ai.onrender.com';

export default function AdminScreen() {
  const { user, token, t } = useApp();
  const [tab, setTab] = useState<'upload' | 'tracks' | 'users' | 'ticker'>('upload');
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [file, setFile] = useState<any>(null);
  const [coverImage, setCoverImage] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [tracks, setTracks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [ticker, setTicker] = useState('');
  const [tickerActive, setTickerActive] = useState(false);

  useEffect(() => {
    if (tab === 'tracks') loadTracks();
    if (tab === 'users') loadUsers();
    if (tab === 'ticker') loadTicker();
  }, [tab]);

  const loadTracks = async () => {
    try {
      const r = await fetch(`${API}/api/tracks`);
      const d = await r.json();
      setTracks(Array.isArray(d) ? d : d.tracks || []);
    } catch {}
  };

  const loadUsers = async () => {
    try {
      const r = await fetch(`${API}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      setUsers(Array.isArray(d) ? d : d.users || []);
    } catch {}
  };

  const loadTicker = async () => {
    try {
      const r = await fetch(`${API}/api/ticker`);
      const d = await r.json();
      setTicker(d.text || '');
      setTickerActive(d.active || false);
    } catch {}
  };

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'audio/*',
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      setFile(result.assets[0]);
    }
  };

  const pickCover = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      setCoverImage(result.assets[0]);
    }
  };

  const uploadTrack = async () => {
    if (!file) return Alert.alert(t.error, 'Izvēlies audio failu!');
    setUploading(true);
    try {
      const form = new FormData();
      form.append('title', title || file.name);
      form.append('artist', artist);
      form.append('audio', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'audio/mpeg',
      } as any);

      // Pievieno cover bildi ja izvēlēta
      if (coverImage) {
        const filename = coverImage.uri.split('/').pop() || 'cover.jpg';
        form.append('cover', {
          uri: coverImage.uri,
          name: filename,
          type: 'image/jpeg',
        } as any);
      }

      const r = await fetch(`${API}/api/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const d = await r.json();
      if (d._id || d.track) {
        Alert.alert('✅', 'Dziesma augšupielādēta!');
        setTitle(''); setArtist(''); setFile(null); setCoverImage(null);
      } else {
        Alert.alert(t.error, d.error || 'Neizdevās');
      }
    } catch (e: any) {
      Alert.alert(t.error, e.message);
    }
    setUploading(false);
  };

  const deleteTrack = async (id: string) => {
    Alert.alert('Dzēst?', 'Vai tiešām dzēst šo dziesmu?', [
      { text: 'Nē', style: 'cancel' },
      {
        text: 'Dzēst', style: 'destructive', onPress: async () => {
          try {
            await fetch(`${API}/api/tracks/${id}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` },
            });
            loadTracks();
          } catch {}
        }
      }
    ]);
  };

  const saveTicker = async () => {
    try {
      await fetch(`${API}/api/ticker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: ticker, active: tickerActive }),
      });
      Alert.alert('✅', 'Ticker saglabāts!');
    } catch {}
  };

  if (!user?.isAdmin) {
    return (
      <View style={styles.noAccess}>
        <Ionicons name="lock-closed" size={60} color="#ff4466" />
        <Text style={styles.noAccessText}>Tikai adminam!</Text>
      </View>
    );
  }

  const TABS = [
    { key: 'upload', icon: 'cloud-upload', label: 'Upload' },
    { key: 'tracks', icon: 'musical-notes', label: 'Dziesmas' },
    { key: 'users', icon: 'people', label: 'Lietotāji' },
    { key: 'ticker', icon: 'megaphone', label: 'Ticker' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="shield-checkmark" size={22} color="#00cfff" />
        <Text style={styles.title}> Admin Panelis</Text>
      </View>

      <View style={styles.tabBar}>
        {TABS.map(tb => (
          <TouchableOpacity
            key={tb.key}
            style={[styles.tabBtn, tab === tb.key && styles.tabBtnActive]}
            onPress={() => setTab(tb.key as any)}
          >
            <Ionicons name={tb.icon as any} size={18} color={tab === tb.key ? '#000' : '#888'} />
            <Text style={[styles.tabLabel, tab === tb.key && styles.tabLabelActive]}>{tb.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>

        {/* UPLOAD TAB */}
        {tab === 'upload' && (
          <View>
            <Text style={styles.sectionTitle}>📦 Augšupielādēt dziesmu</Text>
            <TextInput style={styles.input} placeholder="Nosaukums" placeholderTextColor="#555" value={title} onChangeText={setTitle} />
            <TextInput style={styles.input} placeholder="Izpildītājs" placeholderTextColor="#555" value={artist} onChangeText={setArtist} />

            {/* Audio fails */}
            <TouchableOpacity style={styles.pickBtn} onPress={pickFile}>
              <Ionicons name="musical-note" size={20} color="#00cfff" />
              <Text style={styles.pickText}>{file ? file.name : 'Izvēlies MP3 failu'}</Text>
            </TouchableOpacity>

            {/* Cover bilde */}
            <TouchableOpacity style={styles.pickBtn} onPress={pickCover}>
              <Ionicons name="image-outline" size={20} color="#00cfff" />
              <Text style={styles.pickText}>{coverImage ? 'Bilde izvēlēta ✅' : 'Izvēlies vāka bildi (pēc izvēles)'}</Text>
            </TouchableOpacity>
            {coverImage && (
              <Image source={{ uri: coverImage.uri }} style={styles.coverPreview} />
            )}

            <TouchableOpacity style={[styles.uploadBtn, uploading && styles.uploadBtnDisabled]} onPress={uploadTrack} disabled={uploading}>
              <Text style={styles.uploadBtnText}>{uploading ? 'Augšupielādē...' : '⬆ Augšupielādēt'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* TRACKS TAB */}
        {tab === 'tracks' && (
          <View>
            <Text style={styles.sectionTitle}>🎵 Dziesmas ({tracks.length})</Text>
            {tracks.map((tr: any) => (
              <View key={tr._id} style={styles.trackRow}>
                {tr.coverUrl ? (
                  <Image source={{ uri: tr.coverUrl }} style={styles.trackCover} />
                ) : (
                  <View style={styles.trackCoverEmpty}>
                    <Ionicons name="musical-note" size={16} color="#555" />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.trackTitle} numberOfLines={1}>{tr.title || 'Nav nosaukuma'}</Text>
                  <Text style={styles.trackArtist}>{tr.artist || '—'} · {tr.plays || 0} atskaņojumi</Text>
                </View>
                <TouchableOpacity onPress={() => deleteTrack(tr._id)} style={styles.deleteBtn}>
                  <Ionicons name="trash" size={20} color="#ff4466" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* USERS TAB */}
        {tab === 'users' && (
          <View>
            <Text style={styles.sectionTitle}>👥 Lietotāji ({users.length})</Text>
            {users.length === 0 && (
              <Text style={styles.emptyText}>Nav lietotāju vai nav piekļuves</Text>
            )}
            {users.map((u: any) => (
              <View key={u._id || u.username} style={styles.userRow}>
                <Ionicons name={u.isAdmin ? 'shield-checkmark' : 'person'} size={20} color={u.isAdmin ? '#00cfff' : '#888'} />
                <Text style={styles.userName}>{u.username}</Text>
                {u.isAdmin && <Text style={styles.adminBadge}>ADMIN</Text>}
              </View>
            ))}
          </View>
        )}

        {/* TICKER TAB */}
        {tab === 'ticker' && (
          <View>
            <Text style={styles.sectionTitle}>📢 Slīdošais ziņojums</Text>
            <TextInput
              style={[styles.input, { height: 80 }]}
              placeholder="Ziņojuma teksts..."
              placeholderTextColor="#555"
              value={ticker}
              onChangeText={setTicker}
              multiline
            />
            <TouchableOpacity
              style={[styles.toggleBtn, tickerActive && styles.toggleBtnActive]}
              onPress={() => setTickerActive(!tickerActive)}
            >
              <Ionicons name={tickerActive ? 'eye' : 'eye-off'} size={18} color={tickerActive ? '#000' : '#888'} />
              <Text style={[styles.toggleText, tickerActive && styles.toggleTextActive]}>
                {tickerActive ? 'Redzams visiem' : 'Paslēpts'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.uploadBtn} onPress={saveTicker}>
              <Text style={styles.uploadBtnText}>💾 Saglabāt</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 55, paddingBottom: 15, backgroundColor: '#111118' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#00cfff' },
  tabBar: { flexDirection: 'row', backgroundColor: '#111118', paddingHorizontal: 10, paddingBottom: 10 },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10, marginHorizontal: 3 },
  tabBtnActive: { backgroundColor: '#00cfff' },
  tabLabel: { color: '#888', fontSize: 11, marginTop: 2 },
  tabLabelActive: { color: '#000', fontWeight: 'bold' },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 16 },
  input: { backgroundColor: '#1a1a25', color: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, marginBottom: 12 },
  pickBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a25', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#00cfff44' },
  pickText: { color: '#00cfff', marginLeft: 10, flex: 1 },
  coverPreview: { width: 80, height: 80, borderRadius: 10, marginBottom: 12, alignSelf: 'center' },
  uploadBtn: { backgroundColor: '#00cfff', borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 4 },
  uploadBtnDisabled: { opacity: 0.5 },
  uploadBtnText: { color: '#000', fontWeight: 'bold', fontSize: 15 },
  trackRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a25', borderRadius: 12, padding: 12, marginBottom: 8 },
  trackCover: { width: 40, height: 40, borderRadius: 8, marginRight: 10 },
  trackCoverEmpty: { width: 40, height: 40, borderRadius: 8, marginRight: 10, backgroundColor: '#0a0a0f', justifyContent: 'center', alignItems: 'center' },
  trackTitle: { color: '#fff', fontSize: 14, fontWeight: '600' },
  trackArtist: { color: '#888', fontSize: 12, marginTop: 2 },
  deleteBtn: { padding: 8 },
  userRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a25', borderRadius: 12, padding: 14, marginBottom: 8 },
  userName: { color: '#fff', fontSize: 15, marginLeft: 10, flex: 1 },
  adminBadge: { color: '#00cfff', fontSize: 11, fontWeight: 'bold', backgroundColor: '#0d1a2a', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  emptyText: { color: '#444', fontSize: 15, textAlign: 'center', marginTop: 20 },
  toggleBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a25', borderRadius: 12, padding: 14, marginBottom: 12 },
  toggleBtnActive: { backgroundColor: '#00cfff' },
  toggleText: { color: '#888', marginLeft: 10, fontWeight: '600' },
  toggleTextActive: { color: '#000' },
  noAccess: { flex: 1, backgroundColor: '#0a0a0f', justifyContent: 'center', alignItems: 'center' },
  noAccessText: { color: '#ff4466', fontSize: 20, fontWeight: 'bold', marginTop: 16 },
});
