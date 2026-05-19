import React, { useState, useEffect } from 'react';
import { X, Download, FileText } from 'lucide-react';
import { getMonthlyReportPdf } from '@/src/lib/pdfGenerator';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { formatNumber, cn } from '@/src/lib/utils';

interface ReportPreviewProps {
  transactions: any[];
  communityData: any;
  period?: { month: number, year: number };
  initialBalance?: number;
  onClose: () => void;
}

export default function ReportPreview({ transactions, communityData, period, initialBalance = 0, onClose }: ReportPreviewProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    const doc = getMonthlyReportPdf(transactions, communityData, period, initialBalance);
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    setPdfUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [transactions, communityData, period, initialBalance]);

  const handleDownload = () => {
    const doc = getMonthlyReportPdf(transactions, communityData, period, initialBalance);
    const now = period ? new Date(period.year, period.month, 1) : new Date();
    const monthName = format(now, 'MMMM yyyy', { locale: id });
    doc.save(`Laporan_Kas_RT_${monthName.replace(' ', '_')}.pdf`);
  };

  const currentPeriodDate = period ? new Date(period.year, period.month, 1) : null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl h-[90vh] shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        <div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-center bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight leading-tight">Pratinjau Laporan</h2>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                {currentPeriodDate ? format(currentPeriodDate, 'MMMM yyyy', { locale: id }) : 'Semua Periode'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleDownload}
              className="hidden md:flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all text-sm shadow-lg shadow-indigo-100"
            >
              <Download size={18} />
              Unduh PDF
            </button>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex-1 bg-gray-100 overflow-y-auto p-4 md:p-8 flex justify-center">
          <div className="bg-white w-full max-w-[21cm] min-h-[29.7cm] shadow-xl p-[1cm] md:p-[2cm] flex flex-col font-serif text-slate-800">
            {/* Report Content Wrapper */}
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="text-center mb-10">
                <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-tight mb-1">
                  {communityData?.name || 'KAS RT DIGITAL'}
                </h1>
                <p className="text-lg font-medium text-slate-600 mb-2">LAPORAN KEUANGAN BULANAN</p>
                <div className="inline-block px-4 py-1 bg-slate-100 rounded-full text-sm font-bold text-slate-700">
                  Periode: {currentPeriodDate ? format(currentPeriodDate, 'MMMM yyyy', { locale: id }) : 'Semua Data'}
                </div>
              </div>

              <div className="h-px bg-slate-200 w-full mb-8"></div>

              {/* Transactions Table */}
              <div className="flex-1">
                <table className="w-full border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-800 text-white leading-tight">
                      <th className="p-1 px-2 border border-slate-700 text-center w-8">No</th>
                      <th className="p-1 px-2 border border-slate-700 text-center w-20">Tanggal</th>
                      <th className="p-1 px-2 border border-slate-700 text-left">Keterangan</th>
                      <th className="p-1 px-2 border border-slate-700 text-center w-24">Pemasukan</th>
                      <th className="p-1 px-2 border border-slate-700 text-center w-24">Pengeluaran</th>
                      <th className="p-1 px-2 border border-slate-700 text-center w-28">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      let runningBalance = initialBalance;
                      const rows = [];
                      
                      // Add initial balance row
                      if (period || initialBalance !== 0) {
                        rows.push(
                          <tr key="initial" className="bg-slate-100/50 font-bold italic">
                            <td className="p-1 px-2 border border-slate-200 text-center font-mono"></td>
                            <td className="p-1 px-2 border border-slate-200 text-center">-</td>
                            <td className="p-1 px-2 border border-slate-200 text-slate-500 uppercase tracking-wider text-[9px]">
                              SALDO BULAN SEBELUMNYA
                            </td>
                            <td className="p-1 px-2 border border-slate-200 text-right">-</td>
                            <td className="p-1 px-2 border border-slate-200 text-right">-</td>
                            <td className="p-1 px-2 border border-slate-200 text-right font-mono text-slate-900">
                              {formatNumber(Math.abs(initialBalance))}
                            </td>
                          </tr>
                        );
                      }

                      const transactionRows = transactions
                        .slice()
                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                        .map((t, i) => {
                          if (t.type === 'income') runningBalance += t.amount;
                          else runningBalance -= t.amount;
                          return (
                            <tr key={t.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                              <td className="p-1 px-2 border border-slate-200 text-center font-mono">{i + 1}</td>
                              <td className="p-1 px-2 border border-slate-200 text-center">{format(new Date(t.date), 'dd/MM/yy')}</td>
                              <td className="p-1 px-2 border border-slate-200 font-medium text-slate-700">
                                {t.description || t.category || '-'}
                              </td>
                              <td className="p-1 px-2 border border-slate-200 text-right text-emerald-600 font-mono font-bold">
                                {t.type === 'income' ? formatNumber(t.amount) : '-'}
                              </td>
                              <td className="p-1 px-2 border border-slate-200 text-right text-rose-600 font-mono font-bold">
                                {t.type === 'expense' ? formatNumber(t.amount) : '-'}
                              </td>
                              <td className="p-1 px-2 border border-slate-200 text-right font-mono font-black text-slate-900 bg-slate-50/30">
                                {formatNumber(Math.abs(runningBalance))}
                              </td>
                            </tr>
                          );
                        });
                      
                      return [...rows, ...transactionRows];
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Signatures */}
              <div className="mt-16 grid grid-cols-2 gap-20">
                <div className="text-center">
                  <p className="mb-20">Ketua RT,</p>
                  <div className="border-b border-slate-800 w-48 mx-auto font-bold uppercase">
                    {communityData?.chairman || '..........................'}
                  </div>
                </div>
                <div className="text-center">
                  <p className="mb-20">Bendahara,</p>
                  <div className="border-b border-slate-800 w-48 mx-auto font-bold uppercase">
                    {communityData?.treasurer || '..........................'}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-20 pt-8 border-t border-slate-100 text-center text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                Laporan Otomatis Kas RT Digital • {format(new Date(), 'dd MMMM yyyy HH:mm', { locale: id })}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-gray-50 md:hidden shrink-0">
          <button 
            onClick={handleDownload}
            className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg"
          >
            <Download size={18} />
            Unduh Laporan
          </button>
        </div>
      </div>
    </div>
  );
}
