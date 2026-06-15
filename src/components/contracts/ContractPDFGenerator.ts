import jsPDF from 'jspdf';
import { format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ContractClauses } from '@/hooks/useAgencySettings';

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const buildAddress = (addr: string | null, city: string | null, state: string | null, zip: string | null) => {
  const parts = [addr, city, state, zip ? `CEP ${zip}` : null].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : '[ENDEREÇO COMPLETO]';
};

const numToWords: Record<number, string> = {
  1: 'um', 2: 'dois', 3: 'três', 4: 'quatro', 5: 'cinco',
  6: 'seis', 7: 'sete', 8: 'oito', 9: 'nove', 10: 'dez',
  11: 'onze', 12: 'doze', 24: 'vinte e quatro', 36: 'trinta e seis',
};

interface ImageData { b64: string; naturalW: number; naturalH: number; }

async function loadImage(url: string): Promise<ImageData | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const b64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const { w, h } = await new Promise<{ w: number; h: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve({ w: 0, h: 0 });
      img.src = b64;
    });
    return { b64, naturalW: w, naturalH: h };
  } catch {
    return null;
  }
}

// Default clause texts — supports {{VALOR}}, {{VERBA}}, {{MESES}}, {{DIA}}, {{MULTA}} placeholders
const DEFAULT_CLAUSES: Required<ContractClauses> = {
  objeto:
    'O presente instrumento tem como objeto a prestação, pelo(a) Contratado(a), de serviços de gestão de tráfego pago com a finalidade de promover os produtos, bens e serviços da Contratante, tendo como objetivo a extensão da divulgação ao seu público, em conformidade com a estratégia descrita na Cláusula Sétima.',

  pagamento:
    'Pela prestação dos serviços discriminados na Cláusula anterior, a Contratada receberá a quantia correspondente a {{VALOR}} mensais, a ser paga até o dia {{DIA}} de cada mês, que deverá ser depositada ou transferida (via TED, DOC ou Pix) para a conta bancária indicada pela Contratada.\n\nParágrafo Primeiro – O atraso no pagamento das parcelas acima mencionadas resultará no pagamento, pela Contratante, de multa de 10% (dez por cento) sobre o valor para ela estipulado, acrescido de juros moratórios de 1% (um por cento) ao mês, calculado de forma proporcional, devidamente atualizado monetariamente pelo índice IPCA.\n\nParágrafo Segundo – A tolerância, por parte da Contratada, do atraso no pagamento de quaisquer das parcelas será considerada como mera liberalidade, não sendo capaz de gerar qualquer inovação em relação aos termos estipulados no presente contrato.',

  obrigacoes_contratante:
    'a) Fazer o pagamento da prestação de serviços em dia;\nb) Disponibilizar os acessos às contas de anúncio das plataformas em que os investimentos serão realizados;\nc) Fornecer informações e dados acerca dos produtos, bens ou serviços por ela vendidos.',

  obrigacoes_contratada:
    'a) Prestar os serviços relativos à assessoria em gestão de tráfego pago para os anúncios que serão por ela veiculados;\nb) Comunicar à Contratante acerca de eventuais bloqueios nas contas de anúncio e orientá-la sobre como proceder;\nc) Executar o trabalho de acordo com a linha estratégica acertada entre as partes.',

  valor_anuncios:
    'As campanhas de divulgação dos produtos, bens e serviços da Contratante serão objeto de anúncios nas seguintes plataformas: Facebook Ads, Google Ads, TikTok Ads, YouTube e Pinterest, ficando a Contratada responsável pela adoção de estratégia compatível com os objetivos, metas e o público alvo da Contratante.\n\nAs partes convencionam que o valor a ser disponibilizado com a finalidade de veicular as campanhas{{VERBA_TEXTO}} será definido em comum acordo, sendo esta obrigação exclusiva da Contratante.\n\nParágrafo Único – Em hipótese alguma a Contratada se responsabilizará pelo pagamento de eventuais despesas com o tráfego pago por ela gerido, cabendo à Contratante arcar com eventuais valores pendentes nas contas de anúncios.',

  estrategia:
    'Para a adoção das estratégias que servirão de parâmetro para a configuração das campanhas é necessário o fornecimento, pela Contratante, das informações específicas sobre o produto, bem ou serviço por ela comercializado.\n\nParágrafo Primeiro – Após a ativação das campanhas, fica proibida a realização de qualquer alteração nas configurações das campanhas por terceiros que não vinculados à Contratada, ainda que por prepostos, funcionários ou representantes da Contratante.\n\nParágrafo Segundo – A Contratada não será responsabilizada por eventual bloqueio das contas de anúncios em que são realizadas as campanhas da Contratante.',

  nao_exclusividade:
    'A prestação dos serviços discriminados na Cláusula Primeira não gera qualquer vínculo de natureza trabalhista/empregatícia entre as partes, sendo eles prestados com total independência e autonomia, não havendo qualquer responsabilidade das partes nas atividades exercidas por uma ou por outra.',

  confidencialidade:
    'As informações obtidas como consequência da celebração do presente instrumento são consideradas confidenciais, devendo ser mantidas no mais absoluto sigilo por ambos os contratantes.\n\nParágrafo Único – A obrigação de confidencialidade disposta na presente cláusula perdurará por período indeterminado, mesmo após o término, rescisão ou extinção do presente contrato.',

  duracao:
    'O presente instrumento vigerá pelo período de {{MESES}} meses, a contar da data de sua assinatura, podendo ser prorrogado por período equivalente, desde que comunicado por escrito pela parte interessada com prazo mínimo de 30 (trinta) dias de antecedência ao término de sua vigência.',

  reajuste:
    'Os valores estabelecidos na Cláusula Segunda serão reajustados anualmente, a contar da data de assinatura do contrato, com base na variação acumulada do Índice Nacional de Preços ao Consumidor Amplo (IPCA), divulgado pelo IBGE, ou por índice que vier a substituí-lo.\n\nParágrafo Único – O reajuste será comunicado à Contratante com antecedência mínima de 30 (trinta) dias, passando a vigorar no mês subsequente ao da comunicação.',

  rescisao:
    'Apesar do caráter irrevogável e irretratável da presente avença, podem quaisquer das partes rescindi-la, independentemente de justificativa, desde que comuniquem sua intenção com antecedência mínima de 30 (trinta) dias, período no qual as obrigações assumidas permanecerão em vigor.\n\nParágrafo Primeiro – A rescisão injustificada do presente instrumento, por qualquer das partes, ensejará o pagamento de multa correspondente a {{MULTA}}, pela parte que anunciar seu desejo de assim proceder.\n\nParágrafo Segundo – O descumprimento repetitivo das obrigações assumidas pelas partes poderá ensejar a rescisão do presente contrato, ocasião na qual será aplicada multa correspondente a 20% (vinte por cento) do valor agregado do instrumento contratual, em benefício da parte prejudicada.',

  disposicoes:
    'As disposições contidas no presente instrumento particular prevalecem sobre quaisquer outros entendimentos ou acordos feitos entre os contratantes, explícitos ou implícitos, que sejam conflitantes com o teor das informações aqui dispostas.\n\nEm caso de necessidade de modificação em alguma das disposições ora estabelecidas, as partes deverão formalizar referida alteração por meio de aditivo contratual.\n\nQuaisquer tolerâncias ou concessões, por quaisquer das partes, não possuem a capacidade de gerar direitos, alterar ou inovar as obrigações estipuladas neste instrumento.',

  foro:
    'As partes elegem o foro da comarca de {{CIDADE}}, {{ESTADO}}, para dirimir quaisquer ações oriundas deste contrato.',
};

