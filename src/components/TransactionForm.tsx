import React, { useState } from 'react';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/src/lib/firebase';
import { handleFirestoreError, OperationType } from '@/src/lib/firestoreErrorHandler';
import { cn, formatNumber } from '@/src/lib/utils';
import { Plus, X, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface TransactionFormProps {
  onClose: () => void;
  customCategories?: { income: string[], expense: string[] };
  communityId?: string | null;
  userTitle?: string | null;
}

export default function TransactionForm({ onClose, customCategories, communityId, userTitle }: TransactionFormProps) {
  const categories = customCategories || {
    income: ['Iuran Bulanan', 'Donasi', 'Bunga Bank', 'Lainnya'],
    expense: ['Kebersihan', 'Keamanan', 'Listrik & Air', 'Perbaikan', 'Acara RT', 'Lainnya'],
  };
  const [type, setType] = useState<'income' | 'expense'>('income');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(categories.income[0] || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChangeAmount = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove all non-digits
    const value = e.target.value.replace(/\D/g, '');
    setAmount(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    setLoading(true);
    const path = 'transactions';
    try {
      const transactionId = crypto.randomUUID();
      const transactionData = {
        amount: Number(amount),
        type,
        category,
        description,
        date: new Date(date).toISOString(),
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || auth.currentUser.email || 'Pengurus',
        userTitle: userTitle || null,
        communityId: communityId || null,
        createdAt: serverTimestamp(),
      };

      try {
        await setDoc(doc(db, path, transactionId), transactionData);
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `${path}/${transactionId}`);
      }
      onClose();
    } catch (error) {
      console.error('Submit Error:', error);
      alert('Gagal menyimpan transaksi. Pastikan data benar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 flex justify-between items-center border-bottom border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Catat Transaksi</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex p-1 bg-gray-100 rounded-lg">
            <button
              type="button"
              onClick={() => { setType('income'); setCategory(categories.income[0] || ''); }}
              className={cn(
                "flex-1 py-2 text-sm font-black uppercase tracking-widest rounded-md transition-all",
                type === 'income' ? "bg-white text-green-600 shadow-sm" : "text-gray-400 hover:text-green-500"
              )}
            >
              Pemasukan
            </button>
            <button
              type="button"
              onClick={() => { setType('expense'); setCategory(categories.expense[0] || ''); }}
              className={cn(
                "flex-1 py-2 text-sm font-black uppercase tracking-widest rounded-md transition-all",
                type === 'expense' ? "bg-white text-red-600 shadow-sm" : "text-gray-400 hover:text-red-500"
              )}
            >
              Pengeluaran
            </button>
          </div>

          <div>
            <label className={cn(
              "block text-[10px] font-black uppercase tracking-widest mb-1 ml-1",
              type === 'income' ? "text-green-600" : "text-red-600"
            )}>Nominal (Rp)</label>
            <div className="relative">
              <input
                type="text"
                required
                value={amount ? formatNumber(Number(amount)) : ''}
                onChange={handleChangeAmount}
                placeholder="0"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-mono font-bold text-lg tracking-tighter"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 text-xs font-bold pointer-events-none">
                IDR
              </div>
            </div>
          </div>

          <div>
            <label className={cn(
              "block text-[10px] font-black uppercase tracking-widest mb-1 ml-1",
              type === 'income' ? "text-green-600" : "text-red-600"
            )}>Kategori</label>
            {categories[type].length > 0 ? (
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              >
                {categories[type].map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            ) : (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-amber-700">
                  Belum ada kategori {type === 'income' ? 'pemasukan' : 'pengeluaran'}. 
                  Silakan buat kategori di menu <strong>Pengaturan</strong> terlebih dahulu.
                </p>
              </div>
            )}
          </div>

          <div>
            <label className={cn(
              "block text-[10px] font-black uppercase tracking-widest mb-1 ml-1",
              type === 'income' ? "text-green-600" : "text-red-600"
            )}>Tanggal</label>
            <div className="relative">
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all opacity-0 absolute inset-0 z-10 cursor-pointer"
              />
              <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white flex justify-between items-center pointer-events-none">
                <span className="text-gray-900 font-medium">
                  {date ? format(new Date(date), 'dd-MM-yyyy') : 'Pilih Tanggal'}
                </span>
                <Calendar size={18} className="text-gray-400" />
              </div>
            </div>
          </div>

          <div>
            <label className={cn(
              "block text-[10px] font-black uppercase tracking-widest mb-1 ml-1",
              type === 'income' ? "text-green-600" : "text-red-600"
            )}>Keterangan</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Misal: Iuran bulanan Bp. Ahmad"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none h-20"
            />
          </div>

          <button
            type="submit"
            disabled={loading || categories[type].length === 0}
            className={cn(
              "w-full py-3 rounded-xl font-bold text-white transition-all shadow-lg active:scale-[0.98]",
              type === 'income' ? "bg-green-600 hover:bg-green-700 shadow-green-200" : "bg-red-600 hover:bg-red-700 shadow-red-200",
              (loading || categories[type].length === 0) && "opacity-50 cursor-not-allowed"
            )}
          >
            {loading ? 'Menyimpan...' : 'Simpan Transaksi'}
          </button>
        </form>
      </div>
    </div>
  );
}
