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

const Tooltip = ({ children, texto }: { children: React.ReactNode, texto: string }) => (
  <div className="relative flex items-center group">
    {children}
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-max max-w-xs p-3 bg-gray-900 text-white text-xs font-medium rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-xl pointer-events-none text-center leading-relaxed">
      {texto}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
    </div>
  </div>
);

export default function Dashboard({ session }: any) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [marketplace, setMarketplace] = useState('kwai'); 
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({ kwai: true, tiktok: true }); 

  const [isSyncing, setIsSyncing] = useState(false);
  const [isF5Loading, setIsF5Loading] = useState(true);
  
  // Fontes de Dados
  const [upsellerData, setUpsellerData] = useState<any[]>([]);
  const [kwaiData, setKwaiData] = useState<any[]>([]);
  const [tiktokData, setTiktokData] = useState<any[]>([]);
  
  const [resultados, setResultados] = useState<any>(null);
  const [meusProdutos, setMeusProdutos] = useState<any[]>([]);

  const COLORS = ['#10b981', '#F1C40F', '#e74c3c', '#3b82f6', '#8b5cf6', '#94a3b8'];

  useEffect(() => {
    const carregarTudo = async () => {
      setIsF5Loading(true);
      await carregarProdutos();
      await carregarDashboardDoBanco();
      setIsF5Loading(false);
    };
    carregarTudo();
  }, [marketplace]); // Recarrega do banco ao trocar de marketplace

  const carregarProdutos = async () => {
    const { data } = await supabase.from('produtos').select('*').eq('user_id', session.user.id);
    if (data) setMeusProdutos(data);
  };

  const carregarDashboardDoBanco = async () => {
    // Escolhe a tabela baseada no marketplace ativo
    const tabela = marketplace === 'tiktok' ? 'pedidos_tiktok' : 'pedidos_kwai';
    const { data: dbOrders } = await supabase.from(tabela).select('*').eq('user_id', session.user.id).catch(() => ({ data: [] }));
    
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
           divergenciasPreco.push({ "ID do Pedido": order.id_pedido, "Aviso": "Preço base da UPSeller difere do extrato financeiro." });
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
               corretos.push({ "ID do Pedido": order.id_pedido, "Receita Liquidada (R$)": Number(order.receita_kwai), "Lucro Líquido (R$)": Number(order.lucro_pedido) });
               lucroLiquido += Number(order.lucro_pedido);
           }
       }
    });

    setResultados({
        atrasados, divergencias, noPrazo, corretos, cancelados, amostras, divergenciasPreco,
        valorBruto: Number(valorBruto.toFixed(2)), totalRetido: Number(totalRetido.toFixed(2)), custoTotal: Number(custoTotal.toFixed(2)), lucroLiquido: Number(lucroLiquido.toFixed(2)),
        jsonAudit: null, 
        chartStatus: [
          {name:'Tudo Certo',value:corretos.length},
          {name:'No Prazo',value:noPrazo.length},
          {name:'Divergência',value:divergencias.length},
          {name:'Atrasados',value:atrasados.length},
          {name:'Amostras',value:amostras.length},
          {name:'Cancelados',value:cancelados.length}
        ].filter(i=>i.value>0) 
    });
  };

  const confirmarAmostra = async (idPedido: string) => {
    const tabela = marketplace === 'tiktok' ? 'pedidos_tiktok' : 'pedidos_kwai';
    const { error } = await supabase.from(tabela).update({ status: 'AMOSTRA_CONFIRMADA' }).eq('id_pedido', idPedido).eq('user_id', session.user.id);
    if (!error) {
      alert("Pronto! Salvamos na memória que este pedido foi uma amostra autorizada.");
      carregarDashboardDoBanco();
    }
  };

  const exportarBackupGeral = async () => {
    const tabela = marketplace === 'tiktok' ? 'pedidos_tiktok' : 'pedidos_kwai';
    const { data: dbOrders } = await supabase.from(tabela).select('*').eq('user_id', session.user.id).catch(() => ({ data: [] }));
    if (!dbOrders || dbOrders.length === 0) return alert("Não há dados salvos ainda.");
    const worksheet = XLSX.utils.json_to_sheet(dbOrders);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Backup_${marketplace}`);
    XLSX.writeFile(workbook, `Backup_RepasseAI_${marketplace}_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`);
  };

  const apagarTudo = async () => {
    if (!window.confirm(`Certeza absoluta? Isso vai apagar todos os resultados da sua auditoria atual de ${marketplace.toUpperCase()}. Quer recomeçar?`)) return;
    setIsF5Loading(true);
    const tabela = marketplace === 'tiktok' ? 'pedidos_tiktok' : 'pedidos_kwai';
    await supabase.from(tabela).delete().eq('user_id', session.user.id).catch(() => {});
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
    doc.setFontSize(16); doc.text(`REPASSE.AI | ${titulo}`, 14, 15);
    doc.setFontSize(10); doc.text(`Documento gerado em: ${new Date().toLocaleString()}`, 14, 22);
    autoTable(doc, { head: [Object.keys(dados[0])], body: dados.map(obj => Object.values(obj)), startY: 28, styles: { fontSize: 8, font: 'helvetica' }, headStyles: { fillColor: [26, 26, 26] } });
    doc.save(`${nomeArquivo}.pdf`);
  };

  const exportarJSON = () => {
    if (!resultados || !resultados.jsonAudit) return alert("Por favor, processe os relatórios novamente nesta sessão para gerar o arquivo.");
    const blob = new Blob([JSON.stringify(resultados.jsonAudit, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `Prova_Real_Auditoria_${marketplace}_${new Date().getTime()}.json`; a.click();
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

  // MOTOR MULTI-PLATAFORMA
  const executarConciliacao = async () => {
    const finData = marketplace === 'tiktok' ? tiktokData : kwaiData;
    if (upsellerData.length === 0 && finData.length === 0) return alert(`⚠️ Suba as planilhas da UPSeller e da ${marketplace.toUpperCase()} primeiro.`);
    setIsSyncing(true);

    const tol = 0.02; // Tolerância de 2 centavos
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

    const tabela = marketplace === 'tiktok' ? 'pedidos_tiktok' : 'pedidos_kwai';
    const { data: dbOrders } = await supabase.from(tabela).select('*').eq('user_id', session.user.id).catch(() => ({ data: [] }));
    const orderMap = new Map();
    if (dbOrders) dbOrders.forEach(o => orderMap.set(o.id_pedido, o));

    let maxDataFinanceiro = new Date(0);
    finData.forEach(r => {
      const dStr = extrair(r, ['conclusão do pedido', 'geração', 'data']);
      if (dStr && new Date(String(dStr).replace(' ', 'T')) > maxDataFinanceiro) maxDataFinanceiro = new Date(String(dStr).replace(' ', 'T'));
    });
    if (maxDataFinanceiro.getTime() === 0) maxDataFinanceiro = new Date(); 

    // CAMADA 1: LOGÍSTICA (UPSeller)
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

    // CAMADAS 2 AO 8: AUDITORIA FORENSE
    Array.from(orderMap.values()).forEach(order => {
       const finRow = finData.find(r => String(extrair(r, ['número do pedido', 'pedido', 'id', 'id do pedido/ajuste'])).trim().includes(order.id_pedido));
       
       let auditObj: any = { pedido_id: order.id_pedido, upseller: { valor_total_produtos: order.valor_bruto, quantidade_itens: order.qtd }, financeiro: null, calculo: null, classificacao: { status: order.status } };

       if (order.status === 'CANCELADO_DEVOLVIDO' || order.status === 'REEMBOLSO') {
          cancelados.push({ "ID do Pedido": order.id_pedido, "Status": "Cancelado/Devolvido", "Valor Original": order.valor_bruto });
          jsonAuditExport.push(auditObj);
          return;
       }

       if (!finRow) {
          const repasseEstimado = order.valor_bruto - ((order.valor_bruto * 0.20) + (order.qtd * 4.00));
          if (new Date(order.vencimento_esperado) < maxDataFinanceiro) {
             order.status = 'ATRASADO'; auditObj.classificacao.status = 'ATRASADO';
             atrasados.push({ "ID do Pedido": order.id_pedido, "Repasse Atrasado Estimado (R$)": Number(repasseEstimado.toFixed(2)) });
             totalDiferencas += repasseEstimado;
          } else {
             order.status = 'NO_PRAZO'; auditObj.classificacao.status = 'NO_PRAZO';
             noPrazo.push({ "ID do Pedido": order.id_pedido, "Paga até dia": new Date(order.vencimento_esperado).toLocaleDateString(), "Valor Estimado (R$)": order.valor_bruto });
          }
          valorBrutoGeral += order.valor_bruto; custoTotalGeral += order.custo_pedido;
          jsonAuditExport.push(auditObj);
          return;
       }

       let valorRealVenda = 0, repasseEsperado = 0, diferenca = 0, repasseLiquidado = 0, baseReport: any = {};

       // --- LÓGICA TIKTOK ---
       if (marketplace === 'tiktok') {
           valorRealVenda = Number(extrair(finRow, ['vendas líquidas dos produtos'])) || order.valor_bruto;
           repasseLiquidado = Number(extrair(finRow, ['valor total a ser liquidado'])) || 0;
           
           const dataCriacaoStr = extrair(finRow, ['data de criação do pedido']);
           let isNewRule = false;
           if (dataCriacaoStr) {
               const dataParsed = new Date(String(dataCriacaoStr).replace(' ', 'T'));
               if (!isNaN(dataParsed.getTime()) && dataParsed >= new Date('2026-07-15T00:00:00')) isNewRule = true;
           }

           let taxaComissaoEsperada = 0; let taxaFixaEsperada = 0;
           if (isNewRule) {
               if (valorRealVenda < 50) { taxaComissaoEsperada = valorRealVenda * 0.10; taxaFixaEsperada = 4.00 * order.qtd; } 
               else { taxaComissaoEsperada = valorRealVenda * 0.06; taxaFixaEsperada = 6.00 * order.qtd; }
           } else {
               taxaComissaoEsperada = valorRealVenda * 0.06; taxaFixaEsperada = 4.00 * order.qtd;
           }

           const sfp = Math.abs(Number(extrair(finRow, ['taxa de serviço do sfp'])) || 0);
           const afiliado = Math.abs(Number(extrair(finRow, ['comissões de afiliados'])) || 0);
           const freteCliente = Number(extrair(finRow, ['custo do frete'])) || 0; 
           
           repasseEsperado = valorRealVenda - taxaComissaoEsperada - taxaFixaEsperada - sfp - afiliado;
           diferenca = repasseEsperado - repasseLiquidado;

           auditObj.financeiro = { vendas_liquidas: valorRealVenda, comissao_calculada: taxaComissaoEsperada, taxa_fixa_calculada: taxaFixaEsperada, sfp: sfp, afiliado: afiliado, liquidado: repasseLiquidado };
           auditObj.calculo = { repasse_esperado: repasseEsperado, diferenca: diferenca };

           baseReport = {
              "ID do Pedido": order.id_pedido,
              "Venda Real": Number(valorRealVenda.toFixed(2)),
              "Comissão (%)": Number(-taxaComissaoEsperada.toFixed(2)),
              "Fixo / Item": Number(-taxaFixaEsperada.toFixed(2)),
              "Outros (SFP/Afil)": Number(-(sfp + afiliado).toFixed(2)),
              "O que deviam": Number(repasseEsperado.toFixed(2)),
              "O que pagaram": Number(repasseLiquidado.toFixed(2)),
              "Falta Pagar": Number(diferenca.toFixed(2))
           };
       } 
       // --- LÓGICA KWAI ---
       else {
           const precoKwai = Number(extrair(finRow, ['preço do produto', 'preço'])) || 0;
           const subvencaoComercial = Number(extrair(finRow, ['subvenção ao comércio de mercadorias'])) || 0; 
           const freteCobradoVendedor = Number(extrair(finRow, ['frete pago pelo vendedor'])) || 0;
           repasseLiquidado = Number(extrair(finRow, ['receita', 'repasse'])) || 0;

           if (Math.abs(order.valor_bruto - precoKwai) > tol && order.valor_bruto > 0) {
               order.status = 'DIVERGENCIA_PRECO'; auditObj.classificacao.status = 'DIVERGENCIA_PRECO';
               divergenciasPreco.push({ "ID": order.id_pedido, "Preço UPSeller": order.valor_bruto, "Preço Kwai": precoKwai, "Diferença": Math.abs(order.valor_bruto - precoKwai) });
               jsonAuditExport.push(auditObj);
               return; 
           }

           valorRealVenda = precoKwai - Math.abs(subvencaoComercial);
           const taxa20 = valorRealVenda * 0.20;
           const taxaOp = order.qtd * 4.00;
           repasseEsperado = valorRealVenda - taxa20 - taxaOp;
           diferenca = repasseEsperado - repasseLiquidado;

           auditObj.financeiro = { preco: precoKwai, subvencao_comercio: subvencaoComercial, frete_vendedor: freteCobradoVendedor, liquidado: repasseLiquidado };
           auditObj.calculo = { preco_real_venda: valorRealVenda, comissao_20: taxa20, taxa_operacional: taxaOp, repasse_esperado: repasseEsperado, diferenca: diferenca };

           baseReport = {
              "ID do Pedido": order.id_pedido,
              "Preço Original": Number(precoKwai.toFixed(2)),
              "Seu Desconto": Number(-Math.abs(subvencaoComercial).toFixed(2)),
              "Venda Real": Number(valorRealVenda.toFixed(2)),
              "Comissão 20%": Number(-taxa20.toFixed(2)),
              "Fixo R$4": Number(-taxaOp.toFixed(2)),
              "O que deviam": Number(repasseEsperado.toFixed(2)),
              "O que pagaram": Number(repasseLiquidado.toFixed(2)),
              "Falta Pagar": Number(diferenca.toFixed(2))
           };
       }

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
       order.receita_kwai = repasseLiquidado;
       order.lucro_pedido = repasseLiquidado - order.custo_pedido;
       order.roubo_taxa = diferenca; 
       
       valorBrutoGeral += valorRealVenda;
       custoTotalGeral += order.custo_pedido;
       lucroLiquidoGeral += order.lucro_pedido;

       if (Math.abs(diferenca) <= tol) {
          order.status = 'PAGO_CORRETO'; auditObj.classificacao.status = 'REPASSADO_CORRETAMENTE';
          corretos.push({ ...baseReport, "STATUS": "🟢 TUDO CERTO" });
       } else if (diferenca < -tol) {
          order.status = 'ACIMA_ESPERADO'; auditObj.classificacao.status = 'RECEBIMENTO_ACIMA_ESPERADO';
          corretos.push({ ...baseReport, "STATUS": "🟢 PAGARAM A MAIS" });
       } else {
          order.status = 'DIVERGENCIA_FINANCEIRA'; auditObj.classificacao.status = 'DIVERGENCIA_FINANCEIRA';
          let motivo = "Diferença não explicada na taxa";
          if (marketplace === 'tiktok') {
             const freteCobrado = Number(extrair(finRow, ['custo líquido de frete'])) || 0;
             if (freteCobrado < 0) motivo = `Divergência. Cobrança de Frete detectada: R$ ${Math.abs(freteCobrado).toFixed(2)}`;
          } else {
             const freteCobradoVendedor = Number(extrair(finRow, ['frete pago pelo vendedor'])) || 0;
             if (Math.abs(freteCobradoVendedor) > tol) motivo = `Cobraram Frete: R$ ${Math.abs(freteCobradoVendedor).toFixed(2)}`;
          }
          
          divergencias.push({ ...baseReport, "Motivo do Erro": motivo, "STATUS": "🔴 COBRAR ELES" });
          totalDiferencas += diferenca;
       }
       jsonAuditExport.push(auditObj);
    });

    try {
      for (let i = 0; i < Array.from(orderMap.values()).length; i += 500) {
        await supabase.from(tabela).upsert(Array.from(orderMap.values()).slice(i, i + 500), { onConflict: 'user_id,id_pedido' }).catch(() => {});
      }
    } catch (e) {}

    setResultados({
        atrasados, divergencias, noPrazo, corretos, cancelados, amostras, divergenciasPreco,
        valorBruto: Number(valorBrutoGeral.toFixed(2)), totalRetido: Number(totalDiferencas.toFixed(2)), custoTotal: Number(custoTotalGeral.toFixed(2)), lucroLiquido: Number(lucroLiquidoGeral.toFixed(2)),
        jsonAudit: jsonAuditExport,
        chartStatus: [
          {name:'Tudo Certo',value:corretos.length},
          {name:'No Prazo',value:noPrazo.length},
          {name:'Divergência',value:divergencias.length},
          {name:'Atrasados',value:atrasados.length},
          {name:'Amostras',value:amostras.length},
          {name:'Cancelados',value:cancelados.length}
        ].filter(i=>i.value>0) 
    });
    setIsSyncing(false);
    setActiveTab('dashboard');
  };

  const handleMenuClick = (mkt: string, tab: string) => {
    if (mkt !== 'kwai' && mkt !== 'tiktok' && mkt !== 'global') {
      setMarketplace(mkt);
      setActiveTab('em_breve');
      return;
    }
    if (mkt !== marketplace) {
        setResultados(null);
        setUpsellerData([]);
        setKwaiData([]);
        setTiktokData([]);
    }
    setMarketplace(mkt);
    setActiveTab(tab);
  };

  const toggleMenu = (menu: string) => {
    setOpenMenus(prev => ({ ...prev, [menu]: !prev[menu] }));
  };

  if (isF5Loading) return <div className="h-screen w-full flex items-center justify-center bg-[#f8fafc]"><Loader2 className="animate-spin text-[#F1C40F]" size={48} /></div>;

  const SecaoHeader = ({ titulo, icone: Icon, descricao }: any) => (
    <div className={`bg-gradient-to-r ${marketplace === 'tiktok' ? 'from-pink-900 to-gray-900' : 'from-gray-900 to-gray-800'} rounded-3xl p-8 mb-8 text-white shadow-xl flex items-center gap-6 relative overflow-hidden`}>
      <div className={`absolute top-0 right-0 w-48 h-48 ${marketplace === 'tiktok' ? 'bg-pink-500' : 'bg-[#F1C40F]'} opacity-10 rounded-full blur-3xl -mr-10 -mt-10`}></div>
      <div className="bg-gray-800/80 p-5 rounded-2xl border border-gray-700 shadow-inner">
        <Icon size={36} className={marketplace === 'tiktok' ? 'text-pink-400' : 'text-[#F1C40F]'} />
      </div>
      <div className="relative z-10">
        <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">{titulo}</h2>
        <p className="text-gray-300 font-medium text-sm mt-2 max-w-3xl leading-relaxed">{descricao}</p>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] text-gray-800 font-sans overflow-hidden selection:bg-[#F1C40F] selection:text-black">
      
      {/* SIDEBAR MODULAR */}
      <div className="w-72 bg-[#111827] flex-shrink-0 flex flex-col justify-between overflow-y-auto border-r border-gray-800 scrollbar-hide shadow-xl z-20 relative">
        <div className="p-5">
          <div className="flex items-center gap-3 mb-8 px-2 mt-2">
            <div className="bg-[#F1C40F] p-2 rounded-lg shadow-lg"><ShieldCheck size={24} className="text-[#111827]" /></div>
            <h1 className="text-xl font-black text-white tracking-widest">REPASSE<span className="text-[#F1C40F]">.AI</span></h1>
          </div>
          
          <p className="text-[11px] uppercase tracking-widest text-gray-500 font-bold mb-3 ml-2">Suas Plataformas</p>
          <div className="space-y-3 mb-6">
            
            {/* MENU KWAI */}
            <div className="bg-gray-900/60 rounded-2xl border border-gray-800 overflow-hidden">
              <button onClick={() => toggleMenu('kwai')} className={`w-full flex items-center justify-between p-4 text-sm font-bold ${marketplace==='kwai' ? 'text-white' : 'text-gray-400 hover:text-white hover:bg-gray-900/50'} transition-colors`}>
                 <div className="flex items-center gap-3"><div className={`bg-[#F1C40F]/10 p-2 rounded-lg ${marketplace==='kwai'?'text-[#F1C40F]':'text-gray-500'}`}><Smartphone size={18}/></div> Kwai </div>
                 {marketplace==='kwai' ? <div className="w-2 h-2 rounded-full bg-[#10b981] shadow-[0_0_8px_#10b981]"></div> : <ChevronDown size={16} className={`transition-transform text-gray-600 ${openMenus['kwai'] ? 'rotate-180' : ''}`} />}
              </button>
              {openMenus['kwai'] && (
                <div className="pl-12 pr-4 pb-4 pt-1 space-y-1.5">
                  <button onClick={() => handleMenuClick('kwai', 'dashboard')} className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${marketplace === 'kwai' && activeTab === 'dashboard' ? 'bg-[#F1C40F] text-[#111827] shadow-md' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>Visão Geral</button>
                  <button onClick={() => handleMenuClick('kwai', 'upload')} className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${marketplace === 'kwai' && activeTab === 'upload' ? 'bg-[#F1C40F] text-[#111827] shadow-md' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>Subir Planilhas</button>
                  <button onClick={() => handleMenuClick('kwai', 'aguardando')} className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${marketplace === 'kwai' && activeTab === 'aguardando' ? 'bg-[#F1C40F] text-[#111827] shadow-md' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>No Prazo</button>
                  <button onClick={() => handleMenuClick('kwai', 'divergencias')} className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex justify-between items-center ${marketplace === 'kwai' && activeTab === 'divergencias' ? 'bg-[#F1C40F] text-[#111827] shadow-md' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>Erros / Atrasos {resultados?.divergencias?.length > 0 && marketplace==='kwai' && <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-[10px]">{resultados.divergencias.length}</span>}</button>
                  <button onClick={() => handleMenuClick('kwai', 'amostras')} className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${marketplace === 'kwai' && activeTab === 'amostras' ? 'bg-[#F1C40F] text-[#111827] shadow-md' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>Amostras</button>
                  <button onClick={() => handleMenuClick('kwai', 'malhafina')} className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${marketplace === 'kwai' && activeTab === 'malhafina' ? 'bg-[#F1C40F] text-[#111827] shadow-md' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>Cancelados</button>
                  <button onClick={() => handleMenuClick('kwai', 'lucro')} className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${marketplace === 'kwai' && activeTab === 'lucro' ? 'bg-[#F1C40F] text-[#111827] shadow-md' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>Meu Lucro Real</button>
                </div>
              )}
            </div>

            {/* MENU TIKTOK */}
            <div className="bg-gray-900/60 rounded-2xl border border-gray-800 overflow-hidden">
              <button onClick={() => toggleMenu('tiktok')} className={`w-full flex items-center justify-between p-4 text-sm font-bold ${marketplace==='tiktok' ? 'text-white' : 'text-gray-400 hover:text-white hover:bg-gray-900/50'} transition-colors`}>
                 <div className="flex items-center gap-3"><div className={`bg-pink-500/10 p-2 rounded-lg ${marketplace==='tiktok'?'text-pink-500':'text-gray-500'}`}><Video size={18}/></div> TikTok </div>
                 {marketplace==='tiktok' ? <div className="w-2 h-2 rounded-full bg-pink-500 shadow-[0_0_8px_#ec4899]"></div> : <ChevronDown size={16} className={`transition-transform text-gray-600 ${openMenus['tiktok'] ? 'rotate-180' : ''}`} />}
              </button>
              {openMenus['tiktok'] && (
                <div className="pl-12 pr-4 pb-4 pt-1 space-y-1.5">
                  <button onClick={() => handleMenuClick('tiktok', 'dashboard')} className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${marketplace === 'tiktok' && activeTab === 'dashboard' ? 'bg-pink-500 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>Visão Geral</button>
                  <button onClick={() => handleMenuClick('tiktok', 'upload')} className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${marketplace === 'tiktok' && activeTab === 'upload' ? 'bg-pink-500 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>Subir Planilhas</button>
                  <button onClick={() => handleMenuClick('tiktok', 'aguardando')} className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${marketplace === 'tiktok' && activeTab === 'aguardando' ? 'bg-pink-500 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>No Prazo</button>
                  <button onClick={() => handleMenuClick('tiktok', 'divergencias')} className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex justify-between items-center ${marketplace === 'tiktok' && activeTab === 'divergencias' ? 'bg-pink-500 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>Erros / Atrasos {resultados?.divergencias?.length > 0 && marketplace==='tiktok' && <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-[10px]">{resultados.divergencias.length}</span>}</button>
                  <button onClick={() => handleMenuClick('tiktok', 'malhafina')} className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${marketplace === 'tiktok' && activeTab === 'malhafina' ? 'bg-pink-500 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>Cancelados</button>
                  <button onClick={() => handleMenuClick('tiktok', 'lucro')} className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${marketplace === 'tiktok' && activeTab === 'lucro' ? 'bg-pink-500 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>Meu Lucro Real</button>
                </div>
              )}
            </div>

            {/* SHOPEE / MELI (EM BREVE) */}
            <button onClick={() => handleMenuClick('shopee', 'em_breve')} className="bg-transparent border border-gray-800 w-full flex items-center justify-between p-4 text-sm font-bold text-gray-500 hover:bg-gray-900/50 rounded-2xl transition-colors">
               <div className="flex items-center gap-3"><ShoppingBag size={18} className="text-gray-600"/> Shopee </div><span className="bg-gray-800 text-[9px] uppercase tracking-wider text-gray-400 px-2 py-1 rounded-md font-black">Em breve</span>
            </button>
            <button onClick={() => handleMenuClick('meli', 'em_breve')} className="bg-transparent border border-gray-800 w-full flex items-center justify-between p-4 text-sm font-bold text-gray-500 hover:bg-gray-900/50 rounded-2xl transition-colors">
               <div className="flex items-center gap-3"><Store size={18} className="text-gray-600"/> Mercado Livre </div><span className="bg-gray-800 text-[9px] uppercase tracking-wider text-gray-400 px-2 py-1 rounded-md font-black">Em breve</span>
            </button>

          </div>

          <div className="h-px bg-gray-800 my-6 mx-2"></div>
          <p className="text-[11px] uppercase tracking-widest text-gray-500 font-bold mb-3 ml-2">Configurações Gerais</p>
          <nav className="space-y-2">
            <button onClick={() => { setMarketplace('global'); setActiveTab('produtos'); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${activeTab === 'produtos' ? 'bg-[#10b981] text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}><Package size={18}/> Custos de Produtos</button>
          </nav>
        </div>
        <div className="p-5 border-t border-gray-800"><button onClick={() => supabase.auth.signOut()} className="w-full flex items-center justify-center gap-3 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-2xl transition-colors text-sm font-bold"><LogOut size={18}/> Sair da Conta</button></div>
      </div>

      <div className="flex-1 h-full overflow-y-auto p-10 relative">
        
        {/* VIEW GLOBAL: PRODUTOS */}
        {activeTab === 'produtos' && (
          <div className="w-full animate-fade-in max-w-6xl mx-auto pb-10">
            <SecaoHeader titulo="Seus Custos e Produtos" icone={Package} descricao="Cadastre quanto custou cada produto para você. Isso serve para calcularmos o seu lucro líquido em todas as plataformas." />
            <div className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden">
               <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-end"><Tooltip texto="Força o sistema a salvar os custos digitados."><button onClick={carregarProdutos} className="bg-white text-gray-700 border border-gray-200 px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-gray-100 transition-colors shadow-sm"><Save size={16}/> Salvar Tudo</button></Tooltip></div>
               {meusProdutos.length === 0 ? ( <div className="p-16 text-center text-gray-400 font-bold text-lg">Catálogo vazio. Suba uma planilha na aba "Subir Planilhas" para o sistema puxar seus produtos sozinho.</div> ) : (
                 <div className="max-h-[60vh] overflow-y-auto">
                   <table className="w-full text-left text-sm">
                     <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[11px] tracking-wider sticky top-0 border-b border-gray-100">
                       <tr><th className="p-5">Cód. SKU</th><th className="p-5 w-1/3">Nome do Produto</th><th className="p-5">Seu Custo (R$)</th><th className="p-5">Agrupar Vendas c/ SKU</th><th className="p-5">Ação</th></tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100">
                       {meusProdutos.map((prod) => (
                         <tr key={prod.id} className="hover:bg-gray-50 transition-colors">
                           <td className="p-5 font-mono text-xs font-bold text-gray-600 bg-gray-50/50">{prod.sku}</td><td className="p-5 text-gray-800 truncate max-w-xs font-semibold" title={prod.nome}>{prod.nome}</td>
                           <td className="p-5"><div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">R$</span><input type="number" step="0.01" defaultValue={prod.custo} id={`custo-${prod.sku}`} className="w-32 bg-white border-2 border-gray-200 rounded-xl py-2.5 pl-10 pr-3 text-sm text-gray-900 focus:border-[#10b981] outline-none transition-all font-bold" /></div></td>
                           <td className="p-5"><input type="text" placeholder="SKU Principal" defaultValue={prod.sku_master || ''} id={`master-${prod.sku}`} className="w-40 bg-white border-2 border-gray-200 rounded-xl px-4 py-2.5 text-xs text-gray-900 focus:border-[#10b981] outline-none transition-all font-mono font-bold" /></td>
                           <td className="p-5"><button onClick={() => { const custo = (document.getElementById(`custo-${prod.sku}`) as HTMLInputElement).value; const master = (document.getElementById(`master-${prod.sku}`) as HTMLInputElement).value; atualizarProduto(prod.sku, Number(custo), master); }} className="bg-[#10b981] text-white p-2.5 rounded-xl hover:bg-emerald-600 hover:shadow-lg hover:-translate-y-1 transition-all"><Save size={18}/></button></td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               )}
            </div>
          </div>
        )}

        {/* VIEW: MÓDULOS EM BREVE (SHOPEE, MELI) */}
        {activeTab === 'em_breve' && (
           <div className="flex flex-col items-center justify-center min-h-[70vh] text-center animate-fade-in">
             <div className="bg-white border border-gray-200 p-8 rounded-full shadow-lg mb-8 relative">
                <div className="absolute top-0 right-0 -mr-2 -mt-2 bg-gray-800 text-white text-[10px] px-3 py-1 rounded-full font-bold shadow-md animate-pulse">EM BREVE</div>
                {marketplace === 'shopee' && <ShoppingBag size={56} className="text-[#ee4d2d]" />}
                {marketplace === 'meli' && <Store size={56} className="text-[#eab308]" />}
             </div>
             <h2 className="text-3xl font-black text-gray-900 tracking-tight">Estamos construindo a ponte!</h2>
             <p className="text-gray-500 mt-4 max-w-lg leading-relaxed text-lg font-medium">As regras da <b>{marketplace.toUpperCase()}</b> são diferentes. Nossos engenheiros estão adaptando o sistema para garantir a mesma precisão absurda que você já tem na Kwai e TikTok.</p>
           </div>
        )}

        {/* VIEWS: KWAI OU TIKTOK (RENDERIZAÇÃO DINÂMICA) */}
        {activeTab !== 'produtos' && activeTab !== 'em_breve' && (marketplace === 'kwai' || marketplace === 'tiktok') && (
          <>
            {activeTab === 'dashboard' && resultados && (
              <div className="w-full animate-fade-in max-w-6xl mx-auto pb-10">
                <SecaoHeader titulo={`Resumo Geral (${marketplace.charAt(0).toUpperCase() + marketplace.slice(1)})`} icone={LayoutDashboard} descricao="Acompanhe o volume real de vendas e descubra imediatamente se há dinheiro seu retido por erros da plataforma." />
                
                <div className="flex justify-end gap-3 mb-6">
                    <Tooltip texto="Gera um arquivo de código com todos os cálculos."><button onClick={exportarJSON} className="flex items-center gap-2 text-sm font-bold text-gray-600 bg-white hover:bg-gray-50 border border-gray-200 px-5 py-2.5 rounded-xl transition-colors shadow-sm"><FileJson size={16}/> Exportar I.A (JSON)</button></Tooltip>
                    <Tooltip texto="Baixa uma cópia de segurança em Excel de absolutamente tudo."><button onClick={exportarBackupGeral} className="flex items-center gap-2 text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-100 px-5 py-2.5 rounded-xl transition-colors shadow-sm"><Archive size={16}/> Backup da Conta</button></Tooltip>
                    <Tooltip texto={`Apaga as auditorias de ${marketplace}.`}><button onClick={apagarTudo} className="flex items-center gap-2 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 px-5 py-2.5 rounded-xl transition-colors shadow-sm"><Trash2 size={16}/> Começar do Zero</button></Tooltip>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                  <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-center">
                       <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2"><CheckCircle2 size={16} className="text-[#10b981]"/> O que você vendeu (Bruto)</p>
                       <p className="text-4xl font-black tracking-tight text-gray-900">R$ {resultados.valorBruto.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                    </div>
                    <div className="bg-gradient-to-br from-red-50 to-white p-8 rounded-3xl border border-red-100 shadow-sm flex flex-col justify-center relative overflow-hidden group">
                       <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform"><AlertTriangle size={80} className="text-red-500"/></div>
                       <Tooltip texto="A soma de todos os pedidos atrasados ou com taxas indevidas para cobrar."><p className="text-xs font-bold text-red-600 uppercase tracking-widest mb-3 relative z-10 cursor-help w-max">Dinheiro Retido (Cobrar)</p></Tooltip>
                       <p className="text-4xl font-black tracking-tight text-red-600 relative z-10">R$ {resultados.totalRetido.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                    </div>
                  </div>
                  <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col min-h-[350px]">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6">Divisão dos seus Pedidos</h3>
                    <div className="flex-1 min-h-[220px]">
                       <ResponsiveContainer width="100%" height="100%">
                         <PieChart><Pie data={resultados.chartStatus} cx="50%" cy="50%" innerRadius="65%" outerRadius="85%" paddingAngle={3} dataKey="value" stroke="none">{resultados.chartStatus.map((_:any, index:number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><RechartsTooltip contentStyle={{ borderRadius: '16px', border: '1px solid #f3f4f6', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} itemStyle={{ fontWeight: 'bold' }}/><Legend verticalAlign="bottom" height={30} iconType="circle" wrapperStyle={{ fontSize: '13px', fontWeight: 'bold', color: '#4b5563' }}/></PieChart>
                       </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'dashboard' && !resultados && (
              <div className="w-full animate-fade-in max-w-5xl mx-auto flex flex-col items-center justify-center min-h-[80vh] relative">
                <div className="bg-transparent p-6 rounded-full shadow-lg mb-8 bg-white border border-gray-200">
                  {marketplace === 'tiktok' ? <Video size={56} className="text-pink-500" /> : <ShieldCheck size={56} className="text-yellow-600" />}
                </div>
                
                <h2 className="text-4xl font-black text-gray-900 tracking-tight text-center mb-6">Conferência Inteligente ({marketplace.charAt(0).toUpperCase() + marketplace.slice(1)})</h2>
                <p className="text-gray-500 text-center max-w-2xl mb-12 text-lg font-medium leading-relaxed">
                  Chega de planilhas confusas. Nós cruzamos suas vendas da UPSeller com os pagamentos da plataforma e mostramos exatamente onde está o seu dinheiro.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full mb-12">
                  <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:-translate-y-1 transition-transform">
                    <Database size={28} className="text-blue-500 mb-5" />
                    <h3 className="text-lg font-black text-gray-900 mb-2">1. Feito pra você</h3>
                    <p className="text-sm text-gray-500 font-medium leading-relaxed">Basta jogar os relatórios aqui dentro. O sistema junta os IDs e entende sozinho quem pagou o quê.</p>
                  </div>
                  <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:-translate-y-1 transition-transform relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-full bg-gradient-to-l from-green-50 to-transparent pointer-events-none rounded-r-3xl"></div>
                    <Search size={28} className="text-green-500 mb-5 relative z-10" />
                    <h3 className="text-lg font-black text-gray-900 mb-2 relative z-10">2. Fim do "Achismo"</h3>
                    <p className="text-sm text-gray-500 font-medium leading-relaxed relative z-10">Isolamos os cupons e garantimos as regras matemáticas exatas da plataforma.</p>
                  </div>
                  <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:-translate-y-1 transition-transform">
                    <LineChart size={28} className="text-orange-500 mb-5" />
                    <h3 className="text-lg font-black text-gray-900 mb-2">3. O seu Bolso</h3>
                    <p className="text-sm text-gray-500 font-medium leading-relaxed">Mostramos os atrasados para você cobrar, os fretes indevidos e qual foi o seu lucro real.</p>
                  </div>
                </div>

                <button onClick={() => setActiveTab('upload')} className={`bg-[#111827] ${marketplace==='tiktok'?'text-pink-400':'text-[#F1C40F]'} px-10 py-5 rounded-2xl font-black text-lg hover:shadow-2xl hover:scale-105 transition-all flex items-center justify-center gap-3`}>
                  <UploadCloud size={24}/> Começar a Verificação
                </button>
              </div>
            )}

            {activeTab === 'upload' && (
              <div className="w-full animate-fade-in max-w-5xl mx-auto pb-10">
                <SecaoHeader titulo="Subir Planilhas" icone={UploadCloud} descricao={`Coloque aqui seus relatórios e deixe a mágica acontecer para o ${marketplace.charAt(0).toUpperCase() + marketplace.slice(1)}.`} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  <Tooltip texto="Vá na UPSeller, na área de pedidos, e baixe o relatório padrão.">
                    <label className="bg-white border-2 border-dashed border-gray-300 rounded-3xl p-10 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-all w-full">
                      <div className="bg-gray-100 p-4 rounded-xl mb-5 text-gray-500"><Package size={32}/></div>
                      <h3 className="font-black text-lg text-gray-900 mb-2">1. Vendas UPSeller</h3>
                      <p className="text-sm text-gray-500 mb-6 text-center font-medium h-8">{upsellerData.length > 0 ? <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-green-50 text-green-700 font-bold border border-green-200">{upsellerData.length} carregados</span> : 'Clique para escolher'}</p>
                      <div className="text-sm font-bold text-gray-700 bg-white border-2 border-gray-200 px-6 py-2.5 rounded-xl shadow-sm transition-colors pointer-events-none">Procurar Arquivo</div>
                      <input type="file" className="hidden" onChange={(e) => lerPlanilha(e, setUpsellerData)} />
                    </label>
                  </Tooltip>

                  <Tooltip texto={`Vá no painel de finanças do ${marketplace} e baixe o relatório de liquidação.`}>
                    <label className="bg-white border-2 border-dashed border-gray-300 rounded-3xl p-10 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-all w-full">
                      <div className="bg-gray-100 p-4 rounded-xl mb-5 text-gray-500"><FileSpreadsheet size={32}/></div>
                      <h3 className="font-black text-lg text-gray-900 mb-2">2. Saques {marketplace.charAt(0).toUpperCase() + marketplace.slice(1)}</h3>
                      <p className="text-sm text-gray-500 mb-6 text-center font-medium h-8">{(marketplace==='tiktok'?tiktokData:kwaiData).length > 0 ? <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-green-50 text-green-700 font-bold border border-green-200">{(marketplace==='tiktok'?tiktokData:kwaiData).length} carregados</span> : 'Clique para escolher'}</p>
                      <div className="text-sm font-bold text-gray-700 bg-white border-2 border-gray-200 px-6 py-2.5 rounded-xl shadow-sm transition-colors pointer-events-none">Procurar Arquivo</div>
                      <input type="file" className="hidden" onChange={(e) => { marketplace === 'tiktok' ? lerPlanilha(e, setTiktokData) : lerPlanilha(e, setKwaiData); }} />
                    </label>
                  </Tooltip>
                </div>
                
                <button onClick={executarConciliacao} disabled={isSyncing} className={`w-full py-5 rounded-2xl shadow-xl font-black text-lg uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${isSyncing ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : `bg-[#111827] ${marketplace==='tiktok'?'text-pink-400':'text-[#F1C40F]'} hover:shadow-2xl hover:-translate-y-1`}`}>{isSyncing ? <><Loader2 className="animate-spin" size={24}/> Conferindo linhas...</> : <><Database size={24}/> Iniciar Conferência Automática</>}</button>
              </div>
            )}

            {activeTab === 'divergencias' && (
              <div className="w-full animate-fade-in max-w-6xl mx-auto pb-10">
                <SecaoHeader titulo="Erros & Dinheiro Retido" icone={AlertTriangle} descricao="Identificamos falhas de taxas, fretes não autorizados e atrasos logísticos para você abrir chamado na plataforma." />
                {!resultados ? ( <div className="bg-white border border-gray-200 rounded-3xl p-16 text-center text-lg font-bold text-gray-400">Auditoria não inicializada.</div> ) : (
                  <div className="grid grid-cols-1 gap-8 w-full">
                    <div className="bg-white border border-gray-100 rounded-3xl shadow-sm flex flex-col min-h-[400px] overflow-hidden w-full relative">
                      <div className="absolute top-0 left-0 w-2 h-full bg-red-500"></div>
                      <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center ml-2">
                        <div><h3 className="font-black text-xl text-gray-900 flex items-center gap-2">Cobranças Indevidas</h3><p className="text-sm font-medium text-gray-500 mt-1">{resultados.divergencias.length} pedidos pagos a menos.</p></div>
                        {resultados.divergencias.length > 0 && (
                          <div className="flex gap-2">
                            <Tooltip texto="Baixa uma planilha para você anexar no suporte."><button onClick={() => exportarExcel(resultados.divergencias, "Erros_Financeiros")} className="bg-white text-gray-700 border-2 border-gray-200 px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-gray-100 transition-colors shadow-sm"><Download size={16}/> Excel</button></Tooltip>
                            <Tooltip texto="Gera um PDF profissional com as divergências."><button onClick={() => exportarPDF(resultados.divergencias, "Relatório de Cobranças Indevidas", "Erros_Financeiros")} className="bg-red-50 text-red-700 border-2 border-red-100 px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-red-100 transition-colors shadow-sm"><FileJson size={16}/> PDF</button></Tooltip>
                          </div>
                        )}
                      </div>
                      <div className="overflow-y-auto flex-1 ml-2">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-gray-50 text-gray-500 sticky top-0 border-b border-gray-100 font-bold uppercase text-[11px] tracking-wider">
                            <tr><th className="p-5">ID do Pedido</th><th className="p-5">O que aconteceu?</th><th className="p-5 text-right">Deveriam Pagar</th><th className="p-5 text-right">Pagaram</th><th className="p-5 text-right text-red-600">Diferença (Cobrar)</th></tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {resultados.divergencias.map((item: any, idx: number) => (
                              <tr key={idx} className="hover:bg-red-50/40 transition-colors">
                                <td className="p-5 font-mono text-xs font-bold text-gray-700">{item["ID do Pedido"]}</td>
                                <td className="p-5"><span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold bg-red-100 text-red-700 border border-red-200">{item["Motivo do Erro"] || item["Análise Forense"] || item["Motivo"]}</span></td>
                                <td className="p-5 text-right font-semibold text-gray-500">R$ {item["O que deviam"]?.toFixed(2) || item["Esperado Kwai"]?.toFixed(2) || '0.00'}</td>
                                <td className="p-5 text-right font-semibold text-gray-500">R$ {item["O que pagaram"]?.toFixed(2) || item["Receita Liquidada"]?.toFixed(2) || '0.00'}</td>
                                <td className="p-5 text-right font-black text-red-600 text-base">R$ {item["Falta Pagar"]?.toFixed(2) || item["Diferença / Gap"]?.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {resultados.divergencias.length === 0 && <div className="p-16 text-center text-lg font-bold text-gray-400">Nenhuma cobrança indevida.</div>}
                      </div>
                    </div>

                    <div className="bg-white border border-gray-100 rounded-3xl shadow-sm flex flex-col min-h-[300px] overflow-hidden w-full relative">
                      <div className="absolute top-0 left-0 w-2 h-full bg-orange-500"></div>
                      <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center ml-2">
                        <div><h3 className="font-black text-xl text-gray-900 flex items-center gap-2">Repasses Atrasados</h3><p className="text-sm font-medium text-gray-500 mt-1">{resultados.atrasados.length} pedidos atrasados.</p></div>
                        {resultados.atrasados.length > 0 && (
                           <div className="flex gap-2"><Tooltip texto="Baixa lista de IDs para cobrar."><button onClick={() => exportarExcel(resultados.atrasados, "Atrasados")} className="bg-white text-gray-700 border-2 border-gray-200 px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-gray-100 transition-colors shadow-sm"><Download size={16}/> Excel</button></Tooltip></div>
                        )}
                      </div>
                      <div className="overflow-y-auto flex-1 ml-2">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-gray-50 text-gray-500 sticky top-0 border-b border-gray-100 font-bold uppercase text-[11px] tracking-wider">
                            <tr><th className="p-5">ID do Pedido</th><th className="p-5 text-right">Aproximado a Receber</th></tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {resultados.atrasados.map((item: any, idx: number) => (
                              <tr key={idx} className="hover:bg-orange-50/40 transition-colors">
                                <td className="p-5 font-mono text-xs font-bold text-gray-700">{item["ID do Pedido"]}</td>
                                <td className="p-5 text-right font-black text-orange-600 text-base">R$ {item["Repasse Atrasado Estimado (R$)"]?.toFixed(2) || item["Atraso Retido Estimado (R$)"]?.toFixed(2) || '0.00'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {resultados.atrasados.length === 0 && <div className="p-16 text-center text-lg font-bold text-gray-400">Nenhum atraso identificado.</div>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'amostras' && marketplace === 'kwai' && (
              <div className="w-full animate-fade-in max-w-5xl mx-auto pb-10">
                <SecaoHeader titulo="Amostras & Casos Estranhos" icone={Search} descricao="Pedidos que resultaram em valores muito baixos ou divergência entre ERP e plataforma." />
                {!resultados ? ( <div className="bg-white border border-gray-200 rounded-3xl p-16 text-center text-lg font-bold text-gray-400">Auditoria não inicializada.</div> ) : (
                  <div className="grid grid-cols-1 gap-8 w-full">
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden w-full relative">
                      <div className="absolute top-0 left-0 w-2 h-full bg-blue-500"></div>
                      <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center ml-2"><h3 className="font-black text-xl text-gray-900">Possíveis Amostras ou Brindes</h3></div>
                      <div className="max-h-[50vh] overflow-y-auto ml-2">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-gray-50 text-gray-500 sticky top-0 border-b border-gray-100 font-bold uppercase text-[11px] tracking-wider">
                            <tr><th className="p-5">ID do Pedido</th><th className="p-5">Valor Real Calculado</th><th className="p-5">Situação</th><th className="p-5 text-right">O que fazer?</th></tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {resultados.amostras.map((item: any, idx: number) => (
                              <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                                <td className="p-5 font-mono text-xs font-bold text-gray-700">{item["ID do Pedido"]}</td>
                                <td className="p-5 font-black text-gray-800">R$ {item["Valor Real"]?.toFixed(2) || item["Valor Real de Venda"]?.toFixed(2)}</td>
                                <td className="p-5"><span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold uppercase border ${item["Status"] === 'AMOSTRA_CONFIRMADA' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>{item["Status"].replace('_', ' ')}</span></td>
                                <td className="p-5 text-right">
                                  {item["Status"] !== 'AMOSTRA_CONFIRMADA' ? (
                                    <Tooltip texto="Clique se isso for uma amostra grátis que você enviou."><button onClick={() => confirmarAmostra(item["ID do Pedido"])} className="text-sm font-bold bg-[#111827] text-white px-4 py-2 rounded-xl hover:bg-gray-800 transition-all shadow-md flex items-center gap-2 ml-auto"><Check size={16}/> Confirmar Amostra</button></Tooltip>
                                  ) : <span className="text-sm font-bold text-gray-400 bg-gray-100 px-4 py-2 rounded-xl">Tudo Certo</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {resultados.amostras.length === 0 && <p className="text-gray-400 font-bold text-lg text-center py-16">Nenhuma amostra suspeita.</p>}
                      </div>
                    </div>

                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden w-full relative">
                      <div className="absolute top-0 left-0 w-2 h-full bg-purple-500"></div>
                      <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center ml-2">
                        <div>
                          <h3 className="font-black text-xl text-gray-900">Preços não batem</h3>
                          <p className="text-sm font-medium text-gray-500 mt-1">O valor que está no seu ERP não é o mesmo preço bruto da plataforma.</p>
                        </div>
                      </div>
                      <div className="max-h-[50vh] overflow-y-auto ml-2">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-gray-50 text-gray-500 sticky top-0 border-b border-gray-100 font-bold uppercase text-[11px] tracking-wider">
                            <tr><th className="p-5">ID do Pedido</th><th className="p-5">Preço UPSeller</th><th className="p-5">Preço Plataforma</th><th className="p-5 text-right">Diferença de Preço</th></tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {resultados.divergenciasPreco.map((item: any, idx: number) => (
                              <tr key={idx} className="hover:bg-purple-50/30 transition-colors">
                                <td className="p-5 font-mono text-xs font-bold text-gray-700">{item["ID"] || item["ID do Pedido"]}</td>
                                <td className="p-5 font-bold text-gray-600">R$ {item["Preço UPSeller"]?.toFixed(2) || '---'}</td>
                                <td className="p-5 font-bold text-gray-600">R$ {item["Preço Kwai"]?.toFixed(2) || '---'}</td>
                                <td className="p-5 text-right text-purple-600 font-black text-base">R$ {item["Diferença"]?.toFixed(2) || item["Gap"]?.toFixed(2) || '---'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {resultados.divergenciasPreco.length === 0 && <p className="text-gray-400 font-bold text-lg text-center py-16">Os preços batem perfeitamente.</p>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'aguardando' && (
              <div className="w-full animate-fade-in max-w-5xl mx-auto pb-10">
                <SecaoHeader titulo="A Caminho (No Prazo)" icone={Hourglass} descricao="Pedidos que foram enviados e estão dentro do ciclo normal de liquidação da plataforma." />
                {!resultados ? ( <div className="bg-white border border-gray-200 rounded-3xl p-16 text-center text-lg font-bold text-gray-400">Auditoria não inicializada.</div> ) : (
                  <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden w-full">
                    <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-end gap-2">
                       {resultados.noPrazo.length > 0 && (<button onClick={() => exportarExcel(resultados.noPrazo, "No_Prazo")} className="bg-white text-gray-700 border-2 border-gray-200 px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-gray-100 transition-colors shadow-sm"><Download size={16}/> Exportar Excel</button>)}
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto">
                      <table className="w-full text-left text-sm"><thead className="bg-gray-50 text-gray-500 sticky top-0 border-b border-gray-100 font-bold uppercase text-[11px] tracking-wider"><tr><th className="p-5">ID do Pedido</th><th className="p-5">Paga até (Aprox.)</th><th className="p-5 text-right">Valor Bruto</th></tr></thead>
                        <tbody className="divide-y divide-gray-100">
                          {resultados.noPrazo.map((item: any, idx: number) => (
                            <tr key={idx} className="hover:bg-gray-50 transition-colors"><td className="p-5 font-mono text-xs font-bold text-gray-600">{item["ID do Pedido"]}</td><td className="p-5"><span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold bg-yellow-50 text-yellow-700 border border-yellow-200">{item["Paga até dia"] || item["Vencimento Esperado"]}</span></td><td className="p-5 text-right font-black text-gray-800 text-base">{item["Valor Estimado (R$)"]?.toFixed(2) || item["Valor Estimado Bruto (R$)"]?.toFixed(2) || '0.00'}</td></tr>
                          ))}
                        </tbody>
                      </table>
                      {resultados.noPrazo.length === 0 && <p className="text-gray-400 font-bold text-lg text-center py-16">Nenhum dinheiro pendente na fila.</p>}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'malhafina' && (
              <div className="w-full animate-fade-in max-w-5xl mx-auto pb-10">
                <SecaoHeader titulo="Cancelados & Devolvidos" icone={Ban} descricao="Nós separamos tudo que foi Cancelado ou Reembolsado para que esses valores não sujem o cálculo do seu faturamento real." />
                {!resultados ? ( <div className="bg-white border border-gray-200 rounded-3xl p-16 text-center text-lg font-bold text-gray-400">Auditoria não inicializada.</div> ) : (
                  <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden w-full">
                    <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-end gap-2">{resultados.cancelados.length > 0 && (<button onClick={() => exportarExcel(resultados.cancelados, "Quarentena")} className="bg-white text-gray-700 border-2 border-gray-200 px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-gray-100 transition-colors shadow-sm"><Download size={16}/> Exportar Excel</button>)}</div>
                    <div className="max-h-[60vh] overflow-y-auto">
                      <table className="w-full text-left text-sm"><thead className="bg-gray-50 text-gray-500 sticky top-0 border-b border-gray-100 font-bold uppercase text-[11px] tracking-wider"><tr><th className="p-5">ID do Pedido</th><th className="p-5">Situação</th><th className="p-5 text-right">Valor Original (Base)</th></tr></thead>
                        <tbody className="divide-y divide-gray-100">
                          {resultados.cancelados.map((item: any, idx: number) => (
                            <tr key={idx} className="hover:bg-gray-50 transition-colors"><td className="p-5 font-mono text-xs font-bold text-gray-600">{item["ID do Pedido"]}</td><td className="p-5"><span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold uppercase bg-gray-100 text-gray-600 border border-gray-200">{item["Status"] || item["Status UPSeller"]}</span></td><td className="p-5 text-right font-black text-gray-400 line-through">R$ {item["Valor Original"]?.toFixed(2) || item["Valor UPSeller Base"]?.toFixed(2) || item["Valor de Face"]?.toFixed(2) || '0.00'}</td></tr>
                          ))}
                        </tbody>
                      </table>
                      {resultados.cancelados.length === 0 && <p className="text-gray-400 font-bold text-lg text-center py-16">Zero cancelamentos registrados.</p>}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'lucro' && (
              <div className="w-full animate-fade-in max-w-6xl mx-auto pb-10">
                <SecaoHeader titulo="O que sobra no seu bolso (DRE)" icone={LineChart} descricao="A verdade crua. Nós juntamos os pagamentos corretos da plataforma, isolamos os erros e tiramos o quanto custou para você fabricar/comprar o produto." />
                {!resultados ? ( <div className="bg-white border border-gray-200 rounded-3xl p-16 text-center text-lg font-bold text-gray-400">Auditoria não inicializada.</div> ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <Tooltip texto="A soma bruta de tudo que você vendeu (já retirando os descontos que você deu aos clientes)."><div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-center hover:-translate-y-1 transition-transform cursor-help">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Venda Líquida Processada</p>
                      <p className="text-4xl font-black tracking-tight text-gray-900">R$ {resultados.valorBruto.toLocaleString('pt-BR', {minimumFractionDigits:2})}</p>
                    </div></Tooltip>
                    
                    <Tooltip texto="A soma do que você pagou para adquirir/fabricar os produtos vendidos (baseado no menu de Custos de Produtos)."><div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-center hover:-translate-y-1 transition-transform cursor-help">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Custos de Produto (COGS)</p>
                      <p className="text-4xl font-black tracking-tight text-gray-500">- R$ {resultados.custoTotal.toLocaleString('pt-BR', {minimumFractionDigits:2})}</p>
                    </div></Tooltip>
                    
                    <Tooltip texto="O que de fato sobra no seu bolso depois que o marketplace cobrou a taxa, o frete, e você pagou pelo produto."><div className="bg-gradient-to-br from-[#10b981] to-emerald-600 p-8 rounded-3xl shadow-2xl text-white relative overflow-hidden hover:scale-105 transition-transform cursor-help border border-emerald-500">
                       <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                       <p className="text-xs font-black text-emerald-100 uppercase tracking-widest mb-3 relative z-10">Lucro Líquido Final</p>
                       <p className="text-5xl font-black tracking-tight text-white relative z-10">R$ {resultados.lucroLiquido.toLocaleString('pt-BR', {minimumFractionDigits:2})}</p>
                    </div></Tooltip>
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