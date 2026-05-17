import React, { useState, useEffect } from 'react';
import { onSnapshot, collection, query, orderBy, where } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { db, auth, loginWithGoogle, logout } from './lib/firebase';
import { handleFirestoreError, OperationType } from './lib/firestoreErrorHandler';
import { motion } from 'motion/react';
import { Plus, LogOut, LayoutDashboard, History, User as UserIcon, LogIn, Settings as SettingsIcon, RefreshCw, CheckCircle2 } from 'lucide-react';
import { cn } from './lib/utils';
import Dashboard from './components/Dashboard';
import TransactionList from './components/TransactionList';
import TransactionForm from './components/TransactionForm';
import Settings from './components/Settings';
import SplashScreen from './components/SplashScreen';
import { doc, getDoc } from 'firebase/firestore';
import { DEFAULT_CATEGORIES } from './lib/constants';
import { AnimatePresence } from 'motion/react';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'settings'>('dashboard');
  const [showForm, setShowForm] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [communityId, setCommunityId] = useState<string | null>(null);
  const [communityRole, setCommunityRole] = useState<'admin' | 'viewer' | null>(null);
  const [userTitle, setUserTitle] = useState<string | null>(null);
  const [communityTitles, setCommunityTitles] = useState<{[key: string]: string}>({});
  const [communityData, setCommunityData] = useState<any>(null);
  const [categories, setCategories] = useState<{income: string[], expense: string[]}>(DEFAULT_CATEGORIES);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSyncNotice, setShowSyncNotice] = useState(false);

  const handleSync = () => {
    if (isSyncing) return;
    setIsSyncing(true);
    // Simulate sync animation
    setTimeout(() => {
      setIsSyncing(false);
      setShowSyncNotice(true);
      setTimeout(() => setShowSyncNotice(false), 3000);
    }, 1500);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Monitor settings for notifications, categories, and communityId
  useEffect(() => {
    if (!user) return;
    
    let unsubscribeSettings: (() => void) | undefined;
    let unsubscribeCommunity: (() => void) | undefined;

    async function setupListeners() {
      try {
        const settingsRef = doc(db, 'settings', user.uid);
        unsubscribeSettings = onSnapshot(settingsRef, (settingsSnap) => {
          if (settingsSnap.exists()) {
            const data = settingsSnap.data();
            setNotificationsEnabled(data.notificationsEnabled || false);
            setCommunityId(data.communityId || null);
            
            if (data.categories) {
              setCategories(data.categories);
            }

            // Community listener
            if (data.communityId) {
              const commRef = doc(db, 'communities', data.communityId);
              if (unsubscribeCommunity) unsubscribeCommunity();
              
              unsubscribeCommunity = onSnapshot(commRef, (commSnap) => {
                if (commSnap.exists()) {
                  const commData = commSnap.data();
                  setCommunityData(commData);
                  setCommunityRole(commData.roles?.[user.uid] || 'viewer');
                  setCommunityTitles(commData.titles || {});
                  setUserTitle(commData.titles?.[user.uid] || null);
                } else {
                  setCommunityData(null);
                  setCommunityRole('admin');
                  setCommunityTitles({});
                  setUserTitle(null);
                }
              }, (err) => {
                console.error("Error listening to community:", err);
                setCommunityData(null);
                setCommunityRole('viewer');
                setCommunityTitles({});
                setUserTitle(null);
              });
            } else {
              setCommunityData(null);
              setCommunityRole('admin');
              setCommunityTitles({});
              setUserTitle(null);
              if (unsubscribeCommunity) {
                unsubscribeCommunity();
                unsubscribeCommunity = undefined;
              }
            }
          } else {
            setCommunityId(null);
            setCommunityData(null);
            setCommunityRole('admin');
            setCommunityTitles({});
            setUserTitle(null);
          }
        });
      } catch (e) {
        console.error("Error setting up listeners:", e);
      }
    }
    
    setupListeners();
    
    return () => {
      if (unsubscribeSettings) unsubscribeSettings();
      if (unsubscribeCommunity) unsubscribeCommunity();
    };
  }, [user]);

  useEffect(() => {
    if (!user) {
      setTransactions([]);
      return;
    }

    // Determine query based on communityId
    let q;
    if (communityId) {
      q = query(
        collection(db, 'transactions'), 
        where('communityId', '==', communityId),
        orderBy('date', 'desc')
      );
    } else {
      q = query(
        collection(db, 'transactions'), 
        where('userId', '==', user.uid),
        orderBy('date', 'desc')
      );
    }

    const unsubscribe = onSnapshot(q as any, (snapshot: any) => {
      const docs = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      }));

      // Check for new transactions to notify
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added" && notificationsEnabled) {
          const data = change.doc.data();
          if (data.userId !== user.uid && !snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites) {
            new Notification("Transaksi Baru!", {
              body: `${data.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}: Rp ${data.amount.toLocaleString()} - ${data.category}`,
              icon: '/favicon.ico'
            });
          }
        }
      });

      setTransactions(docs);
    }, (error: any) => {
      console.error("Firestore Listen Error:", error);
      // If it's a permission error and we are in community mode, it might be due to revoked access
      if (communityId && (error.code === 'permission-denied' || error.message?.includes('permission'))) {
        console.warn("Akses komunitas ditolak, kembali ke mode personal.");
        setCommunityId(null);
      }
      handleFirestoreError(error, OperationType.LIST, 'transactions');
    });

    return () => unsubscribe();
  }, [user, notificationsEnabled, communityId]);

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-600 font-medium">Memuat data...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-indigo-600 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl text-center">
          <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <LayoutDashboard size={40} />
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-2">Kas RT Digital</h1>
          <p className="text-gray-500 mb-8">Pencatatan keuangan RT yang praktis, transparan, dan real-time.</p>
          
          <button
            onClick={loginWithGoogle}
            className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-gray-800 transition-all active:scale-[0.98] shadow-xl shadow-gray-200"
          >
            <LogIn size={20} />
            Masuk dengan Google
          </button>
          
          <p className="mt-8 text-xs text-gray-400">
            Hanya pengurus RT yang diizinkan untuk mencatat transaksi.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBFBFE] pb-24 md:pb-8">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
              <LayoutDashboard size={18} strokeWidth={3} />
            </div>
            <span className="font-black text-gray-900 tracking-tight text-lg">KAS RT</span>
          </div>
          <div className="flex items-center gap-3">
            <motion.button
              onClick={handleSync}
              whileTap={{ scale: 0.9 }}
              className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all"
              title="Sinkronisasi Cloud"
            >
              <motion.div
                animate={isSyncing ? { rotate: 360 } : { rotate: 0 }}
                transition={isSyncing ? { repeat: Infinity, duration: 1, ease: "linear" } : { duration: 0.5 }}
              >
                <RefreshCw size={20} className={cn(isSyncing ? "text-indigo-600" : "text-gray-400")} />
              </motion.div>
            </motion.button>
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full border border-gray-100">
              <div className="w-6 h-6 rounded-full overflow-hidden bg-indigo-100">
                {user.photoURL ? <img src={user.photoURL} alt="" /> : <UserIcon size={14} className="m-auto mt-1" />}
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-gray-700 truncate max-w-[100px] leading-tight">{user.displayName || 'User'}</span>
                {userTitle && (
                  <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded mt-0.5 uppercase tracking-wide leading-none w-fit">
                    {userTitle}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={logout}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
              title="Keluar"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-8">
        {/* Navigation Tabs (Desktop) */}
        <div className="hidden md:flex bg-gray-100/50 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={cn(
              "px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
              activeTab === 'dashboard' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            <LayoutDashboard size={18} />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={cn(
              "px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
              activeTab === 'transactions' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            <History size={18} />
            Transaksi
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={cn(
              "px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
              activeTab === 'settings' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            <SettingsIcon size={18} />
            Pengaturan
          </button>
        </div>

        {/* Content */}
        {activeTab === 'dashboard' && <Dashboard transactions={transactions} communityData={communityData} />}
        {activeTab === 'transactions' && (
          <TransactionList 
            transactions={transactions} 
            customCategories={categories}
            currentCommunityId={communityId}
            currentRole={communityRole}
            memberTitles={communityTitles}
            currentUserTitle={userTitle}
          />
        )}
        {activeTab === 'settings' && <Settings onBack={() => setActiveTab('dashboard')} />}
      </main>

      {/* Floating Action Button (Mobile & Desktop) */}
      {communityRole === 'admin' && (
        <button
          onClick={() => setShowForm(true)}
          className="fixed bottom-24 md:bottom-8 right-6 w-14 h-14 bg-indigo-600 text-white rounded-2xl shadow-2xl shadow-indigo-200 flex items-center justify-center hover:bg-indigo-700 transition-all active:scale-90 z-50 group"
        >
          <Plus size={32} className="group-hover:rotate-90 transition-transform duration-300" />
        </button>
      )}

      {/* Bottom Navigation (Mobile Only) */}
      <nav className="md:hidden fixed bottom-6 left-6 right-6 h-16 bg-gray-900 border border-white/10 rounded-2xl shadow-2xl z-40 px-8 flex items-center justify-between">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={cn(
            "flex flex-col items-center gap-1 transition-all",
            activeTab === 'dashboard' ? "text-indigo-400" : "text-gray-400"
          )}
        >
          <LayoutDashboard size={24} />
          <span className="text-[10px] font-bold uppercase tracking-widest">Beranda</span>
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={cn(
            "flex flex-col items-center gap-1 transition-all",
            activeTab === 'transactions' ? "text-indigo-400" : "text-gray-400"
          )}
        >
          <History size={24} />
          <span className="text-[10px] font-bold uppercase tracking-widest">Riwayat</span>
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={cn(
            "flex flex-col items-center gap-1 transition-all",
            activeTab === 'settings' ? "text-indigo-400" : "text-gray-400"
          )}
        >
          <SettingsIcon size={24} />
          <span className="text-[10px] font-bold uppercase tracking-widest">Setelan</span>
        </button>
      </nav>

      {/* Modals */}
      {showForm && (
        <TransactionForm 
          onClose={() => setShowForm(false)} 
          customCategories={categories}
          communityId={communityId}
          userTitle={userTitle}
        />
      )}

      {/* Sync Notification */}
      <AnimatePresence>
        {showSyncNotice && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-32 md:bottom-24 left-1/2 -translate-x-1/2 z-[60] bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/10"
          >
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
              <CheckCircle2 size={14} className="text-white" />
            </div>
            <span className="text-sm font-bold tracking-tight">Data tersinkronisasi</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
