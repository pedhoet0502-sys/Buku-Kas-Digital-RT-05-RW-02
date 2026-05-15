import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, updateDoc, deleteField } from 'firebase/firestore';
import { db, auth } from '@/src/lib/firebase';
import { handleFirestoreError, OperationType } from '@/src/lib/firestoreErrorHandler';
import { Bell, Shield, User as UserIcon, ArrowLeft, Tag, Plus, X, Edit2, Check, UserMinus, ShieldAlert } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { DEFAULT_CATEGORIES } from '@/src/lib/constants';

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
    if (!communityId || !auth.currentUser) return;
    
    // Check if current user is admin
    if (communityData.roles[auth.currentUser.uid] !== 'admin') {
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
    <div className="animate-in fade-in slide-in-from-right-4 duration-300 max-w-2xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-xl transition-all active:scale-95 text-gray-600"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Pengaturan</h2>
            <p className="text-sm text-gray-500">Kelola akun dan sistem kas Anda</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Profile Card */}
        <section className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <UserIcon size={120} />
          </div>
          <div className="flex items-center gap-5 relative">
            <div className="relative">
              {auth.currentUser?.photoURL ? (
                <img 
                  src={auth.currentUser.photoURL} 
                  alt="Profile" 
                  className="w-20 h-20 rounded-2xl object-cover shadow-lg border-2 border-white"
                />
              ) : (
                <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-3xl font-black shadow-lg">
                  {auth.currentUser?.email?.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="absolute -bottom-2 -right-2 p-1.5 bg-green-500 border-2 border-white rounded-full shadow-sm" />
            </div>
            
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-1">Profil Pengguna</p>
              <h3 className="text-xl font-black text-gray-900 truncate tracking-tight">
                {auth.currentUser?.displayName || 'Pengurus Digital'}
              </h3>
              <p className="text-sm font-medium text-gray-500 truncate mb-2">{auth.currentUser?.email}</p>
              
              <div className="inline-flex items-center gap-2 px-2 py-1 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">UID</span>
                <span className="text-[10px] font-mono text-gray-600 select-all">
                  {auth.currentUser?.uid}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Community Section */}
        <section className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-50 bg-gray-50/30">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl">
                <Shield size={20} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Komunitas & Berbagi</h3>
                <p className="text-xs text-gray-500">Kolaborasi dengan pengurus lain</p>
              </div>
            </div>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="space-y-4">
              <p className="text-sm text-gray-600 leading-relaxed">
                Gunakan ID Komunitas untuk berbagi data secara real-time. Semua orang dengan ID yang sama memiliki akses ke data transaksi yang sama.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={tempCommunityId}
                    onChange={(e) => setTempCommunityId(e.target.value)}
                    placeholder="ID KOMUNITAS (Cth: RT05-KAS)"
                    className="w-full pl-4 pr-12 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none uppercase font-black tracking-wider transition-all"
                  />
                  {tempCommunityId && (
                    <button 
                      onClick={() => setTempCommunityId('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
                <button
                  onClick={updateCommunity}
                  disabled={saving || tempCommunityId.trim().toUpperCase() === communityId}
                  className="px-8 py-3 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 transition-all active:scale-95 shadow-lg shadow-gray-200 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (communityId ? 'Update ID' : 'Gabung')}
                </button>
              </div>

              {communityId && (
                <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Koneksi Aktif</span>
                      </div>
                      <p className="text-lg font-black text-indigo-900">{communityId}</p>
                      {communityData && (
                        <div className="inline-flex items-center px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-black uppercase">
                          Role: {communityData.roles[auth.currentUser?.uid || ''] || 'viewer'}
                        </div>
                      )}
                    </div>
                    <button 
                      onClick={() => { if(window.confirm('Keluar dari komunitas?')) { setTempCommunityId(''); updateCommunity(''); } }}
                      className="px-4 py-2 bg-white text-red-500 text-xs font-bold rounded-xl border border-red-100 hover:bg-red-50 transition-all"
                    >
                      Putuskan
                    </button>
                  </div>

                  {/* Community Info Customization */}
                  {communityData?.roles[auth.currentUser?.uid || ''] === 'admin' && (
                    <div className="pt-4 border-t border-indigo-100 space-y-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Nama Laporan / Komunitas</label>
                        <input 
                          type="text"
                          value={newCommunityName}
                          onChange={(e) => setNewCommunityName(e.target.value)}
                          className="w-full px-4 py-2 bg-white border border-indigo-100 rounded-xl text-sm font-bold text-indigo-900 outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="Nama Komunitas (Cth: Kas RT 05)"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Ketua RT</label>
                          <input 
                            type="text"
                            value={chairmanName}
                            onChange={(e) => setChairmanName(e.target.value)}
                            className="w-full px-4 py-2 bg-white border border-indigo-100 rounded-xl text-sm font-bold text-indigo-900 outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Nama Ketua"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Bendahara</label>
                          <input 
                            type="text"
                            value={treasurerName}
                            onChange={(e) => setTreasurerName(e.target.value)}
                            className="w-full px-4 py-2 bg-white border border-indigo-100 rounded-xl text-sm font-bold text-indigo-900 outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Nama Bendahara"
                          />
                        </div>
                      </div>
                      <button 
                        onClick={updateCommunityMetadata}
                        disabled={saving}
                        className="w-full py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all active:scale-95 shadow-md shadow-indigo-100"
                      >
                        Simpan Info Laporan
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Member Management (Admin only) */}
            {communityId && communityData && communityData.roles[auth.currentUser?.uid || ''] === 'admin' && (
              <div className="space-y-4 pt-6 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Anggota Komunitas</h4>
                  <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-1 rounded-full font-bold">
                    {Object.keys(communityData.roles).length} Orangan
                  </span>
                </div>
                
                <div className="grid grid-cols-1 gap-2">
                  {Object.entries(communityData.roles).map(([uid, role]) => (
                    <div key={uid} className="flex flex-col p-3 bg-white rounded-2xl border border-gray-50 shadow-sm gap-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 font-bold text-xs uppercase text-center overflow-hidden">
                            {uid.substring(0, 2)}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-mono text-gray-400">UID: {uid.substring(0, 10)}...</span>
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "text-xs font-bold capitalize",
                                role === 'admin' ? "text-indigo-600" : "text-gray-500"
                              )}>{role as string}</span>
                              {communityData.titles?.[uid] && (
                                <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100/50">
                                  {communityData.titles[uid]}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {communityId && communityData.roles[auth.currentUser?.uid || ''] === 'admin' && (
                            <button
                              onClick={() => {
                                setEditingTitleUid(uid);
                                setTempTitle(communityData.titles?.[uid] || '');
                              }}
                              className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                              title="Edit Jabatan"
                            >
                              <Edit2 size={16} />
                            </button>
                          )}

                          {uid !== auth.currentUser?.uid && (
                            <>
                              <select 
                                value={role as string}
                                onChange={(e) => updateMemberRole(uid, e.target.value)}
                                className="text-[10px] font-bold bg-gray-50 border border-gray-100 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-indigo-500"
                              >
                                <option value="viewer">Viewer</option>
                                <option value="admin">Admin</option>
                              </select>
                              <button 
                                onClick={() => { if(window.confirm('Hapus anggota ini dari komunitas?')) updateMemberRole(uid, null); }}
                                title="Hapus Anggota"
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all group/del"
                              >
                                <UserMinus size={18} className="group-hover/del:scale-110 transition-transform" />
                              </button>
                            </>
                          )}
                          {uid === auth.currentUser?.uid && (
                            <span className="text-[10px] font-bold text-indigo-400 bg-indigo-50 px-2 py-1 rounded-lg uppercase">Anda</span>
                          )}
                        </div>
                      </div>

                      {/* Inline Title Editor */}
                      {editingTitleUid === uid && (
                        <div className="flex items-center gap-2 p-2 bg-indigo-50/50 rounded-xl border border-indigo-100 animate-in slide-in-from-top-2 duration-200">
                          <input
                            type="text"
                            value={tempTitle}
                            onChange={(e) => setTempTitle(e.target.value)}
                            placeholder="Set Jabatan (Cth: Bendahara)"
                            className="flex-1 text-xs px-3 py-1.5 bg-white border border-indigo-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && updateMemberTitle(uid, tempTitle)}
                          />
                          <button
                            onClick={() => updateMemberTitle(uid, tempTitle)}
                            className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={() => setEditingTitleUid(null)}
                            className="p-1.5 bg-white text-gray-400 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="bg-gray-900 rounded-3xl p-5 space-y-4">
                  <div>
                    <h5 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">Undang Anggota</h5>
                    <p className="text-[10px] text-gray-400 italic">Minta pengurus lain untuk memberikan UID mereka</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={newMemberUid}
                      onChange={(e) => setNewMemberUid(e.target.value)}
                      placeholder="Tempel UID user di sini..."
                      className="flex-1 px-4 py-2.5 bg-gray-800 border border-gray-700 text-white rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono placeholder:text-gray-600"
                    />
                    <div className="flex gap-2">
                      <select
                        value={newMemberRole}
                        onChange={(e) => setNewMemberRole(e.target.value as 'admin' | 'viewer')}
                        className="px-3 py-2.5 bg-gray-800 border border-gray-700 text-white rounded-2xl outline-none text-sm font-bold"
                      >
                        <option value="viewer">Viewer</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button
                        onClick={addMember}
                        disabled={!newMemberUid.trim() || saving}
                        className="px-5 py-2.5 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-500 disabled:bg-gray-700 transition-all active:scale-95 flex items-center justify-center"
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Categories Section */}
        <section className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-50 bg-gray-50/30">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 text-amber-600 rounded-xl">
                <Tag size={20} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Kategori Keuangan</h3>
                <p className="text-xs text-gray-500">Label untuk setiap transaksi</p>
              </div>
            </div>
          </div>
          
          <div className="p-6 space-y-8">
            {/* Income Categories */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                  <h4 className="text-sm font-black text-gray-700 uppercase tracking-wider">Pemasukan</h4>
                </div>
                <button 
                  onClick={() => { setEditingType('income'); setIsAdding(true); }}
                  className="px-4 py-2 text-xs font-bold bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all flex items-center gap-2 active:scale-95"
                >
                  <Plus size={14} /> Tambah
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {categories.income.map(cat => (
                  <div key={cat} className="group flex items-center justify-between px-4 py-3 bg-gray-50 text-gray-700 rounded-2xl text-sm font-bold border-2 border-transparent hover:border-emerald-100 hover:bg-white hover:shadow-sm transition-all">
                    <span className="truncate pr-2">{cat}</span>
                    <button 
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeCategory('income', cat); }}
                      className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all shrink-0"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Expense Categories */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-rose-500 rounded-full" />
                  <h4 className="text-sm font-black text-gray-700 uppercase tracking-wider">Pengeluaran</h4>
                </div>
                <button 
                  onClick={() => { setEditingType('expense'); setIsAdding(true); }}
                  className="px-4 py-2 text-xs font-bold bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-all flex items-center gap-2 active:scale-95"
                >
                  <Plus size={14} /> Tambah
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {categories.expense.map(cat => (
                  <div key={cat} className="group flex items-center justify-between px-4 py-3 bg-gray-50 text-gray-700 rounded-2xl text-sm font-bold border-2 border-transparent hover:border-rose-100 hover:bg-white hover:shadow-sm transition-all">
                    <span className="truncate pr-2">{cat}</span>
                    <button 
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeCategory('expense', cat); }}
                      className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all shrink-0"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Add Category UI Overlay/Drawer-like */}
            {isAdding && (
              <div className="bg-gray-900 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h5 className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Tambah Kategori Baru</h5>
                    <p className="text-[10px] text-gray-400">Menambah ke {editingType === 'income' ? 'Pemasukan' : 'Pengeluaran'}</p>
                  </div>
                  <button onClick={() => setIsAdding(false)} className="text-gray-500 hover:text-white transition-colors">
                    <X size={20} />
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    autoFocus
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Contoh: Iuran Sampah"
                    className="flex-1 px-4 py-3 bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl text-white outline-none transition-all placeholder:text-gray-600"
                    onKeyDown={(e) => e.key === 'Enter' && addCategory()}
                  />
                  <button
                    onClick={addCategory}
                    className="px-6 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-500 transition-all active:scale-95"
                  >
                    Simpan
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Preferences Section */}
        <section className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-50 bg-gray-50/30">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl">
                <Bell size={20} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Preferensi</h3>
                <p className="text-xs text-gray-500">Notifikasi dan penggunaan sistem</p>
              </div>
            </div>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
              <div className="space-y-0.5">
                <p className="font-bold text-gray-900">Notifikasi Real-time</p>
                <p className="text-xs text-gray-500 max-w-[200px] sm:max-w-none">Dapatkan info instan saat ada transaksi baru dicatat.</p>
              </div>
              <button
                onClick={handleToggleNotifications}
                disabled={saving}
                className={cn(
                  "relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2",
                  notificationsEnabled ? "bg-indigo-600" : "bg-gray-200",
                  saving && "opacity-50 cursor-not-allowed"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
                    notificationsEnabled ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
            </div>

            <div className="p-4 bg-indigo-50/50 rounded-2xl space-y-3">
              <div className="flex items-start gap-3">
                <Shield className="text-indigo-400 shrink-0" size={18} />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-indigo-900">Kemanan & Privasi</p>
                  <p className="text-xs text-indigo-700 leading-relaxed">
                    Data keuangan Anda disimpan secara aman di cloud. Hanya orang dengan ID Komunitas yang sama yang dapat melihat data tersebut.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* App Info */}
        <div className="text-center py-10 space-y-4">
          <div className="flex flex-col items-center gap-1">
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] leading-none mb-2">Developed by RT Digital Team</p>
            <p className="text-xs font-bold text-gray-400">Versi 1.1.0 (Polished UI)</p>
          </div>
          <div className="flex items-center justify-center gap-6">
            <a href="#" className="text-[10px] font-bold text-indigo-400 hover:text-indigo-600 uppercase tracking-widest">Pusat Bantuan</a>
            <span className="w-1 h-1 bg-gray-200 rounded-full" />
            <a href="#" className="text-[10px] font-bold text-indigo-400 hover:text-indigo-600 uppercase tracking-widest">Kebijakan Privasi</a>
          </div>
        </div>
      </div>
    </div>
  );

}
