import { useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from './supabase';
import { 
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { 
  LayoutDashboard, UploadCloud, Hourglass, Download, FileSpreadsheet, AlertTriangle, Loader2, Database, LogOut, FileJson, Ban
} from 'lucide-react';

export default function Dashboard({ session }: any) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSyncing, setIsSyncing] = useState(false);
  const [upsellerData, setUpsellerData] = useState<any[]>([]);
  const [kwaiData, setKwaiData] = useState<any[]>([]);
  const [resultados, setResultados] = useState<any>(null);

  const COLORS = ['#10b981', '#F1C40F', '#e74c3c', '#94a3b8', '#6b7280'];

  const lerPlanilha = (e: any, setDados: Function) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evento) => {
      const arrayBuffer = evento.target?.result;
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const aba = workbook.Sheets[workbook.SheetNames[0]];
      const dadosJson = XLSX.utils.sheet_to_json(aba);
      setDados((prev: any[]) => [...prev, ...dadosJson]);
      e.target.value = ''; 
    };
    reader.readAsArrayBuffer(file);
  };

  const parseDataStr = (dateStr: string) => {
    if (!dateStr) return new Date(0);
    return new Date(dateStr.toString().replace(' ', 'T'));
  };

  const exportarExcel = (dados: any[], nomeArquivo: string) => {
    if (!dados || dados.length === 0) return alert("Não há dados.");
    const worksheet = XLSX.utils.json_to_sheet(dados);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Relatório");
    XLSX.writeFile(workbook, `${nomeArquivo}.xlsx`);
  };

  // NOVA FERRAMENTA: EXPORTAÇÃO JSON PARA AUDITORIA (PROVA REAL)
  const exportarJSON = () => {
    if (!resultados) return alert("Processe os dados primeiro.");
    const dossieAuditoria = {
      informacoes_sistema: {
        plataforma: "Repasse.AI SaaS",
        regras_matematicas_aplicadas: "Taxa Base Kwai 20% + R$ 4,00 por item.",
        data_auditoria: new Date().toISOString()
      },
      resumo_financeiro: {
        volume_bruto_reais: resultados.valorBruto,
        prejuizo_retido_reais: resultados.totalRetido
      },
      detalhamento_pedidos: {
        pagos_corretamente: resultados.corretos,
        taxas_indevidas: resultados.indevidos,
        atrasados_retidos: resultados.atrasados,
        no_prazo_logistico: resultados.noPrazo,
        ignorados_por_cancelamento: resultados.cancelados // Transparência total
      }
    };

    const blob = new Blob([JSON.stringify(dossieAuditoria, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Prova_Real_Auditoria_${new Date().getTime()}.json`;
    a.click();
  };

  const executarConciliacao = async () => {
    if (upsellerData.length === 0 || kwaiData.length === 0) return alert("⚠️ Suba os arquivos.");
    setIsSyncing(true);

    let maxKwaiDate = new Date(0);
    const kwaiLimpo: any[] = [];
    const kwaiIds = new Set();
    [...kwaiData].reverse().forEach(row => {
      const idKwai = String(row['Número do pedido']);
      if (!kwaiIds.has(idKwai) && row['Status de liquidação'] !== 'Cancelar') {
        kwaiIds.add(idKwai);
        kwaiLimpo.push(row);
      }
      const dataString = row['Data de conclusão do pedido'] || row['Data de geração do pedido'];
      if (dataString) {
        const d = parseDataStr(dataString);
        if (d > maxKwaiDate) maxKwaiDate = d;
      }
    });

    const upsellerLimpo: any[] = [];
    const upIds = new Set();
    upsellerData.forEach(row => {
      const idPedido = String(row['Nº de Pedido da Plataforma']);
      if (!upIds.has(idPedido)) {
        upIds.add(idPedido);
        upsellerLimpo.push(row);
      }
    });

    // Adicionado o array "cancelados"
    let atrasados: any[] = [], indevidos: any[] = [], noPrazo: any[] = [], corretos: any[] = [], cancelados: any[] = [];
    let valorBruto = 0, totalRetido = 0;
    const registrosBanco: any[] = [];

    upsellerLimpo.forEach(upRow => {
      const statusPos = upRow['Pós-venda/Cancelado/Devolvido'];
      const idPedido = String(upRow['Nº de Pedido da Plataforma']);
      const valorPedido = Number(upRow['Valor do Pedido']) || 0;
      const dEnvio = parseDataStr(upRow['Hora de Envio'] || upRow['Hora do Pedido']);
      const dVencimento = new Date(dEnvio.getTime() + (22 * 86400000));

      // AGORA NÃO IGNORAMOS MAIS SILENCIOSAMENTE. NÓS CATALOGAMOS!
      if (statusPos === 'Cancelado' || statusPos === 'Cancelado/Pós-vendas') {
        cancelados.push({
          "ID do Pedido": idPedido,
          "Status Upseller": statusPos,
          "Valor Original (R$)": valorPedido
        });
        
        // Salva no banco com status CANCELADO para manter o histórico 100% íntegro
        registrosBanco.push({
          id_pedido: idPedido,
          valor_bruto: valorPedido,
          data_envio: dEnvio.toISOString(),
          vencimento_esperado: dVencimento.toISOString(),
          status: "CANCELADO_DEVOLVIDO",
          receita_kwai: 0,
          roubo_taxa: 0,
          data_ultima_leitura: new Date().toISOString(),
          user_id: session.user.id 
        });
        return; // Sai deste pedido e vai pro próximo
      }
      
      const qtd = Number(upRow['Qtd. do Produto']) || 1;
      valorBruto += valorPedido;
      const kwaiRow = kwaiLimpo.find(k => String(k['Número do pedido']) === idPedido);
      const taxa = (valorPedido * 0.20) + (qtd * 4.00);
      const repasseEsperado = valorPedido - taxa;
      
      let statusBanco = "", recKwai = 0, roubo = 0;

      if (!kwaiRow) {
        if (dVencimento > maxKwaiDate) {
          noPrazo.push({ "ID do Pedido": idPedido, "Valor Cliente (R$)": valorPedido, "Data Envio": dEnvio.toLocaleDateString(), "Vencimento Esperado": dVencimento.toLocaleDateString() });
          statusBanco = "NO_PRAZO";
        } else {
          atrasados.push({ "ID do Pedido": idPedido, "Valor Cliente (R$)": valorPedido, "Repasse Atrasado (R$)": Number(repasseEsperado.toFixed(2)) });
          totalRetido += repasseEsperado;
          statusBanco = "ATRASADO";
        }
      } else {
        recKwai = Number(kwaiRow['Receita']) || 0;
        const cobradoAMais = (valorPedido - recKwai) - taxa;
        if (cobradoAMais > 0.50) {
          indevidos.push({ "ID do Pedido": idPedido, "Valor Cliente (R$)": valorPedido, "Desconto Aplicado (R$)": Number((valorPedido - recKwai).toFixed(2)), "Roubo na Taxa (R$)": Number(cobradoAMais.toFixed(2)) });
          totalRetido += cobradoAMais;
          roubo = cobradoAMais;
          statusBanco = "TAXA_INDEVIDA";
        } else {
          corretos.push({ "ID do Pedido": idPedido, "Valor Cliente (R$)": valorPedido, "Receita Kwai (R$)": recKwai });
          statusBanco = "PAGO_CORRETO";
        }
      }

      registrosBanco.push({
        id_pedido: idPedido,
        valor_bruto: valorPedido,
        data_envio: dEnvio.toISOString(),
        vencimento_esperado: dVencimento.toISOString(),
        status: statusBanco,
        receita_kwai: recKwai,
        roubo_taxa: roubo,
        data_ultima_leitura: new Date().toISOString(),
        user_id: session.user.id 
      });
    });

    try {
      for (let i = 0; i < registrosBanco.length; i += 500) {
        const lote = registrosBanco.slice(i, i + 500);
        await supabase.from('pedidos_kwai').upsert(lote);
      }
    } catch (err) {
      console.error(err);
    }

    setResultados({ 
      atrasados, indevidos, noPrazo, corretos, cancelados, valorBruto, totalRetido, 
      chartStatus: [
        {name:'Corretos',value:corretos.length},
        {name:'Prazo',value:noPrazo.length},
        {name:'Indevido',value:indevidos.length},
        {name:'Atrasado',value:atrasados.length},
        {name:'Cancelados',value:cancelados.length}
      ].filter(i=>i.value>0) 
    });
    setIsSyncing(false);
  };

  return (
    <div className="flex h-screen w-full bg-gray-100 overflow-hidden font-sans">
      <div className="w-64 bg-[#1a1a1a] text-white flex-shrink-0 p-6 flex flex-col justify-between overflow-y-auto">
        <div>
          <h1 className="text-2xl font-black mb-8 tracking-widest">REPASSE<span className="text-[#F1C40F]">.AI</span></h1>
          <nav className="space-y-4">
            <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 p-3 rounded-lg font-bold ${activeTab === 'dashboard' ? 'bg-[#F1C40F] text-black' : 'text-gray-400 hover:text-white'}`}><LayoutDashboard size={20}/> Visão Geral</button>
            <button onClick={() => setActiveTab('upload')} className={`w-full flex items-center gap-3 p-3 rounded-lg font-bold ${activeTab === 'upload' ? 'bg-[#F1C40F] text-black' : 'text-gray-400 hover:text-white'}`}><UploadCloud size={20}/> Nova Auditoria</button>
            <button onClick={() => setActiveTab('aguardando')} className={`w-full flex items-center gap-3 p-3 rounded-lg font-bold ${activeTab === 'aguardando' ? 'bg-[#F1C40F] text-black' : 'text-gray-400 hover:text-white'}`}><Hourglass size={20}/> No Prazo</button>
            <button onClick={() => setActiveTab('cobranca')} className={`w-full flex items-center gap-3 p-3 rounded-lg font-bold ${activeTab === 'cobranca' ? 'bg-[#F1C40F] text-black' : 'text-gray-400 hover:text-white'}`}><AlertTriangle size={20}/> Fila de Cobrança</button>
            {/* NOVO MENU: MALHA FINA */}
            <button onClick={() => setActiveTab('malhafina')} className={`w-full flex items-center gap-3 p-3 rounded-lg font-bold ${activeTab === 'malhafina' ? 'bg-[#F1C40F] text-black' : 'text-gray-400 hover:text-white'}`}><Ban size={20}/> Malha Fina</button>
          </nav>
        </div>
        
        <button onClick={() => supabase.auth.signOut()} className="w-full flex items-center justify-center gap-2 p-3 text-red-400 hover:bg-gray-800 rounded-lg transition-colors font-bold mt-auto border border-gray-800">
          <LogOut size={18}/> Sair do Sistema
        </button>
      </div>

      <div className="flex-1 h-full overflow-y-auto p-8">
        {activeTab === 'dashboard' && resultados && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 w-full animate-fade-in">
             <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-center h-80 relative">
              
              {/* BOTÃO PROVA REAL NO DASHBOARD */}
              <button onClick={exportarJSON} className="absolute top-6 right-6 flex items-center gap-2 text-xs font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg transition-colors" title="Baixar dossiê completo para auditar no ChatGPT/Claude">
                <FileJson size={16}/> Prova Real (JSON)
              </button>

              <h2 className="text-xl font-bold mb-6 text-gray-800">Visão Geral Financeira</h2>
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-blue-50 p-6 rounded-2xl">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Volume Bruto</p>
                  <p className="text-3xl font-black text-gray-900">R$ {resultados.valorBruto.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                </div>
                <div className="bg-red-50 p-6 rounded-2xl border border-red-100">
                  <p className="text-xs font-bold text-red-600 uppercase tracking-widest mb-2">Prejuízo (Cobrar)</p>
                  <p className="text-3xl font-black text-red-600">R$ {resultados.totalRetido.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 h-80 flex flex-col">
              <h3 className="text-lg font-bold text-gray-800 mb-6">Status dos Pedidos</h3>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart><Pie data={resultados.chartStatus} cx="50%" cy="50%" innerRadius="60%" outerRadius="80%" paddingAngle={5} dataKey="value">{resultados.chartStatus.map((_:any, index:number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><RechartsTooltip /><Legend verticalAlign="bottom" height={36}/></PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        
        {activeTab === 'dashboard' && !resultados && (
           <div className="flex flex-col items-center justify-center bg-white p-16 rounded-3xl shadow-sm border border-gray-100 mt-10 w-full animate-fade-in">
             <Database size={64} className="text-gray-300 mb-6" />
             <h3 className="text-xl font-bold text-gray-600">Pronto para Auditar</h3>
             <button onClick={() => setActiveTab('upload')} className="mt-8 bg-[#1a1a1a] text-[#F1C40F] px-8 py-3 rounded-full font-bold hover:scale-105 transition-transform">Iniciar Auditoria</button>
           </div>
        )}

        {activeTab === 'upload' && (
          <div className="w-full flex flex-col items-center gap-6 animate-fade-in">
             <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 mb-4">
              <label className="border-2 border-dashed border-gray-300 bg-white rounded-3xl p-10 flex flex-col items-center cursor-pointer hover:border-[#F1C40F] transition-all"><UploadCloud size={48} className="text-gray-400 mb-4"/><p className="font-bold text-gray-700">{upsellerData.length > 0 ? `${upsellerData.length} registros (Upseller)` : '1. Upload UPSELLER'}</p><input type="file" className="hidden" onChange={(e) => lerPlanilha(e, setUpsellerData)} /></label>
              <label className="border-2 border-dashed border-gray-300 bg-white rounded-3xl p-10 flex flex-col items-center cursor-pointer hover:border-[#F1C40F] transition-all"><FileSpreadsheet size={48} className="text-gray-400 mb-4"/><p className="font-bold text-gray-700">{kwaiData.length > 0 ? `${kwaiData.length} registros (Kwai)` : '2. Upload KWAI'}</p><input type="file" className="hidden" onChange={(e) => lerPlanilha(e, setKwaiData)} /></label>
            </div>
            <button onClick={executarConciliacao} disabled={isSyncing} className={`w-full py-6 rounded-2xl shadow-xl font-black text-xl uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${isSyncing ? 'bg-gray-800 text-gray-400 cursor-not-allowed' : 'bg-[#1a1a1a] text-[#F1C40F] hover:-translate-y-1'}`}>
              {isSyncing ? <><Loader2 className="animate-spin" size={24}/> Processando Nuvem...</> : <><Database size={24}/> Processar Relatórios</>}
            </button>
          </div>
        )}

        {/* Tabelas de Exportação */}
        {activeTab === 'aguardando' && (
           <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden w-full p-6 animate-fade-in">
             <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black">Pedidos no Prazo</h2>
                {resultados?.noPrazo.length > 0 && <button onClick={() => exportarExcel(resultados.noPrazo, "Aguardando_Vencimento")} className="bg-green-100 text-green-700 px-4 py-2 rounded-lg font-bold flex gap-2"><Download size={18}/> Excel</button>}
             </div>
             {resultados?.noPrazo.length > 0 ? <p className="text-gray-500">{resultados.noPrazo.length} pedidos encontrados.</p> : <p className="text-gray-400">Nenhum dado.</p>}
           </div>
        )}

        {activeTab === 'cobranca' && (
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full animate-fade-in">
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col h-[75vh]">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-black text-orange-600 text-lg flex items-center gap-2"><Hourglass size={20}/> Atrasados</h3>
                  {resultados?.atrasados.length > 0 && <button onClick={() => exportarExcel(resultados.atrasados, "Atrasados")} className="bg-green-100 text-green-700 px-4 py-2 rounded-lg font-bold text-sm flex gap-2"><Download size={16}/> Excel</button>}
                </div>
                 {resultados?.atrasados.length > 0 ? <p className="text-gray-500">{resultados.atrasados.length} pedidos atrasados.</p> : <p className="text-gray-400">Nenhum dado.</p>}
              </div>

              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col h-[75vh]">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-black text-red-600 text-lg flex items-center gap-2"><AlertTriangle size={20}/> Taxa Indevida</h3>
                  {resultados?.indevidos.length > 0 && <button onClick={() => exportarExcel(resultados.indevidos, "Taxa_Indevida")} className="bg-green-100 text-green-700 px-4 py-2 rounded-lg font-bold text-sm flex gap-2"><Download size={16}/> Excel</button>}
                </div>
                {resultados?.indevidos.length > 0 ? <p className="text-gray-500">{resultados.indevidos.length} fretes embutidos.</p> : <p className="text-gray-400">Nenhum dado.</p>}
              </div>
           </div>
        )}

        {/* NOVA ABA: MALHA FINA */}
        {activeTab === 'malhafina' && (
          <div className="w-full animate-fade-in">
            <header className="mb-8">
              <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">Malha Fina (Cancelados)</h2>
              <p className="text-gray-500 mt-1">Pedidos que o sistema detectou como cancelados/devolvidos e separou para sua verificação manual.</p>
            </header>
            {!resultados ? ( <div className="bg-white rounded-3xl shadow-sm p-12 text-center border border-gray-100 text-gray-500 w-full">Nenhum dado processado.</div> ) : (
              <div className="bg-white border border-gray-100 rounded-3xl shadow-sm flex flex-col overflow-hidden w-full max-h-[75vh]">
                <div className="bg-gray-50 p-4 lg:p-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="font-black text-gray-800 text-lg flex items-center gap-2"><Ban size={20}/> Pedidos Ignorados</h3>
                    <p className="text-gray-600 text-xs mt-1">{resultados.cancelados.length} pedidos não entraram no cálculo bruto.</p>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    {resultados.cancelados.length > 0 && <button onClick={() => exportarExcel(resultados.cancelados, "Cancelados_Devolvidos")} className="flex-1 sm:flex-none flex justify-center items-center gap-1 text-xs bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-bold hover:bg-gray-300 transition-colors"><Download size={14}/> Exportar Excel</button>}
                  </div>
                </div>
                <div className="overflow-y-auto flex-1 p-0">
                  <table className="w-full text-left">
                    <thead className="bg-gray-100 text-gray-500 text-xs uppercase font-bold sticky top-0 z-10 shadow-sm">
                      <tr><th className="p-4">ID do Pedido</th><th className="p-4">Status Upseller</th><th className="p-4 text-right">Valor Original</th></tr>
                    </thead>
                    <tbody className="text-sm">
                      {resultados.cancelados.map((item: any, idx: number) => (
                        <tr key={idx} className="border-b border-gray-50 hover:bg-gray-100/50 transition-colors">
                          <td className="p-4 font-mono font-bold text-gray-700">{item["ID do Pedido"]}</td>
                          <td className="p-4 font-bold text-red-500 whitespace-nowrap">{item["Status Upseller"]}</td>
                          <td className="p-4 text-right font-black text-gray-700 whitespace-nowrap">R$ {item["Valor Original (R$)"].toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {resultados.cancelados.length === 0 && <p className="text-gray-400 text-center py-10">Nenhum pedido cancelado encontrado nas planilhas.</p>}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}