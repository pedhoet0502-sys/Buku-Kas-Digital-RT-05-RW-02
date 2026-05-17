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
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <ConfirmModal 
        isOpen={showConfirmDelete}
        onClose={() => setShowConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Konfirmasi Penghapusan?"
        message="Data ini akan dihapus secara permanen dari server Cloud RT Digital. Seluruh log transaksi terkait akan disesuaikan secara real-time."
        loading={loading}
      />
      <ConfirmModal 
        isOpen={showConfirmUpdate}
        onClose={() => setShowConfirmUpdate(false)}
        onConfirm={handleUpdate}
        title="Simpan Perubahan?"
        message="Apakah Anda yakin ingin memperbarui data transaksi ini? Perubahan akan langsung tercermin pada laporan keuangan komunitas."
        loading={loading}
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 100 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-t-[3rem] sm:rounded-[3rem] w-full max-w-2xl shadow-2xl overflow-hidden border-t sm:border border-slate-100 flex flex-col max-h-[90vh]"
      >
        <div className="p-10 flex justify-between items-start border-b border-slate-50 bg-slate-50/30">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-lg shadow-indigo-200"></div>
              <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none">Dokumen Transaksi</h5>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {isEditing ? 'Revisi Transaksi' : 'Detail Transaksi'}
            </h2>
          </div>
          <motion.button 
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-900 p-3 hover:bg-slate-100/50 rounded-2xl transition-all"
          >
            <X size={28} />
          </motion.button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isEditing ? (
            <form onSubmit={handleSubmit} className="p-10 space-y-8">
              <div className="grid grid-cols-2 p-2 bg-slate-100 rounded-3xl gap-2">
                <button
                  type="button"
                  onClick={() => { setType('income'); setCategory(categories.income[0]); }}
                  className={cn(
                    "py-4 text-xs font-black uppercase tracking-widest rounded-2xl transition-all",
                    type === 'income' ? "bg-white text-emerald-600 shadow-xl" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  Pemasukan
                </button>
                <button
                  type="button"
                  onClick={() => { setType('expense'); setCategory(categories.expense[0]); }}
                  className={cn(
                    "py-4 text-xs font-black uppercase tracking-widest rounded-2xl transition-all",
                    type === 'expense' ? "bg-white text-rose-600 shadow-xl" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  Pengeluaran
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Nominal Transaksi (IDR)</label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={amount ? formatNumber(Number(amount)) : ''}
                        onChange={handleChangeAmount}
                        placeholder="0"
                        className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-50 rounded-[2rem] focus:ring-4 focus:ring-indigo-500/5 focus:bg-white focus:border-indigo-100 text-2xl font-mono font-bold text-slate-900 outline-none transition-all tracking-tighter"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Kategorisasi</label>
                    <div className="relative">
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-50 rounded-[2rem] focus:ring-4 focus:ring-indigo-500/5 focus:bg-white focus:border-indigo-100 text-sm font-black text-slate-900 outline-none transition-all appearance-none"
                      >
                        {categories[type].map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                      <ChevronRight className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-300 rotate-90 pointer-events-none" size={18} />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Hari, tanggal</label>
                    <div className="relative group">
                      <input
                        type="date"
                        required
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-50 rounded-[2rem] focus:ring-4 focus:ring-indigo-500/5 focus:bg-white focus:border-indigo-100 text-sm font-black text-slate-900 outline-none transition-all uppercase tracking-[0.2em] opacity-0 absolute inset-0 z-10 cursor-pointer"
                      />
                      <div className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-50 rounded-[2rem] flex justify-between items-center pointer-events-none group-focus-within:border-indigo-100 group-focus-within:ring-4 group-focus-within:ring-indigo-500/5 transition-all">
                        <span className="text-sm font-black text-slate-900 uppercase tracking-[0.2em]">
                          {date ? format(new Date(date), 'dd-MM-yyyy') : 'Pilih Tanggal'}
                        </span>
                        <Calendar size={18} className="text-slate-400" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Uraian transaksi</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Detail penggunaan dana..."
                      className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-50 rounded-[2rem] focus:ring-4 focus:ring-indigo-500/5 focus:bg-white focus:border-indigo-100 text-sm font-bold text-slate-700 outline-none transition-all h-[120px] resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-6">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-5 bg-slate-100 text-slate-600 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Batalkan Revisi
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="flex-[2] py-5 bg-slate-900 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {loading ? 'Processing Node...' : <><Save size={18} /> Simpan Perubahan</>}
                </motion.button>
              </div>
            </form>
          ) : (
            <div className="p-10 space-y-12">
              <div className="text-center py-12 bg-slate-50 rounded-[3rem] border border-slate-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] rotate-12">
                  <FileText size={160} />
                </div>
                
                <div className={cn(
                  "w-14 h-14 rounded-[1.5rem] mx-auto flex items-center justify-center mb-4 shadow-xl",
                  transaction.type === 'income' 
                    ? "bg-emerald-500 text-white shadow-emerald-200" 
                    : "bg-rose-500 text-white shadow-rose-200"
                )}>
                  {transaction.type === 'income' ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                </div>
                
                <p className={cn(
                  "text-3xl sm:text-4xl font-mono font-bold tracking-tighter mb-2",
                  transaction.type === 'income' ? "text-emerald-600" : "text-rose-600"
                )}>
                  {formatCurrency(transaction.amount)}
                </p>
                <div className="inline-flex items-center gap-3 px-6 py-2 bg-white rounded-full shadow-sm border border-slate-100">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    transaction.type === 'income' ? "bg-emerald-500" : "bg-rose-500"
                  )} />
                  <span className={cn(
                    "text-xs font-black uppercase tracking-widest",
                    transaction.type === 'income' ? "text-emerald-600" : "text-rose-600"
                  )}>
                    {transaction.type === 'income' ? 'Pemasukan' : 'Pengeluaran'} • {transaction.category}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-8">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 border border-slate-100 shrink-0">
                      <Calendar size={20} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Hari, tanggal</p>
                      <p className="text-slate-900 font-semibold text-base tracking-tight">
                        {format(new Date(transaction.date), 'EEEE, dd MMMM yyyy', { locale: id })}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] font-medium text-slate-400 uppercase tracking-widest">
                        <Clock size={10} />
                        {transaction.createdAt ? format(new Date(transaction.createdAt?.toDate?.() || transaction.createdAt), 'HH:mm:ss') : '--:--:--'}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 border border-slate-100 shrink-0">
                      <Info size={20} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Uraian transaksi</p>
                      <p className="text-slate-700 font-medium text-sm leading-relaxed italic pr-4">
                        "{transaction.description || 'Tidak ada uraian transaksi.'}"
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 border border-slate-100 shrink-0">
                      <Fingerprint size={20} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Identitas Operator</p>
                      <div className="flex items-center gap-3">
                        <p className="text-slate-900 font-semibold text-base tracking-tight">
                          {transaction.userName || 'Root Admin'}
                        </p>
                        {(transaction.userTitle || memberTitles?.[transaction.userId]) && (
                          <span className="text-[8px] font-bold text-white bg-slate-900 px-2 py-0.5 rounded-md uppercase tracking-widest">
                            {transaction.userTitle || memberTitles?.[transaction.userId]}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 border border-slate-100 shrink-0">
                      <CalendarClock size={20} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Data Entry</p>
                      <p className="text-slate-900 font-semibold text-base tracking-tight">
                        {transaction.createdAt 
                          ? format(new Date(transaction.createdAt?.toDate?.() || transaction.createdAt), 'EEEE, dd MMMM yyyy • HH:mm', { locale: id })
                          : 'Waktu input tidak tercatat'}
                      </p>
                    </div>
                  </div>


                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-8 sm:p-10 bg-white flex items-center justify-center gap-6 border-t border-slate-50">
          {canEdit && !isEditing && (
            <>
              <motion.button
                whileHover={{ scale: 1.1, backgroundColor: '#fff1f2' }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowConfirmDelete(true)}
                disabled={loading}
                title="Hapus Transaksi"
                className="w-16 h-16 bg-rose-50/50 text-rose-500 rounded-2xl flex items-center justify-center transition-all border border-rose-100 shadow-sm"
              >
                <Trash2 size={24} />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1, backgroundColor: '#eef2ff' }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsEditing(true)}
                title="Revisi Data"
                className="w-16 h-16 bg-indigo-50/50 text-indigo-600 rounded-2xl flex items-center justify-center transition-all border border-indigo-100 shadow-sm"
              >
                <Edit2 size={24} />
              </motion.button>
            </>
          )}
          {!isEditing && (
            <motion.button
              whileHover={{ scale: 1.1, backgroundColor: '#f8fafc' }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              title="Tutup"
              className="w-16 h-16 bg-slate-50/50 text-slate-500 rounded-2xl flex items-center justify-center transition-all border border-slate-100 shadow-sm"
            >
              <X size={24} />
            </motion.button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
