import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/src/lib/utils';
import { TrendingUp, TrendingDown, Wallet, Download, Eye } from 'lucide-react';
import { generateMonthlyReport } from '@/src/lib/pdfGenerator';
import ReportPreview from './ReportPreview';

interface DashboardProps {
  transactions: any[];
}

export default function Dashboard({ transactions }: DashboardProps) {
  const [showPreview, setShowPreview] = useState(false);
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const balance = totalIncome - totalExpense;

  // Prepare chart data (last 7 months or days)
  const chartData = transactions
    .slice()
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .reduce((acc: any[], curr) => {
      const date = new Date(curr.date).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' });
      const last = acc[acc.length - 1];
      const amount = curr.type === 'income' ? curr.amount : -curr.amount;
      
      if (last && last.date === date) {
        last.balance += amount;
      } else {
        const prevBalance = last ? last.balance : 0;
        acc.push({ date, balance: prevBalance + amount });
      }
      return acc;
    }, [])
    .slice(-10);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <Wallet size={24} />
            </div>
            <span className="text-sm font-medium text-gray-500">Saldo Kas RT</span>
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
          <h3 className="text-lg font-bold text-gray-900">Tren Saldo Kas</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setShowPreview(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold hover:bg-indigo-100 transition-all text-sm"
            >
              <Eye size={18} />
              Pratinjau
            </button>
            <button
              onClick={() => generateMonthlyReport(transactions)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all text-sm"
            >
              <Download size={18} />
              Ekspor PDF
            </button>
          </div>
        </div>
        <div className="h-[300px] w-full">
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
        </div>
      </div>

      {showPreview && (
        <ReportPreview 
          transactions={transactions} 
          onClose={() => setShowPreview(false)} 
        />
      )}
    </div>
  );
}
