import React, { useState } from 'react';
import { formatCurrency } from '@/src/lib/utils';
import { ArrowUpRight, ArrowDownLeft, Calendar, Tag, Search, User, SlidersHorizontal, RotateCcw, Info, TrendingUp, TrendingDown, Cloud } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { id } from 'date-fns/locale';
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
      <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-gray-900 tracking-tight">Riwayat Kas</h3>
                <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 rounded-full border border-emerald-100/50">
                  <div className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </div>
                  <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Cloud Connected</span>
                  <Cloud size={10} className="text-emerald-500" />
                </div>
              </div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                {filteredTransactions.length} Transaksi Tercatat
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="relative flex-1 md:flex-none group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
                <input
                  type="text"
                  placeholder="Cari transaksi..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full md:w-64 pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-400 outline-none transition-all placeholder:text-gray-400"
                />
              </div>

              <div className="flex items-center gap-1.5 p-1 bg-gray-50 rounded-2xl border border-gray-100">
                <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className={cn(
                    "p-2 rounded-xl transition-all shrink-0 flex items-center justify-center",
                    showFilters || isFilterActive 
                      ? "text-indigo-600 bg-white shadow-sm ring-1 ring-black/5" 
                      : "text-gray-500 hover:text-gray-900"
                  )}
                  title="Filter Transaksi"
                >
                  <SlidersHorizontal size={18} />
                </button>

                <button 
                  onClick={handleResetAll}
                  disabled={isRefreshing}
                  className={cn(
                    "p-2 rounded-xl transition-all shrink-0 flex items-center justify-center",
                    isRefreshing
                      ? "text-indigo-500 animate-spin" 
                      : "text-gray-500 hover:text-gray-900"
                  )}
                  title="Reset Filter"
                >
                  <RotateCcw size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Summary Bar */}
          {isAnyFilterActive && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-indigo-50/30 rounded-3xl border border-indigo-100/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-50">
                  <TrendingUp size={20} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Pemasukan</span>
                  <span className="text-base font-black text-emerald-600 tracking-tight">{formatCurrency(filteredTotals.income)}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 border-l border-indigo-100/50 pl-4">
                <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-rose-600 shadow-sm border border-rose-50">
                  <TrendingDown size={20} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Pengeluaran</span>
                  <span className="text-base font-black text-rose-600 tracking-tight">{formatCurrency(filteredTotals.expense)}</span>
                </div>
              </div>
            </div>
          )}

          {showFilters && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2 animate-in fade-in slide-in-from-top-4 duration-500">
              {/* Tanggal (Date Picker) */}
              {(!filterMonth && !filterYear) && (
                <div className="flex-1 group">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Pilih Tanggal</label>
                  <div className="relative">
                    <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500 pointer-events-none" />
                    <input
                      type="date"
                      defaultValue={new Date().toISOString().split('T')[0]}
                      className="w-full text-sm font-bold bg-gray-50 border border-gray-200 rounded-2xl pl-12 pr-4 py-3 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 appearance-none transition-all cursor-pointer hover:bg-white uppercase"
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
                </div>
              )}

              {/* Bulan Filter */}
              {(!filterDay && !filterYear) && (
                <div className="flex-1 group">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Pilih Bulan</label>
                  <div className="relative">
                    <select
                      value={filterMonth}
                      onChange={(e) => setFilterMonth(e.target.value)}
                      className="w-full text-sm font-bold bg-gray-50 border border-gray-200 rounded-2xl pl-4 pr-10 py-3 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 appearance-none transition-all cursor-pointer hover:bg-white"
                    >
                      <option value="">Semua Bulan</option>
                      {months.map(month => (
                        <option key={month.value} value={month.value}>{month.label}</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover:text-indigo-500">
                      <Calendar size={14} />
                    </div>
                  </div>
                </div>
              )}

              {/* Tahun Filter */}
              {(!filterDay && !filterMonth) && (
                <div className="flex-1 group">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Pilih Tahun</label>
                  <div className="relative">
                    <select
                      value={filterYear}
                      onChange={(e) => setFilterYear(e.target.value)}
                      className="w-full text-sm font-bold bg-gray-50 border border-gray-200 rounded-2xl pl-4 pr-10 py-3 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 appearance-none transition-all cursor-pointer hover:bg-white"
                    >
                      <option value="">Semua Tahun</option>
                      {years.map(year => (
                        <option key={year} value={year.toString()}>{year}</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover:text-indigo-500">
                      <Calendar size={14} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-gray-50/30">
          {sortedTransactions.length > 0 ? (
            <div className="flex flex-col">
              {Object.entries(groupedTransactions).map(([dateKey, transactions]) => (
                <div key={dateKey} className="flex flex-col">
                  {/* Date Header: Restore chronologial grouping for better info */}
                  <div className="px-6 py-3 bg-gray-50/50 backdrop-blur-sm border-y border-gray-100 flex items-center justify-between sticky top-0 z-10">
                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] flex items-center gap-2">
                      <Calendar size={12} strokeWidth={3} />
                      {getRelativeDateLabel(dateKey)}
                    </span>
                    <span className="text-[11px] font-bold text-gray-400">
                      {transactions.length} Entri
                    </span>
                  </div>

                  <div className="divide-y divide-gray-50 bg-white">
                    {transactions.map((t) => (
                      <div 
                        key={t.id} 
                        onClick={() => setSelectedTransaction(t)}
                        className="px-6 py-5 hover:bg-indigo-50/30 transition-all flex items-center gap-5 cursor-pointer group relative overflow-hidden select-none active:scale-[0.99]"
                      >
                        {/* Hover accent */}
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 scale-y-0 group-hover:scale-y-100 transition-transform origin-top duration-300"></div>

                        <div className={cn(
                          "w-14 h-14 rounded-2xl shrink-0 flex items-center justify-center transition-all group-hover:scale-110 group-hover:rotate-3 shadow-sm",
                          t.type === 'income' 
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                            : "bg-rose-50 text-rose-600 border border-rose-100"
                        )}>
                          {t.type === 'income' ? <ArrowUpRight size={24} strokeWidth={2.5} /> : <ArrowDownLeft size={24} strokeWidth={2.5} />}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex flex-col">
                              <p className="font-extrabold text-gray-900 tracking-tight text-base group-hover:text-indigo-600 transition-colors">{t.category}</p>
                              {t.description && (
                                <p className="text-xs text-gray-500 font-medium mt-0.5 line-clamp-1">
                                  {t.description}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col items-end">
                              <p className={cn(
                                "font-black text-lg tracking-tighter leading-none mb-1",
                                t.type === 'income' ? "text-emerald-600" : "text-rose-600"
                              )}>
                                {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                              </p>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] font-black text-gray-300 uppercase tracking-tighter">IDR</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 py-1.5 px-3 bg-gray-50 rounded-xl border border-gray-100 group-hover:bg-white group-hover:border-gray-200 transition-all">
                              <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-indigo-500 shadow-sm border border-indigo-50">
                                <User size={10} strokeWidth={3} />
                              </div>
                              <span className="text-[11px] font-bold text-gray-700">
                                {t.userName || 'Pengurus'}
                              </span>
                              {(t.userTitle || memberTitles?.[t.userId]) && (
                                <span className="text-[9px] font-black text-white bg-indigo-500 px-2 py-0.5 rounded-md uppercase tracking-[0.05em] ml-0.5">
                                  {t.userTitle || memberTitles?.[t.userId]}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-20 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-4 border border-gray-100">
                <Search size={40} strokeWidth={1} />
              </div>
              <p className="text-gray-900 font-bold mb-1">Transaksi Tidak Ditemukan</p>
              <p className="text-sm text-gray-500">Coba ubah kata kunci atau bersihkan filter pencarian.</p>
              <button 
                onClick={handleResetAll}
                className="mt-6 text-xs font-black text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-6 py-2.5 rounded-2xl uppercase tracking-widest transition-all"
              >
                Reset Filter
              </button>
            </div>
          )}
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
