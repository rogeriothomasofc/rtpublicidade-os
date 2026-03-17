import jsPDF from 'jspdf';
import { format, addMonths, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ContractPDFData {
  contract: {
    id: string;
    value: number;
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
}

const formatCurrency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const buildFullAddress = (addr: string | null, city: string | null, state: string | null, zip: string | null) => {
  const parts = [addr, city ? `${city}` : null, state, zip ? `CEP ${zip}` : null].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : '[ENDEREÇO COMPLETO COM CEP]';
};

export function generateContractPDF(data: ContractPDFData) {
  const { contract, client, agency } = data;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 25;
  const contentWidth = pageWidth - margin * 2;
  const durationMonths = contract.duration_months || 12;
  const todayDate = new Date();
  const dayStr = format(todayDate, 'dd');
  const monthStr = format(todayDate, 'MMMM', { locale: ptBR });
  const yearStr = format(todayDate, 'yyyy');

  let y = margin;

  // ── Header ──
  doc.setFillColor(17, 24, 39);
  doc.rect(0, 0, pageWidth, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(agency.name || 'Agência', margin, 20);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  if (agency.cnpj) doc.text(`CNPJ: ${agency.cnpj}`, margin, 30);
  doc.text(`Nº ${contract.id.substring(0, 8).toUpperCase()}`, pageWidth - margin, 30, { align: 'right' });

  y = 55;

  // ── Title ──
  const writeTitle = (text: string) => {
    doc.setTextColor(17, 24, 39);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    const lines = doc.splitTextToSize(text, contentWidth);
    doc.text(lines, pageWidth / 2, y, { align: 'center' });
    y += lines.length * 6 + 6;
  };

  // ── Helpers ──
  const checkPage = (needed: number) => {
    if (y + needed > pageHeight - 25) { doc.addPage(); y = margin; }
  };

  const writeParagraph = (text: string, indent = 0) => {
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(text, contentWidth - indent);
    checkPage(lines.length * 5);
    doc.text(lines, margin + indent, y);
    y += lines.length * 5 + 3;
  };

  const writeClauseTitle = (title: string) => {
    checkPage(14);
    doc.setTextColor(17, 24, 39);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin, y);
    y += 7;
  };

  const writeSectionHeader = (title: string) => {
    checkPage(16);
    y += 4;
    doc.setTextColor(17, 24, 39);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(title, pageWidth / 2, y, { align: 'center' });
    y += 8;
  };

  // ── Contract Title ──
  writeTitle('CONTRATO PARTICULAR DE PRESTAÇÃO DE SERVIÇOS DE');
  y -= 4;
  writeTitle('GESTÃO DE TRÁFEGO PAGO');

  // ── Parties ──
  const agencyAddress = buildFullAddress(agency.address, agency.city, agency.state, agency.zip_code);
  const clientAddress = buildFullAddress(client.address, client.city, client.state, client.zip_code);
  const isPJ = client.person_type === 'pj';

  // Contratada (Agency) - always shown as PJ
  writeParagraph(
    `De um lado, ${agency.name}${agency.cnpj ? `, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº ${agency.cnpj}` : ''}, estabelecida à ${agencyAddress}, daqui em diante denominada como Contratada.`
  );

  // Contratante (Client)
  if (isPJ) {
    writeParagraph(
      `De outro, ${client.razao_social || client.company}, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº ${client.cnpj || '[Nº DO CNPJ]'}, estabelecida à ${clientAddress}, nesse ato representada por seu(sua) sócio(a) administrador(a) ${client.name}${client.cpf ? `, inscrito(a) no CPF sob o nº ${client.cpf}` : ''}, daqui em diante denominada como Contratante.`
    );
  } else {
    writeParagraph(
      `De outro, ${client.name}, brasileiro(a), inscrito(a) no CPF sob o nº ${client.cpf || '[Nº DO CPF]'}, portador(a) da Cédula de Identidade RG nº ${client.rg || '[Nº DO RG]'}, residente e domiciliado(a) à ${clientAddress}, daqui em diante denominado(a) como Contratante.`
    );
  }

  writeParagraph(
    'Resolvem as partes acima qualificadas celebrar o presente contrato, de forma que têm, entre si, justos e acertados os termos a seguir apresentados, que serão regidos pelas cláusulas abaixo destacadas.'
  );

  // ── DO OBJETO ──
  writeSectionHeader('DO OBJETO');
  writeParagraph(
    `CLÁUSULA PRIMEIRA - O presente instrumento tem como objeto a prestação, pelo(a) Contratado(a), de serviços de gestão de tráfego pago com a finalidade de promover os produtos, bens e serviços da Contratante, tendo como objetivo a extensão da divulgação ao seu público, em conformidade com a estratégia descrita na Cláusula Sétima.${contract.description ? ` Descrição adicional: ${contract.description}.` : ''}`
  );

  // ── DO PAGAMENTO ──
  writeSectionHeader('DO PAGAMENTO');
  const paymentDay = contract.payment_day || new Date(contract.start_date + 'T12:00:00').getDate();
  writeParagraph(
    `CLÁUSULA SEGUNDA - Pela prestação dos serviços discriminados na Cláusula anterior, a Contratada receberá a quantia correspondente a ${formatCurrency(contract.value)} mensais, a ser paga até o dia ${paymentDay} (${paymentDay}) de cada mês, que deverá ser depositada ou transferida (via TED, DOC ou Pix) para a conta bancária indicada pela Contratada.`
  );
  writeParagraph(
    'Parágrafo Primeiro – O atraso no pagamento das parcelas acima mencionadas resultará no pagamento, pela Contratante, de multa de 10% (dez por cento) sobre o valor para ela estipulado, acrescido de juros moratórios de 1% (um por cento) ao mês, calculado de forma proporcional, devidamente atualizado monetariamente pelo índice IPCA.'
  );
  writeParagraph(
    'Parágrafo Segundo – A tolerância, por parte da Contratada, do atraso no pagamento de quaisquer das parcelas, pela Contratante, será considerada como mera liberalidade, não sendo capaz de gerar qualquer inovação em relação aos termos que estão estipulados no presente contrato.'
  );

  // ── DAS OBRIGAÇÕES ──
  writeSectionHeader('DAS OBRIGAÇÕES');
  writeClauseTitle('CLÁUSULA TERCEIRA - São obrigações da Contratante:');
  writeParagraph('a) Fazer o pagamento da prestação de serviços em dia;', 5);
  writeParagraph('b) Disponibilizar os acessos às contas de anúncio das plataformas em que os investimentos serão realizados;', 5);
  writeParagraph('c) Fornecer informações e dados acerca dos produtos, bens ou serviços por ela vendidos.', 5);

  writeClauseTitle('CLÁUSULA QUARTA - São obrigações da Contratada:');
  writeParagraph('a) Prestar os serviços relativos à assessoria em gestão de tráfego pago para os anúncios que serão por ela veiculados;', 5);
  writeParagraph('b) Comunicar à Contratante acerca de eventuais bloqueios nas contas de anúncio e orientá-la sobre como proceder;', 5);
  writeParagraph('c) Executar o trabalho de acordo com a linha estratégica acertada entre as partes.', 5);

  // ── DO VALOR PARA ANÚNCIOS ──
  writeSectionHeader('DO VALOR ESTIPULADO PARA REALIZAÇÃO DOS ANÚNCIOS PAGOS');
  writeParagraph(
    'CLÁUSULA QUINTA - As campanhas de divulgação dos produtos, bens e serviços da Contratante serão objeto de anúncios, pela Contratada, nas seguintes plataformas: Facebook Ads, Google Ads, TikTok Ads, YouTube e Pinterest, ficando a Contratada responsável pela adoção de estratégia compatível com os objetivos, metas e o público alvo da Contratante.'
  );
  writeParagraph(
    'CLÁUSULA SEXTA - As partes convencionam que o valor a ser disponibilizado com a finalidade de veicular as campanhas será definido em comum acordo, sendo esta obrigação exclusiva da Contratante.'
  );
  writeParagraph(
    'Parágrafo Primeiro – Em hipótese alguma a Contratada se responsabilizará pelo pagamento de eventuais despesas com o tráfego pago por ela gerido, cabendo a ela comunicar à Contratante a necessidade de alteração da forma ou das informações de pagamento.'
  );
  writeParagraph(
    'Parágrafo Segundo - Caberá, ainda, à Contratante, arcar com eventuais valores pendentes nas contas de anúncios onde as campanhas serão veiculadas.'
  );

  // ── DA ESTRATÉGIA ──
  writeSectionHeader('DA ESTRATÉGIA');
  writeParagraph(
    'CLÁUSULA SÉTIMA – Para a adoção das estratégias que servirão de parâmetro para a configuração das campanhas, pela Contratada, é necessário o fornecimento, pela Contratante, das informações específicas sobre o produto, bem ou serviço por ela comercializado.'
  );
  writeParagraph(
    'Parágrafo Primeiro – Após a ativação das campanhas, pela Contratada, fica proibida a realização de qualquer alteração nas configurações das campanhas por terceiros que não vinculados a ela, ainda que por prepostos, funcionários ou representantes da Contratante, de modo que eventual mudança deverá ser sempre requisitada pela Contratante, de forma expressa, à Contratada.'
  );
  writeParagraph(
    'Parágrafo Segundo - A alteração da estratégia adotada para as campanhas será realizada, em caso de pedido expresso da Contratante, desde que já superado um prazo mínimo razoável de sua ativação, o que somente poderá ser realizado pela Contratada e seus representantes.'
  );
  writeParagraph(
    'Parágrafo Terceiro – A Contratada não será responsabilizada por eventual bloqueio das contas de anúncios em que são realizadas as campanhas da Contratante.'
  );

  // ── DA NÃO EXCLUSIVIDADE ──
  writeSectionHeader('DA NÃO EXCLUSIVIDADE');
  writeParagraph(
    'CLÁUSULA OITAVA - A prestação dos serviços discriminados na Cláusula Primeira não gera qualquer vínculo de natureza trabalhista/empregatícia entre as partes, sendo eles prestados com total independência e autonomia, não havendo qualquer responsabilidade das partes nas atividades exercidas por uma ou por outra.'
  );

  // ── DA CONFIDENCIALIDADE ──
  writeSectionHeader('DA CONFIDENCIALIDADE');
  writeParagraph(
    'CLÁUSULA NONA – As informações obtidas como consequência da celebração do presente instrumento são consideradas confidenciais, devendo ser mantidas no mais absoluto sigilo por ambos os contratantes.'
  );
  writeParagraph(
    'Parágrafo Único - A obrigação de confidencialidade disposta na presente cláusula perdurará por período indeterminado, mesmo após o término, rescisão ou extinção do presente contrato.'
  );

  // ── DA DURAÇÃO ──
  writeSectionHeader('DA DURAÇÃO');
  writeParagraph(
    `CLÁUSULA DÉCIMA – O presente instrumento vigerá pelo período de ${durationMonths} (${durationMonths === 1 ? 'um' : durationMonths}) meses, a contar da data de sua assinatura, podendo ser prorrogado por período equivalente, desde que comunicado por escrito, pela parte interessada, com o prazo mínimo de 30 (trinta) dias de antecedência ao término de sua vigência.`
  );

  // ── DA RESCISÃO ──
  writeSectionHeader('DA RESCISÃO E EXTINÇÃO DO CONTRATO');
  writeParagraph(
    'CLÁUSULA DÉCIMA PRIMEIRA - Apesar do caráter irrevogável e irretratável da presente avença, podem, quaisquer das partes, rescindir o instrumento, independentemente de justificativa, desde que sua intenção seja objeto de comunicação com antecedência mínima de 30 (trinta) dias, período no qual as obrigações por elas assumidas permanecerão em vigor.'
  );
  writeParagraph(
    `Parágrafo Primeiro – A rescisão injustificada do presente instrumento, por qualquer das partes, ensejará o pagamento de multa correspondente a ${formatCurrency(contract.value)}, pela parte que anunciar seu desejo de assim proceder.`
  );
  writeParagraph(
    'Parágrafo Segundo – O descumprimento repetitivo das obrigações assumidas pelas partes poderá ensejar a rescisão do presente contrato, ocasião na qual será aplicada multa correspondente a 20% (vinte por cento) do valor agregado do presente instrumento contratual, em benefício da parte prejudicada.'
  );

  // ── DISPOSIÇÕES GERAIS ──
  writeSectionHeader('DAS DISPOSIÇÕES GERAIS');
  writeParagraph(
    'CLÁUSULA DÉCIMA SEGUNDA – As disposições contidas no presente instrumento particular prevalecem sobre quaisquer outros entendimentos ou acordos feitos entre os contratantes, explícitos ou implícitos, que sejam conflitantes com o teor das informações aqui dispostas.'
  );
  writeParagraph(
    'CLÁUSULA DÉCIMA TERCEIRA – Em caso de necessidade de modificação em alguma das disposições ora estabelecidas, as partes deverão formalizar referida alteração por meio de aditivo contratual.'
  );
  writeParagraph(
    'CLÁUSULA DÉCIMA QUARTA – Quaisquer tolerâncias ou concessões, por quaisquer das partes, não possuem a capacidade de gerar direitos, alterar ou inovar as obrigações estipuladas neste instrumento.'
  );

  // ── DO FORO ──
  writeSectionHeader('DO FORO');
  const foroCity = agency.city || '[CIDADE]';
  const foroState = agency.state || '[ESTADO]';
  writeParagraph(
    `CLÁUSULA DÉCIMA QUINTA – As partes elegem o foro da comarca de ${foroCity}, ${foroState}, para dirimir quaisquer ações oriundas deste contrato.`
  );

  writeParagraph(
    'E, por estarem as partes assim acordadas, firmam o presente contrato particular, em 02 (duas) vias de igual teor e forma, na presença das 02 (duas) testemunhas, abaixo assinadas, que a tudo presenciaram, para que surtam seus jurídicos e legais efeitos.'
  );

  // ── Date & Signatures ──
  checkPage(80);
  y += 8;
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${agency.city || '[CIDADE]'}, ${agency.state || '[ESTADO]'}, ${dayStr} de ${monthStr} de ${yearStr}.`, margin, y);
  y += 20;

  const lineWidth = 75;
  doc.setDrawColor(17, 24, 39);

  // Left – Client (Contratante)
  doc.line(margin, y, margin + lineWidth, y);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  const clientSignName = isPJ ? (client.razao_social || client.company) : client.name;
  doc.text(clientSignName, margin, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const clientDoc = isPJ ? (client.cnpj ? `CNPJ nº ${client.cnpj}` : '') : (client.cpf ? `CPF nº ${client.cpf}` : '');
  if (clientDoc) doc.text(clientDoc, margin, y + 11);
  doc.text('(CONTRATANTE)', margin, y + 16);

  // Right – Agency (Contratada)
  const rightX = pageWidth - margin - lineWidth;
  doc.line(rightX, y, pageWidth - margin, y);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(agency.name || 'CONTRATADA', rightX, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  if (agency.cnpj) doc.text(`CNPJ nº ${agency.cnpj}`, rightX, y + 11);
  doc.text('(CONTRATADA)', rightX, y + 16);


  // ── Footer on all pages ──
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Contrato ${clientSignName} · ${format(new Date(), 'dd/MM/yyyy')} · Página ${i} de ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  const fileName = `Contrato_${(client.company || client.name).replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(fileName);
}
