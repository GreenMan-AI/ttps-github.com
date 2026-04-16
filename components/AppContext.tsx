import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { AppState } from 'react-native';
import { Audio } from 'expo-av';
import { translations, Lang } from './i18n';

export const API = 'https://greenman-ai.onrender.com';

export interface NamedPlaylist { id: string; name: string; tracks: any[]; }

interface AppContextType {
  lang: Lang; setLang: (l: Lang) => void;
  t: typeof translations.lv;
  langChosen: boolean; setLangChosen: (v: boolean) => void;
  user: any; token: string;
  login: (u: string, p: string) => Promise<string | null>;
  register: (u: string, p: string) => Promise<string | null>;
  logout: () => void;
  tracks: any[]; setTracks: (t: any[]) => void;
  playing: any; setPlaying: (t: any) => void;
  isPlaying: boolean; setIsPlaying: (v: boolean) => void;
  playNext: () => void; playPrev: () => void;
  shuffle: boolean; setShuffle: (v: boolean) => void;
  repeat: boolean; setRepeat: (v: boolean) => void;
  playlist: any[];
  addToPlaylist: (track: any) => void;
  removeFromPlaylist: (id: string) => void;
  namedPlaylists: NamedPlaylist[];
  createNamedPlaylist: (name: string) => void;
  deleteNamedPlaylist: (id: string) => void;
  addTrackToNamedPlaylist: (plId: string, track: any) => void;
  removeTrackFromNamedPlaylist: (plId: string, trackId: string) => void;
  likes: string[]; toggleLike: (id: string) => void;
  banner: string; setBanner: (v: string) => void;
  profileData: { nick: string; avatarUrl: string; bio: string; mood: string; };
  saveProfile: (data: { nick?: string; bio?: string; mood?: string; }) => Promise<void>;
  uploadAvatar: (uri: string) => Promise<string | null>;
  uploadLimits: { remaining: number; maxSizeMB: number; maxDurationMin: number; } | null;
  fetchUploadLimits: () => Promise<void>;
}

