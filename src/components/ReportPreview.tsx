import React, { useState, useEffect } from 'react';
import { X, Download, FileText } from 'lucide-react';
import { getMonthlyReportPdf } from '@/src/lib/pdfGenerator';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface ReportPreviewProps {
  transactions: any[];
  onClose: () => void;
}

export default function ReportPreview({ transactions, onClose }: ReportPreviewProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    const doc = getMonthlyReportPdf(transactions);
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    setPdfUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [transactions]);

  const handleDownload = () => {
    const doc = getMonthlyReportPdf(transactions);
    const monthName = format(new Date(), 'MMMM yyyy', { locale: id });
    doc.save(`Laporan_Kas_RT_${monthName.replace(' ', '_')}.pdf`);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl h-[90vh] shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        <div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-center bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 leading-tight">Pratinjau Laporan PDF</h2>
              <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Periode {format(new Date(), 'MMMM yyyy', { locale: id })}</p>
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

        <div className="flex-1 bg-gray-100 overflow-hidden relative">
          {pdfUrl ? (
            <iframe 
              src={`${pdfUrl}#toolbar=0`} 
              className="w-full h-full border-none"
              title="PDF Report Preview"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
              <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p>Menyiapkan pratinjau...</p>
            </div>
          )}
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
