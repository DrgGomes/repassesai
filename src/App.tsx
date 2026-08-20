import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  LayoutDashboard,
  UploadCloud,
  Hourglass,
  AlertCircle,
  Download,
  CheckCircle2,
  FileSpreadsheet,
  TrendingUp,
  AlertTriangle,
  FileText,
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const [upsellerData, setUpsellerData] = useState<any[]>([]);
  const [kwaiData, setKwaiData] = useState<any[]>([]);
  const [resultados, setResultados] = useState<any>(null);

  const COLORS = ['#10b981', '#F1C40F', '#e74c3c', '#94a3b8'];

  // --- MÓDULO DE EMPILHAMENTO DE DADOS ---
  const lerPlanilha = (e: any, setDados: Function, nomeSistema: string) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evento) => {
      const arrayBuffer = evento.target?.result;
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const aba = workbook.Sheets[workbook.SheetNames[0]];
      const dadosJson = XLSX.utils.sheet_to_json(aba);

      setDados((prev: any[]) => {
        const novosDados = [...prev, ...dadosJson];
        alert(
          `✅ Mais ${dadosJson.length} linhas da ${nomeSistema} adicionadas! Total agora: ${novosDados.length} linhas.`
        );
        return novosDados;
      });
      e.target.value = '';
    };
    reader.readAsArrayBuffer(file);
  };

  const parseDataStr = (dateStr: string) => {
    if (!dateStr) return new Date(0);
    return new Date(dateStr.toString().replace(' ', 'T'));
  };

  // --- EXPORTAR EXCEL ---
  const exportarExcel = (dados: any[], nomeArquivo: string) => {
    if (!dados || dados.length === 0)
      return alert('Não há dados para exportar.');
    const worksheet = XLSX.utils.json_to_sheet(dados);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatório');
    XLSX.writeFile(workbook, `${nomeArquivo}.xlsx`);
  };

  // --- EXPORTAR PDF CORRIGIDO ---
  const exportarPDF = (dados: any[], titulo: string, nomeArquivo: string) => {
    if (!dados || dados.length === 0)
      return alert('Não há dados para exportar.');

    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.setTextColor(26, 26, 26);
    doc.text(`REPASSE.AI - ${titulo}`, 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Gerado em: ${new Date().toLocaleDateString()} às ${new Date().toLocaleTimeString()}`,
      14,
      28
    );

    const colunas = Object.keys(dados[0]);
    const linhas = dados.map((obj) => colunas.map((col) => obj[col]));

    autoTable(doc, {
      head: [colunas],
      body: linhas,
      startY: 35,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: {
        fillColor: [26, 26, 26],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    doc.save(`${nomeArquivo}.pdf`);
  };

  // --- MOTOR MATEMÁTICO ---
  const executarConciliacao = () => {
    if (upsellerData.length === 0 || kwaiData.length === 0) {
      alert('⚠️ Faça o upload das DUAS planilhas antes de conciliar.');
      return;
    }

    let maxKwaiDate = new Date(0);

    const kwaiLimpo: any[] = [];
    const kwaiIds = new Set();
    [...kwaiData].reverse().forEach((row) => {
      const idKwai = String(row['Número do pedido']);
      if (!kwaiIds.has(idKwai) && row['Status de liquidação'] !== 'Cancelar') {
        kwaiIds.add(idKwai);
        kwaiLimpo.push(row);
      }

      const dataString =
        row['Data de conclusão do pedido'] ||
        row['Data de geração do pedido'] ||
        (row['Ciclo de faturamento']
          ? String(row['Ciclo de faturamento']).split('~')[1]
          : null);
      if (dataString) {
        const d = parseDataStr(dataString);
        if (d > maxKwaiDate) maxKwaiDate = d;
      }
    });

    if (maxKwaiDate.getTime() === 0) maxKwaiDate = new Date();

    const upsellerLimpo: any[] = [];
    const upIds = new Set();
    upsellerData.forEach((row) => {
      const idPedido = String(row['Nº de Pedido da Plataforma']);
      if (!upIds.has(idPedido)) {
        upIds.add(idPedido);
        upsellerLimpo.push(row);
      }
    });

    let atrasados: any[] = [];
    let indevidos: any[] = [];
    let noPrazo: any[] = [];
    let corretosLista: any[] = [];
    let valorBruto = 0;
    let totalRetido = 0;

    upsellerLimpo.forEach((upRow) => {
      const statusPos = upRow['Pós-venda/Cancelado/Devolvido'];
      if (statusPos === 'Cancelado' || statusPos === 'Cancelado/Pós-vendas')
        return;

      const idPedido = String(upRow['Nº de Pedido da Plataforma']);
      const valorPedido = Number(upRow['Valor do Pedido']) || 0;
      const qtd = Number(upRow['Qtd. do Produto']) || 1;

      valorBruto += valorPedido;

      const kwaiRow = kwaiLimpo.find(
        (k) => String(k['Número do pedido']) === idPedido
      );
      const taxaRegra = valorPedido * 0.2 + qtd * 4.0;
      const repasseEsperado = valorPedido - taxaRegra;

      if (!kwaiRow) {
        const dataEnvio = parseDataStr(
          upRow['Hora de Envio'] || upRow['Hora do Pedido']
        );
        const dataVencimento = new Date(
          dataEnvio.getTime() + 22 * 24 * 60 * 60 * 1000
        );

        if (dataVencimento > maxKwaiDate) {
          noPrazo.push({
            'ID do Pedido': idPedido,
            'Valor Cliente (R$)': Number(valorPedido.toFixed(2)),
            'Data Envio': dataEnvio.toLocaleDateString(),
            'Vencimento Esperado': dataVencimento.toLocaleDateString(),
          });
        } else {
          atrasados.push({
            'ID do Pedido': idPedido,
            'Valor Cliente (R$)': Number(valorPedido.toFixed(2)),
            'Repasse Atrasado (R$)': Number(repasseEsperado.toFixed(2)),
          });
          totalRetido += repasseEsperado;
        }
      } else {
        const receitaKwai = Number(kwaiRow['Receita']) || 0;
        const descontoReal = valorPedido - receitaKwai;
        const cobradoAMais = descontoReal - taxaRegra;

        if (cobradoAMais > 0.5) {
          indevidos.push({
            'ID do Pedido': idPedido,
            'Valor Cliente (R$)': Number(valorPedido.toFixed(2)),
            'Desconto Aplicado (R$)': Number(descontoReal.toFixed(2)),
            'Roubo na Taxa (R$)': Number(cobradoAMais.toFixed(2)),
          });
          totalRetido += cobradoAMais;
        } else {
          corretosLista.push({
            'ID do Pedido': idPedido,
            'Valor Cliente (R$)': Number(valorPedido.toFixed(2)),
            'Receita Kwai (R$)': Number(receitaKwai.toFixed(2)),
          });
        }
      }
    });

    const chartStatus = [
      { name: 'Pagos Corretos', value: corretosLista.length },
      { name: 'No Prazo', value: noPrazo.length },
      { name: 'Taxa Indevida', value: indevidos.length },
      { name: 'Atrasados', value: atrasados.length },
    ].filter((item) => item.value > 0);

    const chartFinanceiro = [
      { name: 'Prejuízo/Retido', valor: Number(totalRetido.toFixed(2)) },
      {
        name: 'Repassado',
        valor: Number((valorBruto - totalRetido).toFixed(2)),
      },
    ];

    setResultados({
      atrasados,
      indevidos,
      noPrazo,
      corretos: corretosLista,
      valorBruto,
      totalRetido,
      maxKwaiDate,
      chartStatus,
      chartFinanceiro,
    });
    setActiveTab('dashboard');
  };

  const NavButton = ({ id, icon: Icon, label }: any) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all duration-300 ${
        activeTab === id
          ? 'bg-[#F1C40F] text-[#1a1a1a] shadow-lg scale-105'
          : 'text-gray-400 hover:bg-gray-800 hover:text-white'
      }`}
    >
      <Icon size={20} />
      <span className="hidden md:inline">{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-[#f3f4f6] font-sans text-gray-800 overflow-hidden">
      {/* SIDEBAR */}
      <div className="w-20 md:w-64 bg-[#1a1a1a] flex flex-col shadow-2xl z-20 flex-shrink-0">
        <div className="p-4 md:p-6 border-b border-gray-800 flex flex-col items-center md:items-start">
          <div className="bg-[#F1C40F] p-2 rounded-lg mb-2">
            <TrendingUp size={24} className="text-[#1a1a1a]" />
          </div>
          <h1 className="hidden md:block text-2xl font-black tracking-widest text-white mt-2">
            REPASSE<span className="text-[#F1C40F]">.AI</span>
          </h1>
          <p className="hidden md:block text-[10px] text-gray-500 uppercase tracking-widest mt-1">
            Versão 1.5 Final
          </p>
        </div>

        <nav className="flex-1 p-3 space-y-4 mt-4">
          <NavButton
            id="dashboard"
            icon={LayoutDashboard}
            label="Visão Geral"
          />
          <NavButton id="upload" icon={UploadCloud} label="Nova Auditoria" />
          <NavButton id="aguardando" icon={Hourglass} label="No Prazo" />
          <NavButton
            id="cobranca"
            icon={AlertTriangle}
            label="Fila de Cobrança"
          />
        </nav>
      </div>

      {/* ÁREA PRINCIPAL (TELA CHEIA RESOLVIDA) */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth w-full">
        {/* DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="w-full h-full animate-fade-in">
            <header className="mb-8">
              <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
                Dashboard Financeiro
              </h2>
              <p className="text-gray-500 mt-1">
                Visão completa e responsiva do seu fluxo de caixa.
              </p>
            </header>

            {!resultados ? (
              <div className="flex flex-col items-center justify-center bg-white p-16 rounded-3xl shadow-sm border border-gray-100 mt-10">
                <FileSpreadsheet size={64} className="text-gray-300 mb-6" />
                <h3 className="text-xl font-bold text-gray-600">
                  Nenhum dado processado
                </h3>
                <button
                  onClick={() => setActiveTab('upload')}
                  className="mt-8 bg-[#1a1a1a] text-white px-8 py-3 rounded-full font-bold hover:bg-gray-800 transition-colors"
                >
                  Iniciar Auditoria
                </button>
              </div>
            ) : (
              <>
                {/* KPIs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 mb-8 w-full">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between w-full">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">
                        Volume Bruto
                      </p>
                      <div className="bg-blue-50 p-2 rounded-lg">
                        <TrendingUp size={16} className="text-blue-500" />
                      </div>
                    </div>
                    <p className="text-2xl xl:text-3xl font-black text-gray-800 break-words whitespace-normal leading-tight mt-2">
                      R${' '}
                      {resultados.valorBruto.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </div>

                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between w-full">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">
                        Pagos Corretos
                      </p>
                      <div className="bg-green-50 p-2 rounded-lg">
                        <CheckCircle2 size={16} className="text-green-500" />
                      </div>
                    </div>
                    <p className="text-2xl xl:text-3xl font-black text-gray-800 break-words whitespace-normal leading-tight mt-2">
                      {resultados.corretos.length}{' '}
                      <span className="text-sm font-medium text-gray-400">
                        pedidos
                      </span>
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 mt-4">
                      <button
                        onClick={() =>
                          exportarExcel(
                            resultados.corretos,
                            'Pagos_Corretamente'
                          )
                        }
                        className="flex-1 flex items-center justify-center gap-1 text-xs font-bold text-green-700 bg-green-50 hover:bg-green-100 py-2 rounded-lg transition-colors"
                      >
                        <Download size={14} /> Excel
                      </button>
                      <button
                        onClick={() =>
                          exportarPDF(
                            resultados.corretos,
                            'Pedidos Pagos Corretamente',
                            'Pagos_Corretos_PDF'
                          )
                        }
                        className="flex-1 flex items-center justify-center gap-1 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 py-2 rounded-lg transition-colors"
                      >
                        <FileText size={14} /> PDF
                      </button>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between w-full">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">
                        Em Prazo
                      </p>
                      <div className="bg-yellow-50 p-2 rounded-lg">
                        <Hourglass size={16} className="text-yellow-600" />
                      </div>
                    </div>
                    <p className="text-2xl xl:text-3xl font-black text-gray-800 break-words whitespace-normal leading-tight mt-2">
                      {resultados.noPrazo.length}{' '}
                      <span className="text-sm font-medium text-gray-400">
                        pedidos
                      </span>
                    </p>
                  </div>

                  <div className="bg-red-50 p-6 rounded-2xl shadow-sm border border-red-100 flex flex-col justify-between relative overflow-hidden w-full">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-red-100 rounded-bl-full -mr-8 -mt-8"></div>
                    <div className="flex justify-between items-start mb-2 relative z-10">
                      <p className="text-xs text-red-600 font-bold uppercase tracking-wider">
                        Prejuízo (Cobrar)
                      </p>
                      <div className="bg-white p-2 rounded-lg shadow-sm">
                        <AlertCircle size={16} className="text-red-600" />
                      </div>
                    </div>
                    <p className="text-2xl xl:text-3xl font-black text-red-600 break-words whitespace-normal leading-tight mt-2 relative z-10">
                      R${' '}
                      {resultados.totalRetido.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </div>

                {/* CHARTS */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-10 w-full">
                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 h-96 flex flex-col w-full">
                    <h3 className="text-lg font-bold text-gray-800 mb-6">
                      Status dos Pedidos
                    </h3>
                    <div className="flex-1 min-h-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={resultados.chartStatus}
                            cx="50%"
                            cy="50%"
                            innerRadius="55%"
                            outerRadius="80%"
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {resultados.chartStatus.map(
                              (entry: any, index: number) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={COLORS[index % COLORS.length]}
                                />
                              )
                            )}
                          </Pie>
                          <RechartsTooltip
                            formatter={(value) => [
                              `${value} pedidos`,
                              'Quantidade',
                            ]}
                          />
                          <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 h-96 flex flex-col w-full">
                    <h3 className="text-lg font-bold text-gray-800 mb-6">
                      Raio-X Financeiro
                    </h3>
                    <div className="flex-1 min-h-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={resultados.chartFinanceiro}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis hide />
                          <RechartsTooltip
                            cursor={{ fill: 'transparent' }}
                            formatter={(value: number) => [
                              `R$ ${value.toLocaleString('pt-BR', {
                                minimumFractionDigits: 2,
                              })}`,
                              'Valor',
                            ]}
                          />
                          <Bar
                            dataKey="valor"
                            radius={[8, 8, 8, 8]}
                            maxBarSize={100}
                          >
                            {resultados.chartFinanceiro.map(
                              (entry: any, index: number) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={index === 0 ? '#e74c3c' : '#10b981'}
                                />
                              )
                            )}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 2: UPLOAD */}
        {activeTab === 'upload' && (
          <div className="w-full mx-auto animate-fade-in">
            <header className="mb-10 text-center md:text-left">
              <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
                Nova Auditoria
              </h2>
              <p className="text-gray-500 mt-2">
                Você pode subir vários arquivos seguidos. O sistema vai empilhar
                e juntar tudo!
              </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10 w-full">
              <label
                className={`relative overflow-hidden border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
                  upsellerData.length > 0
                    ? 'border-[#10b981] bg-[#ecfdf5]'
                    : 'border-gray-300 bg-white hover:border-[#F1C40F] hover:shadow-lg'
                }`}
              >
                {upsellerData.length > 0 && (
                  <div className="absolute top-4 right-4 bg-[#10b981] text-white p-1 rounded-full">
                    <CheckCircle2 size={20} />
                  </div>
                )}
                <UploadCloud
                  size={48}
                  className={
                    upsellerData.length > 0
                      ? 'text-[#10b981] mb-4'
                      : 'text-gray-400 mb-4'
                  }
                />
                <p className="text-gray-700 mb-4 font-bold text-center">
                  {upsellerData.length > 0
                    ? `${upsellerData.length} registros (Pode subir mais!)`
                    : '1. Relatório UPSELLER'}
                </p>
                <div className="bg-[#1a1a1a] text-white px-8 py-3 rounded-full font-bold text-sm shadow-md hover:scale-105 transition-transform">
                  Selecionar Arquivo
                </div>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={(e) => lerPlanilha(e, setUpsellerData, 'Upseller')}
                />
              </label>

              <label
                className={`relative overflow-hidden border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
                  kwaiData.length > 0
                    ? 'border-[#10b981] bg-[#ecfdf5]'
                    : 'border-gray-300 bg-white hover:border-[#F1C40F] hover:shadow-lg'
                }`}
              >
                {kwaiData.length > 0 && (
                  <div className="absolute top-4 right-4 bg-[#10b981] text-white p-1 rounded-full">
                    <CheckCircle2 size={20} />
                  </div>
                )}
                <FileSpreadsheet
                  size={48}
                  className={
                    kwaiData.length > 0
                      ? 'text-[#10b981] mb-4'
                      : 'text-gray-400 mb-4'
                  }
                />
                <p className="text-gray-700 mb-4 font-bold text-center">
                  {kwaiData.length > 0
                    ? `${kwaiData.length} registros (Pode subir mais!)`
                    : '2. Extrato KWAI'}
                </p>
                <div className="bg-[#F1C40F] text-[#1a1a1a] px-8 py-3 rounded-full font-bold text-sm shadow-md hover:scale-105 transition-transform">
                  Selecionar Arquivo
                </div>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={(e) => lerPlanilha(e, setKwaiData, 'Kwai')}
                />
              </label>
            </div>

            <button
              onClick={executarConciliacao}
              className="w-full relative overflow-hidden group bg-[#1a1a1a] text-[#F1C40F] font-black text-xl py-6 rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all uppercase tracking-widest flex items-center justify-center gap-3"
            >
              <span className="relative z-10 flex items-center gap-2">
                Processar Cruzamento <TrendingUp size={24} />
              </span>
              <div className="absolute inset-0 bg-black w-0 group-hover:w-full transition-all duration-500 ease-out z-0"></div>
            </button>
          </div>
        )}

        {/* TAB 3: AGUARDANDO VENCIMENTO */}
        {activeTab === 'aguardando' && (
          <div className="w-full animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
              <div>
                <h2 className="text-3xl font-black text-gray-900 tracking-tight">
                  Pedidos no Prazo
                </h2>
                <p className="text-gray-500 mt-1">
                  Ainda não completaram o ciclo logístico de 22 dias.
                </p>
              </div>
              {resultados && resultados.noPrazo.length > 0 && (
                <div className="flex gap-2 w-full md:w-auto">
                  <button
                    onClick={() =>
                      exportarExcel(resultados.noPrazo, 'Aguardando_Vencimento')
                    }
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-green-50 border border-green-200 text-green-700 px-6 py-3 rounded-xl font-bold shadow-sm hover:bg-green-100 transition-colors"
                  >
                    <Download size={18} /> Excel
                  </button>
                  <button
                    onClick={() =>
                      exportarPDF(
                        resultados.noPrazo,
                        'Pedidos Aguardando Vencimento',
                        'NoPrazo_PDF'
                      )
                    }
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-red-50 border border-red-200 text-red-700 px-6 py-3 rounded-xl font-bold shadow-sm hover:bg-red-100 transition-colors"
                  >
                    <FileText size={18} /> PDF
                  </button>
                </div>
              )}
            </div>

            {!resultados ? (
              <div className="bg-white rounded-3xl shadow-sm p-12 text-center border border-gray-100 text-gray-500">
                Nenhum dado disponível.
              </div>
            ) : (
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden w-full">
                <div className="max-h-[70vh] overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="p-4 whitespace-nowrap">ID do Pedido</th>
                        <th className="p-4 whitespace-nowrap">Data Envio</th>
                        <th className="p-4 whitespace-nowrap">Vencimento</th>
                        <th className="p-4 text-right whitespace-nowrap">
                          Valor
                        </th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {resultados.noPrazo.map((item: any, idx: number) => (
                        <tr
                          key={idx}
                          className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                        >
                          <td className="p-4 font-mono font-bold text-gray-700">
                            {item['ID do Pedido']}
                          </td>
                          <td className="p-4 text-gray-500 whitespace-nowrap">
                            {item['Data Envio']}
                          </td>
                          <td className="p-4 text-yellow-600 font-semibold whitespace-nowrap">
                            {item['Vencimento Esperado']}
                          </td>
                          <td className="p-4 text-right font-bold text-gray-700 whitespace-nowrap">
                            R$ {item['Valor Cliente (R$)'].toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {resultados.noPrazo.length === 0 && (
                    <p className="text-gray-400 text-center py-10">
                      Lista vazia.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: FILA DE COBRANÇA */}
        {activeTab === 'cobranca' && (
          <div className="w-full animate-fade-in pb-10">
            <header className="mb-8">
              <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
                Fila de Cobrança
              </h2>
              <p className="text-gray-500 mt-1">
                Dossiês prontos para exportar e abrir chamado.
              </p>
            </header>

            {!resultados ? (
              <div className="bg-white rounded-3xl shadow-sm p-12 text-center border border-gray-100 text-gray-500">
                Nenhum dado processado.
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 w-full">
                {/* ATRASADOS CARD */}
                <div className="bg-white border border-gray-100 rounded-3xl shadow-sm flex flex-col h-[75vh] overflow-hidden w-full">
                  <div className="bg-orange-50 p-4 lg:p-6 border-b border-orange-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h3 className="font-black text-orange-800 text-lg flex items-center gap-2">
                        <Hourglass size={20} /> Pedidos Atrasados
                      </h3>
                      <p className="text-orange-600 text-xs mt-1">
                        {resultados.atrasados.length} pedidos retidos
                      </p>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <button
                        onClick={() =>
                          exportarExcel(resultados.atrasados, 'Atrasados_Kwai')
                        }
                        className="flex-1 sm:flex-none flex justify-center items-center gap-1 text-xs bg-green-100 text-green-800 px-4 py-2 rounded-lg font-bold hover:bg-green-200 transition-colors"
                      >
                        <Download size={14} /> Excel
                      </button>
                      <button
                        onClick={() =>
                          exportarPDF(
                            resultados.atrasados,
                            'Dossie de Pedidos Atrasados',
                            'Atrasados_Kwai_PDF'
                          )
                        }
                        className="flex-1 sm:flex-none flex justify-center items-center gap-1 text-xs bg-red-100 text-red-800 px-4 py-2 rounded-lg font-bold hover:bg-red-200 transition-colors"
                      >
                        <FileText size={14} /> PDF
                      </button>
                    </div>
                  </div>
                  <div className="overflow-y-auto flex-1 p-0">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 text-gray-400 text-xs uppercase font-bold sticky top-0 z-10 shadow-sm">
                        <tr>
                          <th className="p-4">ID</th>
                          <th className="p-4 text-right">Valor Devido</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {resultados.atrasados.map((item: any, idx: number) => (
                          <tr
                            key={idx}
                            className="border-b border-gray-50 hover:bg-orange-50/50"
                          >
                            <td className="p-4 font-mono font-bold text-gray-700">
                              {item['ID do Pedido']}
                            </td>
                            <td className="p-4 text-right font-black text-orange-600 whitespace-nowrap">
                              R$ {item['Repasse Atrasado (R$)'].toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* INDEVIDOS CARD */}
                <div className="bg-white border border-gray-100 rounded-3xl shadow-sm flex flex-col h-[75vh] overflow-hidden w-full">
                  <div className="bg-red-50 p-4 lg:p-6 border-b border-red-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h3 className="font-black text-red-800 text-lg flex items-center gap-2">
                        <AlertTriangle size={20} /> Taxa Indevida
                      </h3>
                      <p className="text-red-600 text-xs mt-1">
                        {resultados.indevidos.length} fretes embutidos
                      </p>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <button
                        onClick={() =>
                          exportarExcel(
                            resultados.indevidos,
                            'TaxaIndevida_Kwai'
                          )
                        }
                        className="flex-1 sm:flex-none flex justify-center items-center gap-1 text-xs bg-green-100 text-green-800 px-4 py-2 rounded-lg font-bold hover:bg-green-200 transition-colors"
                      >
                        <Download size={14} /> Excel
                      </button>
                      <button
                        onClick={() =>
                          exportarPDF(
                            resultados.indevidos,
                            'Dossie de Taxas Indevidas',
                            'TaxaIndevida_Kwai_PDF'
                          )
                        }
                        className="flex-1 sm:flex-none flex justify-center items-center gap-1 text-xs bg-red-100 text-red-800 px-4 py-2 rounded-lg font-bold hover:bg-red-200 transition-colors"
                      >
                        <FileText size={14} /> PDF
                      </button>
                    </div>
                  </div>
                  <div className="overflow-y-auto flex-1 p-0">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 text-gray-400 text-xs uppercase font-bold sticky top-0 z-10 shadow-sm">
                        <tr>
                          <th className="p-4">ID</th>
                          <th className="p-4 text-right">Valor Roubado</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {resultados.indevidos.map((item: any, idx: number) => (
                          <tr
                            key={idx}
                            className="border-b border-gray-50 hover:bg-red-50/50"
                          >
                            <td className="p-4 font-mono font-bold text-gray-700">
                              {item['ID do Pedido']}
                            </td>
                            <td className="p-4 text-right font-black text-[#e74c3c] whitespace-nowrap">
                              R$ {item['Roubo na Taxa (R$)'].toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
