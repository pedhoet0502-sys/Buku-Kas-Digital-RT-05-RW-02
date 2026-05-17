import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { formatCurrency, formatNumber } from './utils';

export const getMonthlyReportPdf = (transactions: any[], communityData?: any, period?: { month: number, year: number }) => {
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
  let runningBalance = 0;
  const tableRows = transactions
    .slice()
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) // Sort chronological for balance
    .map((t, index) => {
      if (t.type === 'income') runningBalance += t.amount;
      else runningBalance -= t.amount;
      
      return {
        no: index + 1,
        date: format(new Date(t.date), 'dd/MM/yy'),
        description: t.description || t.category || '-',
        income: t.type === 'income' ? formatNumber(t.amount) : '-',
        expense: t.type === 'expense' ? formatNumber(t.amount) : '-',
        balance: formatNumber(Math.abs(runningBalance))
      };
    })
    .map((r) => [
      r.no,
      r.date,
      r.description,
      r.income,
      r.expense,
      r.balance
    ]);

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
    doc.text(`Dicetak di Jakarta, ${format(now, 'dd MMMM yyyy', { locale: id })}`, 190, finalY - 15, { align: 'right' });

    // Chairman
    doc.text('Ketua RT,', 40, finalY);
    doc.text(`( ${communityData?.chairman || '..........................'} )`, 40, finalY + 25, { align: 'center' });
    
    // Treasurer
    doc.text('Bendahara,', 150, finalY);
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

export const generateMonthlyReport = (transactions: any[], communityData?: any, period?: { month: number, year: number }) => {
  const doc = getMonthlyReportPdf(transactions, communityData, period);
  const now = period ? new Date(period.year, period.month, 1) : new Date();
  const monthName = format(now, 'MMMM yyyy', { locale: id });
  doc.save(`Laporan_Kas_RT_${monthName.replace(' ', '_')}.pdf`);
};