export interface ContractPDFData {
  contract: {
    id: string;
    value: number;
    media_budget?: number | null;
    start_date: string;
    duration_months: number | null;
    description: string | null;
    status: string;
    payment_day?: number | null;
  };
  client: {
    name: string;
    company: string;
    email: string | null;
    phone: string | null;
    cnpj: string | null;
    cpf: string | null;
    rg: string | null;
    razao_social: string | null;
    person_type: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    zip_code: string | null;
  };
  agency: {
    name: string;
    cnpj: string | null;
    logo_url: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    zip_code: string | null;
  };
  clauses?: ContractClauses | null;
}

export interface ContractPDFResult {
  dataUrl: string;
  blob: Blob;
  filename: string;
}

function replacePlaceholders(
  text: string,
  vars: { VALOR: string; VERBA: string; VERBA_TEXTO: string; MESES: string; DIA: string; MULTA: string; CIDADE: string; ESTADO: string }
): string {
  return text
    .replace(/{{VALOR}}/g, vars.VALOR)
    .replace(/{{VERBA}}/g, vars.VERBA)
    .replace(/{{VERBA_TEXTO}}/g, vars.VERBA_TEXTO)
    .replace(/{{MESES}}/g, vars.MESES)
    .replace(/{{DIA}}/g, vars.DIA)
    .replace(/{{MULTA}}/g, vars.MULTA)
    .replace(/{{CIDADE}}/g, vars.CIDADE)
    .replace(/{{ESTADO}}/g, vars.ESTADO);
}