const AppContext = createContext<AppContextType>({} as AppContextType);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang]             = useState<Lang>('lv');
  const [langChosen, setLangChosen] = useState(false);
  const [user, setUser]             = useState<any>(null);
  const [token, setToken]           = useState('');
  const [tracks, setTracks]         = useState<any[]>([]);
  const [playing, setPlaying]       = useState<any>(null);
  const [isPlaying, setIsPlaying]   = useState(false);
  const [shuffle, setShuffle]       = useState(false);
  const [repeat, setRepeat]         = useState(false);
  const [playlist, setPlaylist]     = useState<any[]>([]);
  const [namedPlaylists, setNamedPlaylists] = useState<NamedPlaylist[]>([]);
  const [likes, setLikes]           = useState<string[]>([]);
  const [banner, setBanner]         = useState('');
  const [profileData, setProfileData] = useState({ nick: '', avatarUrl: '', bio: '', mood: '' });
  const [uploadLimits, setUploadLimits] = useState<any>(null);

  const t = translations[lang];

  // ── Audio fona atskaņošana — SVARĪGI lai mūzika turpina fonā! ──
  useEffect(() => {
    Audio.setAudioModeAsync({
      staysActiveInBackground: true,      // ← mūzika turpina kad ekrāns izslēgts
      playsInSilentModeIOS: true,         // ← strādā arī iOS klusuma režīmā
      shouldDuckAndroid: false,           // ← nesamazina skaļumu citām lietotnēm
      playThroughEarpieceAndroid: false,
    }).catch(() => {});
  }, []);

  // ── Auth ──────────────────────────────────────────────
  const login = async (u: string, p: string): Promise<string | null> => {
    try {
      const res = await fetch(`${API}/api/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, password: p }),
      });
      const d = await res.json();
      if (d.token) {
        setUser({ username: d.username, role: d.role, isAdmin: d.role === 'admin' });
        setToken(d.token);
        fetch(`${API}/api/ticker`).then(r => r.json()).then(d => { if (d.text) setBanner(d.text); }).catch(() => {});
        loadProfile(d.username, d.token);
        return null;
      }
      return d.error || t.error;
    } catch { return t.serverError; }
  };

  const register = async (u: string, p: string): Promise<string | null> => {
    if (p.length < 6) return t.passMin;
    try {
      const res = await fetch(`${API}/api/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, password: p }),
      });
      const d = await res.json();
      if (d.token) {
        setUser({ username: d.username, role: d.role, isAdmin: d.role === 'admin' });
        setToken(d.token);
        return null;
      }
      return d.error || t.error;
    } catch { return t.serverError; }
  };

  const logout = async () => {
    if (token) {
      fetch(`${API}/api/logout`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    }
    setUser(null); setToken('');
    setPlaying(null); setIsPlaying(false);
    setPlaylist([]); setLikes([]);
    setProfileData({ nick: '', avatarUrl: '', bio: '', mood: '' });
    setUploadLimits(null);
  };

  // ── Profile ───────────────────────────────────────────
  const loadProfile = async (username: string, tok: string) => {
    try {
      const res = await fetch(`${API}/api/profiles/${username}`);
      const d = await res.json();
      if (d.profile) {
        setProfileData({
          nick:      d.profile.nick      || username,
          avatarUrl: d.profile.avatarUrl || '',
          bio:       d.profile.bio       || '',
          mood:      d.profile.mood      || '',
        });
      }
    } catch {}
  };

  const saveProfile = async (data: { nick?: string; bio?: string; mood?: string; }) => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/api/me/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      const d = await res.json();
      if (d.profile) {
        setProfileData(prev => ({
          ...prev,
          nick: d.profile.nick || prev.nick,
          bio:  d.profile.bio  || prev.bio,
          mood: d.profile.mood || prev.mood,
        }));
      }
    } catch {}
  };

  const uploadAvatar = async (uri: string): Promise<string | null> => {
    if (!token) return null;
    try {
      const form = new FormData();
      const filename = uri.split('/').pop() || 'avatar.jpg';
      const type = filename.endsWith('.png') ? 'image/png' : 'image/jpeg';
      form.append('avatar', { uri, type, name: filename } as any);
      const res = await fetch(`${API}/api/me/avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const d = await res.json();
      if (d.avatarUrl) {
        setProfileData(prev => ({ ...prev, avatarUrl: d.avatarUrl }));
        return d.avatarUrl;
      }
      return null;
    } catch { return null; }
  };

  // ── Upload limits ─────────────────────────────────────
  const fetchUploadLimits = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/api/upload/limits`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      setUploadLimits(d);
    } catch {}
  };

  // ── Player ────────────────────────────────────────────
  const tracksRef = useRef<any[]>([]);
  const playingRef = useRef<any>(null);
  const isPlayingRef = useRef(false);

  useEffect(() => { tracksRef.current = tracks; }, [tracks]);
  useEffect(() => { playingRef.current = playing; }, [playing]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  const playNext = () => {
    if (!tracksRef.current.length) return;
    if (shuffle) {
      setPlaying(tracksRef.current[Math.floor(Math.random() * tracksRef.current.length)]);
      return;
    }
    const idx = tracksRef.current.findIndex(t => t._id === playingRef.current?._id);
    setPlaying(tracksRef.current[(idx + 1) % tracksRef.current.length]);
  };

  const playPrev = () => {
    if (!tracksRef.current.length) return;
    const idx = tracksRef.current.findIndex(t => t._id === playingRef.current?._id);
    setPlaying(tracksRef.current[(idx - 1 + tracksRef.current.length) % tracksRef.current.length]);
  };

  // ── Playlist ──────────────────────────────────────────
  const addToPlaylist       = (track: any)  => { if (!playlist.find(t => t._id === track._id)) setPlaylist(p => [...p, track]); };
  const removeFromPlaylist  = (id: string)  => setPlaylist(p => p.filter(t => t._id !== id));
  const toggleLike          = (id: string)  => setLikes(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const createNamedPlaylist = (name: string) => setNamedPlaylists(p => [...p, { id: Date.now().toString(), name, tracks: [] }]);
  const deleteNamedPlaylist = (id: string)   => setNamedPlaylists(p => p.filter(x => x.id !== id));
  const addTrackToNamedPlaylist = (plId: string, track: any) =>
    setNamedPlaylists(p => p.map(x => x.id === plId && !x.tracks.find(t => t._id === track._id) ? { ...x, tracks: [...x.tracks, track] } : x));
  const removeTrackFromNamedPlaylist = (plId: string, trackId: string) =>
    setNamedPlaylists(p => p.map(x => x.id === plId ? { ...x, tracks: x.tracks.filter(t => t._id !== trackId) } : x));

  return (
    <AppContext.Provider value={{
      lang, setLang, t, langChosen, setLangChosen,
      user, token, login, register, logout,
      tracks, setTracks,
      playing, setPlaying, isPlaying, setIsPlaying,
      playNext, playPrev, shuffle, setShuffle, repeat, setRepeat,
      playlist, addToPlaylist, removeFromPlaylist,
      namedPlaylists, createNamedPlaylist, deleteNamedPlaylist,
      addTrackToNamedPlaylist, removeTrackFromNamedPlaylist,
      likes, toggleLike, banner, setBanner,
      profileData, saveProfile, uploadAvatar,
      uploadLimits, fetchUploadLimits,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
