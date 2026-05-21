import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/src/lib/utils';
import { TrendingUp, TrendingDown, Wallet, Calendar, Filter, ChevronDown, RotateCcw, Sliders } from 'lucide-react';

import { cn } from '../lib/utils';

interface DashboardProps {
  transactions: any[];
  communityData: any;
  isScrolling?: boolean;
  onViewLaporan?: () => void;
}

export default function Dashboard({ transactions, communityData, isScrolling, onViewLaporan }: DashboardProps) {
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all');
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

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

  const previousBalance = transactions
    .filter(t => {
      const d = new Date(t.date);
      if (selectedYear === 'all') return false;
      if (d.getFullYear() < selectedYear) return true;
      if (d.getFullYear() === selectedYear && selectedMonth !== 'all' && d.getMonth() < selectedMonth) return true;
      return false;
    })
    .reduce((acc, curr) => acc + (curr.type === 'income' ? curr.amount : -curr.amount), 0);

  const currentPeriodBalance = totalIncome - totalExpense;
  const totalBalance = previousBalance + currentPeriodBalance;

  // Prepare chart data starting with previous balance if filter is active
  const chartData = filteredTransactions
    .slice()
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .reduce((acc: any[], curr) => {
      const date = new Date(curr.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      const last = acc[acc.length - 1];
      const amount = curr.type === 'income' ? curr.amount : -curr.amount;
      
      if (last && last.date === date) {
        last.balance += amount;
      } else {
        const baseBalance = last ? last.balance : previousBalance;
        acc.push({ date, balance: baseBalance + amount });
      }
      return acc;
    }, []);

  const periodTitle = selectedMonth === 'all' && selectedYear === 'all' 
    ? 'Semua Periode'
    : `${selectedMonth !== 'all' ? months[selectedMonth] : ''} ${selectedYear !== 'all' ? selectedYear : ''}`.trim();

  return (
    <div className="space-y-8 max-w-full mx-auto pb-32">
      {/* Filters - Sticky under viewport when global header scrolls up */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md px-6 py-6 md:px-8 border-b border-gray-100 shadow-[0_4px_20px_rgba(15,23,42,0.02)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 max-w-full mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
              <Sliders size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 leading-none">Laporan Kas</h2>
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
                <option value="all">Bulan</option>
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
                <option value="all">Tahun</option>
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={12} strokeWidth={1.5} />
            </div>

            <button 
              onClick={() => {
                setSelectedMonth('all');
                setSelectedYear('all');
              }}
              className="p-2.5 bg-white border border-gray-200 text-slate-400 hover:text-blue-600 rounded-xl transition-all active:scale-95 shadow-sm"
              title="Reset Filter"
            >
              <RotateCcw size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area with horizontal padding */}
      <div className="px-6 md:px-8 space-y-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-6">
          <div className="p-4 bg-indigo-50 text-indigo-600 rounded-xl">
            <Wallet size={24} />
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-500 font-medium">Saldo Kas</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(totalBalance)}
            </p>
            {(selectedMonth !== 'all' || selectedYear !== 'all') && (
              <p className="text-sm text-indigo-600 mt-1 font-semibold">
                Saldo sebelumnya: {formatCurrency(previousBalance)}
              </p>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-6">
          <div className="p-4 bg-green-50 text-green-600 rounded-xl">
            <TrendingUp size={24} />
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-500 font-medium">Pemasukan</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(totalIncome)}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-6">
          <div className="p-4 bg-red-50 text-red-600 rounded-xl">
            <TrendingDown size={24} />
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-500 font-medium">Pengeluaran</p>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(totalExpense)}
            </p>
          </div>
        </div>
      </div>

        {/* Chart Section */}
        <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-gray-900">Grafik Saldo</h3>
          {onViewLaporan && (
            <button 
              onClick={onViewLaporan}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1 active:scale-95 duration-150 cursor-pointer"
            >
              Selengkapnya <span className="translate-y-[-0.5px] font-black font-sans">&gt;</span>
            </button>
          )}
        </div>
        <div className="h-[300px] w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  dy={10}
                />
                <YAxis 
                  hide 
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' 
                  }}
                  formatter={(value: number) => [formatCurrency(value), 'Saldo']}
                />
                <Area 
                  type="monotone" 
                  dataKey="balance" 
                  stroke="#4f46e5" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorBalance)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 font-medium">
              Belum ada data transaksi untuk filter ini
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
  );
}
