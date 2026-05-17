import React, { useState } from 'react';
import { formatCurrency } from '@/src/lib/utils';
import { 
  X, 
  Calendar, 
  Info, 
  User, 
  TrendingUp, 
  TrendingDown, 
  Edit2, 
  Save, 
  Trash2,
  Clock,
  Fingerprint,
  FileText,
  ChevronRight,
  CalendarClock
} from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '@/src/lib/firebase';
import { handleFirestoreError, OperationType } from '@/src/lib/firestoreErrorHandler';
import { cn, formatNumber } from '@/src/lib/utils';
import ConfirmModal from './ConfirmModal';

interface TransactionDetailProps {
  transaction: any;
  onClose: () => void;
  customCategories?: { income: string[], expense: string[] };
  currentCommunityId?: string | null;
  currentRole?: 'admin' | 'viewer' | null;
  memberTitles?: {[key: string]: string};
}

export default function TransactionDetail({ transaction, onClose, customCategories, currentCommunityId, currentRole, memberTitles }: TransactionDetailProps) {
  const categories = customCategories || {
    income: ['Iuran Bulanan', 'Donasi', 'Bunga Bank', 'Lainnya'],
    expense: ['Kebersihan', 'Keamanan', 'Listrik & Air', 'Perbaikan', 'Acara RT', 'Lainnya'],
  };
  const [isEditing, setIsEditing] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showConfirmUpdate, setShowConfirmUpdate] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Edit states
  const [type, setType] = useState<'income' | 'expense'>(transaction.type);
  const [amount, setAmount] = useState(transaction.amount.toString());
  const [category, setCategory] = useState(transaction.category);
  const [date, setDate] = useState(new Date(transaction.date).toISOString().split('T')[0]);
  const [description, setDescription] = useState(transaction.description);

  if (!transaction) return null;

  const canEdit = currentRole === 'admin';
  
  const handleChangeAmount = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    setAmount(value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirmUpdate(true);
  };

  const handleUpdate = async () => {
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
      setShowConfirmUpdate(false);
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <ConfirmModal 
        isOpen={showConfirmDelete}
        onClose={() => setShowConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Hapus Transaksi?"
        message="Anda yakin ingin menghapus catatan transaksi ini? Saldo akan dihitung ulang secara otomatis."
        loading={loading}
      />
      <ConfirmModal 
        isOpen={showConfirmUpdate}
        onClose={() => setShowConfirmUpdate(false)}
        onConfirm={handleUpdate}
        title="Simpan Perubahan?"
        message="Apakah data yang Anda masukkan sudah benar?"
        loading={loading}
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 100 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
      >
        <div className="p-6 flex justify-between items-center border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-xl font-black text-gray-900">
            {isEditing ? 'Ubah Transaksi' : 'Detail Transaksi'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-xl transition-all">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto relative z-10">
          {isEditing ? (
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="flex p-1 bg-gray-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => { setType('income'); setCategory(categories.income[0]); }}
                  className={cn(
                    "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                    type === 'income' ? "bg-white text-green-600 shadow-sm" : "text-gray-500"
                  )}
                >
                  Pemasukan
                </button>
                <button
                  type="button"
                  onClick={() => { setType('expense'); setCategory(categories.expense[0]); }}
                  className={cn(
                    "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                    type === 'expense' ? "bg-white text-red-600 shadow-sm" : "text-gray-500"
                  )}
                >
                  Pengeluaran
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 ml-1">Jumlah (Rp)</label>
                  <input
                    type="text"
                    required
                    value={amount ? formatNumber(Number(amount)) : ''}
                    onChange={handleChangeAmount}
                    placeholder="0"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 text-lg font-bold text-gray-900 outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 ml-1">Kategori</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm font-medium text-gray-900 outline-none transition-all cursor-pointer"
                  >
                    {categories[type].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 ml-1">Tanggal</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm font-medium text-gray-900 outline-none transition-all cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 ml-1">Keterangan</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm font-medium text-gray-900 outline-none transition-all h-24 resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-[2] py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? 'Menyimpan...' : <><Save size={18} /> Simpan Perubahan</>}
                </button>
              </div>
            </form>
          ) : (
            <div className="p-6 space-y-8">
              <div className="text-center py-8 bg-gray-50 rounded-2xl border border-gray-100">
                <div className={cn(
                  "w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-4",
                  transaction.type === 'income' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                )}>
                  {transaction.type === 'income' ? <TrendingUp size={28} /> : <TrendingDown size={28} />}
                </div>
                <p className={cn(
                  "text-3xl font-black mb-1",
                  transaction.type === 'income' ? "text-green-600" : "text-red-600"
                )}>
                  {formatCurrency(transaction.amount)}
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-gray-100 rounded-full">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    transaction.type === 'income' ? "bg-green-500" : "bg-red-500"
                  )} />
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                    {transaction.type === 'income' ? 'Pemasukan' : 'Pengeluaran'} • {transaction.category}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 shrink-0">
                      <Calendar size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Tanggal Transaksi</p>
                      <p className="text-gray-900 font-bold">
                        {format(new Date(transaction.date), 'EEEE, dd MMMM yyyy', { locale: id })}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 shrink-0">
                      <Info size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Keterangan</p>
                      <p className="text-gray-700 font-medium text-sm">
                        {transaction.description || '-'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 shrink-0">
                      <User size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Dicatat Oleh</p>
                      <div className="flex items-center gap-2">
                        <p className="text-gray-900 font-bold">
                          {transaction.userName || 'Sistem'}
                        </p>
                        {(transaction.userTitle || memberTitles?.[transaction.userId]) && (
                          <span className="text-[9px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded font-black uppercase tracking-wide">
                            {transaction.userTitle || memberTitles?.[transaction.userId]}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 shrink-0">
                      <Clock size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Waktu Input</p>
                      <p className="text-gray-900 font-bold">
                        {transaction.createdAt 
                          ? format(new Date(transaction.createdAt?.toDate?.() || transaction.createdAt), 'dd MMM yyyy, HH:mm', { locale: id })
                          : '-'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-gray-50 flex items-center justify-end gap-3 border-t border-gray-100">
          {canEdit && !isEditing && (
            <>
              <button
                onClick={() => setShowConfirmDelete(true)}
                disabled={loading}
                className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                title="Hapus"
              >
                <Trash2 size={24} />
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="p-3 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                title="Ubah"
              >
                <Edit2 size={24} />
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
