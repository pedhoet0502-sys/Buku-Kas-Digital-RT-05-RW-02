import React, { useState } from 'react';
import { formatCurrency } from '@/src/lib/utils';
import { 
  Plus,
  ArrowUpRight, 
  ArrowDownLeft, 
  Calendar, 
  Tag, 
  Search, 
  User, 
  SlidersHorizontal, 
  RotateCcw, 
  Info, 
  TrendingUp, 
  TrendingDown, 
  Cloud,
  ChevronRight,
  ChevronLeft,
  Filter,
  FileText,
  Clock,
  NotebookPen,
  Sliders
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { id } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import TransactionDetail from './TransactionDetail';

interface TransactionListProps {
  transactions: any[];
  customCategories?: { income: string[], expense: string[] };
  currentCommunityId?: string | null;
  currentRole?: 'admin' | 'viewer' | null;
  memberTitles?: {[key: string]: string};
  currentUserTitle?: string | null;
  onTabChange?: (tab: 'dashboard' | 'transactions' | 'settings') => void;
  onAdd?: () => void;
}

export default function TransactionList({ transactions, customCategories, currentCommunityId, currentRole, memberTitles, currentUserTitle, onTabChange, onAdd }: TransactionListProps) {
  const [selectedTransaction, setSelectedTransaction] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState<string>('');
  const [filterYear, setFilterYear] = useState<string>('');
  const [filterDay, setFilterDay] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredTransactions = transactions.filter(t => {
    const searchLower = searchTerm.toLowerCase();
    const tDate = new Date(t.date);
    
    // Search filter
    const matchesSearch = (
      (t.category?.toLowerCase() || '').includes(searchLower) ||
      (t.description?.toLowerCase() || '').includes(searchLower)
    );

    // Date filters
    const matchesDay = filterDay === '' || format(tDate, 'yyyy-MM-dd') === filterDay;
    const matchesMonth = filterMonth === '' || (tDate.getMonth() + 1).toString() === filterMonth;
    const matchesYear = filterYear === '' || tDate.getFullYear().toString() === filterYear;

    return matchesSearch && matchesDay && matchesMonth && matchesYear;
  });

  // Calculate totals for filtered transactions
  const filteredTotals = filteredTransactions.reduce((acc, t) => {
    const amount = Number(t.amount) || 0;
    if (t.type === 'income') acc.income += amount;
    else acc.expense += amount;
    return acc;
  }, { income: 0, expense: 0 });

  const years = Array.from(new Set(transactions.map(t => new Date(t.date).getFullYear()))).sort((a, b) => b - a);
  const months = [
    { value: '1', label: 'Januari' },
    { value: '2', label: 'Februari' },
    { value: '3', label: 'Maret' },
    { value: '4', label: 'April' },
    { value: '5', label: 'Mei' },
    { value: '6', label: 'Juni' },
    { value: '7', label: 'Juli' },
    { value: '8', label: 'Agustus' },
    { value: '9', label: 'September' },
    { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },
    { value: '12', label: 'Desember' }
  ];

  const sortedTransactions = [...filteredTransactions].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Grouping by date
  const groupedTransactions: { [key: string]: any[] } = {};
  sortedTransactions.forEach(t => {
    const dateKey = format(new Date(t.date), 'yyyy-MM-dd');
    if (!groupedTransactions[dateKey]) {
      groupedTransactions[dateKey] = [];
    }
    groupedTransactions[dateKey].push(t);
  });

  const getRelativeDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Hari Ini';
    return format(date, 'EEEE, dd MMMM yyyy', { locale: id });
  };

  const isFilterActive = filterYear !== '' || filterMonth !== '' || filterDay !== '';
  const isSearchActive = searchTerm !== '';
  const isAnyFilterActive = isFilterActive || isSearchActive;

  const handleResetAll = () => {
    setIsRefreshing(true);
    setSearchTerm('');
    setFilterYear('');
    setFilterMonth('');
    setFilterDay('');
    setShowFilters(false);
    setTimeout(() => setIsRefreshing(false), 800);
  };

  if (transactions.length === 0) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-500">
        <p className="text-lg font-medium">Belum ada transaksi</p>
        <p className="text-sm">Klik tombol "Tambah" untuk mencatat pemasukan atau pengeluaran.</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col animate-in fade-in duration-500">
        <div className="bg-slate-50/10 pb-40">
          <div className="max-w-full mx-auto">
            {/* Control Panel - Sticky and Below Global Header */}
            <div className="sticky top-[72px] md:top-[88px] z-30 px-6 py-6 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 bg-white/95 backdrop-blur-md shadow-sm transition-all">
              <div className="flex items-center justify-between w-full lg:w-auto">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                    <Sliders size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 leading-none">Riwayat Transaksi</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Cari dan urutkan data</p>
                  </div>
                </div>
                
                {currentRole === 'admin' && (
                  <button 
                    onClick={onAdd}
                    className="lg:hidden w-11 h-11 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg active:scale-95"
                  >
                    <Plus size={24} />
                  </button>
                )}
              </div>
              
              <div className="flex flex-col lg:flex-row lg:items-end gap-4 w-full lg:w-auto">
                <div className="space-y-2 flex-1 lg:flex-none">
                  <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Pencarian Riwayat Transaksi</h2>
                  <div className="flex items-center gap-2">
                    <div className="relative group flex-1 min-w-[240px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                      <input
                        type="text"
                        placeholder="Cari transaksi..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:bg-white focus:border-blue-500 outline-none transition-all"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setShowFilters(!showFilters)}
                        className={cn(
                          "p-3 rounded-xl transition-all flex items-center justify-center border",
                          showFilters || isFilterActive 
                            ? "bg-blue-50 border-blue-200 text-blue-600" 
                            : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                        )}
                        title="Filter Transaksi"
                      >
                        <Sliders size={20} />
                      </button>

                      <button 
                        onClick={handleResetAll}
                        disabled={isRefreshing}
                        className={cn(
                          "p-3 rounded-xl transition-all flex items-center justify-center bg-gray-50 border border-gray-200",
                          isRefreshing ? "text-blue-600" : "text-gray-400 hover:text-gray-600"
                        )}
                        title="Reset Filter"
                      >
                        <RotateCcw size={20} className={cn(isRefreshing && "animate-spin")} />
                      </button>
                    </div>
                  </div>
                </div>

                {currentRole === 'admin' && (
                  <button 
                    onClick={onAdd}
                    className="hidden lg:flex w-12 h-12 bg-blue-600 text-white rounded-xl items-center justify-center shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 mb-0.5"
                    title="Tambah Transaksi"
                  >
                    <Plus size={24} />
                  </button>
                )}
              </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
              <AnimatePresence>
                {showFilters && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden mb-8"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pb-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Rentang Tanggal</label>
                        <input
                          type="date"
                          value={filterDay}
                          onChange={(e) => setFilterDay(e.target.value)}
                          className="w-full px-5 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all cursor-pointer shadow-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Bulan Data</label>
                        <select
                          value={filterMonth}
                          onChange={(e) => setFilterMonth(e.target.value)}
                          className="w-full px-5 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all cursor-pointer shadow-sm appearance-none"
                        >
                          <option value="">Seluruh Bulan</option>
                          {months.map(m => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Periode Tahun</label>
                        <select
                          value={filterYear}
                          onChange={(e) => setFilterYear(e.target.value)}
                          className="w-full px-5 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all cursor-pointer shadow-sm appearance-none"
                        >
                          <option value="">Semua Tahun</option>
                          {years.map(y => (
                            <option key={y} value={y.toString()}>{y}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {isAnyFilterActive && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden mb-10"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="p-6 bg-emerald-50/50 rounded-[2rem] border border-emerald-100 flex flex-col justify-center items-center text-center">
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.25em] mb-3">Total Pemasukan</p>
                        <p className="text-3xl font-black text-emerald-700 tracking-tighter tabular-nums">{formatCurrency(filteredTotals.income)}</p>
                      </div>
                      <div className="p-6 bg-rose-50/50 rounded-[2rem] border border-rose-100 flex flex-col justify-center items-center text-center">
                        <p className="text-[10px] font-black text-rose-600 uppercase tracking-[0.25em] mb-3">Total Pengeluaran</p>
                        <p className="text-3xl font-black text-rose-700 tracking-tighter tabular-nums">{formatCurrency(filteredTotals.expense)}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm mb-10">
                {sortedTransactions.length > 0 ? (
                  <div className="flex flex-col">
                    {Object.entries(groupedTransactions).map(([dateKey, transactions], groupIndex) => (
                      <div key={dateKey} className="flex flex-col">
                        <div className="px-6 py-3.5 bg-slate-50 border-y border-slate-100 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                              {getRelativeDateLabel(dateKey)}
                            </span>
                          </div>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-white border border-slate-200 px-2.5 py-1 rounded-full shadow-sm">
                            {transactions.length} TRANSAKSI
                          </span>
                        </div>

                        <div className="divide-y divide-slate-100">
                          <AnimatePresence mode="popLayout">
                            {transactions.map((t, idx) => (
                              <motion.div 
                                layout
                                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.2 } }}
                                transition={{ 
                                  type: 'spring',
                                  stiffness: 300,
                                  damping: 30,
                                  delay: Math.min((idx * 0.03), 0.3) 
                                }}
                                key={t.id} 
                                onClick={() => setSelectedTransaction(t)}
                                className="px-6 py-5 hover:bg-slate-50 transition-all flex items-center gap-5 cursor-pointer group"
                              >
                                {/* Icon Section */}
                                <div className={cn(
                                  "w-12 h-12 rounded-xl shrink-0 flex items-center justify-center transition-all group-hover:scale-110 shadow-sm border",
                                  t.type === 'income' 
                                    ? "bg-emerald-50 text-emerald-600 border-emerald-100/50" 
                                    : "bg-rose-50 text-rose-600 border-rose-100/50"
                                )}>
                                  {t.type === 'income' ? <ArrowUpRight size={24} strokeWidth={2.5} /> : <ArrowDownLeft size={24} strokeWidth={2.5} />}
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-4 mb-1">
                                    <div className="min-w-0">
                                      <h4 className="font-bold text-slate-800 text-[15px] uppercase tracking-tight group-hover:text-blue-600 transition-colors">
                                        {t.category}
                                      </h4>
                                      {t.description && (
                                        <p className="text-[11px] text-slate-400 mt-1 font-medium leading-relaxed">
                                          {t.description}
                                        </p>
                                      )}
                                    </div>
                                    
                                    <div className="text-right shrink-0">
                                      <p className={cn(
                                        "font-black text-lg leading-none tabular-nums tracking-tight",
                                        t.type === 'income' ? "text-emerald-600" : "text-rose-600"
                                      )}>
                                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2 py-1 px-2.5 bg-slate-50 border border-slate-100 rounded-lg">
                                      <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center shadow-[0_1px_2px_rgba(0,0,0,0.05)] border border-slate-100">
                                        <User size={10} className="text-slate-400" />
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">
                                          {t.userName || 'System'}
                                        </span>
                                        {(t.userTitle || memberTitles?.[t.userId]) && (
                                          <span className="text-[8px] bg-slate-900 text-white px-1.5 py-0.5 rounded font-black uppercase tracking-wider">
                                            {t.userTitle || memberTitles?.[t.userId]}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-1.5 text-slate-400">
                                      <Clock size={12} strokeWidth={2} />
                                      <span className="text-[10px] font-bold tabular-nums">
                                        {t.createdAt ? format(new Date(t.createdAt?.toDate?.() || t.createdAt), 'HH:mm') : '--:--'}
                                      </span>
                                    </div>
                                    
                                    <ChevronRight size={14} className="text-slate-300 ml-auto group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-32 flex flex-col items-center justify-center text-center px-10">
                    <div className="w-32 h-32 bg-slate-50 rounded-[3rem] flex items-center justify-center text-slate-200 mb-10 border-2 border-slate-100 shadow-inner group">
                      <Search size={56} strokeWidth={1} className="group-hover:scale-110 transition-transform" />
                    </div>
                    <h4 className="text-slate-900 font-black text-2xl tracking-tighter mb-4 uppercase">BUFFER EMPTY</h4>
                    <p className="text-[10px] text-slate-400 font-bold max-w-xs mx-auto mb-12 uppercase tracking-[0.3em] leading-loose">
                      Sistem tidak mendeteksi adanya paket data transaksi yang sesuai dengan parameter filter saat ini.
                    </p>
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleResetAll}
                      className="text-[11px] font-black text-white bg-slate-900 px-14 py-5 rounded-[2rem] uppercase tracking-[0.3em] shadow-2xl shadow-slate-200 transition-all active:scale-[0.98]"
                    >
                      Reset Core Buffer
                    </motion.button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>

      {selectedTransaction && (
        <TransactionDetail 
          transaction={selectedTransaction} 
          onClose={() => setSelectedTransaction(null)} 
          customCategories={customCategories}
          currentCommunityId={currentCommunityId}
          currentRole={currentRole}
          memberTitles={memberTitles}
        />
      )}
    </>
  );
}

// Helper to use cn in this file since it's common
function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
