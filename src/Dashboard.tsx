import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from './supabase';
import { 
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { 
  LayoutDashboard, UploadCloud, Hourglass, Download, FileSpreadsheet, AlertTriangle, Loader2, Database, LogOut, FileJson, Ban, Package, LineChart, Save, Trash2, Archive, CheckCircle2, Info, Search, ShieldCheck
} from 'lucide-react';

export default function Dashboard({ session }: any) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isF5Loading, setIsF5Loading] = useState(true);
  const [upsellerData, setUpsellerData] = useState<any[]>([]);
  const [kwaiData, setKwaiData] = useState<any[]>([]);
  const [resultados, setResultados] = useState<any>(null);
  
  const [meusProdutos, setMeusProdutos] = useState<any[]>([]);

  const COLORS = ['#10b981', '#F1C40F', '#e74c3c', '#94a3b8', '#6b7280'];

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
    const confirmacao = window.confirm("CUIDADO! Isso vai apagar TODOS os pedidos do seu banco de dados para você recomeçar do zero. Seus produtos e custos serão mantidos. Deseja continuar?");
    if (!confirmacao) return;
    setIsF5Loading(true);
    await supabase.from('pedidos_kwai').delete().eq('user_id', session.user.id);
    setResultados(null);
    alert("Sistema resetado com sucesso! Lousa em branco.");
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
    const doc = new jsPDF('landscape'); // Formato paisagem para caber mais colunas
    doc.setFontSize(16);
    doc.text(`REPASSE.AI - ${titulo}`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Documento gerado e auditado em ${new Date().toLocaleDateString()}`, 14, 22);
    
    autoTable(doc, {
      head: [Object.keys(dados[0])],
      body: dados.map(obj => Object.values(obj)),
      startY: 28,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [26, 26, 26], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [245, 245, 245] }
    });
    doc.save(`${nomeArquivo}.pdf`);
  };

  const exportarJSON = () => {
    if (!resultados) return alert("Processe os dados primeiro.");
    const dossieAuditoria = {
      informacoes_sistema: {
        plataforma: "Repasse.AI SaaS (Auditoria Forense)",
        regras_matematicas_aplicadas: "Valor Real = (Preço Original - Subvenção Comercial). Taxas aplicadas: 20% sobre Valor Real + R$ 4,00 por item.",
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
    if (error) alert("Erro ao salvar produto.");
    else {
      alert("Produto atualizado! Faça uma Nova Auditoria para recalcular o DRE com o novo custo.");
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
          // NOVA LÓGICA DE AUDITORIA FORENSE
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
             corretos.push({ ...baseReport, "STATUS": "🟢 CORRETO" });
          } else {
             order.roubo_taxa = diferenca;
             totalDiferencas += diferenca;
             
             if (freteCobradoVendedor > 0) {
                 order.status = "DIVERGENCIA_FRETE";
                 divergencias.push({ ...baseReport, "Motivo": "Divergência de Frete", "STATUS": "🔴 DIVERGÊNCIA" });
             } else {
                 order.status = "DIVERGENCIA_FINANCEIRA";
                 divergencias.push({ ...baseReport, "Motivo": "Divergência Financeira", "STATUS": "🔴 DIVERGÊNCIA" });
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
    return <div className="h-screen w-full flex items-center justify-center bg-gray-100"><Loader2 className="animate-spin text-[#F1C40F]" size={48} /></div>;
  }

  // COMPONENTE DE HEADER DIDÁTICO REUTILIZÁVEL
  const SecaoHeader = ({ titulo, icone: Icon, descricao }: any) => (
    <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-3xl p-6 mb-8 text-white shadow-lg flex items-center gap-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#F1C40F] opacity-10 rounded-full blur-3xl -mr-10 -mt-10"></div>
      <div className="bg-gray-800/50 p-4 rounded-2xl border border-gray-700">
        <Icon size={32} className="text-[#F1C40F]" />
      </div>
      <div>
        <h2 className="text-2xl font-black tracking-tight">{titulo}</h2>
        <p className="text-gray-300 font-medium text-sm mt-1 max-w-2xl">{descricao}</p>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] overflow-hidden font-sans">
      {/* SIDEBAR COM NOVO DESIGN */}
      <div className="w-64 bg-[#111827] text-gray-300 flex-shrink-0 flex flex-col justify-between overflow-y-auto border-r border-gray-800">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-10">
            <div className="bg-[#F1C40F] p-2 rounded-xl"><ShieldCheck size={24} className="text-[#111827]" /></div>
            <h1 className="text-2xl font-black text-white tracking-widest">REPASSE<span className="text-[#F1C40F]">.AI</span></h1>
          </div>
          
          <nav className="space-y-2">
            <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${activeTab === 'dashboard' ? 'bg-[#F1C40F] text-[#111827] shadow-lg scale-105' : 'hover:bg-gray-800 hover:text-white'}`}><LayoutDashboard size={20}/> Visão Geral</button>
            <button onClick={() => setActiveTab('upload')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${activeTab === 'upload' ? 'bg-[#F1C40F] text-[#111827] shadow-lg scale-105' : 'hover:bg-gray-800 hover:text-white'}`}><UploadCloud size={20}/> Nova Auditoria</button>
            <button onClick={() => setActiveTab('aguardando')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${activeTab === 'aguardando' ? 'bg-[#F1C40F] text-[#111827] shadow-lg scale-105' : 'hover:bg-gray-800 hover:text-white'}`}><Hourglass size={20}/> No Prazo</button>
            <button onClick={() => setActiveTab('divergencias')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${activeTab === 'divergencias' ? 'bg-[#F1C40F] text-[#111827] shadow-lg scale-105' : 'hover:bg-gray-800 hover:text-white'}`}><AlertTriangle size={20}/> Divergências / Atrasos</button>
            <button onClick={() => setActiveTab('malhafina')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${activeTab === 'malhafina' ? 'bg-[#F1C40F] text-[#111827] shadow-lg scale-105' : 'hover:bg-gray-800 hover:text-white'}`}><Ban size={20}/> Malha Fina</button>
            
            <div className="h-px bg-gray-800 my-4 mx-2"></div>
            <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-2 ml-3">Inteligência de Negócio</p>
            <button onClick={() => setActiveTab('produtos')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${activeTab === 'produtos' ? 'bg-[#10b981] text-white shadow-lg scale-105' : 'hover:bg-gray-800 hover:text-white'}`}><Package size={20}/> Meus Produtos</button>
            <button onClick={() => setActiveTab('lucro')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${activeTab === 'lucro' ? 'bg-[#10b981] text-white shadow-lg scale-105' : 'hover:bg-gray-800 hover:text-white'}`}><LineChart size={20}/> Lucratividade</button>
          </nav>
        </div>
        <div className="p-6">
          <button onClick={() => supabase.auth.signOut()} className="w-full flex items-center justify-center gap-2 p-3 text-red-400 bg-red-400/10 hover:bg-red-400/20 rounded-xl transition-colors font-bold"><LogOut size={18}/> Sair da Conta</button>
        </div>
      </div>

      <div className="flex-1 h-full overflow-y-auto p-8 relative">
        
        {/* TAB 1: VISÃO GERAL (Com Dados) */}
        {activeTab === 'dashboard' && resultados && (
          <div className="w-full animate-fade-in pb-10">
            <SecaoHeader titulo="Visão Geral Financeira" icone={LayoutDashboard} descricao="O raio-x completo do seu negócio. Acompanhe o volume real de vendas e identifique o capital retido por divergências das plataformas." />
            
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
               <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-center h-80 relative group hover:shadow-md transition-shadow">
                
                <div className="absolute top-6 right-6 flex gap-2">
                   <button onClick={exportarJSON} className="flex items-center gap-2 text-xs font-bold text-gray-500 bg-gray-50 hover:bg-gray-100 px-4 py-2 rounded-xl transition-colors border border-gray-200" title="Exportar JSON para Inteligência Artificial"><FileJson size={16}/> Prova Real (JSON)</button>
                   <button onClick={exportarBackupGeral} className="flex items-center gap-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-xl transition-colors" title="Baixar todos os pedidos do Banco"><Archive size={16}/></button>
                   <button onClick={apagarTudo} className="flex items-center gap-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-xl transition-colors" title="Apagar todos os dados para recomeçar"><Trash2 size={16}/></button>
                </div>

                <div className="grid grid-cols-2 gap-6 mt-8">
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-2xl border border-gray-200">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2"><CheckCircle2 size={14} className="text-green-500"/> Valor Real de Venda</p>
                    <p className="text-3xl font-black text-gray-900">R$ {resultados.valorBruto.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                  </div>
                  <div className="bg-gradient-to-br from-red-50 to-white p-6 rounded-2xl border border-red-100">
                    <p className="text-xs font-bold text-red-600 uppercase tracking-widest mb-2 flex items-center gap-2"><AlertTriangle size={14}/> Divergências (Cobrar)</p>
                    <p className="text-3xl font-black text-red-600">R$ {resultados.totalRetido.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 h-80 flex flex-col hover:shadow-md transition-shadow">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2">Status dos Pedidos</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart><Pie data={resultados.chartStatus} cx="50%" cy="50%" innerRadius="60%" outerRadius="80%" paddingAngle={5} dataKey="value">{resultados.chartStatus.map((_:any, index:number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><RechartsTooltip /><Legend verticalAlign="bottom" height={36}/></PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
        
        {/* HOME DIDÁTICA (Sem Dados) */}
        {activeTab === 'dashboard' && !resultados && (
           <div className="w-full animate-fade-in relative max-w-5xl mx-auto">
             <div className="absolute top-0 right-0 mt-4 mr-4">
                <button onClick={apagarTudo} className="flex items-center gap-2 text-xs font-bold text-red-600 bg-white border border-red-100 shadow-sm hover:bg-red-50 px-4 py-2 rounded-xl transition-colors"><Trash2 size={16}/> Limpar Banco</button>
             </div>
             
             <div className="text-center mb-12 pt-10">
               <div className="inline-flex items-center justify-center p-4 bg-[#F1C40F]/20 rounded-full mb-6">
                 <ShieldCheck size={48} className="text-yellow-600" />
               </div>
               <h2 className="text-4xl font-black text-gray-900 tracking-tight mb-4">A primeira Auditoria Forense para Kwai.</h2>
               <p className="text-gray-500 text-lg max-w-2xl mx-auto">Não confie em planilhas cegas. Nosso algoritmo destrincha as taxas reais e expõe os centavos que a plataforma tenta esconder de você.</p>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
               <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden group hover:-translate-y-2 transition-transform">
                 <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-bl-full -mr-2 -mt-2 transition-transform group-hover:scale-150"></div>
                 <Database size={32} className="text-blue-500 mb-6 relative z-10" />
                 <h3 className="text-xl font-black text-gray-900 mb-2">1. Cruzamento Inteligente</h3>
                 <p className="text-gray-500 text-sm">Basta subir seu relatório logístico da UPSeller e o financeiro da Kwai. O sistema cruza os IDs instantaneamente.</p>
               </div>
               
               <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden group hover:-translate-y-2 transition-transform">
                 <div className="absolute top-0 right-0 w-16 h-16 bg-yellow-50 rounded-bl-full -mr-2 -mt-2 transition-transform group-hover:scale-150"></div>
                 <Search size={32} className="text-yellow-500 mb-6 relative z-10" />
                 <h3 className="text-xl font-black text-gray-900 mb-2">2. A Regra de Ouro</h3>
                 <p className="text-gray-500 text-sm">O sistema limpa a maquiagem da Kwai. O repasse correto é: <span className="font-bold text-gray-800 bg-gray-100 px-1 rounded">(Preço Original - Seu Desconto) - 20% - R$4.</span></p>
               </div>

               <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden group hover:-translate-y-2 transition-transform">
                 <div className="absolute top-0 right-0 w-16 h-16 bg-green-50 rounded-bl-full -mr-2 -mt-2 transition-transform group-hover:scale-150"></div>
                 <LineChart size={32} className="text-green-500 mb-6 relative z-10" />
                 <h3 className="text-xl font-black text-gray-900 mb-2">3. Recuperação & DRE</h3>
                 <p className="text-gray-500 text-sm">Aponte fretes cobrados indevidamente, exija o repasse de pedidos atrasados e calcule seu lucro líquido real.</p>
               </div>
             </div>

             <div className="text-center">
               <button onClick={() => setActiveTab('upload')} className="bg-[#111827] text-[#F1C40F] px-10 py-5 rounded-2xl font-black text-lg hover:shadow-2xl hover:scale-105 transition-all flex items-center justify-center gap-3 mx-auto">
                 <UploadCloud size={24}/> COMEÇAR PRIMEIRA AUDITORIA
               </button>
             </div>
           </div>
        )}

        {/* TAB 2: UPLOAD */}
        {activeTab === 'upload' && (
          <div className="w-full animate-fade-in max-w-5xl mx-auto pb-10">
             <SecaoHeader titulo="Processar Relatórios" icone={UploadCloud} descricao="Suba os relatórios oficiais da UPSeller (para base logística e IDs) e da Kwai (para valores financeiros). Nossa IA fará o resto." />
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <label className="bg-white border-2 border-dashed border-gray-300 rounded-3xl p-12 flex flex-col items-center justify-center cursor-pointer hover:border-[#F1C40F] hover:bg-yellow-50/30 transition-all group">
                <div className="bg-gray-50 p-4 rounded-full mb-6 group-hover:bg-[#F1C40F]/20 transition-colors"><Package size={40} className="text-gray-400 group-hover:text-yellow-600"/></div>
                <h3 className="font-black text-xl text-gray-800 mb-2">1. Relatório UPSELLER</h3>
                <p className="text-gray-500 text-sm mb-6 text-center">{upsellerData.length > 0 ? <span className="text-green-600 font-bold bg-green-50 px-3 py-1 rounded-full">{upsellerData.length} registros prontos</span> : 'Selecione o arquivo Excel / CSV'}</p>
                <div className="bg-gray-100 text-gray-600 px-6 py-2 rounded-xl font-bold text-sm group-hover:bg-white group-hover:shadow-sm">Procurar Arquivo</div>
                <input type="file" className="hidden" onChange={(e) => lerPlanilha(e, setUpsellerData)} />
              </label>

              <label className="bg-white border-2 border-dashed border-gray-300 rounded-3xl p-12 flex flex-col items-center justify-center cursor-pointer hover:border-[#F1C40F] hover:bg-yellow-50/30 transition-all group">
                <div className="bg-gray-50 p-4 rounded-full mb-6 group-hover:bg-[#F1C40F]/20 transition-colors"><FileSpreadsheet size={40} className="text-gray-400 group-hover:text-yellow-600"/></div>
                <h3 className="font-black text-xl text-gray-800 mb-2">2. Extrato Financeiro KWAI</h3>
                <p className="text-gray-500 text-sm mb-6 text-center">{kwaiData.length > 0 ? <span className="text-green-600 font-bold bg-green-50 px-3 py-1 rounded-full">{kwaiData.length} registros prontos</span> : 'Selecione o arquivo Excel / CSV'}</p>
                <div className="bg-gray-100 text-gray-600 px-6 py-2 rounded-xl font-bold text-sm group-hover:bg-white group-hover:shadow-sm">Procurar Arquivo</div>
                <input type="file" className="hidden" onChange={(e) => lerPlanilha(e, setKwaiData)} />
              </label>
            </div>
            
            <button onClick={executarConciliacao} disabled={isSyncing} className={`w-full py-6 rounded-2xl shadow-xl font-black text-xl uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${isSyncing ? 'bg-gray-800 text-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-[#111827] to-gray-800 text-[#F1C40F] hover:shadow-2xl hover:-translate-y-1'}`}>
              {isSyncing ? <><Loader2 className="animate-spin" size={24}/> Auditando milhares de linhas...</> : <><ShieldCheck size={28}/> Executar Auditoria Forense</>}
            </button>
          </div>
        )}

        {/* TAB 3: AGUARDANDO NO PRAZO */}
        {activeTab === 'aguardando' && (
          <div className="w-full animate-fade-in pb-10">
            <SecaoHeader titulo="Pedidos no Prazo" icone={Hourglass} descricao="Fique tranquilo. Estes pedidos foram enviados recentemente e ainda estão dentro do ciclo logístico de 22 dias da plataforma para serem pagos." />
            
            {!resultados ? ( <div className="bg-white rounded-3xl p-16 text-center border border-gray-100 text-gray-400 font-medium">Faça uma auditoria primeiro para visualizar.</div> ) : (
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden w-full">
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-end gap-2">
                   {resultados.noPrazo.length > 0 && (
                     <>
                        <button onClick={() => exportarExcel(resultados.noPrazo, "No_Prazo")} className="bg-white text-green-700 border border-gray-200 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-green-50 transition-colors"><Download size={16}/> Baixar Excel</button>
                        <button onClick={() => exportarPDF(resultados.noPrazo, "Pedidos Aguardando Prazo Logístico", "No_Prazo")} className="bg-white text-red-700 border border-gray-200 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-red-50 transition-colors"><FileJson size={16}/> Gerar PDF</button>
                     </>
                   )}
                </div>
                <div className="max-h-[60vh] overflow-y-auto">
                  <table className="w-full text-left">
                    <thead className="bg-white text-gray-400 text-xs uppercase font-black sticky top-0 shadow-sm">
                      <tr><th className="p-5">ID do Pedido</th><th className="p-5">Vencimento Máximo</th><th className="p-5 text-right">Valor Estimado</th></tr>
                    </thead>
                    <tbody className="text-sm">
                      {resultados.noPrazo.map((item: any, idx: number) => (
                        <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50/80 transition-colors">
                          <td className="p-5 font-mono font-bold text-gray-700">{item["ID do Pedido"]}</td>
                          <td className="p-5 text-yellow-600 font-bold bg-yellow-50/30 rounded-lg inline-block mt-3">{item["Vencimento Esperado"]}</td>
                          <td className="p-5 text-right font-black text-gray-800">R$ {item["Valor Estimado (R$)"].toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {resultados.noPrazo.length === 0 && <p className="text-gray-400 text-center py-16 font-medium">Nenhum pedido no prazo encontrado.</p>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: DIVERGÊNCIAS E ATRASOS */}
        {activeTab === 'divergencias' && (
          <div className="w-full animate-fade-in pb-10">
            <SecaoHeader titulo="Divergências & Atrasos" icone={AlertTriangle} descricao="Onde recuperamos o seu dinheiro. Exporte as planilhas abaixo em Excel ou PDF e anexe diretamente nos chamados do suporte da Kwai." />
            
            {!resultados ? ( <div className="bg-white rounded-3xl p-16 text-center border border-gray-100 text-gray-400 font-medium">Faça uma auditoria primeiro para visualizar.</div> ) : (
              <div className="grid grid-cols-1 gap-8 w-full">
                
                {/* DIVERGÊNCIAS FINANCEIRAS */}
                <div className="bg-white border border-gray-100 rounded-3xl shadow-sm flex flex-col h-[60vh] overflow-hidden w-full relative">
                  <div className="absolute top-0 left-0 w-2 h-full bg-red-500"></div>
                  <div className="bg-white p-6 border-b border-gray-100 flex justify-between items-center ml-2">
                    <div>
                      <h3 className="font-black text-gray-900 text-xl flex items-center gap-2">Divergências Financeiras</h3>
                      <p className="text-gray-500 text-sm mt-1">{resultados.divergencias.length} pedidos com diferenças indevidas no repasse.</p>
                    </div>
                    {resultados.divergencias.length > 0 && (
                      <div className="flex gap-2">
                         <button onClick={() => exportarExcel(resultados.divergencias, "Divergencias_Financeiras")} className="bg-green-50 text-green-700 border border-green-100 hover:bg-green-100 px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors"><Download size={16}/> Excel</button>
                         <button onClick={() => exportarPDF(resultados.divergencias, "Dossiê de Divergências Financeiras e Frete", "Divergencias_Financeiras")} className="bg-red-50 text-red-700 border border-red-100 hover:bg-red-100 px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors"><FileJson size={16}/> PDF</button>
                      </div>
                    )}
                  </div>
                  <div className="overflow-y-auto flex-1 ml-2">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase font-black sticky top-0 shadow-sm">
                        <tr><th className="p-4">ID do Pedido</th><th className="p-4">Análise Forense (Motivo)</th><th className="p-4 text-right">Repasse Correto</th><th className="p-4 text-right">Repasse Realizado</th><th className="p-4 text-right text-red-600">Falta Pagar</th></tr>
                      </thead>
                      <tbody className="text-sm">
                        {resultados.divergencias.map((item: any, idx: number) => (
                          <tr key={idx} className="border-b border-gray-50 hover:bg-red-50/30 transition-colors">
                            <td className="p-4 font-mono font-bold text-gray-800">{item["ID do Pedido"]}</td>
                            <td className="p-4"><span className="bg-red-100 text-red-700 px-2 py-1 rounded-md text-xs font-bold">{item["Motivo"]}</span></td>
                            <td className="p-4 text-right font-medium text-gray-500">R$ {item["Repasse Esperado (R$)"]?.toFixed(2) || '0.00'}</td>
                            <td className="p-4 text-right font-medium text-gray-500">R$ {item["Receita Kwai (R$)"]?.toFixed(2) || '0.00'}</td>
                            <td className="p-4 text-right font-black text-red-600">R$ {item["Diferença (R$)"]?.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {resultados.divergencias.length === 0 && <div className="p-16 text-center text-gray-400 font-bold">Nenhuma divergência encontrada.</div>}
                  </div>
                </div>

                {/* ATRASADOS */}
                <div className="bg-white border border-gray-100 rounded-3xl shadow-sm flex flex-col h-[50vh] overflow-hidden w-full relative">
                  <div className="absolute top-0 left-0 w-2 h-full bg-orange-500"></div>
                  <div className="bg-white p-6 border-b border-gray-100 flex justify-between items-center ml-2">
                    <div>
                      <h3 className="font-black text-gray-900 text-xl flex items-center gap-2">Repasses Atrasados</h3>
                      <p className="text-gray-500 text-sm mt-1">{resultados.atrasados.length} pedidos já passaram do prazo de 22 dias.</p>
                    </div>
                    {resultados.atrasados.length > 0 && (
                       <div className="flex gap-2">
                          <button onClick={() => exportarExcel(resultados.atrasados, "Repasses_Atrasados")} className="bg-green-50 text-green-700 border border-green-100 hover:bg-green-100 px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors"><Download size={16}/> Excel</button>
                          <button onClick={() => exportarPDF(resultados.atrasados, "Dossiê de Repasses Atrasados", "Repasses_Atrasados")} className="bg-red-50 text-red-700 border border-red-100 hover:bg-red-100 px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors"><FileJson size={16}/> PDF</button>
                       </div>
                    )}
                  </div>
                  <div className="overflow-y-auto flex-1 ml-2">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase font-black sticky top-0 shadow-sm">
                        <tr><th className="p-5">ID do Pedido</th><th className="p-5 text-right">Repasse Atrasado Estimado</th></tr>
                      </thead>
                      <tbody className="text-sm">
                        {resultados.atrasados.map((item: any, idx: number) => (
                          <tr key={idx} className="border-b border-gray-50 hover:bg-orange-50/30 transition-colors">
                            <td className="p-5 font-mono font-bold text-gray-800">{item["ID do Pedido"]}</td>
                            <td className="p-5 text-right font-black text-orange-600">R$ {item["Repasse Atrasado Estimado (R$)"].toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {resultados.atrasados.length === 0 && <div className="p-16 text-center text-gray-400 font-bold">Nenhum repasse atrasado.</div>}
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

        {/* TAB 5: MALHA FINA */}
        {activeTab === 'malhafina' && (
          <div className="w-full animate-fade-in pb-10">
            <SecaoHeader titulo="Malha Fina (Cancelados)" icone={Ban} descricao="Transparência total. Separamos e isolamos todos os pedidos marcados como Cancelados ou Devolvidos para não inflar artificialmente o seu painel de vendas brutas. Você pode conferir cada um deles aqui." />
            
            {!resultados ? ( <div className="bg-white rounded-3xl p-16 text-center border border-gray-100 text-gray-400 font-medium">Faça uma auditoria primeiro para visualizar.</div> ) : (
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden w-full max-h-[70vh]">
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-end gap-2">
                  {resultados.cancelados.length > 0 && (
                     <>
                        <button onClick={() => exportarExcel(resultados.cancelados, "Cancelados_Isolados")} className="bg-white text-green-700 border border-gray-200 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-green-50 transition-colors"><Download size={16}/> Baixar Excel</button>
                        <button onClick={() => exportarPDF(resultados.cancelados, "Relatório de Pedidos Cancelados ou Devolvidos", "Cancelados_Isolados")} className="bg-white text-red-700 border border-gray-200 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-red-50 transition-colors"><FileJson size={16}/> Gerar PDF</button>
                     </>
                   )}
                </div>
                <div className="overflow-y-auto h-full p-0">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-white text-gray-400 text-[10px] uppercase font-black sticky top-0 shadow-sm">
                      <tr><th className="p-5">ID do Pedido</th><th className="p-5">Status Upseller</th><th className="p-5 text-right">Valor Original de Referência</th></tr>
                    </thead>
                    <tbody className="text-sm">
                      {resultados.cancelados.map((item: any, idx: number) => (
                        <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50/80 transition-colors">
                          <td className="p-5 font-mono font-bold text-gray-500">{item["ID do Pedido"]}</td>
                          <td className="p-5"><span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold border border-gray-200">{item["Status"]}</span></td>
                          <td className="p-5 text-right font-black text-gray-400 line-through">R$ {item["Valor Registrado"] ? item["Valor Registrado"].toFixed(2) : item["Valor de Referência (R$)"].toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {resultados.cancelados.length === 0 && <p className="text-gray-400 text-center py-16 font-medium">Nenhum pedido cancelado encontrado.</p>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 6: PRODUTOS */}
        {activeTab === 'produtos' && (
          <div className="w-full animate-fade-in pb-10">
            <SecaoHeader titulo="Inteligência de Produtos" icone={Package} descricao="Cadastre os custos de fabricação/aquisição para descobrir sua lucratividade real. O sistema extrai e salva os SKUs automaticamente ao auditar relatórios." />
            
            <div className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden">
               <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-end">
                 <button onClick={carregarProdutos} className="bg-white text-gray-700 border border-gray-200 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-gray-100 transition-colors">Atualizar Banco</button>
               </div>
               
               {meusProdutos.length === 0 ? (
                 <div className="p-16 text-center text-gray-400 font-medium">Nenhum produto cadastrado no banco. Suba uma planilha na aba "Nova Auditoria".</div>
               ) : (
                 <div className="max-h-[60vh] overflow-y-auto p-0">
                   <table className="w-full text-left">
                     <thead className="bg-white text-gray-400 text-[10px] uppercase font-black sticky top-0 shadow-sm">
                       <tr><th className="p-5">Cód. SKU</th><th className="p-5 w-1/3">Nome do Produto</th><th className="p-5">Custo Unitário (R$)</th><th className="p-5">Agrupar Vendas (SKU Master)</th><th className="p-5">Ação</th></tr>
                     </thead>
                     <tbody className="text-sm">
                       {meusProdutos.map((prod) => (
                         <tr key={prod.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                           <td className="p-5 font-mono font-bold text-gray-800 bg-gray-50/50">{prod.sku}</td>
                           <td className="p-5 text-gray-600 truncate max-w-xs font-medium" title={prod.nome}>{prod.nome}</td>
                           <td className="p-5"><input type="number" step="0.01" defaultValue={prod.custo} id={`custo-${prod.sku}`} className="w-32 bg-white border-2 border-gray-200 rounded-xl p-3 focus:border-[#10b981] focus:ring-4 focus:ring-green-50 outline-none font-bold text-gray-800 transition-all" /></td>
                           <td className="p-5"><input type="text" placeholder="Ex: SKU-BASE" defaultValue={prod.sku_master || ''} id={`master-${prod.sku}`} className="w-40 bg-white border-2 border-gray-200 rounded-xl p-3 focus:border-[#10b981] focus:ring-4 focus:ring-green-50 outline-none font-bold text-gray-800 transition-all text-xs" /></td>
                           <td className="p-5"><button onClick={() => { const custo = (document.getElementById(`custo-${prod.sku}`) as HTMLInputElement).value; const master = (document.getElementById(`master-${prod.sku}`) as HTMLInputElement).value; atualizarProduto(prod.sku, Number(custo), master); }} className="bg-[#10b981] text-white p-3 rounded-xl hover:bg-emerald-600 hover:shadow-lg hover:-translate-y-1 transition-all"><Save size={18}/></button></td>
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
          <div className="w-full animate-fade-in pb-10">
            <SecaoHeader titulo="DRE & Lucratividade Real" icone={LineChart} descricao="A verdade crua sobre o seu negócio. Cruzamos os repasses confirmados, removemos as taxas e divergências, e subtraímos o custo dos produtos para revelar o que sobrou no seu bolso." />
            
            {!resultados ? ( <div className="bg-white rounded-3xl p-16 text-center border border-gray-100 text-gray-400 font-medium">Faça uma auditoria primeiro para gerar o DRE.</div> ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gray-50 rounded-bl-full -mr-4 -mt-4"></div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 relative z-10">Valor Real Vendido</p>
                  <p className="text-4xl font-black text-gray-900 relative z-10">R$ {resultados.valorBruto.toLocaleString('pt-BR', {minimumFractionDigits:2})}</p>
                </div>
                
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-orange-50 rounded-bl-full -mr-4 -mt-4"></div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 relative z-10">Custo dos Produtos</p>
                  <p className="text-4xl font-black text-orange-500 relative z-10">- R$ {resultados.custoTotal.toLocaleString('pt-BR', {minimumFractionDigits:2})}</p>
                </div>
                
                <div className="bg-gradient-to-br from-[#10b981] to-emerald-600 p-8 rounded-3xl shadow-xl text-white relative overflow-hidden hover:scale-105 transition-transform cursor-default">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                   <div className="absolute bottom-0 left-0 w-24 h-24 bg-black opacity-10 rounded-tr-full -ml-4 -mb-4"></div>
                   <p className="text-xs font-black uppercase tracking-widest mb-2 opacity-90 relative z-10">Lucro Líquido no Bolso</p>
                   <p className="text-5xl font-black relative z-10">R$ {resultados.lucroLiquido.toLocaleString('pt-BR', {minimumFractionDigits:2})}</p>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}