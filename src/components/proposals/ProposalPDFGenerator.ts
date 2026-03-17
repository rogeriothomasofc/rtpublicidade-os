import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Proposal } from '@/hooks/useProposals';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type PDFLayout = 'minimal' | 'premium' | 'corporativo';

const formatCurrency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function generateProposalPDF(proposal: Proposal, layout: PDFLayout = 'minimal') {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;

  const colors = {
    minimal: { primary: [30, 30, 30] as [number, number, number], accent: [100, 100, 100] as [number, number, number] },
    premium: { primary: [15, 82, 186] as [number, number, number], accent: [59, 130, 246] as [number, number, number] },
    corporativo: { primary: [17, 24, 39] as [number, number, number], accent: [75, 85, 99] as [number, number, number] },
  };

  const color = colors[layout];
  let y = margin;

  // Header
  doc.setFillColor(...color.primary);
  doc.rect(0, 0, pageWidth, layout === 'premium' ? 50 : 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(layout === 'premium' ? 22 : 18);
  doc.setFont('helvetica', 'bold');
  doc.text('RT Publicidade', margin, layout === 'premium' ? 22 : 18);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('PROPOSTA COMERCIAL', margin, layout === 'premium' ? 35 : 30);

  doc.setFontSize(10);
  doc.text(`v${proposal.version}`, pageWidth - margin, layout === 'premium' ? 35 : 30, { align: 'right' });

  y = (layout === 'premium' ? 50 : 40) + 15;

  // Client info
  doc.setTextColor(...color.primary);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO CLIENTE', margin, y);
  y += 8;

  doc.setTextColor(60, 60, 60);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const clientName = proposal.client?.name || proposal.company || 'N/A';
  const clientCompany = proposal.client?.company || proposal.company || '';
  doc.text(`Cliente: ${clientName}`, margin, y); y += 6;
  if (clientCompany) { doc.text(`Empresa: ${clientCompany}`, margin, y); y += 6; }
  if (proposal.segment) { doc.text(`Segmento: ${proposal.segment}`, margin, y); y += 6; }
  if (proposal.campaign_objective) { doc.text(`Objetivo: ${proposal.campaign_objective}`, margin, y); y += 6; }
  doc.text(`Data: ${format(new Date(proposal.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`, margin, y);
  y += 12;

  // Scope
  if (proposal.platforms?.length || proposal.services_included) {
    doc.setTextColor(...color.primary);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('ESCOPO DO PROJETO', margin, y);
    y += 8;

    doc.setTextColor(60, 60, 60);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    if (proposal.platforms?.length) {
      doc.text(`Plataformas: ${proposal.platforms.join(', ')}`, margin, y); y += 6;
    }
    if (proposal.services_included) {
      const lines = doc.splitTextToSize(`Serviços: ${proposal.services_included}`, pageWidth - margin * 2);
      doc.text(lines, margin, y); y += lines.length * 5 + 2;
    }
    if (proposal.creatives) { doc.text(`Criativos: ${proposal.creatives}`, margin, y); y += 6; }
    if (proposal.landing_pages) { doc.text(`Landing Pages: ${proposal.landing_pages}`, margin, y); y += 6; }
    if (proposal.automations) { doc.text(`Automações: ${proposal.automations}`, margin, y); y += 6; }
    if (proposal.sla) { doc.text(`SLA: ${proposal.sla}`, margin, y); y += 6; }
    y += 6;
  }

  // Pricing table
  doc.setTextColor(...color.primary);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('INVESTIMENTO', margin, y);
  y += 4;

  const totalBase = proposal.monthly_fee + proposal.setup_fee;
  const taxAmount = totalBase * (proposal.tax_rate || 0) / 100;
  const total = totalBase + taxAmount;

  const tableBody: (string | number)[][] = [
    ['Fee Mensal', formatCurrency(proposal.monthly_fee)],
    ['Setup', formatCurrency(proposal.setup_fee)],
  ];
  if (proposal.commission) tableBody.push(['Comissão', `${proposal.commission}%`]);
  if (proposal.tax_rate) tableBody.push(['Impostos', `${proposal.tax_rate}% (${formatCurrency(taxAmount)})`]);
  tableBody.push(['TOTAL', formatCurrency(total)]);

  autoTable(doc, {
    startY: y,
    head: [['Item', 'Valor']],
    body: tableBody,
    margin: { left: margin, right: margin },
    theme: layout === 'premium' ? 'grid' : 'striped',
    headStyles: {
      fillColor: color.primary,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    styles: { fontSize: 10 },
    didParseCell: (data) => {
      if (data.row.index === tableBody.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [240, 240, 240];
      }
    },
  });

  y = (doc as any).lastAutoTable.finalY + 12;

  // Conditions
  if (y > 240) { doc.addPage(); y = margin; }

  doc.setTextColor(...color.primary);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('CONDIÇÕES', margin, y);
  y += 8;

  doc.setTextColor(60, 60, 60);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  doc.text(`Vigência: ${proposal.validity_months} meses`, margin, y); y += 6;
  if (proposal.plan_type) { doc.text(`Plano: ${proposal.plan_type}`, margin, y); y += 6; }
  if (proposal.response_deadline) { doc.text(`Prazo para resposta: ${proposal.response_deadline} dias`, margin, y); y += 6; }
  if (proposal.cancellation_terms) {
    const lines = doc.splitTextToSize(`Cancelamento: ${proposal.cancellation_terms}`, pageWidth - margin * 2);
    doc.text(lines, margin, y); y += lines.length * 5 + 2;
  }
  if (proposal.penalty) { doc.text(`Multa: ${proposal.penalty}`, margin, y); y += 6; }
  if (proposal.renewal_terms) {
    const lines = doc.splitTextToSize(`Renovação: ${proposal.renewal_terms}`, pageWidth - margin * 2);
    doc.text(lines, margin, y); y += lines.length * 5 + 2;
  }

  // Notes
  if (proposal.notes) {
    y += 6;
    if (y > 250) { doc.addPage(); y = margin; }
    doc.setTextColor(...color.primary);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('OBSERVAÇÕES', margin, y);
    y += 8;
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(proposal.notes, pageWidth - margin * 2);
    doc.text(lines, margin, y);
    y += lines.length * 5;
  }

  // Footer signature area
  y = Math.max(y + 20, 250);
  if (y > 270) { doc.addPage(); y = 200; }

  doc.setDrawColor(...color.accent);
  doc.line(margin, y, margin + 70, y);
  doc.line(pageWidth - margin - 70, y, pageWidth - margin, y);

  doc.setTextColor(100, 100, 100);
  doc.setFontSize(9);
  doc.text('RT Publicidade', margin, y + 5);
  doc.text(clientName, pageWidth - margin - 70, y + 5);

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Proposta ${proposal.company || clientName} · v${proposal.version} · ${format(new Date(), 'dd/MM/yyyy')}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  const fileName = `Proposta_${(proposal.company || clientName).replace(/\s+/g, '_')}_v${proposal.version}.pdf`;
  doc.save(fileName);
}
