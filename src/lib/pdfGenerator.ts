import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { formatCurrency, formatNumber } from './utils';

export const getMonthlyReportPdf = (transactions: any[], communityData?: any, period?: { month: number, year: number }, initialBalance: number = 0) => {
  const doc = new jsPDF() as any;
  const now = new Date();
  const reportDate = period 
    ? new Date(period.year, period.month, 1) 
    : null;
  const monthName = reportDate ? format(reportDate, 'MMMM yyyy', { locale: id }) : 'SEMUA PERIODE';
  const communityName = communityData?.name || 'KAS RT DIGITAL';

  // Header
  doc.setFontSize(22);
  doc.setTextColor(30, 41, 59); // Slate 800
  doc.setFont(undefined, 'bold');
  doc.text(communityName.toUpperCase(), 105, 20, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setTextColor(100);
  doc.setFont(undefined, 'normal');
  doc.text(`LAPORAN KEUANGAN BULANAN`, 105, 28, { align: 'center' });
  doc.text(reportDate ? `Periode: ${monthName}` : `Periode: Semua Data`, 105, 36, { align: 'center' });

  // Divider
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.line(20, 42, 190, 42);

  // Table row preparation with running balance
  let runningBalance = initialBalance;
  const sortedTransactions = transactions
    .slice()
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const tableRows: any[][] = [];

  // Add initial balance row if period is selected
  if (period || initialBalance !== 0) {
    tableRows.push([
      '',
      '-',
      'SALDO BULAN SEBELUMNYA',
      '-',
      '-',
      formatNumber(Math.abs(initialBalance))
    ]);
  }

  sortedTransactions.forEach((t, index) => {
    if (t.type === 'income') runningBalance += t.amount;
    else runningBalance -= t.amount;
    
    tableRows.push([
      index + 1,
      format(new Date(t.date), 'dd/MM/yy'),
      t.description || t.category || '-',
      t.type === 'income' ? formatNumber(t.amount) : '-',
      t.type === 'expense' ? formatNumber(t.amount) : '-',
      formatNumber(Math.abs(runningBalance))
    ]);
  });

  autoTable(doc, {
    startY: 50,
    head: [['No', 'Tgl', 'Keterangan', 'Pemasukan', 'Pengeluaran', 'Saldo (Rp)']],
    body: tableRows,
    theme: 'grid',
    headStyles: { 
      fillColor: [30, 41, 59], 
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'center', cellWidth: 18 },
      3: { halign: 'right', cellWidth: 28 },
      4: { halign: 'right', cellWidth: 28 },
      5: { halign: 'right', cellWidth: 32 },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    styles: { fontSize: 8, cellPadding: 2 },
  });

  // Signatures
  const finalY = (doc as any).lastAutoTable.finalY + 30;
  if (finalY < 250) {
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.setFont(undefined, 'normal');
    
    // Date of signature
    doc.text(`Cilangkap, ${format(now, 'dd MMMM yyyy', { locale: id })}`, 190, finalY - 15, { align: 'right' });

    // Chairman
    doc.text('Ketua RT,', 40, finalY, { align: 'center' });
    doc.text(`( ${communityData?.chairman || '..........................'} )`, 40, finalY + 25, { align: 'center' });
    
    // Treasurer
    doc.text('Bendahara,', 150, finalY, { align: 'center' });
    doc.text(`( ${communityData?.treasurer || '..........................'} )`, 150, finalY + 25, { align: 'center' });
  }

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text(
      `Halaman ${i} dari ${pageCount} - Laporan Otomatis Kas RT Digital`,
      105,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }

  return doc;
};

export const generateMonthlyReport = (transactions: any[], communityData?: any, period?: { month: number, year: number }, initialBalance: number = 0) => {
  const doc = getMonthlyReportPdf(transactions, communityData, period, initialBalance);
  const now = period ? new Date(period.year, period.month, 1) : new Date();
  const monthName = format(now, 'MMMM yyyy', { locale: id });
  doc.save(`Laporan_Kas_RT_${monthName.replace(' ', '_')}.pdf`);
};
