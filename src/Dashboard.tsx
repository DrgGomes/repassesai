import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from './supabase';
import { 
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { 
  LayoutDashboard, UploadCloud, Hourglass, Download, FileSpreadsheet, AlertTriangle, Loader2, Database, LogOut, FileJson, Ban, Package, LineChart, Save, Trash2, Archive, CheckCircle2, Search, ShieldCheck, Check, ChevronDown, Smartphone, ShoppingBag, Video, Store
} from 'lucide-react';

export default function Dashboard({ session }: any) {
  // Estados de Navegação Modular
  const [activeTab, setActiveTab] = useState('dashboard');
  const [marketplace, setMarketplace] = useState('kwai'); // Controla qual plataforma está ativa
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({ kwai: true }); // Controla quais menus estão abertos

  const [isSyncing, setIsSyncing] = useState(false);
  const [isF5Loading, setIsF5Loading] = useState(true);
  const [upsellerData, setUpsellerData] = useState<any[]>([]);
  const [kwaiData, setKwaiData] = useState<any[]>([]);
  const [resultados, setResultados] = useState<any>(null);
  
  const [meusProdutos, setMeusProdutos] = useState<any[]>([]);

  const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#64748b'];

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

  // LÓGICA ESTRITA DO KWAI MANTIDA INTACTA
  const carregarDashboardDoBanco = async () => {
    const { data: dbOrders } = await supabase.from('pedidos_kwai').select('*').eq('user_id', session.user.id);
    if (!dbOrders || dbOrders.length === 0) {
      setResultados(null);
      return;
    }

    let atrasados: any[] = [], divergencias: any[] = [], noPrazo: any[] = [], corretos: any[] = [], cancelados: any[] = [], amostras: any[] = [], divergenciasPreco: any[] = [];
    let valorBruto = 0, totalRetido = 0, custoTotal = 0, lucroLiquido = 0;

    dbOrders.forEach(order => {
       if (order.status === 'CANCELADO_DEVOLVIDO' || order.status === 'REEMBOLSO') {
           cancelados.push({ "ID do Pedido": order.id_pedido, "Status": order.status, "Valor de Face": Number(order.valor_bruto) });
       } else if (order.status === 'POSSIVEL_AMOSTRA' || order.status === 'AMOSTRA_CONFIRMADA') {
           amostras.push({ "ID do Pedido": order.id_pedido, "Status": order.status, "Valor Real de Venda": Number(order.valor_bruto) });
       } else if (order.status === 'DIVERGENCIA_PRECO') {
           divergenciasPreco.push({ "ID do Pedido": order.id_pedido, "Aviso": "Preço base da UPSeller difere do preço da Kwai." });
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
           } else if (order.status === 'PAGO_CORRETO' || order.status === 'ACIMA_ESPERADO') {
               corretos.push({ "ID do Pedido": order.id_pedido, "Receita Kwai (R$)": Number(order.receita_kwai), "Lucro Líquido (R$)": Number(order.lucro_pedido) });
               lucroLiquido += Number(order.lucro_pedido);
           }
       }
    });

    setResultados({
        atrasados, divergencias, noPrazo, corretos, cancelados, amostras, divergenciasPreco,
        valorBruto: Number(valorBruto.toFixed(2)), 
        totalRetido: Number(totalRetido.toFixed(2)), 
        custoTotal: Number(custoTotal.toFixed(2)),
        lucroLiquido: Number(lucroLiquido.toFixed(2)),
        jsonAudit: null, 
        chartStatus: [
          {name:'Liquidados OK',value:corretos.length},
          {name:'No Pipeline',value:noPrazo.length},
          {name:'Divergência',value:divergencias.length},
          {name:'Atrasados SLA',value:atrasados.length},
          {name:'Amostras',value:amostras.length},
          {name:'Quarentena',value:cancelados.length}
        ].filter(i=>i.value>0) 
    });
  };

  const confirmarAmostra = async (idPedido: string) => {
    const { error } = await supabase.from('pedidos_kwai').update({ status: 'AMOSTRA_CONFIRMADA' }).eq('id_pedido', idPedido).eq('user_id', session.user.id);
    if (!error) {
      alert("Amostra confirmada e salva na memória.");
      carregarDashboardDoBanco();
    }
  };

  const exportarBackupGeral = async () => {
    const { data: dbOrders } = await supabase.from('pedidos_kwai').select('*').eq('user_id', session.user.id);
    if (!dbOrders || dbOrders.length === 0) return alert("Não há dados.");
    const worksheet = XLSX.utils.json_to_sheet(dbOrders);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Backup_Completo");
    XLSX.writeFile(workbook, `Database_Dump_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`);
  };

  const apagarTudo = async () => {
    if (!window.confirm("Atenção: Limpeza completa da instância Kwai. Os registros de auditoria serão apagados. Confirmar?")) return;
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
      const aba = XLSX.read(evento.target?.result, { type: 'array' }).Sheets[XLSX.read(evento.target?.result, { type: 'array' }).SheetNames[0]];
      setDados((prev: any[]) => [...prev, ...XLSX.utils.sheet_to_json(aba)]);
      e.target.value = ''; 
    };
    reader.readAsArrayBuffer(file);
  };

  const exportarExcel = (dados: any[], nomeArquivo: string) => {
    if (!dados || dados.length === 0) return alert("Não há dados.");
    const worksheet = XLSX.utils.json_to_sheet(dados);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Auditoria");
    XLSX.writeFile(workbook, `${nomeArquivo}.xlsx`);
  };

  const exportarPDF = (dados: any[], titulo: string, nomeArquivo: string) => {
    if (!dados || dados.length === 0) return;
    const doc = new jsPDF('landscape'); 
    doc.setFontSize(14); doc.text(`REPASSE.AI | ${titulo}`, 14, 15);
    doc.setFontSize(9); doc.text(`Timestamp: ${new Date().toLocaleString()}`, 14, 22);
    autoTable(doc, { head: [Object.keys(dados[0])], body: dados.map(obj => Object.values(obj)), startY: 28, styles: { fontSize: 8, font: 'helvetica' }, headStyles: { fillColor: [9, 9, 11] } });
    doc.save(`${nomeArquivo}.pdf`);
  };

  const exportarJSON = () => {
    if (!resultados || !resultados.jsonAudit) return alert("Suba e processe os relatórios novamente para gerar o JSON profundo.");
    const blob = new Blob([JSON.stringify(resultados.jsonAudit, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `Prova_Real_Auditoria_${new Date().getTime()}.json`; a.click();
  };

  const atualizarProduto = async (sku: string, custo: number, skuMaster: string) => {
    if (!await supabase.from('produtos').update({ custo, sku_master: skuMaster || null }).eq('sku', sku).eq('user_id', session.user.id).then(r=>r.error)) carregarProdutos();
  };

  const extrair = (row: any, palavras: string[]) => {
    const keys = Object.keys(row);
    let chave = keys.find(k => palavras.some(p => k.toLowerCase().trim() === p.toLowerCase().trim()));
    if (!chave) chave = keys.find(k => palavras.some(p => k.toLowerCase().includes(p.toLowerCase())));
    return chave ? row[chave] : null;
  };

  const executarConciliacao = async () => {
    if (upsellerData.length === 0 && kwaiData.length === 0) return alert("⚠️ Suba os arquivos.");
    setIsSyncing(true);

    const tol = 0.01; 
    const produtosExtraidos = new Map();
    upsellerData.forEach(row => {
      const sku = extrair(row, ['sku', 'especificação', 'código']);
      const nome = extrair(row, ['nome do produto', 'produto', 'título']);
      if (sku && nome && !produtosExtraidos.has(String(sku).trim())) produtosExtraidos.set(String(sku).trim(), { user_id: session.user.id, sku: String(sku).trim(), nome: String(nome).trim() });
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
      const dStr = extrair(r, ['conclusão do pedido', 'geração', 'data']);
      if (dStr && new Date(String(dStr).replace(' ', 'T')) > maxKwaiDate) maxKwaiDate = new Date(String(dStr).replace(' ', 'T'));
    });
    if (maxKwaiDate.getTime() === 0) maxKwaiDate = new Date(); 

    // CAMADA 1: LOGÍSTICA
    upsellerData.forEach(row => {
      const idPedido = String(extrair(row, ['nº de pedido da plataforma', 'nº de pedido', 'order id']) || '').trim();
      if (!idPedido) return;
      
      const statusPos = extrair(row, ['pós-venda', 'cancelado', 'devolvido', 'status']);
      const valorTotalProdutos = Number(extrair(row, ['valor total de produtos'])) || Number(extrair(row, ['valor do pedido'])) || 0; 
      
      const dEnvio = new Date(String(extrair(row, ['hora de envio', 'hora do pedido'])).replace(' ', 'T') || 0);
      const dVencimento = new Date(dEnvio.getTime() + (22 * 86400000));
      const sku = String(extrair(row, ['sku', 'especificação', 'código'])).trim();
      const qtd = Number(extrair(row, ['qtd', 'quantidade'])) || 1;
      const custoUnitario = mapaCustos.get(sku)?.custo || 0;
      
      let status = "PENDENTE";
      if (String(statusPos).toLowerCase().includes('cancelado') || String(statusPos).toLowerCase().includes('devolvido')) status = "CANCELADO_DEVOLVIDO";

      if (!orderMap.has(idPedido) || orderMap.get(idPedido).status !== 'AMOSTRA_CONFIRMADA') {
        orderMap.set(idPedido, { id_pedido: idPedido, valor_bruto: valorTotalProdutos, data_envio: dEnvio.toISOString(), vencimento_esperado: dVencimento.toISOString(), status: orderMap.get(idPedido)?.status || status, receita_kwai: 0, roubo_taxa: 0, custo_pedido: (custoUnitario * qtd), lucro_pedido: 0, sku, qtd, user_id: session.user.id });
      }
    });

    let atrasados: any[] = [], divergencias: any[] = [], noPrazo: any[] = [], corretos: any[] = [], cancelados: any[] = [], amostras: any[] = [], divergenciasPreco: any[] = [];
    let valorBrutoGeral = 0, totalDiferencas = 0, custoTotalGeral = 0, lucroLiquidoGeral = 0;
    const jsonAuditExport: any[] = [];

    // CAMADAS 2 AO 8: AUDITORIA FORENSE FINANCEIRA (KWAI)
    Array.from(orderMap.values()).forEach(order => {
       const kwaiRow = kwaiData.find(r => String(extrair(r, ['número do pedido', 'pedido', 'id'])).trim() === order.id_pedido);
       
       let auditObj: any = {
           pedido_id: order.id_pedido,
           upseller: { valor_total_produtos: order.valor_bruto, quantidade_itens: order.qtd },
           kwai: null, calculo: null, classificacao: { status: order.status }
       };

       if (order.status === 'CANCELADO_DEVOLVIDO' || order.status === 'REEMBOLSO') {
          cancelados.push({ "ID do Pedido": order.id_pedido, "Status UPSeller": "Cancelado/Devolvido", "Valor UPSeller Base": order.valor_bruto });
          jsonAuditExport.push(auditObj);
          return;
       }

       if (!kwaiRow) {
          const repasseEstimado = order.valor_bruto - ((order.valor_bruto * 0.20) + (order.qtd * 4.00));
          if (new Date(order.vencimento_esperado) < maxKwaiDate) {
             order.status = 'ATRASADO'; auditObj.classificacao.status = 'ATRASADO';
             atrasados.push({ "ID do Pedido": order.id_pedido, "Repasse Atrasado Estimado (R$)": Number(repasseEstimado.toFixed(2)) });
             totalDiferencas += repasseEstimado;
          } else {
             order.status = 'NO_PRAZO'; auditObj.classificacao.status = 'NO_PRAZO';
             noPrazo.push({ "ID do Pedido": order.id_pedido, "Vencimento Esperado": new Date(order.vencimento_esperado).toLocaleDateString(), "Valor Estimado Bruto (R$)": order.valor_bruto });
          }
          valorBrutoGeral += order.valor_bruto; custoTotalGeral += order.custo_pedido;
          jsonAuditExport.push(auditObj);
          return;
       }

       const precoKwai = Number(extrair(kwaiRow, ['preço do produto', 'preço'])) || 0;
       const subvencaoComercial = Number(extrair(kwaiRow, ['subvenção ao comércio de mercadorias'])) || 0; 
       const subsidioPlataforma = Number(extrair(kwaiRow, ['subsídio da plataforma', 'subsídio de produto da plataforma'])) || 0;
       const freteCobradoVendedor = Number(extrair(kwaiRow, ['frete pago pelo vendedor'])) || 0;
       const recKwai = Number(extrair(kwaiRow, ['receita', 'repasse'])) || 0;

       auditObj.kwai = { preco: precoKwai, subvencao_comercio: subvencaoComercial, subsidio_plataforma: subsidioPlataforma, frete_vendedor: freteCobradoVendedor, receita: recKwai };

       if (Math.abs(order.valor_bruto - precoKwai) > tol && order.valor_bruto > 0) {
           order.status = 'DIVERGENCIA_PRECO'; auditObj.classificacao.status = 'DIVERGENCIA_PRECO';
           divergenciasPreco.push({ "ID": order.id_pedido, "Preço UPSeller": order.valor_bruto, "Preço Kwai": precoKwai, "Gap": Math.abs(order.valor_bruto - precoKwai) });
           jsonAuditExport.push(auditObj);
           return; 
       }

       const valorRealVenda = precoKwai - Math.abs(subvencaoComercial);
       const taxa20 = valorRealVenda * 0.20;
       const taxaOp = order.qtd * 4.00;
       const repasseEsperado = valorRealVenda - taxa20 - taxaOp;
       const diferenca = repasseEsperado - recKwai;

       auditObj.calculo = { preco_real_venda: Number(valorRealVenda.toFixed(2)), comissao_20: Number(taxa20.toFixed(2)), taxa_operacional: Number(taxaOp.toFixed(2)), repasse_esperado: Number(repasseEsperado.toFixed(2)), diferenca: Number(diferenca.toFixed(2)) };

       if (valorRealVenda <= 1.00 && order.status !== 'AMOSTRA_CONFIRMADA') {
           order.status = 'POSSIVEL_AMOSTRA'; auditObj.classificacao.status = 'POSSIVEL_AMOSTRA';
           amostras.push({ "ID do Pedido": order.id_pedido, "Valor Real": valorRealVenda, "Status": "POSSIVEL_AMOSTRA" });
           jsonAuditExport.push(auditObj);
           return;
       }

       if (order.status === 'AMOSTRA_CONFIRMADA') {
           amostras.push({ "ID do Pedido": order.id_pedido, "Valor Real": valorRealVenda, "Status": "AMOSTRA_CONFIRMADA" });
           auditObj.classificacao.status = 'AMOSTRA_CONFIRMADA';
           jsonAuditExport.push(auditObj);
           return;
       }

       order.valor_bruto = valorRealVenda;
       order.receita_kwai = recKwai;
       order.lucro_pedido = recKwai - order.custo_pedido;
       order.roubo_taxa = diferenca; 
       
       valorBrutoGeral += valorRealVenda;
       custoTotalGeral += order.custo_pedido;
       lucroLiquidoGeral += order.lucro_pedido;

       const baseReport = {
          "ID do Pedido": order.id_pedido,
          "Preço Original": Number(precoKwai.toFixed(2)),
          "Subvenção (Desc.)": Number(-Math.abs(subvencaoComercial).toFixed(2)),
          "Valor Real da Venda": Number(valorRealVenda.toFixed(2)),
          "Taxa 20%": Number(-taxa20.toFixed(2)),
          "Taxa Op": Number(-taxaOp.toFixed(2)),
          "Esperado Kwai": Number(repasseEsperado.toFixed(2)),
          "Receita Liquidada": Number(recKwai.toFixed(2)),
          "Diferença / Gap": Number(diferenca.toFixed(2))
       };

       if (Math.abs(diferenca) <= tol) {
          order.status = 'PAGO_CORRETO'; auditObj.classificacao.status = 'REPASSADO_CORRETAMENTE';
          corretos.push({ ...baseReport, "STATUS": "🟢 CORRETO" });
       } else if (diferenca < -tol) {
          order.status = 'ACIMA_ESPERADO'; auditObj.classificacao.status = 'RECEBIMENTO_ACIMA_ESPERADO';
          corretos.push({ ...baseReport, "STATUS": "🟢 ACIMA DO ESPERADO" });
       } else {
          order.status = 'DIVERGENCIA_FINANCEIRA'; auditObj.classificacao.status = 'DIVERGENCIA_FINANCEIRA';
          let motivo = "Diferença não explicada";
          if (Math.abs(freteCobradoVendedor) > tol) motivo = `Divergência Financeira (Frete Vendedor Identificado: R$ ${Math.abs(freteCobradoVendedor).toFixed(2)})`;
          
          divergencias.push({ ...baseReport, "Análise Forense": motivo, "STATUS": "🔴 DIVERGÊNCIA" });
          totalDiferencas += diferenca;
       }
       jsonAuditExport.push(auditObj);
    });

    try {
      for (let i = 0; i < Array.from(orderMap.values()).length; i += 500) {
        await supabase.from('pedidos_kwai').upsert(Array.from(orderMap.values()).slice(i, i + 500), { onConflict: 'user_id,id_pedido' });
      }
    } catch (e) {}

    setResultados({
        atrasados, divergencias, noPrazo, corretos, cancelados, amostras, divergenciasPreco,
        valorBruto: Number(valorBrutoGeral.toFixed(2)), totalRetido: Number(totalDiferencas.toFixed(2)), custoTotal: Number(custoTotalGeral.toFixed(2)), lucroLiquido: Number(lucroLiquidoGeral.toFixed(2)),
        jsonAudit: jsonAuditExport,
        chartStatus: [
          {name:'Liquidados OK',value:corretos.length},
          {name:'No Pipeline',value:noPrazo.length},
          {name:'Divergência',value:divergencias.length},
          {name:'Atrasados SLA',value:atrasados.length},
          {name:'Amostras',value:amostras.length},
          {name:'Quarentena',value:cancelados.length}
        ].filter(i=>i.value>0) 
    });
    setIsSyncing(false);
    setActiveTab('dashboard');
  };

  // NAVEGAÇÃO ACORDEÃO (Menu Lateral Modular)
  const toggleMenu = (menu: string) => {
    setOpenMenus(prev => ({ ...prev, [menu]: !prev[menu] }));
  };

  const handleMenuClick = (mkt: string, tab: string) => {
    setMarketplace(mkt);
    setActiveTab(tab);
  };

  if (isF5Loading) return <div className="h-screen w-full flex items-center justify-center bg-[#09090B]"><Loader2 className="animate-spin text-zinc-400" size={32} /></div>;

  const SecaoHeader = ({ titulo, descricao }: any) => (
    <div className="mb-8 border-b border-zinc-200 pb-5"><h2 className="text-2xl font-semibold tracking-tight text-zinc-900">{titulo}</h2><p className="text-sm text-zinc-500 mt-1">{descricao}</p></div>
  );

  return (
    <div className="flex h-screen w-full bg-[#FAFAFA] text-zinc-900 font-sans antialiased overflow-hidden selection:bg-emerald-100 selection:text-emerald-900">
      
      {/* SIDEBAR MODULAR */}
      <div className="w-72 bg-[#09090B] flex-shrink-0 flex flex-col justify-between overflow-y-auto border-r border-zinc-800 scrollbar-hide">
        <div className="p-5">
          <div className="flex items-center gap-3 mb-8 px-2 mt-2">
            <div className="bg-zinc-50 p-1.5 rounded-md"><ShieldCheck size={18} className="text-zinc-900" /></div>
            <h1 className="text-base font-bold text-zinc-50 tracking-tight">REPASSE.AI</h1>
          </div>
          
          <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-semibold mb-3 ml-2">Módulos de Auditoria</p>
          <div className="space-y-2 mb-6">
            
            {/* MENU KWAI (ATIVO) */}
            <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 overflow-hidden">
              <button onClick={() => toggleMenu('kwai')} className="w-full flex items-center justify-between p-3 text-sm font-medium text-zinc-300 hover:text-zinc-50 transition-colors">
                 <div className="flex items-center gap-3"><div className="bg-[#f59e0b]/10 p-1.5 rounded-md text-[#f59e0b]"><Smartphone size={16}/></div> Kwai </div>
                 <ChevronDown size={14} className={`transition-transform text-zinc-500 ${openMenus['kwai'] ? 'rotate-180' : ''}`} />
              </button>
              {openMenus['kwai'] && (
                <div className="pl-11 pr-3 pb-3 pt-1 space-y-1">
                  <button onClick={() => handleMenuClick('kwai', 'dashboard')} className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${marketplace === 'kwai' && activeTab === 'dashboard' ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'}`}>Visão Geral</button>
                  <button onClick={() => handleMenuClick('kwai', 'upload')} className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${marketplace === 'kwai' && activeTab === 'upload' ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'}`}>Nova Auditoria</button>
                  <button onClick={() => handleMenuClick('kwai', 'aguardando')} className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${marketplace === 'kwai' && activeTab === 'aguardando' ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'}`}>No Pipeline (Prazo)</button>
                  <button onClick={() => handleMenuClick('kwai', 'divergencias')} className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${marketplace === 'kwai' && activeTab === 'divergencias' ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'}`}>Divergências / Atrasos</button>
                  <button onClick={() => handleMenuClick('kwai', 'amostras')} className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${marketplace === 'kwai' && activeTab === 'amostras' ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'}`}>Amostras & Anomalias</button>
                  <button onClick={() => handleMenuClick('kwai', 'malhafina')} className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${marketplace === 'kwai' && activeTab === 'malhafina' ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'}`}>Quarentena (Canc.)</button>
                  <button onClick={() => handleMenuClick('kwai', 'lucro')} className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${marketplace === 'kwai' && activeTab === 'lucro' ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'}`}>Lucratividade</button>
                </div>
              )}
            </div>

            {/* MENUS EM DESENVOLVIMENTO (SHOPEE, TIKTOK, MERCADO LIVRE) */}
            <div className="bg-transparent rounded-xl overflow-hidden">
              <button onClick={() => toggleMenu('shopee')} className="w-full flex items-center justify-between p-3 text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 rounded-xl transition-colors">
                 <div className="flex items-center gap-3"><div className="bg-[#ee4d2d]/10 p-1.5 rounded-md text-[#ee4d2d]"><ShoppingBag size={16}/></div> Shopee </div>
                 <ChevronDown size={14} className={`transition-transform text-zinc-600 ${openMenus['shopee'] ? 'rotate-180' : ''}`} />
              </button>
              {openMenus['shopee'] && (
                <div className="pl-11 pr-3 pb-2 pt-1 space-y-1">
                  {['Visão Geral', 'Nova Auditoria', 'No Pipeline', 'Divergências', 'Quarentena'].map(t => ( <button key={t} onClick={() => handleMenuClick('shopee', 'upload')} className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${marketplace === 'shopee' ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-500 hover:text-zinc-300'}`}>{t}</button> ))}
                </div>
              )}
            </div>

            <div className="bg-transparent rounded-xl overflow-hidden">
              <button onClick={() => toggleMenu('tiktok')} className="w-full flex items-center justify-between p-3 text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 rounded-xl transition-colors">
                 <div className="flex items-center gap-3"><div className="bg-[#ec4899]/10 p-1.5 rounded-md text-[#ec4899]"><Video size={16}/></div> TikTok </div>
                 <ChevronDown size={14} className={`transition-transform text-zinc-600 ${openMenus['tiktok'] ? 'rotate-180' : ''}`} />
              </button>
              {openMenus['tiktok'] && (
                <div className="pl-11 pr-3 pb-2 pt-1 space-y-1">
                  {['Visão Geral', 'Nova Auditoria', 'No Pipeline', 'Divergências', 'Quarentena'].map(t => ( <button key={t} onClick={() => handleMenuClick('tiktok', 'upload')} className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${marketplace === 'tiktok' ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-500 hover:text-zinc-300'}`}>{t}</button> ))}
                </div>
              )}
            </div>

            <div className="bg-transparent rounded-xl overflow-hidden">
              <button onClick={() => toggleMenu('meli')} className="w-full flex items-center justify-between p-3 text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 rounded-xl transition-colors">
                 <div className="flex items-center gap-3"><div className="bg-[#eab308]/10 p-1.5 rounded-md text-[#eab308]"><Store size={16}/></div> Mercado Livre </div>
                 <ChevronDown size={14} className={`transition-transform text-zinc-600 ${openMenus['meli'] ? 'rotate-180' : ''}`} />
              </button>
              {openMenus['meli'] && (
                <div className="pl-11 pr-3 pb-2 pt-1 space-y-1">
                  {['Visão Geral', 'Nova Auditoria', 'No Pipeline', 'Divergências', 'Quarentena'].map(t => ( <button key={t} onClick={() => handleMenuClick('meli', 'upload')} className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${marketplace === 'meli' ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-500 hover:text-zinc-300'}`}>{t}</button> ))}
                </div>
              )}
            </div>

          </div>

          <div className="h-px bg-zinc-800 my-4 mx-2"></div>
          <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-semibold mb-2 ml-3">Gestão Global</p>
          <nav className="space-y-1">
            <button onClick={() => { setMarketplace('global'); setActiveTab('produtos'); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'produtos' ? 'bg-emerald-500/10 text-emerald-400' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/40'}`}><Package size={16}/> Meus Produtos (SKUs)</button>
          </nav>
        </div>
        <div className="p-4 border-t border-zinc-800"><button onClick={() => supabase.auth.signOut()} className="w-full flex items-center gap-3 px-3 py-2.5 text-zinc-500 hover:text-red-400 rounded-lg transition-colors text-sm font-medium"><LogOut size={16}/> Encerrar Sessão</button></div>
      </div>

      <div className="flex-1 h-full overflow-y-auto p-10 relative">
        
        {/* VIEW GLOBAL: PRODUTOS */}
        {activeTab === 'produtos' && (
          <div className="w-full animate-fade-in max-w-6xl mx-auto pb-10">
            <div className="flex justify-between items-end mb-8 border-b border-zinc-200 pb-5"><div><h2 className="text-2xl font-semibold tracking-tight text-zinc-900">Gerenciamento Central de SKUs</h2><p className="text-sm text-zinc-500 mt-1">Atribuição de custos (COGS) válida para todas as plataformas integradas.</p></div><button onClick={carregarProdutos} className="bg-white text-zinc-700 border border-zinc-200 px-4 py-2 rounded-md font-medium text-xs hover:bg-zinc-50 shadow-sm transition-colors">Sync Database</button></div>
            <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
               {meusProdutos.length === 0 ? ( <div className="p-16 text-center text-sm text-zinc-500">Catálogo vazio. O sistema populará isso automaticamente via Data Ingestion.</div> ) : (
                 <div className="max-h-[60vh] overflow-y-auto">
                   <table className="w-full text-left text-sm">
                     <thead className="bg-zinc-50/50 text-zinc-500 font-medium sticky top-0 border-b border-zinc-200"><tr><th className="p-4">SKU / Identifier</th><th className="p-4 w-1/3">Item Descriptor</th><th className="p-4">Unit Cost (COGS)</th><th className="p-4">SKU Consolidation</th><th className="p-4">Ação</th></tr></thead>
                     <tbody className="divide-y divide-zinc-100">
                       {meusProdutos.map((prod) => (
                         <tr key={prod.id} className="hover:bg-zinc-50 transition-colors">
                           <td className="p-4 font-mono text-xs text-zinc-500">{prod.sku}</td><td className="p-4 text-zinc-900 truncate max-w-xs" title={prod.nome}>{prod.nome}</td>
                           <td className="p-4"><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs font-medium">R$</span><input type="number" step="0.01" defaultValue={prod.custo} id={`custo-${prod.sku}`} className="w-28 bg-white border border-zinc-200 rounded-md py-1.5 pl-8 pr-2 text-sm text-zinc-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all shadow-sm" /></div></td>
                           <td className="p-4"><input type="text" placeholder="SKU-PARENT" defaultValue={prod.sku_master || ''} id={`master-${prod.sku}`} className="w-32 bg-white border border-zinc-200 rounded-md px-3 py-1.5 text-xs text-zinc-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all shadow-sm font-mono placeholder:text-zinc-300" /></td>
                           <td className="p-4"><button onClick={() => { const custo = (document.getElementById(`custo-${prod.sku}`) as HTMLInputElement).value; const master = (document.getElementById(`master-${prod.sku}`) as HTMLInputElement).value; atualizarProduto(prod.sku, Number(custo), master); }} className="bg-zinc-900 text-white p-1.5 rounded-md hover:bg-zinc-800 transition-all shadow-sm"><Save size={16}/></button></td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               )}
            </div>
          </div>
        )}

        {/* VIEW: MÓDULOS EM DESENVOLVIMENTO (SHOPEE, TIKTOK, MELI) */}
        {activeTab !== 'produtos' && marketplace !== 'kwai' && (
           <div className="flex flex-col items-center justify-center min-h-[70vh] text-center animate-fade-in">
             <div className="bg-white border border-zinc-200 p-6 rounded-2xl shadow-sm mb-6">
                {marketplace === 'shopee' && <ShoppingBag size={48} className="text-zinc-300" />}
                {marketplace === 'tiktok' && <Video size={48} className="text-zinc-300" />}
                {marketplace === 'meli' && <Store size={48} className="text-zinc-300" />}
             </div>
             <h2 className="text-2xl font-semibold text-zinc-900 tracking-tight">Módulo em Desenvolvimento</h2>
             <p className="text-zinc-500 mt-2 max-w-md leading-relaxed">Nossos engenheiros financeiros estão homologando as regras matemáticas e as tolerâncias de frete para a plataforma <b>{marketplace.toUpperCase()}</b>. Estará disponível em breve.</p>
           </div>
        )}

        {/* VIEW: MÓDULO KWAI (ISOLADO E FUNCIONAL) */}
        {activeTab !== 'produtos' && marketplace === 'kwai' && (
          <>
            {activeTab === 'dashboard' && resultados && (
              <div className="w-full animate-fade-in max-w-6xl mx-auto pb-10">
                <div className="flex justify-between items-end mb-8 border-b border-zinc-200 pb-5">
                  <div><h2 className="text-2xl font-semibold tracking-tight text-zinc-900">Visão Geral - Kwai</h2><p className="text-sm text-zinc-500 mt-1">Métricas de volume e capital processadas em base forense.</p></div>
                  <div className="flex gap-2">
                    <button onClick={exportarJSON} className="flex items-center gap-2 text-xs font-medium text-zinc-600 bg-white hover:bg-zinc-50 border border-zinc-200 px-3 py-2 rounded-lg transition-colors shadow-sm"><FileJson size={14}/> Dados Raw (JSON)</button>
                    <button onClick={exportarBackupGeral} className="flex items-center gap-2 text-xs font-medium text-zinc-600 bg-white hover:bg-zinc-50 border border-zinc-200 px-3 py-2 rounded-lg transition-colors shadow-sm"><Archive size={14}/> Database Dump</button>
                    <button onClick={apagarTudo} className="flex items-center gap-2 text-xs font-medium text-red-600 bg-white hover:bg-red-50 border border-red-100 px-3 py-2 rounded-lg transition-colors shadow-sm"><Trash2 size={14}/></button>
                  </div>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm flex flex-col justify-center"><p className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500"/> Venda Efetiva Operacional</p><p className="text-4xl font-semibold tracking-tight text-zinc-900">R$ {resultados.valorBruto.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p></div>
                    <div className="bg-white p-6 rounded-xl border border-red-200 shadow-sm flex flex-col justify-center relative overflow-hidden"><div className="absolute top-0 right-0 p-6 opacity-10"><AlertTriangle size={64} className="text-red-500"/></div><p className="text-xs font-medium text-red-600 uppercase tracking-widest mb-2 relative z-10">Divergências p/ Cobrança</p><p className="text-4xl font-semibold tracking-tight text-red-600 relative z-10">R$ {resultados.totalRetido.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p></div>
                  </div>
                  <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm flex flex-col min-h-[300px]"><h3 className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-4">Status de Conformidade</h3><div className="flex-1 min-h-[200px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={resultados.chartStatus} cx="50%" cy="50%" innerRadius="65%" outerRadius="85%" paddingAngle={2} dataKey="value" stroke="none">{resultados.chartStatus.map((_:any, index:number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><RechartsTooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e4e4e7', boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)' }}/><Legend verticalAlign="bottom" height={24} iconType="circle" wrapperStyle={{ fontSize: '11px' }}/></PieChart></ResponsiveContainer></div></div>
                </div>
              </div>
            )}
            
            {activeTab === 'dashboard' && !resultados && (
              <div className="w-full animate-fade-in max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[80vh]">
                <div className="absolute top-6 right-6"><button onClick={apagarTudo} className="flex items-center gap-2 text-xs font-medium text-red-600 bg-white hover:bg-red-50 border border-red-100 px-3 py-2 rounded-lg transition-colors shadow-sm"><Trash2 size={14}/> Limpar Instância</button></div>
                <div className="bg-white border border-zinc-200 p-4 rounded-2xl shadow-sm mb-8"><ShieldCheck size={32} className="text-zinc-900" /></div>
                <h2 className="text-3xl font-semibold text-zinc-900 tracking-tight text-center mb-4">Auditoria Forense Nível 1</h2>
                <p className="text-zinc-500 text-center max-w-xl mb-12 leading-relaxed">Compliance financeiro construído sobre as diretrizes estritas do mercado. O sistema isola subsídios de plataforma, cruza os valores base e expõe centavos omitidos em falsos positivos.</p>
                <button onClick={() => setActiveTab('upload')} className="bg-zinc-900 text-white px-8 py-3 rounded-lg font-medium text-sm hover:bg-zinc-800 shadow-sm transition-colors flex items-center gap-2"><UploadCloud size={18}/> Iniciar Workspace (Kwai)</button>
              </div>
            )}

            {activeTab === 'upload' && (
              <div className="w-full animate-fade-in max-w-4xl mx-auto pb-10">
                <SecaoHeader titulo="Data Ingestion (Kwai)" descricao="Upload dos artefatos contábeis exportados. Obrigatório: Arquivo UPSeller contendo 'Valor Total de Produtos'." />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <label className="bg-white border border-dashed border-zinc-300 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-zinc-400 hover:bg-zinc-50 transition-all"><div className="bg-zinc-100 p-3 rounded-lg mb-4 text-zinc-600"><Package size={24}/></div><h3 className="font-semibold text-sm text-zinc-900 mb-1">Base Logística (UPSeller)</h3><p className="text-xs text-zinc-500 mb-4 text-center h-8">{upsellerData.length > 0 ? <span className="inline-flex items-center px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 font-medium ring-1 ring-inset ring-emerald-600/20">{upsellerData.length} registros</span> : 'CSV / Excel'}</p><input type="file" className="hidden" onChange={(e) => lerPlanilha(e, setUpsellerData)} /></label>
                  <label className="bg-white border border-dashed border-zinc-300 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-zinc-400 hover:bg-zinc-50 transition-all"><div className="bg-zinc-100 p-3 rounded-lg mb-4 text-zinc-600"><FileSpreadsheet size={24}/></div><h3 className="font-semibold text-sm text-zinc-900 mb-1">Extrato Financeiro (Kwai)</h3><p className="text-xs text-zinc-500 mb-4 text-center h-8">{kwaiData.length > 0 ? <span className="inline-flex items-center px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 font-medium ring-1 ring-inset ring-emerald-600/20">{kwaiData.length} registros</span> : 'CSV / Excel'}</p><input type="file" className="hidden" onChange={(e) => lerPlanilha(e, setKwaiData)} /></label>
                </div>
                <button onClick={executarConciliacao} disabled={isSyncing} className={`w-full py-4 rounded-xl shadow-sm font-semibold text-sm flex items-center justify-center gap-2 transition-all border ${isSyncing ? 'bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed' : 'bg-zinc-900 text-white border-zinc-900 hover:bg-zinc-800'}`}>{isSyncing ? <><Loader2 className="animate-spin" size={18}/> Processando reconciliação...</> : <><Database size={18}/> Executar Motor de Auditoria Kwai</>}</button>
              </div>
            )}

            {activeTab === 'divergencias' && (
              <div className="w-full animate-fade-in max-w-6xl mx-auto pb-10">
                <SecaoHeader titulo="Painel de Discrepâncias" descricao="Rupturas do modelo de conformidade. Divergências financeiras (gaps > R$0.01) e quebras de SLA Logístico (> 22 dias)." />
                {!resultados ? ( <div className="bg-white border border-zinc-200 rounded-xl p-12 text-center text-sm text-zinc-500">Workspace não inicializado.</div> ) : (
                  <div className="grid grid-cols-1 gap-6 w-full">
                    <div className="bg-white border border-zinc-200 rounded-xl shadow-sm flex flex-col min-h-[400px] overflow-hidden w-full">
                      <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 flex justify-between items-center">
                        <div><h3 className="font-semibold text-sm text-zinc-900 flex items-center gap-2"><AlertTriangle size={16} className="text-red-500"/> Anomalias Financeiras</h3><p className="text-xs text-zinc-500 mt-0.5">{resultados.divergencias.length} registros violados.</p></div>
                        {resultados.divergencias.length > 0 && (
                          <div className="flex gap-2"><button onClick={() => exportarExcel(resultados.divergencias, "Divergencias_Financeiras")} className="bg-white text-zinc-700 border border-zinc-200 px-3 py-1.5 rounded-md font-medium text-xs flex items-center gap-2 hover:bg-zinc-50 shadow-sm transition-colors">Excel</button><button onClick={() => exportarPDF(resultados.divergencias, "Relatorio de Anomalias Financeiras", "Divergencias_Financeiras")} className="bg-white text-zinc-700 border border-zinc-200 px-3 py-1.5 rounded-md font-medium text-xs flex items-center gap-2 hover:bg-zinc-50 shadow-sm transition-colors">PDF</button></div>
                        )}
                      </div>
                      <div className="overflow-y-auto flex-1">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-zinc-50/50 text-zinc-500 sticky top-0 border-b border-zinc-200">
                            <tr><th className="p-4 font-medium">Tracking ID</th><th className="p-4 font-medium">Análise Forense</th><th className="p-4 text-right font-medium">Modelo Base</th><th className="p-4 text-right font-medium">Liquidado</th><th className="p-4 text-right font-medium text-zinc-900">Gap Identificado</th></tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100">
                            {resultados.divergencias.map((item: any, idx: number) => (
                              <tr key={idx} className="hover:bg-zinc-50 transition-colors">
                                <td className="p-4 font-mono text-xs text-zinc-900">{item["ID do Pedido"]}</td>
                                <td className="p-4"><span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-semibold tracking-wide uppercase bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/10">{item["Análise Forense"] || item["Motivo"]}</span></td>
                                <td className="p-4 text-right text-zinc-500">R$ {item["Esperado Kwai"]?.toFixed(2) || '0.00'}</td>
                                <td className="p-4 text-right text-zinc-500">R$ {item["Receita Liquidada"]?.toFixed(2) || '0.00'}</td>
                                <td className="p-4 text-right font-medium text-red-600">R$ {item["Diferença / Gap"]?.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {resultados.divergencias.length === 0 && <div className="p-12 text-center text-sm text-zinc-500">Nenhuma anomalia crítica.</div>}
                      </div>
                    </div>

                    <div className="bg-white border border-zinc-200 rounded-xl shadow-sm flex flex-col min-h-[300px] overflow-hidden w-full">
                      <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 flex justify-between items-center">
                        <div><h3 className="font-semibold text-sm text-zinc-900 flex items-center gap-2"><Hourglass size={16} className="text-amber-500"/> Atrasos / SLAs Violados</h3><p className="text-xs text-zinc-500 mt-0.5">{resultados.atrasados.length} pedidos em atraso logístico.</p></div>
                        {resultados.atrasados.length > 0 && (
                           <div className="flex gap-2"><button onClick={() => exportarExcel(resultados.atrasados, "Atrasados")} className="bg-white text-zinc-700 border border-zinc-200 px-3 py-1.5 rounded-md font-medium text-xs flex items-center gap-2 hover:bg-zinc-50 shadow-sm transition-colors">Excel</button></div>
                        )}
                      </div>
                      <div className="overflow-y-auto flex-1">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-zinc-50/50 text-zinc-500 sticky top-0 border-b border-zinc-200">
                            <tr><th className="p-4 font-medium">Tracking ID</th><th className="p-4 text-right font-medium">Exposure Estimado</th></tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100">
                            {resultados.atrasados.map((item: any, idx: number) => (
                              <tr key={idx} className="hover:bg-zinc-50 transition-colors">
                                <td className="p-4 font-mono text-xs text-zinc-900">{item["ID do Pedido"]}</td>
                                <td className="p-4 text-right font-medium text-amber-600">R$ {item["Repasse Atrasado Estimado (R$)"]?.toFixed(2) || item["Atraso Retido (R$)"].toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {resultados.atrasados.length === 0 && <div className="p-12 text-center text-sm text-zinc-500">Nenhum backlog fora da janela.</div>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'amostras' && (
              <div className="w-full animate-fade-in max-w-5xl mx-auto pb-10">
                <SecaoHeader titulo="Amostras & Anomalias Base" descricao="Pedidos processados com Valor Real de Venda <= R$ 1,00 ou com divergência entre preço declarado e preço liquidado." />
                {!resultados ? ( <div className="bg-white border border-zinc-200 rounded-xl p-12 text-center text-sm text-zinc-500">Workspace não inicializado.</div> ) : (
                  <div className="grid grid-cols-1 gap-6 w-full">
                    <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden w-full">
                      <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 flex justify-between items-center"><h3 className="font-semibold text-sm text-zinc-900">Flag: Possíveis Amostras / Promoções</h3></div>
                      <div className="max-h-[50vh] overflow-y-auto">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-zinc-50/50 text-zinc-500 font-medium sticky top-0 border-b border-zinc-200">
                            <tr><th className="p-4 font-medium">Tracking ID</th><th className="p-4 font-medium">Valor Real da Venda</th><th className="p-4 font-medium">Status Atual</th><th className="p-4 text-right font-medium">Ação do Auditor</th></tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100">
                            {resultados.amostras.map((item: any, idx: number) => (
                              <tr key={idx} className="hover:bg-zinc-50 transition-colors">
                                <td className="p-4 font-mono text-xs text-zinc-900">{item["ID do Pedido"]}</td>
                                <td className="p-4 text-zinc-700">R$ {item["Valor Real"]?.toFixed(2) || item["Valor Real de Venda"]?.toFixed(2)}</td>
                                <td className="p-4"><span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-semibold tracking-wide uppercase ring-1 ring-inset ${item["Status"] === 'AMOSTRA_CONFIRMADA' ? 'bg-blue-50 text-blue-700 ring-blue-600/20' : 'bg-amber-50 text-amber-700 ring-amber-600/20'}`}>{item["Status"]}</span></td>
                                <td className="p-4 text-right">
                                  {item["Status"] !== 'AMOSTRA_CONFIRMADA' ? (
                                    <button onClick={() => confirmarAmostra(item["ID do Pedido"])} className="text-xs bg-zinc-900 text-white px-3 py-1.5 rounded-md hover:bg-zinc-800 transition-colors flex items-center gap-1 ml-auto"><Check size={14}/> Confirmar Amostra</button>
                                  ) : <span className="text-xs text-zinc-400">Verificado</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {resultados.amostras.length === 0 && <p className="text-zinc-500 text-sm text-center py-12">Nenhuma amostra detectada.</p>}
                      </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden w-full">
                      <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 flex justify-between items-center"><h3 className="font-semibold text-sm text-zinc-900">Flag: Divergência de Preço (Base UPSeller vs Kwai)</h3></div>
                      <div className="max-h-[50vh] overflow-y-auto">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-zinc-50/50 text-zinc-500 font-medium sticky top-0 border-b border-zinc-200">
                            <tr><th className="p-4 font-medium">Tracking ID</th><th className="p-4 font-medium">Valor Base UPSeller</th><th className="p-4 font-medium">Preço Orig. Kwai</th><th className="p-4 text-right font-medium">Desvio</th></tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100">
                            {resultados.divergenciasPreco.map((item: any, idx: number) => (
                              <tr key={idx} className="hover:bg-zinc-50 transition-colors">
                                <td className="p-4 font-mono text-xs text-zinc-900">{item["ID"] || item["ID do Pedido"]}</td>
                                <td className="p-4 text-zinc-700">R$ {item["Preço UPSeller"]?.toFixed(2) || '---'}</td>
                                <td className="p-4 text-zinc-700">R$ {item["Preço Kwai"]?.toFixed(2) || '---'}</td>
                                <td className="p-4 text-right text-amber-600 font-medium">R$ {item["Gap"]?.toFixed(2) || '---'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {resultados.divergenciasPreco.length === 0 && <p className="text-zinc-500 text-sm text-center py-12">Nenhuma divergência de preço detectada na camada 2.</p>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'aguardando' && (
              <div className="w-full animate-fade-in max-w-5xl mx-auto pb-10">
                <SecaoHeader titulo="Pipeline Logístico (No Prazo)" descricao="Pedidos que constam na base logística, mas ainda estão dentro da janela de liquidação padrão da plataforma." />
                {!resultados ? ( <div className="bg-white border border-zinc-200 rounded-xl p-12 text-center text-sm text-zinc-500">Workspace não inicializado.</div> ) : (
                  <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden w-full">
                    <div className="p-3 border-b border-zinc-100 bg-zinc-50/50 flex justify-end gap-2">
                       {resultados.noPrazo.length > 0 && (<button onClick={() => exportarExcel(resultados.noPrazo, "No_Prazo")} className="bg-white text-zinc-700 border border-zinc-200 px-3 py-1.5 rounded-md font-medium text-xs flex items-center gap-2 hover:bg-zinc-50 shadow-sm transition-colors"><Download size={14}/> CSV</button>)}
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto">
                      <table className="w-full text-left text-sm"><thead className="bg-zinc-50/50 text-zinc-500 font-medium sticky top-0 border-b border-zinc-200"><tr><th className="p-4 font-medium">Tracking ID</th><th className="p-4 font-medium">Forecast Vencimento</th><th className="p-4 text-right font-medium">Valor Base (R$)</th></tr></thead>
                        <tbody className="divide-y divide-zinc-100">
                          {resultados.noPrazo.map((item: any, idx: number) => (
                            <tr key={idx} className="hover:bg-zinc-50 transition-colors"><td className="p-4 font-mono text-xs text-zinc-900">{item["ID do Pedido"]}</td><td className="p-4"><span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-zinc-100 text-zinc-700">{item["Vencimento Esperado"]}</span></td><td className="p-4 text-right text-zinc-900">{item["Valor Estimado (R$)"]?.toFixed(2) || item["Valor Estimado Bruto (R$)"]?.toFixed(2) || item["Valor Real (R$)"]?.toFixed(2)}</td></tr>
                          ))}
                        </tbody>
                      </table>
                      {resultados.noPrazo.length === 0 && <p className="text-zinc-500 text-sm text-center py-12">Sem dados em trânsito.</p>}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'malhafina' && (
              <div className="w-full animate-fade-in max-w-5xl mx-auto pb-10">
                <SecaoHeader titulo="Data Quarantine (Cancelados)" descricao="Registros segregados para evitar distorção nas métricas de performance." />
                {!resultados ? ( <div className="bg-white border border-zinc-200 rounded-xl p-12 text-center text-sm text-zinc-500">Workspace não inicializado.</div> ) : (
                  <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden w-full">
                    <div className="p-3 border-b border-zinc-100 bg-zinc-50/50 flex justify-end gap-2">{resultados.cancelados.length > 0 && (<button onClick={() => exportarExcel(resultados.cancelados, "Quarentena")} className="bg-white text-zinc-700 border border-zinc-200 px-3 py-1.5 rounded-md font-medium text-xs flex items-center gap-2 hover:bg-zinc-50 shadow-sm transition-colors"><Download size={14}/> CSV</button>)}</div>
                    <div className="max-h-[60vh] overflow-y-auto">
                      <table className="w-full text-left text-sm"><thead className="bg-zinc-50/50 text-zinc-500 font-medium sticky top-0 border-b border-zinc-200"><tr><th className="p-4 font-medium">Tracking ID</th><th className="p-4 font-medium">Flag</th><th className="p-4 text-right font-medium">Valor Original (Base UPSeller)</th></tr></thead>
                        <tbody className="divide-y divide-zinc-100">
                          {resultados.cancelados.map((item: any, idx: number) => (
                            <tr key={idx} className="hover:bg-zinc-50 transition-colors"><td className="p-4 font-mono text-xs text-zinc-900">{item["ID do Pedido"]}</td><td className="p-4"><span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-semibold tracking-wide uppercase bg-zinc-100 text-zinc-600 ring-1 ring-inset ring-zinc-500/10">{item["Status"] || item["Status UPSeller"]}</span></td><td className="p-4 text-right text-zinc-400 line-through">R$ {item["Valor UPSeller Base"]?.toFixed(2) || item["Valor Registrado"]?.toFixed(2) || '0.00'}</td></tr>
                          ))}
                        </tbody>
                      </table>
                      {resultados.cancelados.length === 0 && <p className="text-zinc-500 text-sm text-center py-12">Nenhum evento registrado.</p>}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'lucro' && (
              <div className="w-full animate-fade-in max-w-5xl mx-auto pb-10">
                <SecaoHeader titulo="Statements (P&L)" descricao="Demonstrativo de Resultado com base nas regras de auditoria e COGS." />
                {!resultados ? ( <div className="bg-white border border-zinc-200 rounded-xl p-12 text-center text-sm text-zinc-500">Workspace não inicializado.</div> ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm flex flex-col justify-center"><p className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-2">Net Sales (Valor Real)</p><p className="text-3xl font-semibold tracking-tight text-zinc-900">R$ {resultados.valorBruto.toLocaleString('pt-BR', {minimumFractionDigits:2})}</p></div>
                    <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm flex flex-col justify-center"><p className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-2">COGS (Custos)</p><p className="text-3xl font-semibold tracking-tight text-zinc-500">- R$ {resultados.custoTotal.toLocaleString('pt-BR', {minimumFractionDigits:2})}</p></div>
                    <div className="bg-zinc-900 p-6 rounded-xl shadow-lg flex flex-col justify-center border border-zinc-800 relative overflow-hidden"><div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500 opacity-10 rounded-full blur-2xl -mr-10 -mt-10"></div><p className="text-xs font-medium text-zinc-400 uppercase tracking-widest mb-2 relative z-10">Net Profit</p><p className="text-4xl font-semibold tracking-tight text-emerald-400 relative z-10">R$ {resultados.lucroLiquido.toLocaleString('pt-BR', {minimumFractionDigits:2})}</p></div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}