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
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Laporan Kas</h2>
              <p className="text-sm text-gray-500 font-medium">{periodTitle}</p>
            </div>
            <button 
              onClick={() => {
                setSelectedMonth('all');
                setSelectedYear('all');
              }}
              className="p-2.5 bg-gray-50 border border-gray-100 text-blue-600 hover:bg-blue-50 rounded-xl transition-all active:scale-95"
              title="Reset Filter"
            >
              <RotateCcw size={20} />
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="relative group">
              <select 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                className="w-full pl-4 pr-10 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-900 appearance-none outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/30 transition-all cursor-pointer"
              >
                <option value="all">Pilih Bulan</option>
                {months.map((m, i) => (
                  <option key={m} value={i}>{m}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
            </div>

            <div className="relative group">
              <select 
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                className="w-full pl-4 pr-10 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-900 appearance-none outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/30 transition-all cursor-pointer"
              >
                <option value="all">Pilih Tahun</option>
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
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

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-4 bg-green-50 text-green-600 rounded-xl">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Pemasukan</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(totalIncome)}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-4 bg-red-50 text-red-600 rounded-xl">
            <TrendingDown size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Pengeluaran</p>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(totalExpense)}
            </p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Grafik Saldo</h3>
          </div>
          <div className="flex flex-row gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowPreview(true)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all shadow-sm"
            >
              <Eye size={18} />
              <span className="whitespace-nowrap">Pratinjau</span>
            </button>
            <button
              onClick={() => generateMonthlyReport(filteredTransactions, communityData, 
                selectedMonth === 'all' || selectedYear === 'all' ? undefined : { month: selectedMonth, year: selectedYear },
                previousBalance
              )}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
            >
              <Download size={18} />
              <span className="whitespace-nowrap">Export PDF</span>
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
