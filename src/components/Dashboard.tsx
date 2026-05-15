import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/src/lib/utils';
import { TrendingUp, TrendingDown, Wallet, Download, Eye, Calendar, Filter, ChevronDown, RotateCcw } from 'lucide-react';
import { generateMonthlyReport } from '@/src/lib/pdfGenerator';
import ReportPreview from './ReportPreview';

interface DashboardProps {
  transactions: any[];
  communityData: any;
}

export default function Dashboard({ transactions, communityData }: DashboardProps) {
  const [showPreview, setShowPreview] = useState(false);
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

  const balance = totalIncome - totalExpense;

  // Prepare chart data for all transactions to show overall trend, 
  // or maybe just the filtered ones? Let's show overall trend for context but highlight selected?
  // User asked for "filter per bulan Dan per tahun untuk laporan keuangan (pdf)".
  // For the dashboard itself, it's better if it shows the filtered stats.

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
        const prevBalance = last ? last.balance : 0;
        acc.push({ date, balance: prevBalance + amount });
      }
      return acc;
    }, []);

  const periodTitle = selectedMonth === 'all' && selectedYear === 'all' 
    ? 'Semua Periode'
    : `${selectedMonth !== 'all' ? months[selectedMonth] : ''} ${selectedYear !== 'all' ? selectedYear : ''}`.trim();

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100">
              <Filter size={20} />
            </div>
            <div className="space-y-0.5">
              <h2 className="text-lg font-black text-slate-900 tracking-tight">Filter Laporan</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{periodTitle}</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <div className="relative flex-1 lg:flex-none lg:min-w-[180px]">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-50 text-indigo-600 rounded-lg pointer-events-none">
                <Calendar size={14} />
              </div>
              <select 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                className="w-full pl-12 pr-10 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 appearance-none outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer"
              >
                <option value="all">Bulan</option>
                {months.map((m, i) => (
                  <option key={m} value={i}>{m}</option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <ChevronDown size={16} />
              </div>
            </div>

            <div className="relative flex-1 lg:flex-none lg:min-w-[140px]">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-50 text-indigo-600 rounded-lg pointer-events-none">
                <Calendar size={14} strokeWidth={3} />
              </div>
              <select 
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                className="w-full pl-12 pr-10 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 appearance-none outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer"
              >
                <option value="all">Tahun</option>
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <ChevronDown size={16} />
              </div>
            </div>

            <button 
              onClick={() => {
                setSelectedMonth('all');
                setSelectedYear('all');
              }}
              className="p-3 bg-slate-50 text-slate-400 border border-slate-100 rounded-2xl hover:bg-slate-100 hover:text-slate-600 transition-all group"
              title="Reset Filter"
            >
              <RotateCcw size={20} className="group-active:rotate-[-45deg] transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <Wallet size={24} />
            </div>
            <span className="text-sm font-medium text-gray-500">Saldo Periode Ini</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(balance)}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-green-50 text-green-600 rounded-xl">
              <TrendingUp size={24} />
            </div>
            <span className="text-sm font-medium text-gray-500">Total Pemasukan</span>
          </div>
          <p className="text-2xl font-bold text-green-600">+{formatCurrency(totalIncome)}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-red-50 text-red-600 rounded-xl">
              <TrendingDown size={24} />
            </div>
            <span className="text-sm font-medium text-gray-500">Total Pengeluaran</span>
          </div>
          <p className="text-2xl font-bold text-red-600">-{formatCurrency(totalExpense)}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h3 className="text-lg font-black text-slate-900 tracking-tight">Grafik {periodTitle}</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setShowPreview(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold hover:bg-indigo-100 transition-all text-sm"
            >
              <Eye size={18} />
              Pratinjau
            </button>
            <button
              onClick={() => generateMonthlyReport(filteredTransactions, communityData, 
                selectedMonth === 'all' || selectedYear === 'all' ? undefined : { month: selectedMonth, year: selectedYear }
              )}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all text-sm"
            >
              <Download size={18} />
              Ekspor PDF
            </button>
          </div>
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
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                />
                <YAxis 
                  hide 
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
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
              Tidak ada data transaksi di periode ini
            </div>
          )}
        </div>
      </div>

      {showPreview && (
        <ReportPreview 
          transactions={filteredTransactions} 
          communityData={communityData}
          period={selectedMonth === 'all' || selectedYear === 'all' ? undefined : { month: selectedMonth, year: selectedYear }}
          onClose={() => setShowPreview(false)} 
        />
      )}
    </div>
  );
}
