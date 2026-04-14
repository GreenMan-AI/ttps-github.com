import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Image, Modal } from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '../../AppContext';

const API = 'https://greenman-ai.onrender.com';

const VIOLATION_TYPES = [
  { key: 'spam',      label: '🗑️ Spam',          color: '#f59e0b' },
  { key: 'abuse',     label: '🤬 Rupjības',       color: '#ef4444' },
  { key: 'copyright', label: '©️ Autortiesības',  color: '#a855f7' },
  { key: 'fake',      label: '🎭 Viltus konts',   color: '#6366f1' },
  { key: 'other',     label: '⚠️ Cits',           color: '#888'   },
];

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
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [warnMsg, setWarnMsg] = useState('');
  const [selectedViolation, setSelectedViolation] = useState('spam');
  const [violations, setViolations] = useState<Record<string, any[]>>({});
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
    const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true });
    if (!result.canceled && result.assets?.[0]) setFile(result.assets[0]);
  };

  const pickCover = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) setCoverImage(result.assets[0]);
  };

  const uploadTrack = async () => {
    if (!file) return Alert.alert(t.error, 'Izvēlies audio failu!');
    setUploading(true);
    try {
      const form = new FormData();
      form.append('title', title || file.name);
      form.append('artist', artist);
      form.append('audio', { uri: file.uri, name: file.name, type: file.mimeType || 'audio/mpeg' } as any);
      if (coverImage) {
        const filename = coverImage.uri.split('/').pop() || 'cover.jpg';
        form.append('cover', { uri: coverImage.uri, name: filename, type: 'image/jpeg' } as any);
      }
      const r = await fetch(`${API}/api/upload`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form,
      });
      const d = await r.json();
      if (d._id || d.track) {
        Alert.alert('✅', 'Dziesma augšupielādēta!');
        setTitle(''); setArtist(''); setFile(null); setCoverImage(null);
      } else {
        Alert.alert(t.error, d.error || 'Neizdevās');
      }
    } catch (e: any) { Alert.alert(t.error, e.message); }
    setUploading(false);
  };

  const deleteTrack = async (id: string) => {
    Alert.alert('Dzēst?', 'Vai tiešām dzēst šo dziesmu?', [
      { text: 'Nē', style: 'cancel' },
      { text: 'Dzēst', style: 'destructive', onPress: async () => {
        try {
          await fetch(`${API}/api/tracks/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
          loadTracks();
        } catch {}
      }},
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

  const openUserModal = (u: any) => {
    setSelectedUser(u);
    setWarnMsg('');
    setSelectedViolation('spam');
    setShowUserModal(true);
  };

  const sendWarning = async () => {
    if (!warnMsg.trim()) return Alert.alert('Kļūda', 'Ievadi brīdinājuma ziņojumu!');
    const violation = VIOLATION_TYPES.find(v => v.key === selectedViolation);
    const newViolation = {
      id: Date.now().toString(),
      type: selectedViolation,
      label: violation?.label || '⚠️',
      msg: warnMsg.trim(),
      date: new Date().toLocaleDateString('lv-LV'),
    };
    setViolations(prev => ({
      ...prev,
      [selectedUser._id]: [...(prev[selectedUser._id] || []), newViolation],
    }));
    try {
      await fetch(`${API}/api/admin/warn/${selectedUser._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: warnMsg.trim(), type: selectedViolation }),
      });
    } catch {}
    Alert.alert('✅', `Brīdinājums nosūtīts lietotājam "${selectedUser.username}"!`);
    setWarnMsg('');
    setShowUserModal(false);
  };

  const deleteUser = (u: any) => {
    Alert.alert('🗑️ Dzēst lietotāju?', `Vai tiešām dzēst "${u.username}"?`, [
      { text: 'Atcelt', style: 'cancel' },
      { text: 'Dzēst', style: 'destructive', onPress: async () => {
        try {
          await fetch(`${API}/api/admin/users/${u._id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
          setShowUserModal(false);
          loadUsers();
          Alert.alert('✅', `Lietotājs "${u.username}" dzēsts!`);
        } catch { Alert.alert('Kļūda', 'Neizdevās dzēst'); }
      }},
    ]);
  };

  const banUser = (u: any) => {
    Alert.alert('🚫 Bloķēt?', `Bloķēt "${u.username}"?`, [
      { text: 'Atcelt', style: 'cancel' },
      { text: 'Bloķēt', style: 'destructive', onPress: async () => {
        try {
          await fetch(`${API}/api/admin/ban/${u._id}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
          setShowUserModal(false);
          loadUsers();
          Alert.alert('✅', `Lietotājs "${u.username}" bloķēts!`);
        } catch { Alert.alert('Kļūda', 'Neizdevās bloķēt'); }
      }},
    ]);
  };

  if (!user?.isAdmin) {
    return (
      <View style={st.noAccess}>
        <Ionicons name="lock-closed" size={60} color="#ff4466" />
        <Text style={st.noAccessText}>Tikai adminam!</Text>
      </View>
    );
  }

  const TABS = [
    { key: 'upload', icon: 'cloud-upload',  label: 'Upload' },
    { key: 'tracks', icon: 'musical-notes', label: 'Dziesmas' },
    { key: 'users',  icon: 'people',        label: 'Lietotāji' },
    { key: 'ticker', icon: 'megaphone',     label: 'Ticker' },
  ];

  return (
    <View style={st.container}>
      <View style={st.header}>
        <Ionicons name="shield-checkmark" size={22} color="#00cfff" />
        <Text style={st.title}> Admin Panelis</Text>
      </View>

      <View style={st.tabBar}>
        {TABS.map(tb => (
          <TouchableOpacity
            key={tb.key}
            style={[st.tabBtn, tab === tb.key && st.tabBtnActive]}
            onPress={() => setTab(tb.key as any)}
          >
            <Ionicons name={tb.icon as any} size={18} color={tab === tb.key ? '#000' : '#888'} />
            <Text style={[st.tabLabel, tab === tb.key && st.tabLabelActive]}>{tb.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>

        {tab === 'upload' && (
          <View>
            <Text style={st.sectionTitle}>📦 Augšupielādēt dziesmu</Text>
            <TextInput style={st.input} placeholder="Nosaukums" placeholderTextColor="#555" value={title} onChangeText={setTitle} />
            <TextInput style={st.input} placeholder="Izpildītājs" placeholderTextColor="#555" value={artist} onChangeText={setArtist} />
            <TouchableOpacity style={st.pickBtn} onPress={pickFile}>
              <Ionicons name="musical-note" size={20} color="#00cfff" />
              <Text style={st.pickText}>{file ? file.name : 'Izvēlies MP3 failu'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={st.pickBtn} onPress={pickCover}>
              <Ionicons name="image-outline" size={20} color="#00cfff" />
              <Text style={st.pickText}>{coverImage ? 'Bilde izvēlēta ✅' : 'Izvēlies vāka bildi (pēc izvēles)'}</Text>
            </TouchableOpacity>
            {coverImage && <Image source={{ uri: coverImage.uri }} style={st.coverPreview} />}
            <TouchableOpacity style={[st.uploadBtn, uploading && st.uploadBtnDisabled]} onPress={uploadTrack} disabled={uploading}>
              <Text style={st.uploadBtnText}>{uploading ? 'Augšupielādē...' : '⬆ Augšupielādēt'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {tab === 'tracks' && (
          <View>
            <Text style={st.sectionTitle}>🎵 Dziesmas ({tracks.length})</Text>
            {tracks.map((tr: any) => (
              <View key={tr._id} style={st.trackRow}>
                {tr.coverUrl
                  ? <Image source={{ uri: tr.coverUrl }} style={st.trackCover} />
                  : <View style={st.trackCoverEmpty}><Ionicons name="musical-note" size={16} color="#555" /></View>
                }
                <View style={{ flex: 1 }}>
                  <Text style={st.trackTitle} numberOfLines={1}>{tr.title || 'Nav nosaukuma'}</Text>
                  <Text style={st.trackArtist}>{tr.artist || '—'} · {tr.plays || 0} atskaņojumi</Text>
                </View>
                <TouchableOpacity onPress={() => deleteTrack(tr._id)} style={st.deleteBtn}>
                  <Ionicons name="trash" size={20} color="#ff4466" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {tab === 'users' && (
          <View>
            <Text style={st.sectionTitle}>👥 Lietotāji ({users.length})</Text>
            {users.length === 0 && <Text style={st.emptyText}>Nav lietotāju vai nav piekļuves</Text>}
            {users.map((u: any) => {
              const userViolations = violations[u._id] || [];
              return (
                <TouchableOpacity
                  key={u._id || u.username}
                  style={[st.userRow, userViolations.length > 0 && st.userRowWarned]}
                  onPress={() => openUserModal(u)}
                >
                  <View style={[st.userAvatar, { backgroundColor: u.isAdmin ? '#00cfff22' : '#111118' }]}>
                    <Text style={[st.userAvatarLetter, { color: u.isAdmin ? '#00cfff' : '#888' }]}>
                      {u.username?.charAt(0)?.toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={st.userName}>{u.username}</Text>
                      {u.isAdmin && <Text style={st.adminBadge}>ADMIN</Text>}
                      {u.banned && <Text style={st.bannedBadge}>BLOĶĒTS</Text>}
                    </View>
                    <Text style={st.userMeta}>
                      {userViolations.length > 0
                        ? `⚠️ ${userViolations.length} brīdinājums(-i)`
                        : '✓ Nav pārkāpumu'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#444" />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {tab === 'ticker' && (
          <View>
            <Text style={st.sectionTitle}>📢 Slīdošais ziņojums</Text>
            <TextInput
              style={[st.input, { height: 80 }]}
              placeholder="Ziņojuma teksts..."
              placeholderTextColor="#555"
              value={ticker}
              onChangeText={setTicker}
              multiline
            />
            <TouchableOpacity
              style={[st.toggleBtn, tickerActive && st.toggleBtnActive]}
              onPress={() => setTickerActive(!tickerActive)}
            >
              <Ionicons name={tickerActive ? 'eye' : 'eye-off'} size={18} color={tickerActive ? '#000' : '#888'} />
              <Text style={[st.toggleText, tickerActive && st.toggleTextActive]}>
                {tickerActive ? 'Redzams visiem' : 'Paslēpts'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={st.uploadBtn} onPress={saveTicker}>
              <Text style={st.uploadBtnText}>💾 Saglabāt</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* LIETOTĀJA MODĀLS */}
      <Modal visible={showUserModal} transparent animationType="slide">
        <TouchableOpacity style={st.overlay} onPress={() => setShowUserModal(false)} activeOpacity={1}>
          <View style={st.modal}>
            {selectedUser && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={st.modalUserHeader}>
                  <View style={st.modalAvatar}>
                    <Text style={st.modalAvatarLetter}>{selectedUser.username?.charAt(0)?.toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.modalUsername}>{selectedUser.username}</Text>
                    <Text style={st.modalRole}>{selectedUser.isAdmin ? '⭐ Admin' : '👤 Lietotājs'}</Text>
                  </View>
                </View>

                {(violations[selectedUser._id] || []).length > 0 && (
                  <View style={st.violationsBox}>
                    <Text style={st.violationsTitle}>📋 Pārkāpumu vēsture:</Text>
                    {(violations[selectedUser._id] || []).map((v: any) => (
                      <View key={v.id} style={[st.violationRow, { borderLeftColor: VIOLATION_TYPES.find(vt => vt.key === v.type)?.color || '#888' }]}>
                        <Text style={st.violationLabel}>{v.label} · {v.date}</Text>
                        <Text style={st.violationMsg}>{v.msg}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <Text style={st.modalLabel}>Pārkāpuma veids:</Text>
                <View style={st.violationTypes}>
                  {VIOLATION_TYPES.map(vt => (
                    <TouchableOpacity
                      key={vt.key}
                      style={[st.vtBtn, selectedViolation === vt.key && { backgroundColor: vt.color + '33', borderColor: vt.color }]}
                      onPress={() => setSelectedViolation(vt.key)}
                    >
                      <Text style={[st.vtTxt, selectedViolation === vt.key && { color: vt.color }]}>{vt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={st.modalLabel}>Brīdinājuma ziņojums:</Text>
                <TextInput
                  style={st.modalInput}
                  placeholder="Piemēram: Lūdzu ievēro kopienas noteikumus..."
                  placeholderTextColor="#444"
                  value={warnMsg}
                  onChangeText={setWarnMsg}
                  multiline
                />

                <TouchableOpacity style={st.warnBtn} onPress={sendWarning}>
                  <Ionicons name="warning-outline" size={18} color="#000" />
                  <Text style={st.warnBtnTxt}>⚠️ Nosūtīt brīdinājumu</Text>
                </TouchableOpacity>

                {!selectedUser.isAdmin && (
                  <View style={st.dangerRow}>
                    <TouchableOpacity style={st.banBtn} onPress={() => banUser(selectedUser)}>
                      <Ionicons name="ban-outline" size={16} color="#f59e0b" />
                      <Text style={st.banBtnTxt}>Bloķēt</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={st.deleteUserBtn} onPress={() => deleteUser(selectedUser)}>
                      <Ionicons name="trash-outline" size={16} color="#ff4466" />
                      <Text style={st.deleteUserBtnTxt}>Dzēst</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <TouchableOpacity style={st.closeBtn} onPress={() => setShowUserModal(false)}>
                  <Text style={st.closeBtnTxt}>Aizvērt</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
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
  userRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a25', borderRadius: 12, padding: 12, marginBottom: 8, gap: 10 },
  userRowWarned: { borderWidth: 1, borderColor: '#f59e0b44', backgroundColor: '#2a1a0a' },
  userAvatar: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  userAvatarLetter: { fontSize: 16, fontWeight: '800' },
  userName: { color: '#fff', fontSize: 14, fontWeight: '600' },
  userMeta: { color: '#555', fontSize: 11, marginTop: 2 },
  adminBadge: { color: '#00cfff', fontSize: 10, fontWeight: 'bold', backgroundColor: '#0d1a2a', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 5 },
  bannedBadge: { color: '#ff4466', fontSize: 10, fontWeight: 'bold', backgroundColor: '#2a0d0d', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 5 },
  emptyText: { color: '#444', fontSize: 15, textAlign: 'center', marginTop: 20 },
  toggleBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a25', borderRadius: 12, padding: 14, marginBottom: 12 },
  toggleBtnActive: { backgroundColor: '#00cfff' },
  toggleText: { color: '#888', marginLeft: 10, fontWeight: '600' },
  toggleTextActive: { color: '#000' },
  noAccess: { flex: 1, backgroundColor: '#0a0a0f', justifyContent: 'center', alignItems: 'center' },
  noAccessText: { color: '#ff4466', fontSize: 20, fontWeight: 'bold', marginTop: 16 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#111118', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '90%' },
  modalUserHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  modalAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#00cfff22', justifyContent: 'center', alignItems: 'center' },
  modalAvatarLetter: { fontSize: 22, fontWeight: '800', color: '#00cfff' },
  modalUsername: { color: '#fff', fontSize: 18, fontWeight: '700' },
  modalRole: { color: '#555', fontSize: 12, marginTop: 2 },
  modalLabel: { color: '#666', fontSize: 12, fontWeight: '700', marginBottom: 8, letterSpacing: 0.5 },
  modalInput: { backgroundColor: '#0a0a0f', borderRadius: 12, padding: 12, color: '#fff', fontSize: 14, borderWidth: 1, borderColor: '#2a2a35', marginBottom: 12, minHeight: 70 },
  violationsBox: { backgroundColor: '#1a1505', borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#f59e0b33' },
  violationsTitle: { color: '#f59e0b', fontSize: 12, fontWeight: '700', marginBottom: 8 },
  violationRow: { borderLeftWidth: 3, paddingLeft: 10, marginBottom: 6 },
  violationLabel: { color: '#888', fontSize: 10, fontWeight: '600' },
  violationMsg: { color: '#ccc', fontSize: 13, marginTop: 2 },
  violationTypes: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  vtBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: '#1a1a25', borderWidth: 1, borderColor: '#2a2a35' },
  vtTxt: { color: '#666', fontSize: 11, fontWeight: '600' },
  warnBtn: { backgroundColor: '#f59e0b', borderRadius: 12, paddingVertical: 13, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 10 },
  warnBtnTxt: { color: '#000', fontWeight: '800', fontSize: 14 },
  dangerRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  banBtn: { flex: 1, backgroundColor: '#f59e0b22', borderRadius: 12, paddingVertical: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: '#f59e0b44' },
  banBtnTxt: { color: '#f59e0b', fontWeight: '700' },
  deleteUserBtn: { flex: 1, backgroundColor: '#ff446622', borderRadius: 12, paddingVertical: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: '#ff446644' },
  deleteUserBtnTxt: { color: '#ff4466', fontWeight: '700' },
  closeBtn: { backgroundColor: '#1a1a25', borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 4 },
  closeBtnTxt: { color: '#666', fontWeight: '600' },
});
