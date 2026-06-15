import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Proposal } from '@/hooks/useProposals';
import { AgencySettings } from '@/hooks/useAgencySettings';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export type PDFLayout = 'minimal' | 'premium' | 'corporativo';

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const LAYOUTS: Record<PDFLayout, { primary: [number, number, number]; accent: [number, number, number]; headerH: number }> = {
  minimal:     { primary: [30, 30, 30],     accent: [100, 100, 100], headerH: 40 },
  premium:     { primary: [15, 82, 186],    accent: [59, 130, 246],  headerH: 50 },
  corporativo: { primary: [17, 24, 39],     accent: [75, 85, 99],    headerH: 44 },
};

async function loadImageBase64(url: string): Promise<{ b64: string; w: number; h: number } | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const b64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const dims = await new Promise<{ w: number; h: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve({ w: 0, h: 0 });
      img.src = b64;
    });
    return { b64, ...dims };
  } catch {
    return null;
  }
}

export interface ProposalPDFResult {
  dataUrl: string;
  blob: Blob;
  filename: string;
}

export async function generateProposalPDF(
  proposal: Proposal,
  layout: PDFLayout = 'corporativo',
  agency?: AgencySettings | null
): Promise<ProposalPDFResult> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const color = LAYOUTS[layout];

  const agencyName = agency?.name || 'Agência';
  const clientName = proposal.client?.name || proposal.company || 'Cliente';

  let y = 0;

  // ── Header ──
  doc.setFillColor(...color.primary);
  doc.rect(0, 0, pageWidth, color.headerH, 'F');

  // Logo
  const logoUrl = agency?.contract_logo_url || agency?.logo_url || null;
  let logoEndX = margin;
  if (logoUrl) {
    try {
      const img = await loadImageBase64(logoUrl);
      if (img && img.w > 0) {
        const MAX_W = 55; const MAX_H = color.headerH - 14;
        const ratio = img.w / img.h;
        let lw = MAX_W; let lh = lw / ratio;
        if (lh > MAX_H) { lh = MAX_H; lw = lh * ratio; }
        const ly = (color.headerH - lh) / 2;
        const imgType = img.b64.includes('image/png') ? 'PNG' : 'JPEG';
        doc.addImage(img.b64, imgType, margin, ly, lw, lh);
        logoEndX = margin + lw + 6;
      }
    } catch { /* skip */ }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('PROPOSTA COMERCIAL', logoEndX, color.headerH / 2 - 1);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 220, 255);
  doc.setFontSize(7.5);
  doc.text(`v${proposal.version}  ·  ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`, logoEndX, color.headerH / 2 + 6);

  // Status badge (top right)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text(proposal.status.toUpperCase(), pageWidth - margin, color.headerH / 2 + 2, { align: 'right' });

  y = color.headerH + 12;

  // ── Helpers ──
  const checkPage = (needed = 10) => {
    if (y + needed > pageHeight - 18) { doc.addPage(); y = margin; }
  };

  const sectionTitle = (title: string) => {
    checkPage(14);
    y += 4;
    doc.setFillColor(...color.primary);
    doc.rect(margin - 2, y - 4, contentWidth + 4, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin, y + 0.5);
    y += 8;
  };

  const field = (label: string, value: string) => {
    if (!value) return;
    checkPage(7);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...color.primary);
    doc.text(`${label}:`, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(55, 65, 81);
    const lines = doc.splitTextToSize(value, contentWidth - 32);
    doc.text(lines, margin + 32, y);
    y += Math.max(lines.length * 4.5 + 2, 6);
  };

  const contentWidth = pageWidth - margin * 2;

  // ── Summary box ──
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, y, contentWidth, 26, 2, 2, 'FD');

  const cols = contentWidth / 4;
  const summaryItems = [
    { label: 'CLIENTE', value: clientName },
    { label: 'FEE MENSAL', value: fmt(proposal.monthly_fee || 0) },
    { label: 'VERBA DE MÍDIA', value: proposal.media_budget > 0 ? fmt(proposal.media_budget) : '—' },
    { label: 'PROBABILIDADE', value: `${proposal.probability || 0}%` },
  ];
  summaryItems.forEach(({ label, value }, i) => {
    const cx = margin + i * cols + cols / 2;
    if (i > 0) {
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(margin + i * cols, y + 4, margin + i * cols, y + 22);
    }
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...color.accent);
    doc.text(label, cx, y + 9, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...color.primary);
    doc.text(value, cx, y + 19, { align: 'center' });
  });
  y += 34;

  // ── Dados do Cliente ──
  sectionTitle('DADOS DO CLIENTE');
  const clientCompany = proposal.client?.company || proposal.company || '';
  field('Cliente', clientName);
  if (clientCompany && clientCompany !== clientName) field('Empresa', clientCompany);
  if (proposal.segment) field('Segmento', proposal.segment);
  if (proposal.campaign_objective) field('Objetivo', proposal.campaign_objective);
  y += 2;

  // ── Escopo ──
  if (proposal.platforms?.length || proposal.services_included || proposal.creatives || proposal.landing_pages || proposal.sla) {
    sectionTitle('ESCOPO DO PROJETO');
    if (proposal.platforms?.length) field('Plataformas', proposal.platforms.join(', '));
    if (proposal.plan_type) field('Plano', proposal.plan_type);
    if (proposal.services_included) field('Serviços', proposal.services_included);
    if (proposal.creatives) field('Criativos', proposal.creatives);
    if (proposal.landing_pages) field('Landing Pages', proposal.landing_pages);
    if (proposal.automations) field('Automações', proposal.automations);
    if (proposal.sla) field('SLA', proposal.sla);
    y += 2;
  }

  // ── Investimento ──
  sectionTitle('INVESTIMENTO');
  y += 2;

  const taxAmount = (proposal.monthly_fee + proposal.setup_fee) * (proposal.tax_rate || 0) / 100;
  const total = proposal.monthly_fee + proposal.setup_fee + taxAmount;

  const tableBody: string[][] = [
    ['Fee Mensal de Gestão', fmt(proposal.monthly_fee || 0)],
  ];
  if ((proposal.setup_fee || 0) > 0) tableBody.push(['Setup / Onboarding', fmt(proposal.setup_fee)]);
  if ((proposal.media_budget || 0) > 0) tableBody.push(['Verba de Mídia (investimento)', fmt(proposal.media_budget)]);
  if (proposal.commission) tableBody.push(['Comissão', `${proposal.commission}%`]);
  if (proposal.tax_rate) tableBody.push([`Impostos (${proposal.tax_rate}%)`, fmt(taxAmount)]);
  tableBody.push(['TOTAL (fee + setup)', fmt(total)]);

  autoTable(doc, {
    startY: y,
    head: [['Item', 'Valor']],
    body: tableBody,
    margin: { left: margin, right: margin },
    theme: layout === 'premium' ? 'grid' : 'striped',
    headStyles: { fillColor: color.primary, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    styles: { fontSize: 9.5 },
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
    didParseCell: (data) => {
      if (data.row.index === tableBody.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = layout === 'premium' ? [235, 245, 255] : [240, 240, 240];
      }
    },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // ── Condições ──
  const hasConditions = proposal.validity_months || proposal.response_deadline || proposal.cancellation_terms || proposal.penalty || proposal.renewal_terms;
  if (hasConditions) {
    checkPage(20);
    sectionTitle('CONDIÇÕES COMERCIAIS');
    if (proposal.validity_months) field('Vigência', `${proposal.validity_months} meses`);
    if (proposal.response_deadline) field('Validade da proposta', `${proposal.response_deadline} dias`);
    if (proposal.cancellation_terms) field('Cancelamento', proposal.cancellation_terms);
    if (proposal.penalty) field('Multa rescisória', proposal.penalty);
    if (proposal.renewal_terms) field('Renovação', proposal.renewal_terms);
    y += 2;
  }

  // ── Observações ──
  if (proposal.notes) {
    checkPage(20);
    sectionTitle('OBSERVAÇÕES');
    doc.setTextColor(55, 65, 81);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(proposal.notes, contentWidth);
    checkPage(lines.length * 5);
    doc.text(lines, margin, y);
    y += lines.length * 5 + 6;
  }

  // ── Footer todas as páginas ──
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(...color.primary);
    doc.rect(0, pageHeight - 10, pageWidth, 10, 'F');
    doc.setFontSize(7);
    doc.setTextColor(200, 210, 220);
    doc.text(
      `${agencyName}  ·  Proposta ${clientName}  ·  v${proposal.version}  ·  ${format(new Date(), 'dd/MM/yyyy')}  ·  Página ${i} de ${pageCount}`,
      pageWidth / 2, pageHeight - 3.5, { align: 'center' }
    );
  }

  const filename = `Proposta_${(proposal.company || clientName).replace(/\s+/g, '_')}_v${proposal.version}.pdf`;
  const dataUrl = doc.output('datauristring');
  const blob = doc.output('blob');

  return { dataUrl, blob, filename };
}
