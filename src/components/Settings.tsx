import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, updateDoc, deleteField } from 'firebase/firestore';
import { db, auth } from '@/src/lib/firebase';
import { handleFirestoreError, OperationType } from '@/src/lib/firestoreErrorHandler';
import { 
  Bell, 
  Shield, 
  User as UserIcon, 
  ArrowLeft, 
  Tag, 
  Plus, 
  X, 
  Edit2, 
  Check, 
  UserMinus, 
  ShieldAlert,
  Info,
  Globe,
  Settings as SettingsIcon,
  ChevronRight,
  Database,
  LayoutGrid,
  Cloud,
  RefreshCw,
  Save,
  Trash2
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { DEFAULT_CATEGORIES } from '@/src/lib/constants';
import { motion, AnimatePresence } from 'motion/react';

interface SettingsProps {
  onBack: () => void;
}

export default function Settings({ onBack }: SettingsProps) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [categories, setCategories] = useState<{ income: string[], expense: string[] }>(DEFAULT_CATEGORIES);
  const [communityId, setCommunityId] = useState('');
  const [tempCommunityId, setTempCommunityId] = useState('');
  const [communityData, setCommunityData] = useState<any>(null);
  const [newCommunityName, setNewCommunityName] = useState('');
  const [chairmanName, setChairmanName] = useState('');
  const [treasurerName, setTreasurerName] = useState('');
  const [newMemberUid, setNewMemberUid] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'admin' | 'viewer'>('viewer');
  const [editingTitleUid, setEditingTitleUid] = useState<string | null>(null);
  const [tempTitle, setTempTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Category edit state
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingType, setEditingType] = useState<'income' | 'expense'>('income');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      if (!auth.currentUser) return;
      try {
        const settingsRef = doc(db, 'settings', auth.currentUser.uid);
        const settingsSnap = await getDoc(settingsRef);
        if (settingsSnap.exists()) {
          const data = settingsSnap.data();
          setNotificationsEnabled(data.notificationsEnabled || false);
          if (data.communityId) {
            setCommunityId(data.communityId);
            setTempCommunityId(data.communityId);
            loadCommunityData(data.communityId);
          }
          if (data.categories) {
            setCategories(data.categories);
          }
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const loadCommunityData = async (id: string) => {
    if (!id) return;
    try {
      const commRef = doc(db, 'communities', id);
      const commSnap = await getDoc(commRef);
      if (commSnap.exists()) {
        const data = commSnap.data();
        setCommunityData(data);
        setNewCommunityName(data.name || `Kas ${id}`);
        setChairmanName(data.chairman || '');
        setTreasurerName(data.treasurer || '');
      }
    } catch (error) {
      console.error('Error loading community data:', error);
    }
  };

  const saveSettings = async (updates: any) => {
    if (!auth.currentUser) return;
    setSaving(true);
    try {
      const settingsRef = doc(db, 'settings', auth.currentUser.uid);
      await setDoc(settingsRef, updates, { merge: true });
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Gagal menyimpan pengaturan.');
    } finally {
      setSaving(false);
    }
  };

  const updateCommunity = async (forcedId?: any) => {
    // If called as event handler, forcedId will be the event object.
    // We only want to use forcedId if it's a string.
    const actualForcedId = typeof forcedId === 'string' ? forcedId : undefined;
    const newId = (actualForcedId !== undefined ? actualForcedId : tempCommunityId).trim().toUpperCase();
    if (!auth.currentUser) return;
    
    setSaving(true);
    try {
      if (newId) {
        const commRef = doc(db, 'communities', newId);
        const commSnap = await getDoc(commRef);
        
        if (!commSnap.exists()) {
          // Create new community
          const newCommData = {
            name: `Kas ${newId}`,
            roles: {
              [auth.currentUser.uid]: 'admin'
            }
          };
          try {
            await setDoc(commRef, newCommData);
          } catch (e) {
            handleFirestoreError(e, OperationType.CREATE, `communities/${newId}`);
          }
          setCommunityData(newCommData);
        } else {
          // Joining existing - note: in real app, might need approval
          // For now, if joined, add as viewer if not in roles
          const existingData = commSnap.data();
          if (!existingData.roles[auth.currentUser.uid]) {
            try {
              await updateDoc(commRef, {
                [`roles.${auth.currentUser.uid}`]: 'viewer'
              });
              setCommunityData({ 
                ...existingData, 
                roles: { ...existingData.roles, [auth.currentUser.uid]: 'viewer' }
              });
            } catch (e) {
              handleFirestoreError(e, OperationType.UPDATE, `communities/${newId}`);
            }
          } else {
            setCommunityData(existingData);
          }
        }
      } else {
        setCommunityData(null);
      }

      await saveSettings({ communityId: newId });
      setCommunityId(newId);
      alert(newId ? `Berhasil bergabung ke komunitas: ${newId}` : 'Berhasil keluar dari komunitas.');
    } catch (error) {
      console.error('Error joining community:', error);
      alert('Gagal bergabung ke komunitas. Pastikan ID benar.');
    } finally {
      setSaving(false);
    }
  };

  const updateMemberRole = async (uid: string, role: string | null) => {
    if (!communityId || !communityData || !auth.currentUser) return;
    
    // Check if current user is admin
    if (communityData.roles[auth.currentUser.uid] !== 'admin') {
      alert('Hanya Admin yang bisa mengubah peran anggota.');
      return;
    }

    setSaving(true);
    try {
      const commRef = doc(db, 'communities', communityId);
      
      if (role === null) {
        // Correct way to delete a key from a map field in Firestore
        try {
          await updateDoc(commRef, {
            [`roles.${uid}`]: deleteField()
          });
        } catch (e) {
          handleFirestoreError(e, OperationType.UPDATE, `communities/${communityId}`);
        }
        
        // Update local state
        const updatedRoles = { ...communityData.roles };
        delete updatedRoles[uid];
        setCommunityData({ ...communityData, roles: updatedRoles });
      } else {
        try {
          await updateDoc(commRef, {
            [`roles.${uid}`]: role
          });
        } catch (e) {
          handleFirestoreError(e, OperationType.UPDATE, `communities/${communityId}`);
        }
        
        // Update local state
        setCommunityData({ 
          ...communityData, 
          roles: { ...communityData.roles, [uid]: role } 
        });
      }
    } catch (error: any) {
      console.error('Error updating member:', error);
      const isPermissionError = error.code === 'permission-denied' || error.message?.includes('permission');
      alert(isPermissionError 
        ? 'Gagal: Anda tidak memiliki izin Admin untuk menghapus anggota ini.' 
        : `Terjadi kesalahan: ${error.message || 'Gagal mengubah data anggota.'}`);
    } finally {
      setSaving(false);
    }
  };

  const updateMemberTitle = async (uid: string, title: string) => {
    if (!communityId || !communityData || !auth.currentUser) return;
    
    // Check if current user is admin
    if (communityData.roles[auth.currentUser.uid] !== 'admin') {
      alert('Hanya Admin yang bisa mengubah jabatan anggota.');
      return;
    }

    setSaving(true);
    try {
      const commRef = doc(db, 'communities', communityId);
      
      try {
        await updateDoc(commRef, {
          [`titles.${uid}`]: title
        });
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `communities/${communityId}`);
      }
      
      // Update local state
      setCommunityData({ 
        ...communityData, 
        titles: { ...communityData.titles, [uid]: title } 
      });
      setEditingTitleUid(null);
    } catch (error: any) {
      console.error('Error updating title:', error);
      alert('Gagal mengubah jabatan anggota.');
    } finally {
      setSaving(false);
    }
  };

  const addMember = async () => {
    if (!newMemberUid.trim()) return;
    await updateMemberRole(newMemberUid.trim(), newMemberRole);
    setNewMemberUid('');
  };

  const updateCommunityMetadata = async () => {
    if (!communityId || !auth.currentUser || !communityData) {
      alert('Informasi data komunitas belum siap atau hilang. Mohon segarkan halaman.');
      return;
    }
    
    // Check if current user is admin
    if (communityData.roles?.[auth.currentUser.uid] !== 'admin') {
      alert('Hanya Admin yang bisa mengubah nama komunitas.');
      return;
    }

    setSaving(true);
    try {
      const commRef = doc(db, 'communities', communityId);
      const updates = {
        name: newCommunityName,
        chairman: chairmanName,
        treasurer: treasurerName
      };
      await updateDoc(commRef, updates);
      setCommunityData({ ...communityData, ...updates });
      alert('Informasi komunitas berhasil diperbarui.');
    } catch (error) {
      console.error('Error updating community info:', error);
      alert('Gagal memperbarui informasi komunitas.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleNotifications = async () => {
    const newValue = !notificationsEnabled;
    if (newValue) {
      if (!("Notification" in window)) {
        alert("Browser ini tidak mendukung notifikasi desktop.");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        alert("Anda perlu mengizinkan notification di browser untuk mengaktifkan fitur ini.");
        return;
      }
    }
    await saveSettings({ notificationsEnabled: newValue });
    setNotificationsEnabled(newValue);
  };

  const addCategory = async () => {
    const trimmedName = newCategoryName.trim();
    if (!trimmedName) return;
    
    if (categories[editingType].includes(trimmedName)) {
      alert('Kategori ini sudah ada.');
      return;
    }

    const updatedCategories = {
      ...categories,
      [editingType]: [...categories[editingType], trimmedName]
    };
    await saveSettings({ categories: updatedCategories });
    setCategories(updatedCategories);
    setNewCategoryName('');
    setIsAdding(false);
  };

  const removeCategory = async (type: 'income' | 'expense', name: string) => {
    try {
      if (!window.confirm(`Hapus kategori "${name}"?`)) return;
      
      const updatedCategories = {
        ...categories,
        [type]: categories[type].filter(cat => cat !== name)
      };
      
      // Update local state first for better UX
      setCategories(updatedCategories);
      
      // Then sync with server
      await saveSettings({ categories: updatedCategories });
    } catch (error) {
      console.error('Error removing category:', error);
      // Revert if failed
      if (auth.currentUser) {
        const settingsRef = doc(db, 'settings', auth.currentUser.uid);
        const settingsSnap = await getDoc(settingsRef);
        if (settingsSnap.exists() && settingsSnap.data().categories) {
          setCategories(settingsSnap.data().categories);
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 text-sm">Memuat pengaturan...</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto pb-32 px-4 sm:px-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-12 pb-8 mb-8 border-b border-slate-200">
        <div className="flex items-center gap-4">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            className="p-2.5 bg-white border border-slate-200 hover:border-slate-400 rounded-xl transition-all text-slate-500"
          >
            <ArrowLeft size={20} />
          </motion.button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Pengaturan</h1>
            <p className="text-xs text-slate-500">Konfigurasi akun dan preferensi sistem</p>
          </div>
        </div>
        {communityId && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-lg">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Node Terkoneksi</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sidebar Mini / Profile Area */}
        <aside className="lg:col-span-1 space-y-6">
          <section className="bg-white rounded-2xl p-6 border border-slate-200">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="relative">
                {auth.currentUser?.photoURL ? (
                  <img 
                    src={auth.currentUser.photoURL} 
                    alt="Profile" 
                    className="w-20 h-20 rounded-full object-cover ring-4 ring-slate-50 shadow-sm"
                  />
                ) : (
                  <div className="w-20 h-20 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-slate-500 text-2xl font-bold">
                    {auth.currentUser?.email?.charAt(0).toUpperCase()}
                  </div>
                )}
                {communityId && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full" />
                )}
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900 leading-tight">
                  {auth.currentUser?.displayName || 'Administrator'}
                </h3>
                {communityId && communityData?.titles?.[auth.currentUser?.uid || ''] && (
                  <p className={cn(
                    "text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider w-fit mx-auto",
                    communityData.titles[auth.currentUser?.uid || ''].toUpperCase() === 'SEKRETARIS'
                      ? "text-blue-600 bg-blue-50 ring-1 ring-blue-100"
                      : "text-indigo-600 bg-indigo-50"
                  )}>
                    {communityData.titles[auth.currentUser?.uid || '']}
                  </p>
                )}
                <p className="text-xs text-slate-500">{auth.currentUser?.email}</p>
              </div>

              <div className="w-full pt-4 border-t border-slate-100">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-left">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">UID</p>
                  <p className="text-[10px] font-mono text-slate-500 break-all">
                    {auth.currentUser?.uid}
                  </p>
                </div>
              </div>
            </div>
          </section>
        </aside>

        {/* Main Settings Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Community Section */}
          <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center gap-3">
              <Globe size={18} className="text-slate-600" />
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Komunitas Interkoneksi</h2>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                    System Interconnection ID (Node ID)
                  </label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      value={tempCommunityId}
                      onChange={(e) => setTempCommunityId(e.target.value)}
                      placeholder="CONTOH: KAS-RT01"
                      className="flex-1 px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 outline-none uppercase font-mono text-lg font-black tracking-widest transition-all"
                    />
                    <button
                      onClick={updateCommunity}
                      disabled={saving || (tempCommunityId.trim().toUpperCase() === communityId)}
                      className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-indigo-600 disabled:bg-slate-100 disabled:text-slate-300 transition-all shadow-lg active:scale-95"
                    >
                      {saving ? 'PROSES...' : (communityId ? 'UPDATE NODE' : 'CONNECT')}
                    </button>
                  </div>
                </div>
              </div>

              {communityId && (
                <div className="p-4 sm:p-6 bg-slate-50 border border-slate-200 rounded-3xl space-y-6">
                  <div className="flex flex-col sm:flex-row items-center justify-between p-5 bg-white border border-slate-200 rounded-2xl gap-4 shadow-sm">
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                      <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner">
                        <Globe size={28} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Node ID Aktif</p>
                        <h4 className="text-xl font-black text-slate-900 tracking-wider truncate max-w-[180px] sm:max-w-none uppercase font-mono">{communityId}</h4>
                      </div>
                    </div>
                    <button 
                      onClick={() => { if(window.confirm('Putuskan koneksi?')) updateCommunity(''); }}
                      className="w-full sm:w-auto px-6 py-3 bg-rose-50 text-rose-600 border border-rose-100 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                    >
                      Putuskan Node
                    </button>
                  </div>
                  
                  {communityData?.roles[auth.currentUser?.uid || ''] === 'admin' && (
                    <div className="pt-6 border-t border-slate-200 space-y-6">
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nama Organisasi</label>
                          <input 
                            type="text"
                            value={newCommunityName}
                            onChange={(e) => setNewCommunityName(e.target.value)}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 outline-none transition-all"
                            placeholder="Contoh: LAPORAN KAS RT 01"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ketua RT / Penanggung Jawab</label>
                            <input 
                              type="text"
                              value={chairmanName}
                              onChange={(e) => setChairmanName(e.target.value)}
                              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 outline-none transition-all"
                              placeholder="Nama Ketua RT"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bendahara</label>
                            <input 
                              type="text"
                              value={treasurerName}
                              onChange={(e) => setTreasurerName(e.target.value)}
                              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 outline-none transition-all"
                              placeholder="Nama Bendahara"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="pt-6 border-t border-slate-200">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Otorisasi Jaringan</h3>
                          <span className="text-[10px] font-medium text-slate-400">{Object.keys(communityData.roles).length} Operator</span>
                        </div>
                        
                        <div className="space-y-3 mb-6">
                          {Object.entries(communityData.roles).map(([uid, role]) => (
                            <div key={uid} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl group gap-4 transition-all hover:border-slate-300">
                              <div className="flex items-center gap-4 min-w-0 w-full">
                                <div className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-500 font-bold text-xs shrink-0 group-hover:bg-slate-900 group-hover:text-white transition-all shadow-inner">
                                  {uid.substring(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="text-[10px] font-black text-slate-900 uppercase leading-none tracking-wider">
                                      {role === 'admin' ? 'Admin' : 'Viewer'}
                                    </p>
                                    {communityData.titles?.[uid] && (
                                      <span className={cn(
                                        "text-[8px] font-black px-2 py-0.5 rounded-md border transition-colors uppercase tracking-tight",
                                        communityData.titles[uid].toUpperCase() === 'SEKRETARIS'
                                          ? "text-blue-600 bg-blue-50 border-blue-200"
                                          : "text-slate-400 bg-slate-50 border-slate-100"
                                      )}>
                                        {communityData.titles[uid]}
                                      </span>
                                    )}
                                    {uid === auth.currentUser?.uid && (
                                      <span className="text-[8px] font-black px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-md uppercase">Anda</span>
                                    )}
                                  </div>
                                  <p className="text-[10px] font-mono text-slate-400 truncate w-full opacity-60 group-hover:opacity-100 transition-opacity">{uid}</p>
                                </div>
                              </div>
                              
                              <button 
                                onClick={() => { 
                                  if (uid === auth.currentUser?.uid) {
                                    alert('Anda tidak dapat menghapus akses Anda sendiri dari sini.');
                                    return;
                                  }
                                  if(window.confirm(`Hapus akses operator ${uid.substring(0, 8)}...?`)) updateMemberRole(uid, null); 
                                }}
                                className={cn(
                                  "w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all group/del shadow-sm",
                                  uid === auth.currentUser?.uid
                                    ? "bg-slate-50 text-slate-300 border border-slate-100 cursor-not-allowed"
                                    : "bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-600 hover:text-white shadow-rose-100 active:scale-95"
                                )}
                              >
                                <Trash2 size={14} className={cn("transition-transform", uid !== auth.currentUser?.uid && "group-hover/del:rotate-12")} />
                                <span>Hapus Operator</span>
                              </button>
                            </div>
                          ))}
                        </div>
                        
                        <div className="p-6 bg-slate-50 border border-slate-200 rounded-[2rem] space-y-6">
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                                Rekatkan UID Operator Baru
                              </label>
                              <input
                                type="text"
                                value={newMemberUid}
                                onChange={(e) => setNewMemberUid(e.target.value)}
                                placeholder="MASUKKAN ATAU REKATKAN UID (64+ KARAKTER)"
                                className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 outline-none font-mono text-xs font-medium tracking-tight transition-all placeholder:text-slate-300"
                              />
                            </div>
                            
                            <div className="flex flex-col sm:flex-row gap-3">
                              <div className="flex-1 space-y-2">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                                  Tingkat Otoritas
                                </label>
                                <select 
                                  value={newMemberRole}
                                  onChange={(e) => setNewMemberRole(e.target.value as 'admin' | 'viewer')}
                                  className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-[0.25em] outline-none cursor-pointer hover:border-slate-400 focus:ring-4 focus:ring-slate-900/5 transition-all appearance-none text-slate-700 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22currentColor%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_1.25rem_center] bg-no-repeat"
                                >
                                  <option value="viewer">VIEWER</option>
                                  <option value="admin">ADMIN</option>
                                </select>
                              </div>
                              <div className="flex items-end">
                                <button
                                  onClick={addMember}
                                  disabled={!newMemberUid.trim() || saving}
                                  className="w-full sm:w-auto px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-indigo-600 disabled:bg-slate-100 disabled:text-slate-300 transition-all shadow-lg active:scale-95"
                                >
                                  {saving ? 'PROSES...' : 'TAMBAH OPERATOR'}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-8 flex justify-center">
                        <button 
                          onClick={updateCommunityMetadata}
                          disabled={saving}
                          className="w-full sm:w-auto px-12 py-3.5 bg-white border border-blue-600 text-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-50 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-2"
                        >
                          {saving ? (
                            <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                          ) : (
                            <>
                              <Save size={14} />
                              Simpan
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Categories Section */}
          <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Tag size={18} className="text-slate-600" />
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Kategori</h2>
              </div>
            </div>
            
            <div className="p-6 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Pemasukan</h4>
                    <button 
                      onClick={() => { setEditingType('income'); setIsAdding(true); }}
                      className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {categories.income.map(cat => (
                      <div key={cat} className="flex items-center gap-2 pl-3 pr-1.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700">
                        <span className="uppercase">{cat}</span>
                        <button onClick={() => removeCategory('income', cat)} className="text-slate-300 hover:text-rose-500"><X size={12} /></button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">Pengeluaran</h4>
                    <button 
                      onClick={() => { setEditingType('expense'); setIsAdding(true); }}
                      className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {categories.expense.map(cat => (
                      <div key={cat} className="flex items-center gap-2 pl-3 pr-1.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700">
                        <span className="uppercase">{cat}</span>
                        <button onClick={() => removeCategory('expense', cat)} className="text-slate-300 hover:text-rose-500"><X size={12} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {isAdding && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="p-6 bg-white rounded-[2.5rem] space-y-6 border-4 border-slate-50 shadow-2xl relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between relative z-10">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        Tambah Kategori {editingType === 'income' ? 'Masuk' : 'Keluar'}
                      </p>
                      <button onClick={() => setIsAdding(false)} className="p-2 text-slate-300 hover:text-slate-900 transition-colors bg-slate-50 rounded-full">
                        <X size={16} />
                      </button>
                    </div>
                    
                    <div className="flex flex-col gap-3 relative z-10">
                      <input
                        autoFocus
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="MASUKKAN NAMA KATEGORI"
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-slate-900 text-sm font-black uppercase tracking-wider outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all placeholder:text-slate-300"
                        onKeyDown={(e) => e.key === 'Enter' && addCategory()}
                      />
                      <button 
                        onClick={addCategory} 
                        className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.25em] transition-all hover:bg-indigo-600 active:scale-[0.98] shadow-lg shadow-slate-200 flex items-center justify-center gap-2"
                      >
                        <Save size={16} />
                        Simpan Kategori
                      </button>
                    </div>

                    {/* Gradient Accent */}
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/10 blur-[40px] rounded-full pointer-events-none" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>

          {/* Preferences Section */}
          <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center gap-3">
              <LayoutGrid size={18} className="text-slate-600" />
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Preferensi Sistem</h2>
            </div>
            
            <div className="p-6">
              <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-400">
                    <Bell size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Notifikasi Jaringan</p>
                    <p className="text-xs text-slate-500">Dapatkan info pembaruan data secara real-time</p>
                  </div>
                </div>
                <button
                  onClick={handleToggleNotifications}
                  disabled={saving}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                    notificationsEnabled ? "bg-slate-900" : "bg-slate-200"
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                      notificationsEnabled ? "translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      <footer className="pt-16 pb-12 mt-16 border-t border-slate-200">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-3 grayscale opacity-50">
            <Database size={20} className="text-slate-900" />
            <span className="text-xs font-bold tracking-widest text-slate-900 uppercase">RT Digital System</span>
          </div>
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <span className="hover:text-slate-600 cursor-pointer transition-colors">Dokumentasi</span>
            <span className="hover:text-slate-600 cursor-pointer transition-colors">Keamanan</span>
            <span className="hover:text-slate-600 cursor-pointer transition-colors">Repositori</span>
          </div>
          <p className="text-[9px] font-medium text-slate-300 uppercase tracking-widest">© 2026 Powered by Cloud Node Tech</p>
        </div>
      </footer>
    </motion.div>
  );
}
