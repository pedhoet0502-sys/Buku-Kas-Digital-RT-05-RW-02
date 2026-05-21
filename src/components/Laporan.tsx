import React, { useState } from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { TrendingUp, TrendingDown, Wallet, Download, Eye, Calendar, RotateCcw, Sliders, FileText, ChevronDown, CheckCircle } from 'lucide-react';
import { generateMonthlyReport } from '../lib/pdfGenerator';
import ReportPreview from './ReportPreview';
import { formatCurrency } from '../lib/utils';
import { cn } from '../lib/utils';

interface LaporanProps {
  transactions: any[];
  communityData: any;
  customCategories: { income: string[], expense: string[] };
}

export default function Laporan({ transactions, communityData, customCategories }: LaporanProps) {
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number | 'all'>(new Date().getFullYear());
  const [showPreview, setShowPreview] = useState(false);

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  // Filter transactions for report
  const filteredTransactions = transactions.filter(t => {
    const d = new Date(t.date);
    const monthMatch = selectedMonth === 'all' || d.getMonth() === selectedMonth;
    const yearMatch = selectedYear === 'all' || d.getFullYear() === selectedYear;
    return monthMatch && yearMatch;
  });

  const totalIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalExpense = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((acc, curr) => acc + curr.amount, 0);

  // Calculate prior balance
  const previousBalance = transactions
    .filter(t => {
      const d = new Date(t.date);
      if (selectedYear === 'all') return false;
      if (d.getFullYear() < selectedYear) return true;
      if (d.getFullYear() === selectedYear && selectedMonth !== 'all' && d.getMonth() < selectedMonth) return true;
      return false;
    })
    .reduce((acc, curr) => acc + (curr.type === 'income' ? curr.amount : -curr.amount), 0);

  const finalBalance = previousBalance + totalIncome - totalExpense;

  // Breakdown by category
  const categorySummary = filteredTransactions.reduce((acc: { [key: string]: { amount: number, type: 'income' | 'expense' } }, t) => {
    const cat = t.category || 'Lainnya';
    if (!acc[cat]) {
      acc[cat] = { amount: 0, type: t.type };
    }
    acc[cat].amount += t.amount;
    return acc;
  }, {});

  const sortedCategories = (Object.entries(categorySummary) as [string, { amount: number, type: 'income' | 'expense' }][])
    .map(([name, data]) => ({ name, amount: data.amount, type: data.type }))
    .sort((a, b) => b.amount - a.amount);

  const periodTitle = selectedMonth === 'all' && selectedYear === 'all' 
    ? 'Semua Periode'
    : `${selectedMonth !== 'all' ? months[selectedMonth] : ''} ${selectedYear !== 'all' ? selectedYear : ''}`.trim();

  return (
    <div className="space-y-8 max-w-full mx-auto pb-32 animate-in fade-in duration-300">
      {/* Search and Period filters */}
      <div className="bg-white/95 backdrop-blur-sm px-6 py-6 md:px-8 border-b border-gray-100 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 max-w-full mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
              <Sliders size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 leading-none">Pilih Periode Laporan</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{periodTitle}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <select 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                className="pl-3.5 pr-6 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-900 appearance-none outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/30 transition-all cursor-pointer min-w-[105px]"
              >
                <option value="all">Semua Bulan</option>
                {months.map((m, i) => (
                  <option key={m} value={i}>{m}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={12} strokeWidth={1.5} />
            </div>

            <div className="relative">
              <select 
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                className="pl-3.5 pr-6 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-900 appearance-none outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/30 transition-all cursor-pointer min-w-[85px]"
              >
                <option value="all">Semua Tahun</option>
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={12} strokeWidth={1.5} />
            </div>

            <button 
              onClick={() => {
                setSelectedMonth(new Date().getMonth());
                setSelectedYear(new Date().getFullYear());
              }}
              className="p-2.5 bg-white border border-gray-200 text-slate-400 hover:text-blue-600 rounded-xl transition-all active:scale-95 shadow-sm"
              title="Reset ke Bulan Ini"
            >
              <RotateCcw size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 md:px-8 space-y-8">
        {/* Core Buttons */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl">
              <FileText size={28} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Eksport Laporan Bulanan / Tahunan</h3>
              <p className="text-xs text-gray-500 mt-0.5">Dapatkan salinan dokumen fisik resmi bertandatangan untuk rapat warga.</p>
            </div>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <button
              onClick={() => setShowPreview(true)}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-750 hover:bg-gray-200 active:scale-98 rounded-2xl font-bold text-sm transition-all shadow-sm"
            >
              <Eye size={18} />
              Pratinjau Laporan
            </button>
            <button
              onClick={() => generateMonthlyReport(filteredTransactions, communityData, 
                selectedMonth === 'all' || selectedYear === 'all' ? undefined : { month: selectedMonth, year: selectedYear },
                previousBalance
              )}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white hover:bg-indigo-700 active:scale-98 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-indigo-100"
            >
              <Download size={18} />
              Unduh PDF
            </button>
          </div>
        </div>

        {/* Highlight Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-3">Saldo Awal</span>
            <div className="flex items-baseline gap-1 mt-auto">
              <span className="text-xs font-bold text-slate-400">Rp</span>
              <span className="text-lg md:text-xl font-black text-gray-800 leading-none">{formatCurrency(previousBalance).replace('Rp', '').trim()}</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none mb-3">Total Pemasukan</span>
            <div className="flex items-baseline gap-1 mt-auto">
              <span className="text-xs font-bold text-emerald-400">Rp</span>
              <span className="text-lg md:text-xl font-black text-emerald-600 leading-none">{formatCurrency(totalIncome).replace('Rp', '').trim()}</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
            <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest leading-none mb-3">Total Pengeluaran</span>
            <div className="flex items-baseline gap-1 mt-auto">
              <span className="text-xs font-bold text-rose-400">Rp</span>
              <span className="text-lg md:text-xl font-black text-rose-600 leading-none">{formatCurrency(totalExpense).replace('Rp', '').trim()}</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between bg-gradient-to-br from-indigo-50/20 to-indigo-100/10">
            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest leading-none mb-3">Saldo Akhir</span>
            <div className="flex items-baseline gap-1 mt-auto">
              <span className="text-xs font-bold text-indigo-400">Rp</span>
              <span className="text-lg md:text-xl font-black text-indigo-700 leading-none">{formatCurrency(finalBalance).replace('Rp', '').trim()}</span>
            </div>
          </div>
        </div>

        {/* Detailed Graph / Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 lg:col-span-2 space-y-4">
            <h3 className="text-sm font-bold text-gray-900 border-b border-gray-50 pb-3 uppercase tracking-wider text-slate-400">Statistik Kategori Terbanyak</h3>
            
            {sortedCategories.length > 0 ? (
              <div className="space-y-4 pt-1">
                {sortedCategories.slice(0, 5).map((cat) => {
                  const percentage = totalIncome + totalExpense > 0 
                    ? Math.round((cat.amount / (cat.type === 'income' ? totalIncome : totalExpense)) * 100)
                    : 0;

                  return (
                    <div key={cat.name} className="flex flex-col gap-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-700">{cat.name}</span>
                        <div className="flex items-center gap-1.5">
                          <span className={cn(
                            "text-xs font-bold",
                            cat.type === 'income' ? 'text-green-600' : 'text-red-600'
                          )}>
                            {cat.type === 'income' ? '+' : '-'} {formatCurrency(cat.amount)}
                          </span>
                          <span className="text-[9px] font-black text-slate-400">({percentage}%)</span>
                        </div>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            cat.type === 'income' ? 'bg-green-500' : 'bg-red-500'
                          )}
                          style={{ width: `${Math.min(100, Math.max(8, percentage))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-20 text-center text-xs text-slate-400 font-medium">
                Belum ada rincian data transaksi untuk bulan ini.
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 space-y-4 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900 border-b border-gray-50 pb-3 uppercase tracking-wider text-slate-400">Status Kelengkapan</h3>
              <div className="space-y-4 pt-4">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                    <CheckCircle size={12} className="stroke-[3]" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-700">Tanda Tangan Ketua RT</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{communityData?.chairman ? `Aktif (${communityData.chairman})` : 'Belum diatur'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                    <CheckCircle size={12} className="stroke-[3]" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-700">Tanda Tangan Bendahara</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{communityData?.treasurer ? `Aktif (${communityData.treasurer})` : 'Belum diatur'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                    <CheckCircle size={12} className="stroke-[3]" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-700">Tercatat di Database</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{filteredTransactions.length} Transaksi terverifikasi</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-50 bg-slate-50/50 p-3.5 rounded-2xl">
              <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                Seluruh data keuangan di atas dihitung otomatis melalui sinkronisasi cloud dengan database Firebase Firestore.
              </p>
            </div>
          </div>
        </div>
      </div>

      {showPreview && (
        <ReportPreview 
          transactions={filteredTransactions} 
          communityData={communityData}
          period={selectedMonth === 'all' || selectedYear === 'all' ? undefined : { month: selectedMonth, year: selectedYear }}
          initialBalance={previousBalance}
          onClose={() => setShowPreview(false)} 
        />
      )}
    </div>
  );
}
