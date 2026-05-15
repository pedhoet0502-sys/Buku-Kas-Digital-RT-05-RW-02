import React, { useState } from 'react';
import { formatCurrency } from '@/src/lib/utils';
import { X, Calendar, Info, User, TrendingUp, TrendingDown, Edit2, Save, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '@/src/lib/firebase';
import { handleFirestoreError, OperationType } from '@/src/lib/firestoreErrorHandler';
import { cn } from '@/src/lib/utils';

interface TransactionDetailProps {
  transaction: any;
  onClose: () => void;
  customCategories?: { income: string[], expense: string[] };
  currentCommunityId?: string | null;
  currentRole?: 'admin' | 'viewer' | null;
  memberTitles?: {[key: string]: string};
}

import ConfirmModal from './ConfirmModal';

export default function TransactionDetail({ transaction, onClose, customCategories, currentCommunityId, currentRole, memberTitles }: TransactionDetailProps) {
  const categories = customCategories || {
    income: ['Iuran Bulanan', 'Donasi', 'Bunga Bank', 'Lainnya'],
    expense: ['Kebersihan', 'Keamanan', 'Listrik & Air', 'Perbaikan', 'Acara RT', 'Lainnya'],
  };
  const [isEditing, setIsEditing] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Edit states
  const [type, setType] = useState<'income' | 'expense'>(transaction.type);
  const [amount, setAmount] = useState(transaction.amount.toString());
  const [category, setCategory] = useState(transaction.category);
  const [date, setDate] = useState(new Date(transaction.date).toISOString().split('T')[0]);
  const [description, setDescription] = useState(transaction.description);

  if (!transaction) return null;

  const canEdit = currentRole === 'admin';

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !canEdit) return;

    setLoading(true);
    try {
      const transactionRef = doc(db, 'transactions', transaction.id);
      try {
        await updateDoc(transactionRef, {
          amount: Number(amount),
          type,
          category,
          description,
          date: new Date(date).toISOString(),
        });
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `transactions/${transaction.id}`);
      }
      setIsEditing(false);
    } catch (error) {
      console.error('Update Error:', error);
      alert('Gagal memperbarui transaksi.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!auth.currentUser || !canEdit) return;

    setLoading(true);
    try {
      try {
        await deleteDoc(doc(db, 'transactions', transaction.id));
      } catch (e) {
        handleFirestoreError(e, OperationType.DELETE, `transactions/${transaction.id}`);
      }
      onClose();
    } catch (error) {
      console.error('Delete Error:', error);
      alert('Gagal menghapus transaksi.');
    } finally {
      setLoading(false);
      setShowConfirmDelete(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <ConfirmModal 
        isOpen={showConfirmDelete}
        onClose={() => setShowConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Hapus Transaksi?"
        message="Tindakan ini tidak dapat dibatalkan. Riwayat saldo akan disesuaikan secara otomatis."
        loading={loading}
      />
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 flex justify-between items-center border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">
            {isEditing ? 'Ubah Transaksi' : 'Detail Transaksi'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        {isEditing ? (
          <form onSubmit={handleUpdate} className="p-6 space-y-4">
            <div className="flex p-1 bg-gray-100 rounded-lg">
              <button
                type="button"
                onClick={() => { setType('income'); setCategory(categories.income[0]); }}
                className={cn(
                  "flex-1 py-2 text-sm font-medium rounded-md transition-all",
                  type === 'income' ? "bg-white text-green-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                Pemasukan
              </button>
              <button
                type="button"
                onClick={() => { setType('expense'); setCategory(categories.expense[0]); }}
                className={cn(
                  "flex-1 py-2 text-sm font-medium rounded-md transition-all",
                  type === 'expense' ? "bg-white text-red-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                Pengeluaran
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nominal (Rp)</label>
              <input
                type="number"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                {categories[type].map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-20 resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-[2] py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                {loading ? 'Menyimpan...' : <><Save size={18} /> Simpan Perubahan</>}
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="p-6 space-y-6">
              <div className="text-center pb-6 border-b border-gray-100">
                <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4 ${
                  transaction.type === 'income' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                }`}>
                  {transaction.type === 'income' ? <TrendingUp size={32} /> : <TrendingDown size={32} />}
                </div>
                <p className={`text-3xl font-black ${
                  transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                </p>
                <p className="text-gray-500 font-medium mt-1">{transaction.category}</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-gray-50 text-gray-400 rounded-lg">
                    <Calendar size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-0.5">Tanggal</p>
                    <p className="text-gray-900 font-semibold">
                      {format(new Date(transaction.date), 'EEEE, dd MMMM yyyy', { locale: id })}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-2 bg-gray-50 text-gray-400 rounded-lg">
                    <Info size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-0.5">Keterangan</p>
                    <p className="text-gray-900 font-semibold leading-relaxed">
                      {transaction.description || '-'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-2 bg-gray-50 text-gray-400 rounded-lg">
                    <User size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-0.5">Dicatat Oleh</p>
                    <p className="text-gray-900 font-semibold flex items-center gap-2">
                      {transaction.userName || 'Pengurus Digital'}
                      {(transaction.userTitle || memberTitles?.[transaction.userId]) && (
                        <span className="text-[10px] font-black text-white bg-indigo-600 px-2.5 py-1 rounded-lg uppercase tracking-wider shadow-sm shadow-indigo-100">
                          {transaction.userTitle || memberTitles?.[transaction.userId]}
                        </span>
                      )}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      ID: {transaction.userId.substring(0, 8)}...
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      Dibuat pada: {format(new Date(transaction.createdAt?.toDate?.() || transaction.createdAt), 'dd MMMM yyyy, HH:mm', { locale: id })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-50 flex gap-3">
              {canEdit && (
                <>
                  <button
                    onClick={() => setShowConfirmDelete(true)}
                    disabled={loading}
                    className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all flex items-center justify-center"
                    title="Hapus"
                  >
                    <Trash2 size={20} />
                  </button>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex-1 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-100 transition-all flex items-center justify-center gap-2"
                  >
                    <Edit2 size={18} /> Edit
                  </button>
                </>
              )}
              {!canEdit && (
                <button
                  onClick={onClose}
                  className="flex-1 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-100 transition-all"
                >
                  Tutup
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
