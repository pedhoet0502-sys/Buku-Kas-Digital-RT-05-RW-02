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
  FileText,
  Clock
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
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
      >
        <div className="p-6 border-b border-gray-100 flex flex-col gap-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900 leading-none mb-1">Riwayat Transaksi</h3>
              <p className="text-sm text-gray-500">Total {filteredTransactions.length} transaksi ditemukan</p>
            </div>
            
            <div className="flex items-center gap-2 w-full lg:w-auto">
              <div className="relative group flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                <input
                  type="text"
                  placeholder="Cari transaksi..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className={cn(
                    "p-2 rounded-xl transition-all flex items-center justify-center border",
                    showFilters || isFilterActive 
                      ? "text-indigo-600 bg-indigo-50 border-indigo-100" 
                      : "text-gray-400 bg-gray-50 border-gray-200 hover:text-gray-600"
                  )}
                >
                  <Filter size={20} />
                </button>

                <button 
                  onClick={handleResetAll}
                  disabled={isRefreshing}
                  className={cn(
                    "p-2 rounded-xl transition-all flex items-center justify-center bg-gray-50 border border-gray-200",
                    isRefreshing ? "text-indigo-600" : "text-gray-400 hover:text-gray-600"
                  )}
                >
                  <RotateCcw size={20} className={cn(isRefreshing && "animate-spin")} />
                </button>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Pilih Tanggal</label>
                    <input
                      type="date"
                      value={filterDay}
                      onChange={(e) => setFilterDay(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Bulan</label>
                    <select
                      value={filterMonth}
                      onChange={(e) => setFilterMonth(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all cursor-pointer"
                    >
                      <option value="">Semua Bulan</option>
                      {months.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Tahun</label>
                    <select
                      value={filterYear}
                      onChange={(e) => setFilterYear(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all cursor-pointer"
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
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
                  <div>
                    <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-1">Total Pemasukan (Filter)</p>
                    <p className="text-xl font-bold text-green-600 leading-none">{formatCurrency(filteredTotals.income)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-1">Total Pengeluaran (Filter)</p>
                    <p className="text-xl font-bold text-red-600 leading-none">{formatCurrency(filteredTotals.expense)}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="bg-gray-50/50">
          {sortedTransactions.length > 0 ? (
            <div className="flex flex-col">
              {Object.entries(groupedTransactions).map(([dateKey, transactions], groupIndex) => (
                <div key={dateKey} className="flex flex-col">
                  <div className="px-6 py-3 bg-gray-50 border-y border-gray-100 flex items-center justify-between sticky top-0 z-10">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      {getRelativeDateLabel(dateKey)}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400">
                      {transactions.length} transaksi
                    </span>
                  </div>

                  <div className="divide-y divide-gray-100">
                    {transactions.map((t, idx) => (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: (groupIndex * 0.1) + (idx * 0.05) }}
                        key={t.id} 
                        onClick={() => setSelectedTransaction(t)}
                        className="p-6 hover:bg-white transition-all flex items-center gap-6 cursor-pointer group"
                      >
                        <div className={cn(
                          "w-12 h-12 rounded-xl shrink-0 flex items-center justify-center transition-transform group-hover:scale-110",
                          t.type === 'income' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                        )}>
                          {t.type === 'income' ? <ArrowUpRight size={24} /> : <ArrowDownLeft size={24} />}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <h4 className="font-bold text-gray-900 truncate">{t.category}</h4>
                              <p className="text-sm text-gray-500 truncate mt-0.5">
                                {t.description || 'Tanpa keterangan'}
                              </p>
                            </div>
                            
                            <div className="text-right">
                              <p className={cn(
                                "font-black text-lg leading-tight",
                                t.type === 'income' ? "text-green-600" : "text-red-600"
                              )}>
                                {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                              </p>
                            </div>
                          </div>
                          
                          <div className="mt-3 flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-1.5 py-1 px-2.5 bg-gray-100 rounded-lg">
                              <User size={12} className="text-gray-400" />
                              <span className="text-[11px] font-bold text-gray-600">
                                {t.userName || 'Sistem'}
                              </span>
                              {(t.userTitle || memberTitles?.[t.userId]) && (
                                <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded font-black uppercase tracking-wide">
                                  {t.userTitle || memberTitles?.[t.userId]}
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-1 text-gray-400">
                              <Clock size={12} />
                              <span className="text-[11px] font-medium">{t.createdAt ? format(new Date(t.createdAt?.toDate?.() || t.createdAt), 'HH:mm') : '--:--'}</span>
                            </div>

                            <ChevronRight size={14} className="text-gray-300 ml-auto group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
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
