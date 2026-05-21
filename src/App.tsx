import React, { useState, useEffect, useRef } from 'react';
import { onSnapshot, collection, query, orderBy, where } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { db, auth, loginWithGoogle, logout } from './lib/firebase';
import { handleFirestoreError, OperationType } from './lib/firestoreErrorHandler';
import { motion } from 'motion/react';
import { Plus, LogOut, LayoutDashboard, Cloud, History, User as UserIcon, LogIn, Settings as SettingsIcon, CheckCircle2, XCircle, ChevronRight, ChevronLeft, NotebookPen, FileText, Home } from 'lucide-react';
import { cn } from './lib/utils';
import Dashboard from './components/Dashboard';
import TransactionList from './components/TransactionList';
import TransactionForm from './components/TransactionForm';
import Laporan from './components/Laporan';
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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'laporan' | 'settings'>('dashboard');
  const [showForm, setShowForm] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [communityId, setCommunityId] = useState<string | null>(null);
  const [communityRole, setCommunityRole] = useState<'admin' | 'viewer' | null>(null);
  const [userTitle, setUserTitle] = useState<string | null>(null);
  const [communityTitles, setCommunityTitles] = useState<{[key: string]: string}>({});
  const [communityData, setCommunityData] = useState<any>(null);
  const [categories, setCategories] = useState<{income: string[], expense: string[]}>(DEFAULT_CATEGORIES);

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [backPressedOnce, setBackPressedOnce] = useState(false);
  const [showExitToast, setShowExitToast] = useState(false);
  const [appExited, setAppExited] = useState(false);
  const isPoppingRef = useRef(false);

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

  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;

    // Ignore swipe gestures if user is currently editing an input, textarea, or select element
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT')) {
      setTouchStart(null);
      return;
    }

    const touch = e.changedTouches[0];
    const diffX = touch.clientX - touchStart.x;
    const diffY = touch.clientY - touchStart.y;

    // Minimum distance for a valid swipe gesture is 65px
    // Also, ensure the swipe angle is mostly horizontal (Y deviation is less than 60% of X velocity)
    const minSwipeDistance = 65;
    if (Math.abs(diffX) > minSwipeDistance && Math.abs(diffY) < Math.abs(diffX) * 0.6) {
      const tabs: ('dashboard' | 'transactions' | 'laporan' | 'settings')[] = ['dashboard', 'transactions', 'laporan', 'settings'];
      const currentIndex = tabs.indexOf(activeTab);

      if (diffX < 0) {
        // Swiped Left -> Move to Next Tab
        const nextIndex = (currentIndex + 1) % tabs.length;
        setActiveTab(tabs[nextIndex]);
      } else {
        // Swiped Right -> Move to Previous Tab
        const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        setActiveTab(tabs[prevIndex]);
      }
    }
    setTouchStart(null);
  };

  useEffect(() => {
    let timeoutId: any = null;
    const handleScroll = () => {
      setIsScrolling(true);
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsScrolling(false);
      }, 400); // 400ms after scroll ceases, show again
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  // Synchronize browser history and handle back navigation
  useEffect(() => {
    if (!user) return;

    // Push the initial state on mount if history is empty
    if (!window.history.state) {
      window.history.replaceState({ tab: 'dashboard' }, '', '');
    }

    let backPressTimeout: any = null;

    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.tab) {
        isPoppingRef.current = true;
        setActiveTab(event.state.tab);
        setBackPressedOnce(false);
        setShowExitToast(false);
      } else {
        if (activeTab === 'dashboard') {
          setBackPressedOnce((prev) => {
            if (prev) {
              setAppExited(true);
              return false;
            } else {
              setShowExitToast(true);
              // Re-inject history state to block immediate exit
              window.history.pushState({ tab: 'dashboard' }, '', '');

              if (backPressTimeout) clearTimeout(backPressTimeout);
              backPressTimeout = setTimeout(() => {
                setBackPressedOnce(false);
                setShowExitToast(false);
              }, 2000);

              return true;
            }
          });
        } else {
          isPoppingRef.current = true;
          setActiveTab('dashboard');
          window.history.pushState({ tab: 'dashboard' }, '', '');
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (backPressTimeout) clearTimeout(backPressTimeout);
    };
  }, [activeTab, user]);

  useEffect(() => {
    if (!user) return;

    if (isPoppingRef.current) {
      isPoppingRef.current = false;
      return;
    }

    // When the tab is updated inside the React app (by user click or swipe),
    // push it to history only if it's not the same as current history state
    if (window.history.state?.tab !== activeTab) {
      window.history.pushState({ tab: activeTab }, '', '');
    }
  }, [activeTab, user]);

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  if (appExited) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col items-center justify-center p-6 text-center select-none animate-in fade-in duration-500">
        <div className="w-24 h-24 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center mb-8 border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.15)] animate-bounce">
          <LogOut size={44} strokeWidth={2} />
        </div>
        <h1 className="text-3xl font-black tracking-tight mb-3">Aplikasi Keluar</h1>
        <p className="text-slate-400 max-w-sm mb-10 text-sm leading-relaxed">
          Anda telah keluar dari sesi kerja Kas RT Digital. Silakan klik tombol di bawah untuk masuk kembali ke sistem.
        </p>
        <button
          onClick={() => {
            setAppExited(false);
            setBackPressedOnce(false);
            setShowExitToast(false);
            window.history.pushState({ tab: 'dashboard' }, '', '');
          }}
          className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-sm uppercase tracking-wider transition-all active:scale-95 shadow-xl shadow-indigo-600/25"
        >
          Masuk / Buka Kembali
        </button>
      </div>
    );
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
    <div 
      className="min-h-screen bg-gray-50 pb-24 md:pb-8"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <header className={cn(
        "bg-white/80 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-40 transition-all duration-300 transform",
        isScrolling && "-translate-y-full opacity-0 pointer-events-none"
      )}>
        <div className="mx-auto px-6 py-4 md:py-6 flex items-center justify-between max-w-full">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-sm">
              {activeTab === 'dashboard' && <LayoutDashboard size={24} strokeWidth={2.5} />}
              {activeTab === 'transactions' && <NotebookPen size={24} strokeWidth={2.5} />}
              {activeTab === 'laporan' && <FileText size={24} strokeWidth={2.5} />}
              {activeTab === 'settings' && <SettingsIcon size={24} strokeWidth={2.5} />}
            </div>
            <div className="flex flex-col">
              <h1 className="font-black text-gray-900 tracking-tight text-lg uppercase leading-none">
                {activeTab === 'dashboard' ? 'KAS RT DIGITAL' : activeTab === 'transactions' ? 'TRANSAKSI' : activeTab === 'laporan' ? 'LAPORAN KAS' : 'PENGATURAN'}
              </h1>
              <span className={cn(
                "text-[10px] font-bold tracking-[0.2em] mt-1",
                activeTab === 'dashboard' ? "text-[#666666]" : "text-blue-600"
              )}>
                {activeTab === 'dashboard' ? 'RT 05 RW 02' : activeTab === 'transactions' ? `${transactions.length} TOTAL TRANSAKSI` : activeTab === 'laporan' ? 'REKAP & EKSPORT DATA' : 'KONFIGURASI SISTEM'}
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
              className="w-12 h-12 flex items-center justify-center text-red-500 hover:text-red-700 hover:bg-red-50 rounded-2xl transition-all active:scale-95"
              title="Keluar"
            >
              <LogOut size={24} strokeWidth={2.5} />
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
              <Dashboard 
                transactions={transactions} 
                communityData={communityData} 
                isScrolling={isScrolling} 
                onViewLaporan={() => setActiveTab('laporan')} 
              />
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
                isScrolling={isScrolling}
              />
            </motion.div>
          )}
          {activeTab === 'laporan' && (
            <motion.div
              key="laporan"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <Laporan 
                transactions={transactions} 
                communityData={communityData} 
                customCategories={categories} 
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
      <nav className={cn(
        "fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-40 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] transition-all duration-300 transform md:hidden h-[76px] pb-5 pt-2",
        isScrolling && "translate-y-full opacity-0 pointer-events-none"
      )}>
        <div className="grid grid-cols-5 h-full items-center justify-items-center w-full max-w-lg mx-auto px-1">
          {/* Beranda */}
          <button
            onClick={() => setActiveTab('dashboard')}
            className="flex flex-col items-center justify-center gap-1 w-full h-full relative"
          >
            <div className="relative">
              <Home 
                size={23} 
                className={cn(
                  "transition-all duration-300", 
                  activeTab === 'dashboard' ? "text-[#2563EB]" : "text-[#9CA3AF]"
                )} 
                strokeWidth={activeTab === 'dashboard' ? 2.5 : 1.5}
                fill={activeTab === 'dashboard' ? "rgba(37, 99, 235, 0.15)" : "none"}
              />
            </div>
            <span className={cn(
              "text-[10px] font-sans font-black tracking-wide uppercase transition-colors duration-200", 
              activeTab === 'dashboard' ? "text-[#2563EB]" : "text-[#9CA3AF]"
            )}>
              Beranda
            </span>
          </button>

          {/* Transaksi */}
          <button
            onClick={() => setActiveTab('transactions')}
            className="flex flex-col items-center justify-center gap-1 w-full h-full relative"
          >
            <div className="relative">
              <NotebookPen 
                size={23} 
                className={cn(
                  "transition-all duration-300", 
                  activeTab === 'transactions' ? "text-[#2563EB]" : "text-[#9CA3AF]"
                )} 
                strokeWidth={activeTab === 'transactions' ? 2.5 : 1.5}
                fill={activeTab === 'transactions' ? "rgba(37, 99, 235, 0.15)" : "none"}
              />
            </div>
            <span className={cn(
              "text-[10px] font-sans font-black tracking-wide uppercase transition-colors duration-200", 
              activeTab === 'transactions' ? "text-[#2563EB]" : "text-[#9CA3AF]"
            )}>
              Transaksi
            </span>
          </button>

          {/* central Action Button */}
          <div className="flex flex-col items-center justify-center w-full h-full relative -mt-4">
            <button
              onClick={() => setShowForm(true)}
              className="w-13 h-13 bg-[#2563EB] text-white rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30 border-4 border-white active:scale-90 transition-all duration-200"
              title="Tambah Transaksi"
            >
              <Plus size={24} strokeWidth={3} />
            </button>
            <span className="text-[10px] font-sans font-black tracking-wide uppercase text-[#9CA3AF] mt-1">
              Tambah
            </span>
          </div>

          {/* Laporan */}
          <button
            onClick={() => setActiveTab('laporan')}
            className="flex flex-col items-center justify-center gap-1 w-full h-full relative"
          >
            <div className="relative">
              <FileText 
                size={23} 
                className={cn(
                  "transition-all duration-300", 
                  activeTab === 'laporan' ? "text-[#2563EB]" : "text-[#9CA3AF]"
                )} 
                strokeWidth={activeTab === 'laporan' ? 2.5 : 1.5}
                fill={activeTab === 'laporan' ? "rgba(37, 99, 235, 0.15)" : "none"}
              />
            </div>
            <span className={cn(
              "text-[10px] font-sans font-black tracking-wide uppercase transition-colors duration-200", 
              activeTab === 'laporan' ? "text-[#2563EB]" : "text-[#9CA3AF]"
            )}>
              Laporan
            </span>
          </button>

          {/* Pengaturan */}
          <button
            onClick={() => setActiveTab('settings')}
            className="flex flex-col items-center justify-center gap-1 w-full h-full relative"
          >
            <div className="relative">
              <SettingsIcon 
                size={23} 
                className={cn(
                  "transition-all duration-300", 
                  activeTab === 'settings' ? "text-[#2563EB]" : "text-[#9CA3AF]"
                )} 
                strokeWidth={activeTab === 'settings' ? 2.5 : 1.5}
                fill="none"
              />
            </div>
            <span className={cn(
              "text-[10px] font-sans font-black tracking-wide uppercase transition-colors duration-200", 
              activeTab === 'settings' ? "text-[#2563EB]" : "text-[#9CA3AF]"
            )}>
              Pengaturan
            </span>
          </button>
        </div>
      </nav>

      {/* Toast Notifikasi Keluar */}
      <AnimatePresence>
        {showExitToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-slate-900 border border-slate-800 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 max-w-[90vw] w-fit"
          >
            <div className="w-2 h-2 bg-red-400 rounded-full animate-ping" />
            <span className="text-xs font-bold uppercase tracking-wider whitespace-nowrap">
              Tekan sekali lagi untuk keluar dari aplikasi
            </span>
          </motion.div>
        )}
      </AnimatePresence>

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
