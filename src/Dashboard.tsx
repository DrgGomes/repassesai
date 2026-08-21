import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from './supabase';
import { 
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { 
  LayoutDashboard, UploadCloud, Hourglass, Download, FileSpreadsheet, AlertTriangle, Loader2, Database, LogOut, FileJson, Ban, Package, LineChart, Save
} from 'lucide-react';

export default function Dashboard({ session }: any) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSyncing, setIsSyncing] = useState(false);
  const [upsellerData, setUpsellerData] = useState<any[]>([]);
  const [kwaiData, setKwaiData] = useState<any[]>([]);
  const [resultados, setResultados] = useState<any>(null);
  
  const [meusProdutos, setMeusProdutos] = useState<any[]>([]);
  const [isCarregandoProdutos, setIsCarregandoProdutos] = useState(false);

  const COLORS = ['#10b981', '#F1C40F', '#e74c3c', '#94a3b8', '#6b7280'];

  useEffect(() => {
    carregarProdutos();
  }, []);

  const carregarProdutos = async () => {
    setIsCarregandoProdutos(true);
    const { data } = await supabase.from('produtos').select('*').eq('user_id', session.user.id);
    if (data) setMeusProdutos(data);
    setIsCarregandoProdutos(false);
  };

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

  const exportarExcel = (dados: any[], nomeArquivo: string) => {
    if (!dados || dados.length === 0) return alert("Não há dados.");
    const worksheet = XLSX.utils.json_to_sheet(dados);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Relatório");
    XLSX.writeFile(workbook, `${nomeArquivo}.xlsx`);
  };

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
        prejuizo_retido_reais: resultados.totalRetido,
        custo_produtos_reais: resultados.custoTotal,
        lucro_liquido_reais: resultados.lucroLiquido
      },
      detalhamento_pedidos: {
        pagos_corretamente: resultados.corretos,
        taxas_indevidas: resultados.indevidos,
        atrasados_retidos: resultados.atrasados,
        no_prazo_logistico: resultados.noPrazo,
        ignorados_por_cancelamento: resultados.cancelados
      }
    };
    const blob = new Blob([JSON.stringify(dossieAuditoria, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Prova_Real_Auditoria_${new Date().getTime()}.json`;
    a.click();
  };

  const atualizarProduto = async (sku: string, custo: number, skuMaster: string) => {
    const { error } = await supabase.from('produtos')
      .update({ custo: custo, sku_master: skuMaster || null })
      .eq('sku', sku).eq('user_id', session.user.id);
    
    if (error) alert("Erro ao salvar produto.");
    else alert("Produto atualizado com sucesso!");
    carregarProdutos();
  };

  const executarConciliacao = async () => {
    if (upsellerData.length === 0 || kwaiData.length === 0) return alert("⚠️ Suba os arquivos.");
    setIsSyncing(true);

    const produtosExtraidos = new Map();
    upsellerData.forEach(row => {
      const sku = row['SKU do Vendedor'] || row['SKU'] || row['Especificação do Produto'];
      const nome = row['Nome do Produto'] || row['Produto'];
      if (sku && nome && !produtosExtraidos.has(sku)) {
        produtosExtraidos.set(sku, { user_id: session.user.id, sku: String(sku), nome: String(nome) });
      }
    });

    if (produtosExtraidos.size > 0) {
      const arrayNovosProdutos = Array.from(produtosExtraidos.values());
      await supabase.from('produtos').upsert(arrayNovosProdutos, { onConflict: 'user_id,sku', ignoreDuplicates: true });
      await carregarProdutos(); 
    }

    const { data: produtosBanco } = await supabase.from('produtos').select('*').eq('user_id', session.user.id);
    const mapaCustos = new Map();
    if (produtosBanco) {
      produtosBanco.forEach(p => mapaCustos.set(p.sku, p));
    }

    let maxKwaiDate = new Date(0);
    const kwaiLimpo: any[] = [];
    const kwaiIds = new Set();
    [...kwaiData].reverse().forEach(row => {
      const idKwai = String(row['Número do pedido']);
      if (!kwaiIds.has(idKwai) && row['Status de liquidação'] !== 'Cancelar') {
        kwaiIds.add(idKwai);
        kwaiLimpo.push(row);
      }
      const dataStr = row['Data de conclusão do pedido'] || row['Data de geração do pedido'];
      if (dataStr) {
        const d = new Date(dataStr.toString().replace(' ', 'T'));
        if (d > maxKwaiDate) maxKwaiDate = d;
      }
    });

    const upsellerLimpo: any[] = [];
    const upIds = new Set();
    upsellerData.forEach(row => {
      const idPedido = String(row['Nº de Pedido da Plataforma']);
      if (!upIds.has(idPedido)) { upIds.add(idPedido); upsellerLimpo.push(row); }
    });

    let atrasados: any[] = [], indevidos: any[] = [], noPrazo: any[] = [], corretos: any[] = [], cancelados: any[] = [];
    let valorBruto = 0, totalRetido = 0;
    let custoTotalProdutos = 0, lucroLiquidoTotal = 0;
    
    upsellerLimpo.forEach(upRow => {
      const statusPos = upRow['Pós-venda/Cancelado/Devolvido'];
      const idPedido = String(upRow['Nº de Pedido da Plataforma']);
      const valorPedido = Number(upRow['Valor do Pedido']) || 0;
      const dataStr = upRow['Hora de Envio'] || upRow['Hora do Pedido'];
      const dEnvio = dataStr ? new Date(dataStr.toString().replace(' ', 'T')) : new Date(0);
      const dVencimento = new Date(dEnvio.getTime() + (22 * 86400000));

      if (statusPos === 'Cancelado' || statusPos === 'Cancelado/Pós-vendas') {
        cancelados.push({ "ID do Pedido": idPedido, "Status Upseller": statusPos, "Valor Original (R$)": valorPedido });
        return; 
      }
      
      const qtd = Number(upRow['Qtd. do Produto']) || 1;
      const skuRaw = String(upRow['SKU do Vendedor'] || upRow['SKU'] || upRow['Especificação do Produto']);
      
      const produtoInfo = mapaCustos.get(skuRaw);
      const custoUnitario = produtoInfo ? Number(produtoInfo.custo) : 0;
      const custoDoPedido = custoUnitario * qtd;
      custoTotalProdutos += custoDoPedido;
      
      valorBruto += valorPedido;
      const kwaiRow = kwaiLimpo.find(k => String(k['Número do pedido']) === idPedido);
      const taxa = (valorPedido * 0.20) + (qtd * 4.00);
      const repasseEsperado = valorPedido - taxa;
      
      let recKwai = 0;

      if (!kwaiRow) {
        if (dVencimento > maxKwaiDate) {
          noPrazo.push({ "ID do Pedido": idPedido, "Data Envio": dEnvio.toLocaleDateString(), "Vencimento Esperado": dVencimento.toLocaleDateString(), "Valor Cliente (R$)": valorPedido });
        } else {
          atrasados.push({ "ID do Pedido": idPedido, "Repasse Atrasado (R$)": Number(repasseEsperado.toFixed(2)) });
          totalRetido += repasseEsperado;
        }
      } else {
        recKwai = Number(kwaiRow['Receita']) || 0;
        const cobradoAMais = (valorPedido - recKwai) - taxa;
        
        const lucroDoPedido = recKwai - custoDoPedido;
        lucroLiquidoTotal += lucroDoPedido;

        if (cobradoAMais > 0.50) {
          indevidos.push({ "ID do Pedido": idPedido, "Valor Original (R$)": valorPedido, "Receita Kwai (R$)": recKwai, "Roubo na Taxa (R$)": Number(cobradoAMais.toFixed(2)) });
          totalRetido += cobradoAMais;
        } else {
          corretos.push({ "ID do Pedido": idPedido, "Receita Kwai (R$)": recKwai, "Lucro Líquido (R$)": Number(lucroDoPedido.toFixed(2)) });
        }
      }
    });

    const valorBrutoFinal = Number(valorBruto.toFixed(2));
    const totalRetidoFinal = Number(totalRetido.toFixed(2));
    const custoTotalFinal = Number(custoTotalProdutos.toFixed(2));
    const lucroLiquidoFinal = Number(lucroLiquidoTotal.toFixed(2));

    setResultados({ 
      atrasados, indevidos, noPrazo, corretos, cancelados, 
      valorBruto: valorBrutoFinal, 
      totalRetido: totalRetidoFinal, 
      custoTotal: custoTotalFinal,
      lucroLiquido: lucroLiquidoFinal,
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
            <button onClick={() => setActiveTab('malhafina')} className={`w-full flex items-center gap-3 p-3 rounded-lg font-bold ${activeTab === 'malhafina' ? 'bg-[#F1C40F] text-black' : 'text-gray-400 hover:text-white'}`}><Ban size={20}/> Malha Fina</button>
            
            <div className="h-px bg-gray-800 my-4"></div>
            <button onClick={() => setActiveTab('produtos')} className={`w-full flex items-center gap-3 p-3 rounded-lg font-bold ${activeTab === 'produtos' ? 'bg-[#F1C40F] text-black' : 'text-gray-400 hover:text-white'}`}><Package size={20}/> Meus Produtos</button>
            <button onClick={() => setActiveTab('lucro')} className={`w-full flex items-center gap-3 p-3 rounded-lg font-bold ${activeTab === 'lucro' ? 'bg-[#F1C40F] text-black' : 'text-gray-400 hover:text-white'}`}><LineChart size={20}/> Lucratividade</button>
          </nav>
        </div>
        <button onClick={() => supabase.auth.signOut()} className="w-full flex items-center justify-center gap-2 p-3 text-red-400 hover:bg-gray-800 rounded-lg transition-colors font-bold mt-auto border border-gray-800"><LogOut size={18}/> Sair</button>
      </div>

      <div className="flex-1 h-full overflow-y-auto p-8">
        
        {/* TAB 1: VISÃO GERAL */}
        {activeTab === 'dashboard' && resultados && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 w-full animate-fade-in">
             <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-center h-80 relative">
              <button onClick={exportarJSON} className="absolute top-6 right-6 flex items-center gap-2 text-xs font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg transition-colors"><FileJson size={16}/> Prova Real (JSON)</button>
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

        {/* TAB 2: UPLOAD */}
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

        {/* TAB 3: AGUARDANDO NO PRAZO */}
        {activeTab === 'aguardando' && (
          <div className="w-full animate-fade-in">
            <header className="mb-8 flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-black text-gray-900 tracking-tight">Pedidos no Prazo</h2>
                <p className="text-gray-500 mt-1">Ainda não completaram o ciclo logístico de 22 dias.</p>
              </div>
              {resultados?.noPrazo.length > 0 && <button onClick={() => exportarExcel(resultados.noPrazo, "Aguardando_Vencimento")} className="bg-green-100 text-green-700 px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-green-200 transition-colors"><Download size={18}/> Exportar Excel</button>}
            </header>
            {!resultados ? ( <div className="bg-white rounded-3xl shadow-sm p-12 text-center border border-gray-100 text-gray-500">Nenhum dado processado.</div> ) : (
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden w-full max-h-[70vh]">
                <div className="overflow-y-auto h-full p-0">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold sticky top-0 z-10 shadow-sm">
                      <tr><th className="p-4">ID do Pedido</th><th className="p-4">Data Envio</th><th className="p-4">Vencimento Esperado</th><th className="p-4 text-right">Valor Cliente (R$)</th></tr>
                    </thead>
                    <tbody className="text-sm">
                      {resultados.noPrazo.map((item: any, idx: number) => (
                        <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="p-4 font-mono font-bold text-gray-700">{item["ID do Pedido"]}</td>
                          <td className="p-4 text-gray-500">{item["Data Envio"]}</td>
                          <td className="p-4 text-yellow-600 font-semibold">{item["Vencimento Esperado"]}</td>
                          <td className="p-4 text-right font-bold text-gray-700">R$ {item["Valor Cliente (R$)"].toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {resultados.noPrazo.length === 0 && <p className="text-gray-400 text-center py-10">Lista vazia.</p>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: FILA DE COBRANÇA */}
        {activeTab === 'cobranca' && (
          <div className="w-full animate-fade-in pb-10">
             <header className="mb-8">
              <h2 className="text-3xl font-black text-gray-900 tracking-tight">Fila de Cobrança</h2>
              <p className="text-gray-500 mt-1">Dossiês prontos para abrir chamado no suporte do Kwai.</p>
            </header>
            {!resultados ? ( <div className="bg-white rounded-3xl shadow-sm p-12 text-center border border-gray-100 text-gray-500 w-full">Nenhum dado processado.</div> ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 w-full">
                
                {/* ATRASADOS */}
                <div className="bg-white border border-gray-100 rounded-3xl shadow-sm flex flex-col h-[75vh] overflow-hidden w-full">
                  <div className="bg-orange-50 p-4 border-b border-orange-100 flex justify-between items-center">
                    <div>
                      <h3 className="font-black text-orange-800 text-lg flex items-center gap-2"><Hourglass size={20}/> Pedidos Atrasados</h3>
                      <p className="text-orange-600 text-xs mt-1">{resultados.atrasados.length} pedidos retidos</p>
                    </div>
                    {resultados.atrasados.length > 0 && <button onClick={() => exportarExcel(resultados.atrasados, "Atrasados_Kwai")} className="bg-green-100 text-green-800 px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-1"><Download size={14}/> Excel</button>}
                  </div>
                  <div className="overflow-y-auto flex-1 p-0">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 text-gray-400 text-xs uppercase font-bold sticky top-0 z-10 shadow-sm">
                        <tr><th className="p-4">ID</th><th className="p-4 text-right">Repasse Atrasado</th></tr>
                      </thead>
                      <tbody className="text-sm">
                        {resultados.atrasados.map((item: any, idx: number) => (
                          <tr key={idx} className="border-b border-gray-50 hover:bg-orange-50/50">
                            <td className="p-4 font-mono font-bold text-gray-700">{item["ID do Pedido"]}</td>
                            <td className="p-4 text-right font-black text-orange-600">R$ {item["Repasse Atrasado (R$)"].toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* TAXAS INDEVIDAS */}
                <div className="bg-white border border-gray-100 rounded-3xl shadow-sm flex flex-col h-[75vh] overflow-hidden w-full">
                  <div className="bg-red-50 p-4 border-b border-red-100 flex justify-between items-center">
                    <div>
                      <h3 className="font-black text-red-800 text-lg flex items-center gap-2"><AlertTriangle size={20}/> Taxa Indevida</h3>
                      <p className="text-red-600 text-xs mt-1">{resultados.indevidos.length} fretes embutidos</p>
                    </div>
                    {resultados.indevidos.length > 0 && <button onClick={() => exportarExcel(resultados.indevidos, "TaxaIndevida_Kwai")} className="bg-green-100 text-green-800 px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-1"><Download size={14}/> Excel</button>}
                  </div>
                  <div className="overflow-y-auto flex-1 p-0">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 text-gray-400 text-xs uppercase font-bold sticky top-0 z-10 shadow-sm">
                        <tr><th className="p-4">ID</th><th className="p-4 text-right">Valor Roubado</th></tr>
                      </thead>
                      <tbody className="text-sm">
                        {resultados.indevidos.map((item: any, idx: number) => (
                          <tr key={idx} className="border-b border-gray-50 hover:bg-red-50/50">
                            <td className="p-4 font-mono font-bold text-gray-700">{item["ID do Pedido"]}</td>
                            <td className="p-4 text-right font-black text-[#e74c3c]">R$ {item["Roubo na Taxa (R$)"].toFixed(2)}</td>
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

        {/* TAB 5: MALHA FINA (Cancelados) */}
        {activeTab === 'malhafina' && (
          <div className="w-full animate-fade-in">
            <header className="mb-8 flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-black text-gray-900 tracking-tight">Malha Fina (Cancelados)</h2>
                <p className="text-gray-500 mt-1">Pedidos que o sistema isolou para não inflar o seu Bruto.</p>
              </div>
              {resultados?.cancelados.length > 0 && <button onClick={() => exportarExcel(resultados.cancelados, "Cancelados_Kwai")} className="bg-gray-200 text-gray-800 px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-300 transition-colors"><Download size={18}/> Exportar Excel</button>}
            </header>
            {!resultados ? ( <div className="bg-white rounded-3xl shadow-sm p-12 text-center border border-gray-100 text-gray-500">Nenhum dado processado.</div> ) : (
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden w-full max-h-[70vh]">
                <div className="overflow-y-auto h-full p-0">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-100 text-gray-500 text-xs uppercase font-bold sticky top-0 z-10 shadow-sm">
                      <tr><th className="p-4">ID do Pedido</th><th className="p-4">Status Upseller</th><th className="p-4 text-right">Valor Original</th></tr>
                    </thead>
                    <tbody className="text-sm">
                      {resultados.cancelados.map((item: any, idx: number) => (
                        <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="p-4 font-mono font-bold text-gray-700">{item["ID do Pedido"]}</td>
                          <td className="p-4 font-bold text-red-500">{item["Status Upseller"]}</td>
                          <td className="p-4 text-right font-black text-gray-700">R$ {item["Valor Original (R$)"].toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {resultados.cancelados.length === 0 && <p className="text-gray-400 text-center py-10">Lista vazia.</p>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 6: PRODUTOS */}
        {activeTab === 'produtos' && (
          <div className="w-full animate-fade-in">
            <header className="mb-8 flex justify-between items-end">
              <div>
                <h2 className="text-3xl font-black text-gray-900 tracking-tight">Meus Produtos & Custos</h2>
                <p className="text-gray-500 mt-1">Os SKUs são cadastrados automaticamente quando você audita uma planilha.</p>
              </div>
              <button onClick={carregarProdutos} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold text-sm">Atualizar Lista</button>
            </header>
            <div className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden">
               {isCarregandoProdutos ? (
                 <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-gray-400" size={32}/></div>
               ) : meusProdutos.length === 0 ? (
                 <div className="p-10 text-center text-gray-400">Nenhum produto cadastrado. Suba uma planilha na aba "Nova Auditoria".</div>
               ) : (
                 <div className="max-h-[65vh] overflow-y-auto p-0">
                   <table className="w-full text-left">
                     <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold sticky top-0 z-10 shadow-sm">
                       <tr><th className="p-4">SKU</th><th className="p-4 w-1/3">Produto</th><th className="p-4">Custo (R$)</th><th className="p-4">Agrupar c/ SKU</th><th className="p-4">Salvar</th></tr>
                     </thead>
                     <tbody className="text-sm">
                       {meusProdutos.map((prod) => (
                         <tr key={prod.id} className="border-b border-gray-50 hover:bg-gray-50">
                           <td className="p-4 font-mono font-bold text-gray-600">{prod.sku}</td>
                           <td className="p-4 text-gray-600 truncate max-w-xs" title={prod.nome}>{prod.nome}</td>
                           <td className="p-4">
                             <input type="number" step="0.01" defaultValue={prod.custo} id={`custo-${prod.sku}`} className="w-24 bg-white border border-gray-300 rounded p-2 focus:border-[#F1C40F] outline-none" />
                           </td>
                           <td className="p-4">
                             <input type="text" placeholder="Ex: SKU-MASTER" defaultValue={prod.sku_master || ''} id={`master-${prod.sku}`} className="w-32 bg-white border border-gray-300 rounded p-2 focus:border-[#F1C40F] outline-none" />
                           </td>
                           <td className="p-4">
                             <button onClick={() => {
                               const custo = (document.getElementById(`custo-${prod.sku}`) as HTMLInputElement).value;
                               const master = (document.getElementById(`master-${prod.sku}`) as HTMLInputElement).value;
                               atualizarProduto(prod.sku, Number(custo), master);
                             }} className="bg-green-100 text-green-700 p-2 rounded-lg hover:bg-green-200 transition-colors"><Save size={18}/></button>
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               )}
            </div>
          </div>
        )}

        {/* TAB 7: LUCRATIVIDADE */}
        {activeTab === 'lucro' && (
          <div className="w-full animate-fade-in">
            <header className="mb-8">
              <h2 className="text-3xl font-black text-gray-900 tracking-tight">DRE & Lucratividade</h2>
              <p className="text-gray-500 mt-1">Cálculo de Lucro Líquido (Baseado nos repasses recebidos menos os custos cadastrados).</p>
            </header>
            {!resultados ? ( <div className="bg-white rounded-3xl shadow-sm p-12 text-center border border-gray-100 text-gray-500">Faça uma auditoria primeiro para gerar o DRE.</div> ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Volume Vendido (Bruto)</p>
                  <p className="text-2xl font-black text-gray-900">R$ {resultados.valorBruto.toLocaleString('pt-BR', {minimumFractionDigits:2})}</p>
                </div>
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Custo dos Produtos</p>
                  <p className="text-2xl font-black text-orange-500">R$ {resultados.custoTotal.toLocaleString('pt-BR', {minimumFractionDigits:2})}</p>
                </div>
                <div className="bg-[#10b981] p-6 rounded-3xl shadow-sm text-white relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-10 rounded-full -mr-10 -mt-10"></div>
                   <p className="text-xs font-bold uppercase tracking-widest mb-2 opacity-90">Lucro Líquido Real</p>
                   <p className="text-3xl font-black">R$ {resultados.lucroLiquido.toLocaleString('pt-BR', {minimumFractionDigits:2})}</p>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}