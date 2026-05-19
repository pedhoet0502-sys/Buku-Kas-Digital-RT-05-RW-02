import React, { useState, useEffect } from 'react';
import { onSnapshot, collection, query, orderBy, where } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { db, auth, loginWithGoogle, logout } from './lib/firebase';
import { handleFirestoreError, OperationType } from './lib/firestoreErrorHandler';
import { motion } from 'motion/react';
import { Plus, LogOut, LayoutDashboard, Cloud, History, User as UserIcon, LogIn, Settings as SettingsIcon, CheckCircle2, XCircle, ChevronRight, ChevronLeft, NotebookPen } from 'lucide-react';
import { cn } from './lib/utils';
import Dashboard from './components/Dashboard';
import TransactionList from './components/TransactionList';
import TransactionForm from './components/TransactionForm';
import Settings from './components/Settings';
import SplashScreen from './components/SplashScreen';
import ConfirmModal from './components/ConfirmModal';
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

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    logout();
    setShowLogoutConfirm(false);
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
            <LayoutDashboard size={40} strokeWidth={2} />
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

          <button
            onClick={handleLogout}
            className="w-full py-4 mt-3 bg-white border-2 border-red-50 text-red-500 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-red-50 transition-all active:scale-[0.98]"
          >
            <LogOut size={20} />
            Keluar Aplikasi
          </button>
          
          <p className="mt-8 text-xs text-gray-400">
            Hanya pengurus RT yang diizinkan untuk mencatat transaksi.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-40">
        <div className="mx-auto px-6 py-4 md:py-6 flex items-center justify-between max-w-full">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-sm">
              {activeTab === 'dashboard' && <LayoutDashboard size={24} strokeWidth={2.5} />}
              {activeTab === 'transactions' && <NotebookPen size={24} strokeWidth={2.5} />}
              {activeTab === 'settings' && <SettingsIcon size={24} strokeWidth={2.5} />}
            </div>
            <div className="flex flex-col">
              <h1 className="font-black text-gray-900 tracking-tight text-lg uppercase leading-none">
                {activeTab === 'dashboard' ? 'KAS RT DIGITAL' : activeTab === 'transactions' ? 'TRANSAKSI' : 'PENGATURAN'}
              </h1>
              <span className="text-[10px] font-bold text-blue-600 tracking-[0.2em] mt-1">
                {activeTab === 'dashboard' ? 'RT 05 RW 02' : activeTab === 'transactions' ? `${transactions.length} TOTAL TRANSAKSI` : 'KONFIGURASI SISTEM'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 bg-emerald-50/50 px-3 py-1.5 rounded-full border border-emerald-100/50">
              <motion.div
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              >
                <Cloud size={14} className="text-emerald-500 fill-emerald-500/10" />
              </motion.div>
              <span className="text-[10px] font-black text-emerald-600 tracking-tight uppercase">98% Cloud</span>
            </div>
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full border border-gray-100">
              <div className="w-6 h-6 rounded-full overflow-hidden bg-indigo-100 ring-2 ring-white">
                {user.photoURL ? <img src={user.photoURL} alt="" /> : <UserIcon size={14} className="m-auto text-indigo-400 mt-1" />}
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-gray-700 truncate max-w-[100px] leading-tight">{user.displayName || 'Pengurus'}</span>
                {userTitle && (
                  <span className="text-[9px] font-black text-indigo-600 mt-0.5 uppercase tracking-wide leading-none w-fit">
                    {userTitle}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all active:scale-95"
              title="Keluar"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto space-y-0 transition-all duration-300 max-w-full p-0">
        {/* Navigation Tabs (Desktop Icons removed per user request for consistency) */}

        {/* Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <Dashboard transactions={transactions} communityData={communityData} />
            </motion.div>
          )}
          {activeTab === 'transactions' && (
            <motion.div
              key="transactions"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <TransactionList 
                transactions={transactions} 
                customCategories={categories}
                currentCommunityId={communityId}
                currentRole={communityRole}
                memberTitles={communityTitles}
                currentUserTitle={userTitle}
                onTabChange={setActiveTab}
                onAdd={() => setShowForm(true)}
              />
            </motion.div>
          )}
          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <Settings onTabChange={setActiveTab} onBack={() => setActiveTab('dashboard')} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating Action Button (Mobile & Desktop) - Removed as requested */}
      {/* {communityRole === 'admin' && activeTab !== 'dashboard' && (
        <button
          onClick={() => setShowForm(true)}
          className="fixed bottom-24 md:bottom-8 right-6 w-16 h-16 bg-indigo-600 text-white rounded-[1.75rem] shadow-2xl shadow-indigo-600/30 flex items-center justify-center hover:bg-indigo-500 transition-all active:scale-90 z-50 group border border-indigo-400/30 backdrop-blur-md"
        >
          <Plus size={36} className="group-hover:rotate-180 transition-transform duration-500" />
        </button>
      )} */}

      {/* Bottom Navigation (Mobile Only) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-18 bg-white border-t border-gray-100 z-40 px-6 flex items-center justify-between shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
        {activeTab === 'dashboard' ? (
          <div className="flex items-center justify-between w-full">
            <button
              onClick={() => setActiveTab('transactions')}
              className="w-12 h-12 flex items-center justify-center text-blue-600 transition-colors"
            >
              <ChevronRight size={24} strokeWidth={3} />
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className="w-12 h-12 flex items-center justify-center text-slate-300 hover:text-blue-600 transition-colors"
            >
              <ChevronLeft size={24} strokeWidth={3} />
            </button>
          </div>
        ) : activeTab === 'transactions' ? (
          <div className="flex items-center justify-between w-full">
            <button
              onClick={() => setActiveTab('settings')}
              className="w-12 h-12 flex items-center justify-center text-blue-600 transition-colors"
            >
              <ChevronRight size={24} strokeWidth={3} />
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className="w-12 h-12 flex items-center justify-center text-slate-300 hover:text-blue-600 transition-colors"
            >
              <ChevronLeft size={24} strokeWidth={3} />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full">
            <button
              onClick={() => setActiveTab('dashboard')}
              className="w-12 h-12 flex items-center justify-center text-blue-600 transition-colors"
            >
              <ChevronRight size={24} strokeWidth={3} />
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className="w-12 h-12 flex items-center justify-center text-slate-300 hover:text-blue-600 transition-colors"
            >
              <ChevronLeft size={24} strokeWidth={3} />
            </button>
          </div>
        )}
      </nav>

      {/* Modals */}
      <ConfirmModal 
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={confirmLogout}
        title="Konfirmasi Keluar"
        message="anda yakin ingin keluar Dari aplikasi"
        confirmText="Keluar"
        cancelText="Batal"
      />

      {showForm && (
        <TransactionForm 
          onClose={() => setShowForm(false)} 
          customCategories={categories}
          communityId={communityId}
          userTitle={userTitle}
        />
      )}
    </div>
  );
}
