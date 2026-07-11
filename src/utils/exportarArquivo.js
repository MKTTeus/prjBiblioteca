import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

/**
 * Gera um PDF real (arquivo binário) que é baixado diretamente pelo navegador
 * e pode ser aberto/visualizado em qualquer leitor de PDF — diferente da
 * abordagem antiga (window.print()), que só abria a caixa de diálogo de
 * impressão do navegador e não gerava um arquivo de fato.
 *
 * @param {Object} opcoes
 * @param {string} opcoes.titulo - Título principal do relatório.
 * @param {string} [opcoes.subtitulo] - Linha secundária (ex.: período filtrado).
 * @param {string[]} opcoes.colunas - Cabeçalhos das colunas.
 * @param {Array<Array<string|number>>} opcoes.linhas - Linhas da tabela.
 * @param {string} opcoes.nomeArquivo - Nome do arquivo (sem extensão).
 */
export function exportarPDF({ titulo, subtitulo, colunas, linhas, nomeArquivo }) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const dataGeracao = new Date().toLocaleString("pt-BR");

  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59);
  doc.text(titulo, 40, 40);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  if (subtitulo) doc.text(subtitulo, 40, 58);
  doc.text(`Gerado em: ${dataGeracao}`, 40, subtitulo ? 74 : 58);

  autoTable(doc, {
    head: [colunas],
    body: linhas,
    startY: subtitulo ? 90 : 74,
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [79, 70, 229], textColor: 255 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  doc.save(`${nomeArquivo}.pdf`);
}

/**
 * Gera um PDF real para a Ficha Catalográfica, reproduzindo o layout de
 * "cartão" (moldura, recuo de segunda linha no título, CDD alinhado à
 * direita) que antes só existia como HTML jogado numa janela de impressão.
 *
 * @param {Object} opcoes
 * @param {string} opcoes.tituloLivro
 * @param {string[]} opcoes.paragrafos - Parágrafos da ficha, na ordem:
 *   [autor, título, publicação, descrição, isbn, assuntos, cdd].
 * @param {string} opcoes.nomeArquivo
 */
export function exportarFichaCatalografica({ tituloLivro, paragrafos, nomeArquivo }) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const dataGeracao = new Date().toLocaleString("pt-BR");
  const margemBox = 60;
  const larguraBox = doc.internal.pageSize.getWidth() - margemBox * 2;
  const paddingBox = 24;
  const larguraTexto = larguraBox - paddingBox * 2;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(79, 70, 229);
  doc.text("Ficha Catalográfica", margemBox, 50);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(tituloLivro || "Livro", margemBox, 66);
  doc.text(`Gerado em: ${dataGeracao}`, margemBox + larguraBox, 50, { align: "right" });

  const linhas = paragrafos.filter(Boolean);
  const ultimaLinha = linhas[linhas.length - 1] || "";
  const linhasCorpo = linhas.slice(0, -1);

  doc.setFont("courier", "normal");
  doc.setFontSize(10);
  doc.setTextColor(17, 17, 17);

  let y = 90 + paddingBox;
  const boxTopo = 90;
  const xBox = margemBox;

  linhasCorpo.forEach((paragrafo, index) => {
    const negrito = index === 0; // autor
    doc.setFont("courier", negrito ? "bold" : "normal");
    const quebradas = doc.splitTextToSize(paragrafo, larguraTexto);
    quebradas.forEach((linha) => {
      doc.text(linha, xBox + paddingBox, y);
      y += 15;
    });
    y += 6;
  });

  // Linha divisória + CDD alinhado à direita, em negrito
  y += 4;
  doc.setDrawColor(51, 51, 51);
  doc.line(xBox + paddingBox, y, xBox + larguraBox - paddingBox, y);
  y += 18;
  doc.setFont("courier", "bold");
  doc.text(ultimaLinha, xBox + larguraBox - paddingBox, y, { align: "right" });
  y += 14;

  // Moldura ao redor de todo o conteúdo
  doc.setDrawColor(51, 51, 51);
  doc.setLineWidth(1);
  doc.rect(xBox, boxTopo, larguraBox, y - boxTopo + paddingBox);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    "Documento gerado automaticamente pelo sistema de gerenciamento da biblioteca.",
    doc.internal.pageSize.getWidth() / 2,
    y + paddingBox + 24,
    { align: "center" }
  );

  doc.save(`${nomeArquivo}.pdf`);
}

/**
 * Gera um arquivo .xlsx real para download, usando SheetJS.
 *
 * @param {Object} opcoes
 * @param {string} opcoes.nomeAba - Nome da planilha/aba.
 * @param {string[]} opcoes.colunas - Cabeçalhos das colunas.
 * @param {Array<Array<string|number>>} opcoes.linhas - Linhas da tabela.
 * @param {string} opcoes.nomeArquivo - Nome do arquivo (sem extensão).
 */
export function exportarExcel({ nomeAba, colunas, linhas, nomeArquivo }) {
  const planilha = XLSX.utils.aoa_to_sheet([colunas, ...linhas]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, planilha, nomeAba || "Dados");
  XLSX.writeFile(workbook, `${nomeArquivo}.xlsx`);
}