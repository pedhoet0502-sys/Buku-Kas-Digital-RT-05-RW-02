import React, { useState } from 'react';
import { formatCurrency } from '@/src/lib/utils';
import { ArrowUpRight, ArrowDownLeft, Calendar, Tag, Search } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import TransactionDetail from './TransactionDetail';

interface TransactionListProps {
  transactions: any[];
  customCategories?: { income: string[], expense: string[] };
  currentCommunityId?: string | null;
  currentRole?: 'admin' | 'viewer' | null;
}

export default function TransactionList({ transactions, customCategories, currentCommunityId, currentRole }: TransactionListProps) {
  const [selectedTransaction, setSelectedTransaction] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTransactions = transactions.filter(t => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (t.category?.toLowerCase() || '').includes(searchLower) ||
      (t.description?.toLowerCase() || '').includes(searchLower)
    );
  });

  const sortedTransactions = [...filteredTransactions].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

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
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-lg font-bold text-gray-900">Riwayat Transaksi</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Cari kategori atau deskripsi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full md:w-64 pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
            />
          </div>
        </div>
        <div className="divide-y divide-gray-50">
          {sortedTransactions.length > 0 ? (
            sortedTransactions.map((t) => (
              <div 
                key={t.id} 
                onClick={() => setSelectedTransaction(t)}
                className="p-4 hover:bg-gray-50 transition-colors flex items-center gap-4 cursor-pointer group"
              >
                <div className={cn(
                  "p-3 rounded-xl shrink-0 group-hover:scale-110 transition-transform",
                  t.type === 'income' ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                )}>
                  {t.type === 'income' ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-bold text-gray-900 truncate">{t.category}</p>
                    <p className={cn(
                      "font-bold shrink-0",
                      t.type === 'income' ? "text-green-600" : "text-red-600"
                    )}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount).replace('Rp', '').trim()}
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap gap-y-1 gap-x-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {format(new Date(t.date), 'dd MMMM yyyy', { locale: id })}
                    </span>
                    {t.description && (
                      <span className="truncate max-w-[200px] italic">
                        {t.description}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center text-gray-500">
              <p>Tidak ada transaksi yang sesuai dengan pencarian Anda.</p>
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
        />
      )}
    </>
  );
}

// Helper to use cn in this file since it's common
function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
