import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../AppContext';
import { Lang } from '../../i18n';

const LANGUAGES = [
  { code: 'lv' as Lang, flag: '🇱🇻', name: 'Latviešu' },
  { code: 'en' as Lang, flag: '🇬🇧', name: 'English' },
  { code: 'ru' as Lang, flag: '🇷🇺', name: 'Русский' },
];

export default function ProfileScreen() {
  const {
    user, logout, t, lang, setLang,
    tracks, playlist, namedPlaylists,
    setLangChosen,
  } = useApp();

  const [showLang, setShowLang] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      t.logout,
      'Vai tiešām vēlies iziet?',
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.logout,
          style: 'destructive',
          onPress: () => {
            logout();
            // Atgriežas uz auth ekrānu — AppProvider to apstrādā
          },
        },
      ]
    );
  };

  const curLang = LANGUAGES.find(l => l.code === lang);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>👤 {t.profile}</Text>
      </View>

      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={[styles.avatar, user?.isAdmin && styles.avatarAdmin]}>
          <Text style={styles.avatarLetter}>
            {user?.username?.charAt(0)?.toUpperCase() || '?'}
          </Text>
        </View>
        <Text style={styles.username}>{user?.username}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>
            {user?.isAdmin ? '⭐ Admin' : `👤 ${t.user}`}
          </Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.stats}>
        <View style={styles.statCard}>
          <Ionicons name="musical-notes" size={20} color="#00cfff" />
          <Text style={styles.statVal}>{tracks.length}</Text>
          <Text style={styles.statLabel}>{t.home}</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="list" size={20} color="#00cfff" />
          <Text style={styles.statVal}>{namedPlaylists.length}</Text>
          <Text style={styles.statLabel}>{t.playlist}</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="bookmark" size={20} color="#00cfff" />
          <Text style={styles.statVal}>{playlist.length}</Text>
          <Text style={styles.statLabel}>{t.myPlaylist}</Text>
        </View>
      </View>

      {/* Menu */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t.settings}</Text>

        {/* Language */}
        <TouchableOpacity style={styles.menuItem} onPress={() => setShowLang(true)}>
          <View style={styles.menuLeft}>
            <Ionicons name="globe-outline" size={20} color="#00cfff" />
            <Text style={styles.menuText}>{t.changeLanguage}</Text>
          </View>
          <View style={styles.menuRight}>
            <Text style={styles.menuValue}>{curLang?.flag} {curLang?.name}</Text>
            <Ionicons name="chevron-forward" size={18} color="#333" />
          </View>
        </TouchableOpacity>

        {/* Change language from splash */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => setLangChosen(false)}
        >
          <View style={styles.menuLeft}>
            <Ionicons name="language-outline" size={20} color="#666" />
            <Text style={styles.menuText}>Mainīt sākuma valodu</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#333" />
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity style={[styles.menuItem, styles.logoutItem]} onPress={handleLogout}>
          <View style={styles.menuLeft}>
            <Ionicons name="log-out-outline" size={20} color="#ff4466" />
            <Text style={[styles.menuText, styles.logoutText]}>{t.logout}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Language Modal */}
      <Modal visible={showLang} transparent animationType="fade">
        <TouchableOpacity
          style={styles.overlay}
          onPress={() => setShowLang(false)}
          activeOpacity={1}
        >
          <View style={styles.langModal}>
            <Text style={styles.langModalTitle}>{t.changeLanguage}</Text>
            {LANGUAGES.map(l => (
              <TouchableOpacity
                key={l.code}
                style={[styles.langOption, lang === l.code && styles.langOptionActive]}
                onPress={() => { setLang(l.code); setShowLang(false); }}
              >
                <Text style={styles.langFlag}>{l.flag}</Text>
                <Text style={[styles.langName, lang === l.code && styles.langNameActive]}>
                  {l.name}
                </Text>
                {lang === l.code && <Ionicons name="checkmark" size={20} color="#00cfff" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  header: {
    paddingHorizontal: 20, paddingTop: 54, paddingBottom: 14,
    backgroundColor: '#111118',
  },
  title: { fontSize: 22, fontWeight: '800', color: '#00cfff' },
  avatarSection: { alignItems: 'center', paddingVertical: 28 },
  avatar: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: '#00cfff44',
    borderWidth: 2, borderColor: '#00cfff',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  avatarAdmin: {
    backgroundColor: '#f59e0b44',
    borderColor: '#f59e0b',
  },
  avatarLetter: { fontSize: 38, fontWeight: '800', color: '#00cfff' },
  username: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 6 },
  roleBadge: {
    backgroundColor: '#1a1a25',
    paddingHorizontal: 14, paddingVertical: 5,
    borderRadius: 20,
  },
  roleText: { color: '#666', fontSize: 13, fontWeight: '600' },
  stats: {
    flexDirection: 'row',
    paddingHorizontal: 16, gap: 10, marginBottom: 28,
  },
  statCard: {
    flex: 1, backgroundColor: '#111118',
    borderRadius: 14, padding: 14,
    alignItems: 'center', gap: 4,
  },
  statVal: { color: '#00cfff', fontSize: 22, fontWeight: '800' },
  statLabel: { color: '#555', fontSize: 11 },
  section: { paddingHorizontal: 16 },
  sectionLabel: {
    color: '#333', fontSize: 11, fontWeight: '700',
    letterSpacing: 1, marginBottom: 10,
    textTransform: 'uppercase',
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111118', borderRadius: 14,
    padding: 16, marginBottom: 10,
  },
  logoutItem: { borderWidth: 1, borderColor: '#ff446633' },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuText: { color: '#ccc', fontSize: 15 },
  logoutText: { color: '#ff4466' },
  menuRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  menuValue: { color: '#555', fontSize: 13 },
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center', alignItems: 'center',
  },
  langModal: {
    backgroundColor: '#111118', borderRadius: 20,
    padding: 24, width: '80%',
  },
  langModalTitle: { color: '#fff', fontSize: 17, fontWeight: '700', marginBottom: 14 },
  langOption: {
    flexDirection: 'row', alignItems: 'center',
    padding: 13, borderRadius: 12, marginBottom: 6,
  },
  langOptionActive: { backgroundColor: '#0d1a2a', borderWidth: 1, borderColor: '#00cfff33' },
  langFlag: { fontSize: 26, marginRight: 12 },
  langName: { flex: 1, color: '#888', fontSize: 16 },
  langNameActive: { color: '#00cfff', fontWeight: '600' },
});