export async function generateContractPDF(data: ContractPDFData): Promise<ContractPDFResult> {
  const { contract, client, agency, clauses } = data;
  const merged: Required<ContractClauses> = { ...DEFAULT_CLAUSES, ...(clauses || {}) };

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 22;
  const contentWidth = pageWidth - margin * 2;
  const durationMonths = contract.duration_months || 12;
  const today = new Date();
  const paymentDay = contract.payment_day ?? new Date(contract.start_date + 'T12:00:00').getDate();
  const mediaBudget = Number(contract.media_budget ?? 0);

  // ── Placeholder vars ──
  const verbaTxt = mediaBudget > 0 ? `, mais a verba de investimento em mídia no valor de ${fmt(mediaBudget)},` : '';
  const vars = {
    VALOR: fmt(contract.value),
    VERBA: mediaBudget > 0 ? fmt(mediaBudget) : 'a ser definido',
    VERBA_TEXTO: verbaTxt,
    MESES: `${durationMonths} (${numToWords[durationMonths] ?? durationMonths})`,
    DIA: `${paymentDay} (${numToWords[paymentDay] ?? paymentDay})`,
    MULTA: fmt(contract.value),
    CIDADE: agency.city || '[CIDADE]',
    ESTADO: agency.state || '[ESTADO]',
  };

  const isPJ = client.person_type === 'pj';
  const clientSignName = isPJ ? (client.razao_social || client.company) : client.name;

  let y = 0;

  // ── Header ──
  const HEADER_H = 48;
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, HEADER_H, 'F');

  // Logo — adaptive sizing (max 62×30, preserve aspect ratio)
  let logoEndX = margin;
  if (agency.logo_url) {
    try {
      const imgData = await loadImage(agency.logo_url);
      if (imgData && imgData.naturalW > 0) {
        const MAX_W = 62; const MAX_H = 30;
        const ratio = imgData.naturalW / imgData.naturalH;
        let lw = MAX_W; let lh = lw / ratio;
        if (lh > MAX_H) { lh = MAX_H; lw = lh * ratio; }
        const ly = (HEADER_H - lh) / 2;
        const imgType = imgData.b64.includes('image/png') ? 'PNG' : 'JPEG';
        doc.addImage(imgData.b64, imgType, margin, ly, lw, lh);
        logoEndX = margin + lw + 6;
      }
    } catch { /* skip */ }
  }

  if (agency.cnpj) {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(`CNPJ: ${agency.cnpj}`, logoEndX, HEADER_H / 2 + 2);
  }
  doc.setTextColor(74, 222, 128);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(`Nº ${contract.id.substring(0, 8).toUpperCase()}`, pageWidth - margin, HEADER_H / 2 + 2, { align: 'right' });

  y = HEADER_H + 14;

  // ── Helpers ──
  const checkPage = (needed = 10) => {
    if (y + needed > pageHeight - 20) { doc.addPage(); y = margin; }
  };

  const writeTitle = (text: string) => {
    checkPage(14);
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    const lines = doc.splitTextToSize(text, contentWidth);
    doc.text(lines, pageWidth / 2, y, { align: 'center' });
    y += lines.length * 6 + 4;
  };

  const writeSectionHeader = (title: string) => {
    checkPage(16);
    y += 6;
    doc.setFillColor(241, 245, 249); // slate-100
    doc.rect(margin - 2, y - 5, contentWidth + 4, 10, 'F');
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(title.toUpperCase(), pageWidth / 2, y + 1, { align: 'center' });
    y += 10;
  };

  const writeClauseNumber = (label: string) => {
    checkPage(10);
    y += 2;
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, y);
    y += 6;
  };

  const writeParagraph = (text: string, indent = 0, bold = false) => {
    doc.setTextColor(55, 65, 81); // gray-700
    doc.setFontSize(9);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    const lines = doc.splitTextToSize(text, contentWidth - indent);
    checkPage(lines.length * 5 + 2);
    doc.text(lines, margin + indent, y);
    y += lines.length * 5 + 3;
  };

  const writeClauseText = (clauseText: string, clauseLabel: string) => {
    writeClauseNumber(clauseLabel);
    const paragraphs = clauseText.split('\n').filter(l => l.trim());
    paragraphs.forEach((para) => {
      const isSubItem = /^[a-z]\)/.test(para.trim());
      writeParagraph(para.trim(), isSubItem ? 6 : 0);
    });
  };

  // ── Title ──
  writeTitle('CONTRATO PARTICULAR DE PRESTAÇÃO DE SERVIÇOS DE');
  writeTitle('GESTÃO DE TRÁFEGO PAGO');
  y += 2;

  // ── Parties ──
  const agencyFullAddr = buildAddress(agency.address, agency.city, agency.state, agency.zip_code);
  const clientAddr = buildAddress(client.address, client.city, client.state, client.zip_code);

  writeParagraph(
    `De um lado, ${agency.name}${agency.cnpj ? `, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº ${agency.cnpj}` : ''}, estabelecida à ${agencyFullAddr}, daqui em diante denominada como CONTRATADA.`
  );
  y += 2;
  if (isPJ) {
    writeParagraph(
      `De outro, ${client.razao_social || client.company}, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº ${client.cnpj || '[CNPJ]'}, estabelecida à ${clientAddr}, nesse ato representada por ${client.name}${client.cpf ? `, CPF nº ${client.cpf}` : ''}, daqui em diante denominada como CONTRATANTE.`
    );
  } else {
    writeParagraph(
      `De outro, ${client.name}, brasileiro(a), CPF nº ${client.cpf || '[CPF]'}, RG nº ${client.rg || '[RG]'}, residente e domiciliado(a) à ${clientAddr}, daqui em diante denominado(a) como CONTRATANTE.`
    );
  }
  y += 2;
  writeParagraph(
    'Resolvem as partes celebrar o presente contrato, que será regido pelas cláusulas abaixo destacadas.'
  );

  // ── Summary box ──
  checkPage(48);
  y += 6;
  const startDateFmt = format(new Date(contract.start_date + 'T12:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const endDate = addMonths(new Date(contract.start_date + 'T12:00:00'), durationMonths);
  const endDateFmt = format(endDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  const BOX_H = 46;
  const BOX_R = 2.5;
  const GREEN_BG = [240, 253, 244] as const;
  const GREEN_BORDER = [134, 239, 172] as const;
  const GREEN_LABEL = [21, 128, 61] as const;
  const GREEN_VALUE = [15, 83, 42] as const;
  const DIVIDER = [167, 243, 208] as const;

  doc.setFillColor(...GREEN_BG);
  doc.setDrawColor(...GREEN_BORDER);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, contentWidth, BOX_H, BOX_R, BOX_R, 'FD');

  // Row 1: contract number + status
  doc.setFillColor(22, 101, 52);
  doc.roundedRect(margin, y, contentWidth, 11, BOX_R, BOX_R, 'F');
  // re-draw bottom corners as square to merge with rest of box
  doc.setFillColor(22, 101, 52);
  doc.rect(margin, y + 6, contentWidth, 5, 'F');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(`CONTRATO Nº ${contract.id.substring(0, 8).toUpperCase()}`, margin + 5, y + 7.5);
  doc.text('ATIVO', pageWidth - margin - 5, y + 7.5, { align: 'right' });

  // Divider after row 1
  doc.setDrawColor(...DIVIDER);
  doc.setLineWidth(0.3);
  doc.line(margin + 2, y + 11, margin + contentWidth - 2, y + 11);

  // Row 2: 4 cells — Fee | Mídia | Duração | Pagamento
  const cells = mediaBudget > 0
    ? [
        { label: 'FEE MENSAL', value: fmt(contract.value) },
        { label: 'VERBA DE MÍDIA', value: fmt(mediaBudget) },
        { label: 'DURAÇÃO', value: `${durationMonths} meses` },
        { label: 'PAGAMENTO', value: `Todo dia ${paymentDay}` },
      ]
    : [
        { label: 'FEE MENSAL', value: fmt(contract.value) },
        { label: 'DURAÇÃO', value: `${durationMonths} meses` },
        { label: 'PAGAMENTO', value: `Todo dia ${paymentDay}` },
        { label: 'CONTRATO', value: contract.id.substring(0, 8).toUpperCase() },
      ];

  const cellW = contentWidth / cells.length;
  cells.forEach(({ label, value }, i) => {
    const cx = margin + i * cellW;
    // vertical divider between cells
    if (i > 0) {
      doc.setDrawColor(...DIVIDER);
      doc.setLineWidth(0.3);
      doc.line(cx, y + 13, cx, y + 32);
    }
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...GREEN_LABEL);
    doc.text(label, cx + cellW / 2, y + 18, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...GREEN_VALUE);
    doc.text(value, cx + cellW / 2, y + 27, { align: 'center' });
  });

  // Divider before row 3
  doc.setDrawColor(...DIVIDER);
  doc.setLineWidth(0.3);
  doc.line(margin + 2, y + 33, margin + contentWidth - 2, y + 33);

  // Row 3: vigência
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GREEN_LABEL);
  doc.text('VIGÊNCIA', margin + 5, y + 39.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...GREEN_VALUE);
  doc.text(
    `${startDateFmt}  →  ${endDateFmt}`,
    pageWidth / 2, y + 39.5, { align: 'center' }
  );

  y += BOX_H + 8;

  // ── Sections ──
  const clauseNo = (() => { let n = 0; return () => { n++; return `CLÁUSULA ${n}ª`; }; })();

  writeSectionHeader('DO OBJETO');
  writeClauseText(replacePlaceholders(merged.objeto, vars), clauseNo());
  if (contract.description) writeParagraph(`Descrição adicional: ${contract.description}.`, 0);

  writeSectionHeader('DO PAGAMENTO');
  writeClauseText(replacePlaceholders(merged.pagamento, vars), clauseNo());

  writeSectionHeader('DAS OBRIGAÇÕES');
  writeClauseNumber(clauseNo() + ' – São obrigações da CONTRATANTE:');
  replacePlaceholders(merged.obrigacoes_contratante, vars).split('\n').filter(Boolean).forEach(line => {
    writeParagraph(line.trim(), /^[a-z]\)/.test(line.trim()) ? 6 : 0);
  });
  y += 2;
  writeClauseNumber(clauseNo() + ' – São obrigações da CONTRATADA:');
  replacePlaceholders(merged.obrigacoes_contratada, vars).split('\n').filter(Boolean).forEach(line => {
    writeParagraph(line.trim(), /^[a-z]\)/.test(line.trim()) ? 6 : 0);
  });

  writeSectionHeader('DO VALOR PARA REALIZAÇÃO DOS ANÚNCIOS');
  writeClauseText(replacePlaceholders(merged.valor_anuncios, vars), clauseNo());

  writeSectionHeader('DA ESTRATÉGIA');
  writeClauseText(replacePlaceholders(merged.estrategia, vars), clauseNo());

  writeSectionHeader('DA NÃO EXCLUSIVIDADE');
  writeClauseText(replacePlaceholders(merged.nao_exclusividade, vars), clauseNo());

  writeSectionHeader('DA CONFIDENCIALIDADE');
  writeClauseText(replacePlaceholders(merged.confidencialidade, vars), clauseNo());

  writeSectionHeader('DA DURAÇÃO');
  writeClauseText(replacePlaceholders(merged.duracao, vars), clauseNo());

  writeSectionHeader('DO REAJUSTE ANUAL');
  writeClauseText(replacePlaceholders(merged.reajuste, vars), clauseNo());

  writeSectionHeader('DA RESCISÃO E EXTINÇÃO');
  writeClauseText(replacePlaceholders(merged.rescisao, vars), clauseNo());

  writeSectionHeader('DAS DISPOSIÇÕES GERAIS');
  const disposicoesParas = replacePlaceholders(merged.disposicoes, vars).split('\n').filter(Boolean);
  disposicoesParas.forEach((para) => {
    writeClauseText(para.trim(), clauseNo());
  });

  writeSectionHeader('DO FORO');
  writeClauseText(replacePlaceholders(merged.foro, vars), clauseNo());

  writeParagraph(
    'E, por estarem as partes assim acordadas, firmam o presente contrato em 02 (duas) vias de igual teor e forma.',
    0
  );

  // ── Date & Signatures ──
  checkPage(55);
  y += 10;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(55, 65, 81);
  doc.text(
    `${agency.city || '[CIDADE]'}, ${agency.state || '[ESTADO]'}, ${format(today, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}.`,
    margin, y
  );
  y += 18;

  const lineW = 78;
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.4);

  // Contratante
  doc.line(margin, y, margin + lineW, y);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(clientSignName, margin, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  const clientDoc = isPJ ? (client.cnpj ? `CNPJ nº ${client.cnpj}` : '') : (client.cpf ? `CPF nº ${client.cpf}` : '');
  if (clientDoc) doc.text(clientDoc, margin, y + 11);
  doc.text('CONTRATANTE', margin, y + 16);

  // Contratada
  const rightX = pageWidth - margin - lineW;
  doc.setDrawColor(15, 23, 42);
  doc.line(rightX, y, pageWidth - margin, y);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(agency.name || 'CONTRATADA', rightX, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  if (agency.cnpj) doc.text(`CNPJ nº ${agency.cnpj}`, rightX, y + 11);
  doc.text('CONTRATADA', rightX, y + 16);

  // ── Footer on all pages ──
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(15, 23, 42);
    doc.rect(0, pageHeight - 12, pageWidth, 12, 'F');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `${agency.name} · Contrato ${contract.id.substring(0, 8).toUpperCase()} · ${clientSignName} · Página ${i} de ${pageCount}`,
      pageWidth / 2,
      pageHeight - 4,
      { align: 'center' }
    );
  }

  const filename = `Contrato_${(client.company || client.name).replace(/\s+/g, '_')}_${format(today, 'yyyy-MM-dd')}.pdf`;
  const dataUrl = doc.output('datauristring');
  const blob = doc.output('blob');

  return { dataUrl, blob, filename };
}
