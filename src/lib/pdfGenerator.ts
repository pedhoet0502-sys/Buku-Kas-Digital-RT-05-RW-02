import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { formatCurrency } from './utils';

export const getMonthlyReportPdf = (transactions: any[]) => {
  const doc = new jsPDF() as any;
  const now = new Date();
  const monthName = format(now, 'MMMM yyyy', { locale: id });

  // Header
  doc.setFontSize(20);
  doc.setTextColor(79, 70, 229); // Indigo 600
  doc.text('LAPORAN KAS RT DIGITAL', 105, 20, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setTextColor(100);
  doc.text(`Periode: ${monthName}`, 105, 30, { align: 'center' });

  // Summary
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const balance = totalIncome - totalExpense;

  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text(`Total Pemasukan: ${formatCurrency(totalIncome)}`, 20, 50);
  doc.text(`Total Pengeluaran: ${formatCurrency(totalExpense)}`, 20, 58);
  doc.text(`Saldo Akhir: ${formatCurrency(balance)}`, 20, 66);

  // Table
  const tableRows = transactions
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map((t, index) => [
      index + 1,
      format(new Date(t.date), 'dd/MM/yyyy'),
      t.category,
      t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
      formatCurrency(t.amount),
      t.description || '-'
    ]);

  autoTable(doc, {
    startY: 80,
    head: [['No', 'Tanggal', 'Kategori', 'Tipe', 'Nominal', 'Keterangan']],
    body: tableRows,
    theme: 'striped',
    headStyles: { fillColor: [79, 70, 229] },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    styles: { fontSize: 10 },
  });

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text(
      `Dicetak pada: ${format(new Date(), 'dd/MM/yyyy HH:mm')} - Halaman ${i} dari ${pageCount}`,
      105,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }

  return doc;
};

export const generateMonthlyReport = (transactions: any[]) => {
  const doc = getMonthlyReportPdf(transactions);
  const monthName = format(new Date(), 'MMMM yyyy', { locale: id });
  doc.save(`Laporan_Kas_RT_${monthName.replace(' ', '_')}.pdf`);
};
