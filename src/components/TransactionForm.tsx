import React, { useState } from 'react';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/src/lib/firebase';
import { handleFirestoreError, OperationType } from '@/src/lib/firestoreErrorHandler';
import { cn, formatNumber } from '@/src/lib/utils';
import { Plus, X, Calendar, NotebookPen } from 'lucide-react';
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

  const isComplete = Boolean(amount && category && date && description);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    if (!isComplete) {
      alert('Mohon lengkapi semua kolom isian (Jumlah, Kategori, Tanggal, dan Keterangan)');
      return;
    }

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
    <div className="fixed inset-0 bg-white z-[100] flex flex-col animate-in fade-in slide-in-from-bottom duration-500">
      <div className="flex-1 overflow-y-auto bg-white">
        <div className="max-w-lg mx-auto min-h-screen flex flex-col">
          <div className="pt-14 pb-8 px-6 flex justify-between items-center border-b border-gray-100 sticky top-0 bg-white/80 backdrop-blur-md z-10">
            <div className="flex items-center gap-3">
              <NotebookPen size={24} className="text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900 tracking-tight uppercase">PENCATATAN TRANSAKSI</h2>
            </div>
            <button 
              onClick={onClose} 
              className="w-10 h-10 flex items-center justify-center bg-red-500 text-white rounded-xl hover:bg-red-600 shadow-lg shadow-red-100 transition-all active:scale-95"
              title="Tutup"
            >
              <X size={22} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-8 flex-1">
            <div className="flex p-1.5 bg-gray-100 rounded-2xl">
            <button
              type="button"
              onClick={() => { setType('income'); setCategory(categories.income[0] || ''); }}
              className={cn(
                "flex-1 py-2 text-sm font-bold rounded-lg transition-all",
                type === 'income' ? "bg-white text-green-600 shadow-sm" : "text-gray-500"
              )}
            >
              Pemasukan
            </button>
            <button
              type="button"
              onClick={() => { setType('expense'); setCategory(categories.expense[0] || ''); }}
              className={cn(
                "flex-1 py-2 text-sm font-bold rounded-lg transition-all",
                type === 'expense' ? "bg-white text-red-600 shadow-sm" : "text-gray-500"
              )}
            >
              Pengeluaran
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 ml-1">Jumlah</label>
            <div className="relative">
              <input
                type="text"
                required
                value={amount ? formatNumber(Number(amount)) : ''}
                onChange={handleChangeAmount}
                placeholder="0"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-lg"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">
                Rp
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 ml-1">Kategori</label>
            {categories[type].length > 0 ? (
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
              >
                {categories[type].map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            ) : (
              <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
                <p className="text-xs text-amber-600 font-medium">Buka menu Setelan untuk menambahkan kategori baru.</p>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 ml-1">Tanggal</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 ml-1">Keterangan</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contoh: Iuran bulan Juni Pak Budi"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none h-24"
            />
          </div>

          {!isComplete && (
            <p className="text-center text-red-500 text-xs font-bold animate-in fade-in slide-in-from-top-1">
              Mohon lengkapi semua kolom isian data transaksi
            </p>
          )}

          <button
            type="submit"
            disabled={loading || categories[type].length === 0 || !isComplete}
            className={cn(
              "w-full py-4 rounded-xl font-bold text-white transition-all shadow-lg active:scale-95 mt-2",
              !isComplete 
                ? "bg-gray-300 shadow-none cursor-not-allowed" 
                : (type === 'income' ? "bg-green-600 hover:bg-green-700 shadow-green-100" : "bg-red-600 hover:bg-red-700 shadow-red-100"),
              loading && "opacity-50 cursor-not-allowed"
            )}
          >
            {loading ? 'Menyimpan...' : 'Simpan Transaksi'}
          </button>
        </form>
      </div>
    </div>
  </div>
);
}
