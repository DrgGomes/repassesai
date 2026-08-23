import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from './supabase';
import { 
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { 
  LayoutDashboard, UploadCloud, Hourglass, Download, FileSpreadsheet, AlertTriangle, Loader2, Database, LogOut, FileJson, Ban, Package, LineChart, Save, Trash2, Archive, CheckCircle2, Search, ShieldCheck
} from 'lucide-react';

export default function Dashboard({ session }: any) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isF5Loading, setIsF5Loading] = useState(true);
  const [upsellerData, setUpsellerData] = useState<any[]>([]);
  const [kwaiData, setKwaiData] = useState<any[]>([]);
  const [resultados, setResultados] = useState<any>(null);
  
  const [meusProdutos, setMeusProdutos] = useState<any[]>([]);

  // Paleta refinada: Emerald, Amber, Red, Blue, Slate
  const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#64748b'];

  useEffect(() => {
    const carregarTudo = async () => {
      setIsF5Loading(true);
      await carregarProdutos();
      await carregarDashboardDoBanco();
      setIsF5Loading(false);
    };
    carregarTudo();
  }, []);

  const carregarProdutos = async () => {
    const { data } = await supabase.from('produtos').select('*').eq('user_id', session.user.id);
    if (data) setMeusProdutos(data);
  };

  const carregarDashboardDoBanco = async () => {
    const { data: dbOrders } = await supabase.from('pedidos_kwai').select('*').eq('user_id', session.user.id);
    if (!dbOrders || dbOrders.length === 0) {
      setResultados(null);
      return;
    }

    let atrasados: any[] = [], divergencias: any[] = [], noPrazo: any[] = [], corretos: any[] = [], cancelados: any[] = [];
    let valorBruto = 0, totalRetido = 0, custoTotal = 0, lucroLiquido = 0;

    dbOrders.forEach(order => {
       if (order.status === 'CANCELADO_DEVOLVIDO') {
           cancelados.push({ "ID do Pedido": order.id_pedido, "Status": "Cancelado/Devolvido", "Valor Registrado": Number(order.valor_bruto) });
       } else {
           valorBruto += Number(order.valor_bruto);
           custoTotal += Number(order.custo_pedido);
           
           if (order.status === 'NO_PRAZO') {
               noPrazo.push({ "ID do Pedido": order.id_pedido, "Vencimento Esperado": new Date(order.vencimento_esperado).toLocaleDateString(), "Valor Estimado (R$)": Number(order.valor_bruto) });
           } else if (order.status === 'ATRASADO') {
               const repasseEstimado = order.valor_bruto - ((order.valor_bruto * 0.20) + ((order.qtd || 1) * 4.00));
               atrasados.push({ "ID do Pedido": order.id_pedido, "Repasse Atrasado Estimado (R$)": Number(repasseEstimado.toFixed(2)) });
               totalRetido += repasseEstimado;
           } else if (order.status === 'DIVERGENCIA_FINANCEIRA' || order.status === 'DIVERGENCIA_FRETE') {
               divergencias.push({ "ID do Pedido": order.id_pedido, "Motivo": order.status, "Diferença (R$)": Number(order.roubo_taxa) });
               totalRetido += Number(order.roubo_taxa);
               lucroLiquido += Number(order.lucro_pedido);
           } else if (order.status === 'PAGO_CORRETO') {
               corretos.push({ "ID do Pedido": order.id_pedido, "Receita Kwai (R$)": Number(order.receita_kwai), "Lucro Líquido (R$)": Number(order.lucro_pedido) });
               lucroLiquido += Number(order.lucro_pedido);
           }
       }
    });

    setResultados({
        atrasados, divergencias, noPrazo, corretos, cancelados, 
        valorBruto: Number(valorBruto.toFixed(2)), 
        totalRetido: Number(totalRetido.toFixed(2)), 
        custoTotal: Number(custoTotal.toFixed(2)),
        lucroLiquido: Number(lucroLiquido.toFixed(2)),
        chartStatus: [
          {name:'Corretos',value:corretos.length},
          {name:'Prazo',value:noPrazo.length},
          {name:'Divergência',value:divergencias.length},
          {name:'Atrasado',value:atrasados.length},
          {name:'Cancelados',value:cancelados.length}
        ].filter(i=>i.value>0) 
    });
  };

  const exportarBackupGeral = async () => {
    const { data: dbOrders } = await supabase.from('pedidos_kwai').select('*').eq('user_id', session.user.id);
    if (!dbOrders || dbOrders.length === 0) return alert("Não há dados para exportar.");
    const worksheet = XLSX.utils.json_to_sheet(dbOrders);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Backup_Completo");
    XLSX.writeFile(workbook, `Backup_RepasseAI_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`);
  };

  const apagarTudo = async () => {
    const confirmacao = window.confirm("Atenção: Todos os registros de pedidos serão apagados. Seus produtos serão mantidos. Confirmar?");
    if (!confirmacao) return;
    setIsF5Loading(true);
    await supabase.from('pedidos_kwai').delete().eq('user_id', session.user.id);
    setResultados(null);
    setIsF5Loading(false);
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

  const exportarPDF = (dados: any[], titulo: string, nomeArquivo: string) => {
    if (!dados || dados.length === 0) return alert("Não há dados.");
    const doc = new jsPDF('landscape'); 
    doc.setFontSize(14);
    doc.text(`REPASSE.AI | ${titulo}`, 14, 15);
    doc.setFontSize(9);
    doc.text(`Gerado em: ${new Date().toLocaleDateString()}`, 14, 22);
    
    autoTable(doc, {
      head: [Object.keys(dados[0])],
      body: dados.map(obj => Object.values(obj)),
      startY: 28,
      styles: { fontSize: 8, cellPadding: 3, font: 'helvetica' },
      headStyles: { fillColor: [9, 9, 11], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [250, 250, 250] }
    });
    doc.save(`${nomeArquivo}.pdf`);
  };

  const exportarJSON = () => {
    if (!resultados) return alert("Processe os dados primeiro.");
    const dossieAuditoria = {
      informacoes_sistema: {
        plataforma: "Repasse.AI SaaS (Auditoria Forense)",
        regras_matematicas_aplicadas: "Valor Real = (Preço Original - Subvenção Comercial). Taxas aplicadas: 20% sobre Valor Real + R$ 4,00 por item. Custo de frete do vendedor classificado como divergência.",
        data_auditoria: new Date().toISOString()
      },
      resumo_financeiro: {
        volume_bruto_reais: resultados.valorBruto,
        prejuizo_retido_divergencias_reais: resultados.totalRetido,
        custo_produtos_reais: resultados.custoTotal,
        lucro_liquido_reais: resultados.lucroLiquido
      },
      detalhamento_pedidos: {
        pagos_corretamente: resultados.corretos,
        divergencias_financeiras_frete: resultados.divergencias,
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
    const { error } = await supabase.from('produtos').update({ custo: custo, sku_master: skuMaster || null }).eq('sku', sku).eq('user_id', session.user.id);
    if (error) alert("Erro ao atualizar o registro.");
    else {
      carregarProdutos();
    }
  };

  const extrair = (row: any, palavras: string[]) => {
    const chave = Object.keys(row).find(k => palavras.some(p => k.toLowerCase().includes(p)));
    return chave ? row[chave] : null;
  };

  const executarConciliacao = async () => {
    if (upsellerData.length === 0 && kwaiData.length === 0) return alert("⚠️ Suba os arquivos.");
    setIsSyncing(true);

    const produtosExtraidos = new Map();
    upsellerData.forEach(row => {
      const sku = extrair(row, ['sku', 'especificação', 'código', 'id do produto']);
      const nome = extrair(row, ['nome do produto', 'produto', 'título', 'nome']);
      if (sku && nome && !produtosExtraidos.has(sku)) {
        produtosExtraidos.set(String(sku).trim(), { user_id: session.user.id, sku: String(sku).trim(), nome: String(nome).trim() });
      }
    });

    if (produtosExtraidos.size > 0) {
      await supabase.from('produtos').upsert(Array.from(produtosExtraidos.values()), { onConflict: 'user_id,sku', ignoreDuplicates: true });
      await carregarProdutos(); 
    }

    const mapaCustos = new Map();
    meusProdutos.forEach(p => mapaCustos.set(p.sku, p));

    const { data: dbOrders } = await supabase.from('pedidos_kwai').select('*').eq('user_id', session.user.id);
    const orderMap = new Map();
    if (dbOrders) dbOrders.forEach(o => orderMap.set(o.id_pedido, o));

    let maxKwaiDate = new Date(0);
    kwaiData.forEach(r => {
      const dStr = extrair(r, ['conclusão do pedido', 'geração do pedido', 'data']);
      if (dStr) { const d = new Date(String(dStr).replace(' ', 'T')); if (d > maxKwaiDate) maxKwaiDate = d; }
    });
    if (maxKwaiDate.getTime() === 0) maxKwaiDate = new Date(); 

    upsellerData.forEach(row => {
      const idPedido = String(extrair(row, ['nº de pedido', 'pedido', 'order id']) || '');
      if (!idPedido) return;
      
      const statusPos = extrair(row, ['pós-venda', 'cancelado', 'devolvido', 'status']);
      const valorPedido = Number(extrair(row, ['valor do pedido', 'valor'])) || 0; 
      const dataStr = extrair(row, ['hora de envio', 'hora do pedido', 'data']);
      const dEnvio = dataStr ? new Date(String(dataStr).replace(' ', 'T')) : new Date(0);
      const dVencimento = new Date(dEnvio.getTime() + (22 * 86400000));
      
      const sku = String(extrair(row, ['sku', 'especificação', 'código', 'id do produto'])).trim();
      const qtd = Number(extrair(row, ['qtd', 'quantidade'])) || 1;
      
      const prodInfo = mapaCustos.get(sku);
      const custoUnitario = prodInfo ? Number(prodInfo.custo) : 0;
      
      let status = "NO_PRAZO";
      if (String(statusPos).includes('Cancelado')) status = "CANCELADO_DEVOLVIDO";
      else if (dVencimento < maxKwaiDate) status = "ATRASADO";

      if (!orderMap.has(idPedido)) {
        orderMap.set(idPedido, { 
          id_pedido: idPedido, 
          valor_bruto: valorPedido, 
          data_envio: dEnvio.toISOString(), 
          vencimento_esperado: dVencimento.toISOString(), 
          status: status, 
          receita_kwai: 0, 
          roubo_taxa: 0, 
          custo_pedido: (custoUnitario * qtd), 
          lucro_pedido: 0, 
          sku: sku, 
          qtd: qtd, 
          user_id: session.user.id 
        });
      }
    });

    let atrasados: any[] = [], divergencias: any[] = [], noPrazo: any[] = [], corretos: any[] = [], cancelados: any[] = [];
    let valorBrutoGeral = 0, totalDiferencas = 0, custoTotalGeral = 0, lucroLiquidoGeral = 0;

    Array.from(orderMap.values()).forEach(order => {
       const kwaiRow = kwaiData.find(r => String(extrair(r, ['número do pedido', 'pedido', 'id'])) === order.id_pedido);
       
       if (order.status === 'CANCELADO_DEVOLVIDO') {
          cancelados.push({ "ID do Pedido": order.id_pedido, "Status Upseller": "Cancelado/Devolvido", "Valor de Referência (R$)": order.valor_bruto });
          return;
       }

       if (!kwaiRow) {
          const repasseEstimado = order.valor_bruto - ((order.valor_bruto * 0.20) + (order.qtd * 4.00));
          if (order.status === 'ATRASADO') {
             atrasados.push({ "ID do Pedido": order.id_pedido, "Repasse Atrasado Estimado (R$)": Number(repasseEstimado.toFixed(2)) });
             totalDiferencas += repasseEstimado;
          } else {
             noPrazo.push({ "ID do Pedido": order.id_pedido, "Vencimento Esperado": new Date(order.vencimento_esperado).toLocaleDateString(), "Valor Estimado (R$)": order.valor_bruto });
          }
          valorBrutoGeral += order.valor_bruto;
          custoTotalGeral += order.custo_pedido;

       } else {
          const precoOriginal = Number(extrair(kwaiRow, ['preço do produto'])) || order.valor_bruto;
          const subvencaoAbs = Math.abs(Number(extrair(kwaiRow, ['subvenção ao comércio'])) || 0);
          const freteCobradoVendedor = Math.abs(Number(extrair(kwaiRow, ['frete pago pelo vendedor'])) || 0);
          const recKwai = Number(extrair(kwaiRow, ['receita', 'repasse'])) || 0;

          const valorRealVenda = precoOriginal - subvencaoAbs;
          const taxa20 = valorRealVenda * 0.20;
          const taxaOp = order.qtd * 4.00;
          const repasseEsperado = valorRealVenda - taxa20 - taxaOp;
          const diferenca = repasseEsperado - recKwai;

          order.valor_bruto = valorRealVenda;
          order.receita_kwai = recKwai;
          order.lucro_pedido = recKwai - order.custo_pedido;
          
          valorBrutoGeral += valorRealVenda;
          custoTotalGeral += order.custo_pedido;
          lucroLiquidoGeral += order.lucro_pedido;

          const baseReport = {
             "ID do Pedido": order.id_pedido,
             "Preço Original (R$)": Number(precoOriginal.toFixed(2)),
             "Subvenção (R$)": Number(-subvencaoAbs.toFixed(2)),
             "Valor Real da Venda (R$)": Number(valorRealVenda.toFixed(2)),
             "Taxa 20% (R$)": Number(-taxa20.toFixed(2)),
             "Taxa Operacional (R$)": Number(-taxaOp.toFixed(2)),
             "Repasse Esperado (R$)": Number(repasseEsperado.toFixed(2)),
             "Receita Kwai (R$)": Number(recKwai.toFixed(2)),
             "Diferença (R$)": Number(diferenca.toFixed(2))
          };

          if (Math.abs(diferenca) <= 0.50) {
             order.roubo_taxa = 0;
             order.status = "PAGO_CORRETO";
             corretos.push({ ...baseReport, "STATUS": "CORRETO" });
          } else {
             order.roubo_taxa = diferenca;
             totalDiferencas += diferenca;
             
             if (freteCobradoVendedor > 0) {
                 order.status = "DIVERGENCIA_FRETE";
                 divergencias.push({ ...baseReport, "Motivo": "Divergência de Frete", "STATUS": "DIVERGÊNCIA" });
             } else {
                 order.status = "DIVERGENCIA_FINANCEIRA";
                 divergencias.push({ ...baseReport, "Motivo": "Divergência Financeira", "STATUS": "DIVERGÊNCIA" });
             }
          }
       }
    });

    const registrosParaSalvar = Array.from(orderMap.values());
    try {
      for (let i = 0; i < registrosParaSalvar.length; i += 500) {
        await supabase.from('pedidos_kwai').upsert(registrosParaSalvar.slice(i, i + 500), { onConflict: 'user_id,id_pedido' });
      }
    } catch (e) { console.error(e) }

    setResultados({
        atrasados, divergencias, noPrazo, corretos, cancelados, 
        valorBruto: Number(valorBrutoGeral.toFixed(2)), 
        totalRetido: Number(totalDiferencas.toFixed(2)), 
        custoTotal: Number(custoTotalGeral.toFixed(2)),
        lucroLiquido: Number(lucroLiquidoGeral.toFixed(2)),
        chartStatus: [
          {name:'Corretos',value:corretos.length},
          {name:'Prazo',value:noPrazo.length},
          {name:'Divergência',value:divergencias.length},
          {name:'Atrasado',value:atrasados.length},
          {name:'Cancelados',value:cancelados.length}
        ].filter(i=>i.value>0) 
    });

    setIsSyncing(false);
    setActiveTab('dashboard');
  };

  if (isF5Loading) {
    return <div className="h-screen w-full flex items-center justify-center bg-[#FAFAFA]"><Loader2 className="animate-spin text-zinc-400" size={32} /></div>;
  }

  // Componente Header Rigoroso (Estilo Vercel/Linear)
  const SecaoHeader = ({ titulo, descricao }: any) => (
    <div className="mb-8 border-b border-zinc-200 pb-5">
      <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">{titulo}</h2>
      <p className="text-sm text-zinc-500 mt-1">{descricao}</p>
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-[#FAFAFA] text-zinc-900 font-sans antialiased overflow-hidden selection:bg-emerald-100 selection:text-emerald-900">
      
      {/* SIDEBAR ULTRA-MINIMALISTA */}
      <div className="w-64 bg-[#09090B] flex-shrink-0 flex flex-col justify-between overflow-y-auto border-r border-zinc-800">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-10 px-2">
            <div className="bg-zinc-50 p-1.5 rounded-md"><ShieldCheck size={18} className="text-zinc-900" /></div>
            <h1 className="text-base font-bold text-zinc-50 tracking-tight">REPASSE.AI</h1>
          </div>
          
          <nav className="space-y-1">
            <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'dashboard' ? 'bg-zinc-800/80 text-zinc-50' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/40'}`}><LayoutDashboard size={16}/> Visão Geral</button>
            <button onClick={() => setActiveTab('upload')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'upload' ? 'bg-zinc-800/80 text-zinc-50' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/40'}`}><UploadCloud size={16}/> Nova Auditoria</button>
            <button onClick={() => setActiveTab('aguardando')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'aguardando' ? 'bg-zinc-800/80 text-zinc-50' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/40'}`}><Hourglass size={16}/> No Prazo</button>
            <button onClick={() => setActiveTab('divergencias')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'divergencias' ? 'bg-zinc-800/80 text-zinc-50' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/40'}`}><AlertTriangle size={16}/> Divergências / Atrasos</button>
            <button onClick={() => setActiveTab('malhafina')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'malhafina' ? 'bg-zinc-800/80 text-zinc-50' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/40'}`}><Ban size={16}/> Malha Fina</button>
            
            <div className="h-px bg-zinc-800 my-4 mx-2"></div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-semibold mb-2 ml-3">Business Intelligence</p>
            <button onClick={() => setActiveTab('produtos')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'produtos' ? 'bg-emerald-500/10 text-emerald-400' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/40'}`}><Package size={16}/> Meus Produtos</button>
            <button onClick={() => setActiveTab('lucro')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'lucro' ? 'bg-emerald-500/10 text-emerald-400' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/40'}`}><LineChart size={16}/> Lucratividade</button>
          </nav>
        </div>
        <div className="p-4 border-t border-zinc-800">
          <button onClick={() => supabase.auth.signOut()} className="w-full flex items-center gap-3 px-3 py-2.5 text-zinc-500 hover:text-red-400 rounded-lg transition-colors text-sm font-medium"><LogOut size={16}/> Encerrar Sessão</button>
        </div>
      </div>

      <div className="flex-1 h-full overflow-y-auto p-10 relative">
        
        {/* DASHBOARD - COM DADOS */}
        {activeTab === 'dashboard' && resultados && (
          <div className="w-full animate-fade-in max-w-6xl mx-auto pb-10">
            <div className="flex justify-between items-end mb-8 border-b border-zinc-200 pb-5">
               <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">Visão Geral</h2>
                  <p className="text-sm text-zinc-500 mt-1">Métricas de volume e capital retido processadas na última auditoria.</p>
               </div>
               <div className="flex gap-2">
                 <button onClick={exportarJSON} className="flex items-center gap-2 text-xs font-medium text-zinc-600 bg-white hover:bg-zinc-50 border border-zinc-200 px-3 py-2 rounded-lg transition-colors shadow-sm"><FileJson size={14}/> Dados Raw (JSON)</button>
                 <button onClick={exportarBackupGeral} className="flex items-center gap-2 text-xs font-medium text-zinc-600 bg-white hover:bg-zinc-50 border border-zinc-200 px-3 py-2 rounded-lg transition-colors shadow-sm"><Archive size={14}/> Backup Completo</button>
                 <button onClick={apagarTudo} className="flex items-center gap-2 text-xs font-medium text-red-600 bg-white hover:bg-red-50 border border-red-100 px-3 py-2 rounded-lg transition-colors shadow-sm"><Trash2 size={14}/></button>
               </div>
            </div>
            
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm flex flex-col justify-center">
                    <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-2">Valor Real Processado</p>
                    <p className="text-4xl font-semibold tracking-tight text-zinc-900">R$ {resultados.valorBruto.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                 </div>
                 <div className="bg-white p-6 rounded-xl border border-red-200 shadow-sm flex flex-col justify-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-10"><AlertTriangle size={64} className="text-red-500"/></div>
                    <p className="text-xs font-medium text-red-600 uppercase tracking-widest mb-2 relative z-10">Divergências p/ Cobrança</p>
                    <p className="text-4xl font-semibold tracking-tight text-red-600 relative z-10">R$ {resultados.totalRetido.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                 </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm flex flex-col min-h-[300px]">
                <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-4">Status Logístico e Financeiro</h3>
                <div className="flex-1 min-h-[200px]">
                   <ResponsiveContainer width="100%" height="100%">
                     <PieChart><Pie data={resultados.chartStatus} cx="50%" cy="50%" innerRadius="65%" outerRadius="85%" paddingAngle={2} dataKey="value" stroke="none">{resultados.chartStatus.map((_:any, index:number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><RechartsTooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e4e4e7', boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)' }}/><Legend verticalAlign="bottom" height={24} iconType="circle" wrapperStyle={{ fontSize: '12px' }}/></PieChart>
                   </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* DASHBOARD - SEM DADOS (HOME DIDÁTICA REFINADA) */}
        {activeTab === 'dashboard' && !resultados && (
           <div className="w-full animate-fade-in max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[80vh]">
             <div className="absolute top-6 right-6">
                <button onClick={apagarTudo} className="flex items-center gap-2 text-xs font-medium text-red-600 bg-white hover:bg-red-50 border border-red-100 px-3 py-2 rounded-lg transition-colors shadow-sm"><Trash2 size={14}/> Limpar Instância</button>
             </div>
             
             <div className="bg-white border border-zinc-200 p-4 rounded-2xl shadow-sm mb-8">
               <ShieldCheck size={32} className="text-zinc-900" />
             </div>
             
             <h2 className="text-3xl font-semibold text-zinc-900 tracking-tight text-center mb-4">Auditoria Forense de Repasses</h2>
             <p className="text-zinc-500 text-center max-w-xl mb-12 leading-relaxed">
               Sistema de alta precisão projetado para reconciliar fluxos logísticos da UPSeller com extratos financeiros da Kwai, eliminando inconsistências e falsos positivos de cupons da plataforma.
             </p>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-12">
               <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
                 <Database size={20} className="text-zinc-900 mb-4" />
                 <h3 className="text-sm font-semibold text-zinc-900 mb-1">1. Entrada de Dados</h3>
                 <p className="text-xs text-zinc-500 leading-relaxed">Cruzamento algorítmico do catálogo logístico (UPSeller) com o extrato consolidado de liquidação (Kwai).</p>
               </div>
               
               <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm relative">
                 <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-emerald-50/50 to-transparent pointer-events-none rounded-r-xl"></div>
                 <Search size={20} className="text-emerald-600 mb-4" />
                 <h3 className="text-sm font-semibold text-zinc-900 mb-1">2. Motor de Reconciliação</h3>
                 <p className="text-xs text-zinc-500 leading-relaxed">Isola descontos comerciais. Base de cálculo exata: <span className="font-mono bg-zinc-100 px-1 py-0.5 rounded text-zinc-700">(Preço - Subvenção) - 20% - R$4.</span></p>
               </div>

               <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
                 <LineChart size={20} className="text-zinc-900 mb-4" />
                 <h3 className="text-sm font-semibold text-zinc-900 mb-1">3. Business Intelligence</h3>
                 <p className="text-xs text-zinc-500 leading-relaxed">Geração automática de DRE, identificação de capital retido por divergências e controle de custos de SKU.</p>
               </div>
             </div>

             <button onClick={() => setActiveTab('upload')} className="bg-zinc-900 text-white px-8 py-3 rounded-lg font-medium text-sm hover:bg-zinc-800 shadow-sm transition-colors flex items-center gap-2">
               <UploadCloud size={18}/> Iniciar Workspace de Auditoria
             </button>
           </div>
        )}

        {/* TAB 2: UPLOAD */}
        {activeTab === 'upload' && (
          <div className="w-full animate-fade-in max-w-4xl mx-auto pb-10">
             <SecaoHeader titulo="Data Ingestion" descricao="Faça o upload dos arquivos originais em formato Excel (.xlsx ou .xls) exportados diretamente das plataformas." />
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <label className="bg-white border border-dashed border-zinc-300 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-zinc-400 hover:bg-zinc-50 transition-all">
                <div className="bg-zinc-100 p-3 rounded-lg mb-4 text-zinc-600"><Package size={24}/></div>
                <h3 className="font-semibold text-sm text-zinc-900 mb-1">Base Logística (UPSeller)</h3>
                <p className="text-xs text-zinc-500 mb-4 text-center h-8">
                  {upsellerData.length > 0 ? <span className="inline-flex items-center px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 font-medium ring-1 ring-inset ring-emerald-600/20">{upsellerData.length} registros processados</span> : 'Exportação geral de pedidos'}
                </p>
                <div className="text-xs font-medium text-zinc-700 bg-white border border-zinc-200 px-4 py-2 rounded-md shadow-sm">Selecionar Arquivo</div>
                <input type="file" className="hidden" onChange={(e) => lerPlanilha(e, setUpsellerData)} />
              </label>

              <label className="bg-white border border-dashed border-zinc-300 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-zinc-400 hover:bg-zinc-50 transition-all">
                <div className="bg-zinc-100 p-3 rounded-lg mb-4 text-zinc-600"><FileSpreadsheet size={24}/></div>
                <h3 className="font-semibold text-sm text-zinc-900 mb-1">Extrato Financeiro (Kwai)</h3>
                <p className="text-xs text-zinc-500 mb-4 text-center h-8">
                  {kwaiData.length > 0 ? <span className="inline-flex items-center px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 font-medium ring-1 ring-inset ring-emerald-600/20">{kwaiData.length} registros processados</span> : 'Relatório de liquidação/saques'}
                </p>
                <div className="text-xs font-medium text-zinc-700 bg-white border border-zinc-200 px-4 py-2 rounded-md shadow-sm">Selecionar Arquivo</div>
                <input type="file" className="hidden" onChange={(e) => lerPlanilha(e, setKwaiData)} />
              </label>
            </div>
            
            <button onClick={executarConciliacao} disabled={isSyncing} className={`w-full py-4 rounded-xl shadow-sm font-semibold text-sm flex items-center justify-center gap-2 transition-all border ${isSyncing ? 'bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed' : 'bg-zinc-900 text-white border-zinc-900 hover:bg-zinc-800'}`}>
              {isSyncing ? <><Loader2 className="animate-spin" size={18}/> Processando reconciliação...</> : <><Database size={18}/> Executar Algoritmo de Auditoria</>}
            </button>
          </div>
        )}

        {/* TAB 3: AGUARDANDO NO PRAZO */}
        {activeTab === 'aguardando' && (
          <div className="w-full animate-fade-in max-w-5xl mx-auto pb-10">
            <SecaoHeader titulo="Pipeline Logístico (No Prazo)" descricao="Pedidos que constam na base logística, mas ainda estão dentro da janela de liquidação padrão da plataforma." />
            
            {!resultados ? ( <div className="bg-white border border-zinc-200 rounded-xl p-12 text-center text-sm text-zinc-500">Workspace não inicializado.</div> ) : (
              <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden w-full">
                <div className="p-3 border-b border-zinc-100 bg-zinc-50/50 flex justify-end gap-2">
                   {resultados.noPrazo.length > 0 && (
                     <>
                        <button onClick={() => exportarExcel(resultados.noPrazo, "No_Prazo")} className="bg-white text-zinc-700 border border-zinc-200 px-3 py-1.5 rounded-md font-medium text-xs flex items-center gap-2 hover:bg-zinc-50 shadow-sm transition-colors"><Download size={14}/> CSV / Excel</button>
                        <button onClick={() => exportarPDF(resultados.noPrazo, "Pedidos no Pipeline de Liquidação", "No_Prazo")} className="bg-white text-zinc-700 border border-zinc-200 px-3 py-1.5 rounded-md font-medium text-xs flex items-center gap-2 hover:bg-zinc-50 shadow-sm transition-colors"><FileJson size={14}/> PDF Document</button>
                     </>
                   )}
                </div>
                <div className="max-h-[60vh] overflow-y-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-50/50 text-zinc-500 font-medium sticky top-0 border-b border-zinc-200">
                      <tr><th className="p-4 font-medium">Tracking ID</th><th className="p-4 font-medium">Forecast de Vencimento</th><th className="p-4 text-right font-medium">Estimativa Bruta</th></tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {resultados.noPrazo.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-zinc-50 transition-colors">
                          <td className="p-4 font-mono text-xs text-zinc-900">{item["ID do Pedido"]}</td>
                          <td className="p-4"><span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-zinc-100 text-zinc-700">{item["Vencimento Esperado"]}</span></td>
                          <td className="p-4 text-right text-zinc-900">R$ {item["Valor Estimado (R$)"].toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {resultados.noPrazo.length === 0 && <p className="text-zinc-500 text-sm text-center py-12">Sem dados em trânsito no momento.</p>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: DIVERGÊNCIAS E ATRASOS */}
        {activeTab === 'divergencias' && (
          <div className="w-full animate-fade-in max-w-6xl mx-auto pb-10">
            <SecaoHeader titulo="Painel de Discrepâncias" descricao="Registros onde o algoritmo detectou anomalias entre as regras comerciais aplicadas e a liquidação efetiva da plataforma." />
            
            {!resultados ? ( <div className="bg-white border border-zinc-200 rounded-xl p-12 text-center text-sm text-zinc-500">Workspace não inicializado.</div> ) : (
              <div className="grid grid-cols-1 gap-6 w-full">
                
                {/* DIVERGÊNCIAS FINANCEIRAS */}
                <div className="bg-white border border-zinc-200 rounded-xl shadow-sm flex flex-col min-h-[400px] overflow-hidden w-full">
                  <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-sm text-zinc-900 flex items-center gap-2"><AlertTriangle size={16} className="text-red-500"/> Anomalias Financeiras</h3>
                      <p className="text-xs text-zinc-500 mt-0.5">{resultados.divergencias.length} registros com falha no repasse esperado.</p>
                    </div>
                    {resultados.divergencias.length > 0 && (
                      <div className="flex gap-2">
                         <button onClick={() => exportarExcel(resultados.divergencias, "Divergencias_Financeiras")} className="bg-white text-zinc-700 border border-zinc-200 px-3 py-1.5 rounded-md font-medium text-xs flex items-center gap-2 hover:bg-zinc-50 shadow-sm transition-colors"><Download size={14}/> Dados (Excel)</button>
                         <button onClick={() => exportarPDF(resultados.divergencias, "Relatório de Anomalias Financeiras", "Divergencias_Financeiras")} className="bg-white text-zinc-700 border border-zinc-200 px-3 py-1.5 rounded-md font-medium text-xs flex items-center gap-2 hover:bg-zinc-50 shadow-sm transition-colors"><FileJson size={14}/> Dossiê PDF</button>
                      </div>
                    )}
                  </div>
                  <div className="overflow-y-auto flex-1">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-zinc-50/50 text-zinc-500 sticky top-0 border-b border-zinc-200">
                        <tr><th className="p-4 font-medium">Tracking ID</th><th className="p-4 font-medium">Diagnóstico Algorítmico</th><th className="p-4 text-right font-medium">Modelo Esperado</th><th className="p-4 text-right font-medium">Liquidação Efetiva</th><th className="p-4 text-right font-medium text-zinc-900">Gap Identificado</th></tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {resultados.divergencias.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-zinc-50 transition-colors">
                            <td className="p-4 font-mono text-xs text-zinc-900">{item["ID do Pedido"]}</td>
                            <td className="p-4"><span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-semibold tracking-wide uppercase bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/10">{item["STATUS"]}</span></td>
                            <td className="p-4 text-right text-zinc-500">R$ {item["Repasse Esperado (R$)"]?.toFixed(2) || '0.00'}</td>
                            <td className="p-4 text-right text-zinc-500">R$ {item["Receita Kwai (R$)"]?.toFixed(2) || '0.00'}</td>
                            <td className="p-4 text-right font-medium text-red-600">R$ {item["Diferença (R$)"]?.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {resultados.divergencias.length === 0 && <div className="p-12 text-center text-sm text-zinc-500">Nenhuma anomalia crítica detectada.</div>}
                  </div>
                </div>

                {/* ATRASADOS */}
                <div className="bg-white border border-zinc-200 rounded-xl shadow-sm flex flex-col min-h-[300px] overflow-hidden w-full">
                  <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-sm text-zinc-900 flex items-center gap-2"><Hourglass size={16} className="text-amber-500"/> Violações de SLA Logístico</h3>
                      <p className="text-xs text-zinc-500 mt-0.5">{resultados.atrasados.length} pedidos pendentes fora da janela padrão.</p>
                    </div>
                    {resultados.atrasados.length > 0 && (
                       <div className="flex gap-2">
                          <button onClick={() => exportarExcel(resultados.atrasados, "Atrasados")} className="bg-white text-zinc-700 border border-zinc-200 px-3 py-1.5 rounded-md font-medium text-xs flex items-center gap-2 hover:bg-zinc-50 shadow-sm transition-colors"><Download size={14}/> Dados (Excel)</button>
                          <button onClick={() => exportarPDF(resultados.atrasados, "Dossiê de Violações de SLA", "Atrasados")} className="bg-white text-zinc-700 border border-zinc-200 px-3 py-1.5 rounded-md font-medium text-xs flex items-center gap-2 hover:bg-zinc-50 shadow-sm transition-colors"><FileJson size={14}/> Dossiê PDF</button>
                       </div>
                    )}
                  </div>
                  <div className="overflow-y-auto flex-1">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-zinc-50/50 text-zinc-500 sticky top-0 border-b border-zinc-200">
                        <tr><th className="p-4 font-medium">Tracking ID</th><th className="p-4 text-right font-medium">Exposure / Gap Estimado</th></tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {resultados.atrasados.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-zinc-50 transition-colors">
                            <td className="p-4 font-mono text-xs text-zinc-900">{item["ID do Pedido"]}</td>
                            <td className="p-4 text-right font-medium text-amber-600">R$ {item["Repasse Atrasado Estimado (R$)"].toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {resultados.atrasados.length === 0 && <div className="p-12 text-center text-sm text-zinc-500">Nenhum backlog fora da janela logística.</div>}
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

        {/* TAB 5: MALHA FINA */}
        {activeTab === 'malhafina' && (
          <div className="w-full animate-fade-in max-w-5xl mx-auto pb-10">
            <SecaoHeader titulo="Data Quarantine (Cancelados)" descricao="Registros segregados para evitar distorção nas métricas de performance comercial (Pós-venda e Cancelamentos)." />
            
            {!resultados ? ( <div className="bg-white border border-zinc-200 rounded-xl p-12 text-center text-sm text-zinc-500">Workspace não inicializado.</div> ) : (
              <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden w-full">
                <div className="p-3 border-b border-zinc-100 bg-zinc-50/50 flex justify-end gap-2">
                  {resultados.cancelados.length > 0 && (
                     <>
                        <button onClick={() => exportarExcel(resultados.cancelados, "Cancelados_Quarentena")} className="bg-white text-zinc-700 border border-zinc-200 px-3 py-1.5 rounded-md font-medium text-xs flex items-center gap-2 hover:bg-zinc-50 shadow-sm transition-colors"><Download size={14}/> CSV / Excel</button>
                        <button onClick={() => exportarPDF(resultados.cancelados, "Log de Registros em Quarentena", "Cancelados_Quarentena")} className="bg-white text-zinc-700 border border-zinc-200 px-3 py-1.5 rounded-md font-medium text-xs flex items-center gap-2 hover:bg-zinc-50 shadow-sm transition-colors"><FileJson size={14}/> PDF Document</button>
                     </>
                   )}
                </div>
                <div className="max-h-[60vh] overflow-y-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-50/50 text-zinc-500 font-medium sticky top-0 border-b border-zinc-200">
                      <tr><th className="p-4 font-medium">Tracking ID</th><th className="p-4 font-medium">Flag do Sistema</th><th className="p-4 text-right font-medium">Valor de Face</th></tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {resultados.cancelados.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-zinc-50 transition-colors">
                          <td className="p-4 font-mono text-xs text-zinc-900">{item["ID do Pedido"]}</td>
                          <td className="p-4"><span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-semibold tracking-wide uppercase bg-zinc-100 text-zinc-600 ring-1 ring-inset ring-zinc-500/10">EXCLUÍDO</span></td>
                          <td className="p-4 text-right text-zinc-400">R$ {item["Valor Registrado"] ? item["Valor Registrado"].toFixed(2) : item["Valor de Referência (R$)"].toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {resultados.cancelados.length === 0 && <p className="text-zinc-500 text-sm text-center py-12">Nenhum evento de quarentena registrado.</p>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 6: PRODUTOS */}
        {activeTab === 'produtos' && (
          <div className="w-full animate-fade-in max-w-6xl mx-auto pb-10">
            <div className="flex justify-between items-end mb-8 border-b border-zinc-200 pb-5">
              <div>
                 <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">Gerenciamento de SKUs</h2>
                 <p className="text-sm text-zinc-500 mt-1">Atribuição de custo de inventário (COGS) para cálculo real de lucratividade.</p>
              </div>
              <button onClick={carregarProdutos} className="bg-white text-zinc-700 border border-zinc-200 px-4 py-2 rounded-md font-medium text-xs hover:bg-zinc-50 shadow-sm transition-colors">Sync Database</button>
            </div>
            
            <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
               {meusProdutos.length === 0 ? (
                 <div className="p-16 text-center text-sm text-zinc-500">Catálogo vazio. O sistema populará isso automaticamente via Data Ingestion.</div>
               ) : (
                 <div className="max-h-[60vh] overflow-y-auto">
                   <table className="w-full text-left text-sm">
                     <thead className="bg-zinc-50/50 text-zinc-500 font-medium sticky top-0 border-b border-zinc-200">
                       <tr><th className="p-4">SKU / Identifier</th><th className="p-4 w-1/3">Item Descriptor</th><th className="p-4">Unit Cost (COGS)</th><th className="p-4">SKU Consolidation</th><th className="p-4">Ação</th></tr>
                     </thead>
                     <tbody className="divide-y divide-zinc-100">
                       {meusProdutos.map((prod) => (
                         <tr key={prod.id} className="hover:bg-zinc-50 transition-colors">
                           <td className="p-4 font-mono text-xs text-zinc-500">{prod.sku}</td>
                           <td className="p-4 text-zinc-900 truncate max-w-xs" title={prod.nome}>{prod.nome}</td>
                           <td className="p-4">
                             <div className="relative">
                               <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs font-medium">R$</span>
                               <input type="number" step="0.01" defaultValue={prod.custo} id={`custo-${prod.sku}`} className="w-28 bg-white border border-zinc-200 rounded-md py-1.5 pl-8 pr-2 text-sm text-zinc-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all shadow-sm" />
                             </div>
                           </td>
                           <td className="p-4">
                             <input type="text" placeholder="SKU-PARENT" defaultValue={prod.sku_master || ''} id={`master-${prod.sku}`} className="w-32 bg-white border border-zinc-200 rounded-md px-3 py-1.5 text-xs text-zinc-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all shadow-sm font-mono placeholder:text-zinc-300" />
                           </td>
                           <td className="p-4">
                             <button onClick={() => { const custo = (document.getElementById(`custo-${prod.sku}`) as HTMLInputElement).value; const master = (document.getElementById(`master-${prod.sku}`) as HTMLInputElement).value; atualizarProduto(prod.sku, Number(custo), master); }} className="bg-zinc-900 text-white p-1.5 rounded-md hover:bg-zinc-800 transition-all shadow-sm"><Save size={16}/></button>
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
          <div className="w-full animate-fade-in max-w-5xl mx-auto pb-10">
            <SecaoHeader titulo="Statements (P&L)" descricao="Demonstrativo de Resultado com base nas regras de auditoria e COGS atribuídos." />
            
            {!resultados ? ( <div className="bg-white border border-zinc-200 rounded-xl p-12 text-center text-sm text-zinc-500">Workspace não inicializado.</div> ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm flex flex-col justify-center">
                  <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-2">Net Sales (Valor Real)</p>
                  <p className="text-3xl font-semibold tracking-tight text-zinc-900">R$ {resultados.valorBruto.toLocaleString('pt-BR', {minimumFractionDigits:2})}</p>
                </div>
                
                <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm flex flex-col justify-center">
                  <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-2">COGS (Custos)</p>
                  <p className="text-3xl font-semibold tracking-tight text-zinc-500">- R$ {resultados.custoTotal.toLocaleString('pt-BR', {minimumFractionDigits:2})}</p>
                </div>
                
                <div className="bg-zinc-900 p-6 rounded-xl shadow-lg flex flex-col justify-center border border-zinc-800 relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500 opacity-10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                   <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest mb-2 relative z-10">Net Profit</p>
                   <p className="text-4xl font-semibold tracking-tight text-emerald-400 relative z-10">R$ {resultados.lucroLiquido.toLocaleString('pt-BR', {minimumFractionDigits:2})}</p>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}