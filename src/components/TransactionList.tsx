import React, { useState } from 'react';
import { formatCurrency } from '@/src/lib/utils';
import { 
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
  Filter,
  FileText
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
}

export default function TransactionList({ transactions, customCategories, currentCommunityId, currentRole, memberTitles, currentUserTitle }: TransactionListProps) {
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
    const matchesDay = filterDay === '' || tDate.getDate().toString() === filterDay;
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
  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());

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
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden"
      >
        <div className="p-8 border-b border-slate-50 flex flex-col gap-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-1.5">
              <div className="flex items-center gap-3">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Riwayat Transaksi</h3>
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 rounded-full border border-emerald-100">
                  <div className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </div>
                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none">Sinkron Jaringan</span>
                </div>
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-sm shadow-indigo-200"></span>
                Total Transaksi: <span className="text-slate-900 font-black">{filteredTransactions.length} Entri</span>
              </p>
            </div>
            
            <div className="flex items-center gap-2 w-full lg:w-auto max-w-2xl">
              <div className="relative group flex-1">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
                <input
                  type="text"
                  placeholder="Cari transaksi..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-6 py-3.5 bg-slate-50 border-2 border-slate-50 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/5 focus:bg-white focus:border-indigo-100 outline-none transition-all placeholder:text-slate-300 shadow-inner"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowFilters(!showFilters)}
                  className={cn(
                    "p-3.5 rounded-2xl transition-all flex items-center justify-center border-2",
                    showFilters || isFilterActive 
                      ? "text-indigo-600 bg-white border-indigo-100 shadow-xl shadow-indigo-100/50" 
                      : "text-slate-400 bg-slate-50 border-transparent hover:text-slate-900"
                  )}
                >
                  <Filter size={18} />
                </motion.button>

                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleResetAll}
                  disabled={isRefreshing}
                  className={cn(
                    "p-3.5 rounded-2xl transition-all flex items-center justify-center bg-slate-50 border-2 border-transparent",
                    isRefreshing ? "text-indigo-500" : "text-slate-400 hover:text-slate-900"
                  )}
                >
                  <RotateCcw size={18} className={cn(isRefreshing && "animate-spin")} />
                </motion.button>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {isAnyFilterActive && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-6 bg-slate-900 rounded-[2rem] text-white">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-emerald-400 backdrop-blur-md">
                      <TrendingUp size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Pemasukan</p>
                      <p className="text-xl sm:text-2xl font-mono font-bold tracking-tighter text-emerald-400">{formatCurrency(filteredTotals.income)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 sm:border-l sm:border-white/10 sm:pl-8">
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-rose-400 backdrop-blur-md">
                      <TrendingDown size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Pengeluaran</p>
                      <p className="text-xl sm:text-2xl font-mono font-bold tracking-tighter text-rose-400">{formatCurrency(filteredTotals.expense)}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showFilters && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex flex-col sm:flex-row items-end gap-6 pt-2">
                  {(!filterMonth && !filterYear) && (
                    <div className="flex-1 w-full space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                        <Calendar size={12} className="text-indigo-500" />
                        Perspektif Harian
                      </label>
                      <input
                        type="date"
                        className="w-full text-sm font-bold bg-slate-50 border-2 border-slate-50 rounded-[1.5rem] px-6 py-4 outline-none focus:ring-4 focus:ring-indigo-500/5 focus:bg-white focus:border-indigo-100 transition-all cursor-pointer uppercase tracking-widest"
                        onChange={(e) => {
                          if (e.target.value) {
                            const date = new Date(e.target.value);
                            setFilterDay(date.getDate().toString());
                            setFilterMonth((date.getMonth() + 1).toString());
                            setFilterYear(date.getFullYear().toString());
                          } else {
                            setFilterDay('');
                          }
                        }}
                      />
                    </div>
                  )}

                  {(!filterDay && !filterYear) && (
                    <div className="flex-1 w-full space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Perspektif Bulanan</label>
                      <div className="relative">
                        <select
                          value={filterMonth}
                          onChange={(e) => setFilterMonth(e.target.value)}
                          className="w-full text-sm font-bold bg-slate-50 border-2 border-slate-50 rounded-[1.5rem] px-6 py-4 appearance-none outline-none focus:bg-white focus:border-indigo-100 transition-all cursor-pointer"
                        >
                          <option value="">Seluruh Bulan</option>
                          {months.map(month => (
                            <option key={month.value} value={month.value}>{month.label}</option>
                          ))}
                        </select>
                        <ChevronRight className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 rotate-90 pointer-events-none" size={16} />
                      </div>
                    </div>
                  )}

                  {(!filterDay && !filterMonth) && (
                    <div className="flex-1 w-full space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Perspektif Tahunan</label>
                      <div className="relative">
                        <select
                          value={filterYear}
                          onChange={(e) => setFilterYear(e.target.value)}
                          className="w-full text-sm font-bold bg-slate-50 border-2 border-slate-50 rounded-[1.5rem] px-6 py-4 appearance-none outline-none focus:bg-white focus:border-indigo-100 transition-all cursor-pointer"
                        >
                          <option value="">Seluruh Tahun</option>
                          {years.map(year => (
                            <option key={year} value={year.toString()}>{year}</option>
                          ))}
                        </select>
                        <ChevronRight className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 rotate-90 pointer-events-none" size={16} />
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="bg-slate-50/50">
          {sortedTransactions.length > 0 ? (
            <div className="flex flex-col">
              {Object.entries(groupedTransactions).map(([dateKey, transactions], groupIndex) => (
                <div key={dateKey} className="flex flex-col">
                  <div className="px-8 py-4 bg-white/5 shadow-sm border-y border-slate-100 flex items-center justify-between sticky top-0 z-10 backdrop-blur-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner">
                        <Calendar size={14} strokeWidth={3} />
                      </div>
                      <span className="text-[11px] font-black text-slate-900 uppercase tracking-[0.25em]">
                        {getRelativeDateLabel(dateKey)}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {transactions.length} Entri
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100 bg-white">
                    {transactions.map((t, idx) => (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: (groupIndex * 0.1) + (idx * 0.05) }}
                        key={t.id} 
                        onClick={() => setSelectedTransaction(t)}
                        className="px-8 py-6 hover:bg-slate-50 transition-all flex items-center gap-6 cursor-pointer group relative overflow-hidden active:scale-[0.995]"
                      >
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-500 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300"></div>

                        <div className={cn(
                          "w-16 h-16 rounded-[1.5rem] shrink-0 flex flex-col items-center justify-center transition-all group-hover:scale-105 group-hover:-rotate-2 shadow-sm border-2",
                          t.type === 'income' 
                            ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                            : "bg-rose-50 text-rose-600 border-rose-100"
                        )}>
                          {t.type === 'income' ? <ArrowUpRight size={28} strokeWidth={2.5} /> : <ArrowDownLeft size={28} strokeWidth={2.5} />}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-black text-slate-900 tracking-tight text-lg group-hover:text-indigo-600 transition-colors">{t.category}</h4>
                                <div className={cn(
                                  "p-1 px-2 rounded-lg text-[9px] font-extrabold uppercase tracking-widest border",
                                  t.type === 'income' 
                                    ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                                    : "bg-rose-50 text-rose-600 border-rose-100"
                                )}>
                                  {t.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                                </div>
                              </div>
                              <p className="text-sm text-slate-500 font-medium line-clamp-1 italic pr-4">
                                "{t.description || 'Tanpa deskripsi tambahan'}"
                              </p>
                            </div>
                            
                            <div className="flex flex-col items-start sm:items-end">
                              <p className={cn(
                                "font-mono font-bold text-xl sm:text-2xl tracking-tighter leading-none mb-1 text-right",
                                t.type === 'income' ? "text-emerald-600" : "text-rose-600"
                              )}>
                                {formatCurrency(t.amount)}
                              </p>
                              <div className="flex items-center gap-1.5 text-slate-300">
                                {/* Verified status hidden */}
                              </div>
                            </div>
                          </div>
                          
                          <div className="mt-4 flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2.5 py-2 px-4 bg-slate-50 border border-slate-100 rounded-2xl group-hover:bg-white group-hover:border-slate-200 transition-all">
                              <div className="w-6 h-6 rounded-xl bg-white shadow-sm flex items-center justify-center text-indigo-500 border border-indigo-50">
                                <User size={12} strokeWidth={3} />
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-black text-slate-700 tracking-tight">
                                  {t.userName || 'System Auto'}
                                </span>
                                {(t.userTitle || memberTitles?.[t.userId]) && (
                                  <span className="text-[9px] font-black text-white bg-slate-900 px-2.5 py-1 rounded-lg uppercase tracking-widest shadow-lg shadow-slate-200">
                                    {t.userTitle || memberTitles?.[t.userId]}
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <div className="hidden group-hover:flex items-center gap-2 text-indigo-600 animate-in slide-in-from-left-2 duration-300">
                              <span className="text-[10px] font-black uppercase tracking-widest">Detail Node</span>
                              <ChevronRight size={14} />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-24 flex flex-col items-center justify-center text-center">
              <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center text-slate-200 mb-6 border-2 border-slate-100 shadow-inner">
                <Search size={44} strokeWidth={1} />
              </div>
              <h4 className="text-slate-900 font-black text-xl tracking-tight mb-2">Data Tidak Ditemukan</h4>
              <p className="text-sm text-slate-400 font-medium max-w-xs mx-auto mb-8 uppercase tracking-widest">
                Node kami tidak menemukan kecocokan untuk parameter pencarian Anda.
              </p>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleResetAll}
                className="text-xs font-black text-indigo-600 bg-white border-2 border-indigo-100 px-10 py-4 rounded-[1.5rem] uppercase tracking-[0.2em] shadow-xl shadow-indigo-100/50 transition-all"
              >
                Reset Semua Filter
              </motion.button>
            </div>
          )}
        </div>
      </motion.div>

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
