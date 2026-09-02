'use client';

import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { formatCentsToBRL, generateSchedules } from './lib/finance';
import { 
  Plus, ArrowUpCircle, ArrowDownCircle, Calendar, Paperclip, TrendingUp,
  AlertCircle, Loader2, LayoutDashboard, X, Check, Package, Users, Tag
} from 'lucide-react';

export default function FluxoCaixaView() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Estados do Formulário Completo
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [unitValue, setUnitValue] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [installments, setInstallments] = useState(1);
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);

  const [stats, setStats] = useState({ in: BigInt(0), out: BigInt(0), pending: BigInt(0) });
  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetchData();
    fetchResources();
  }, []);

  async function fetchResources() {
    const { data: prods } = await supabase.from('produtos').select('id, nome, sku');
    const { data: supps } = await supabase.from('suppliers').select('id, name');
    if (prods) setProducts(prods);
    if (supps) setSuppliers(supps);
  }

  async function fetchData() {
    setLoading(true);
    const { data, error } = await supabase
      .from('financial_schedules')
      .select('*, financial_entries(description, supplier_name, attachment_url)')
      .order('due_date', { ascending: true });

    if (!error && data) {
      setSchedules(data);
      let inSum = BigInt(0), outSum = BigInt(0), pendingSum = BigInt(0);
      data.forEach((item: any) => {
        const amt = BigInt(item.amount_cents);
        if (item.due_date === todayStr) {
          if (item.type === 'INCOME') inSum += amt;
          if (item.type === 'EXPENSE') outSum += amt;
        }
        if (item.status === 'PENDING') pendingSum += amt;
      });
      setStats({ in: inSum, out: outSum, pending: pendingSum });
    }
    setLoading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);

    try {
      const unitCents = Math.round(parseFloat(unitValue.replace(',', '.')) * 100);
      const totalCents = BigInt(unitCents * parseInt(quantity));
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Acesso negado.");

      // 1. Salva a Entrada (DRE/Competência)
      const { data: entry, error: entryError } = await supabase
        .from('financial_entries')
        .insert([{
          description: description || 'Compra de Mercadoria',
          total_amount_cents: totalCents,
          unit_value_cents: BigInt(unitCents),
          quantity: parseInt(quantity),
          type,
          entry_date: entryDate,
          product_id: selectedProduct || null,
          supplier_id: selectedSupplier || null,
          user_id: userData.user.id
        }])
        .select().single();

      if (entryError) throw entryError;

      // 2. Gera as Parcelas (Caixa)
      const schedulesToInsert = generateSchedules(totalCents, installments, dueDate, type).map(s => ({
        ...s, entry_id: entry.id, user_id: userData.user?.id
      }));

      const { error: schedError } = await supabase.from('financial_schedules').insert(schedulesToInsert);
      if (schedError) throw schedError;

      setIsModalOpen(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      alert('Erro: ' + err.message);
    } finally { setIsSaving(false); }
  }

  function resetForm() {
    setDescription(''); setUnitValue(''); setQuantity('1');
    setSelectedProduct(''); setSelectedSupplier('');
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-700 pb-20">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#09090b] p-8 rounded-[2.5rem] border border-zinc-800/50 shadow-2xl">
        <div className="space-y-1">
          <h1 className="text-5xl font-black tracking-tighter uppercase italic leading-none">
            <span className="text-zinc-200">Fluxo de</span> <span className="text-[#F1C40F]">Caixa</span>
          </h1>
          <p className="text-zinc-500 text-sm font-medium">Gestão profissional de entradas, saídas e parcelamentos.</p>
        </div>
        <button 
          className="bg-[#F1C40F] hover:bg-[#d4ac0d] text-[#09090b] font-black px-10 py-5 rounded-2xl flex items-center gap-3 transition-all transform hover:scale-105 shadow-xl"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus className="w-6 h-6 stroke-[3px]" /> NOVO LANÇAMENTO
        </button>
      </div>

      {/* CARDS DE RESUMO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-zinc-900/40 border border-emerald-500/20 p-6 rounded-[2.5rem] shadow-xl relative overflow-hidden">
          <ArrowUpCircle className="absolute -right-2 -top-2 w-20 h-20 text-emerald-500/10" />
          <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Entradas Hoje</span>
          <p className="text-3xl font-black text-white mt-2">{formatCentsToBRL(stats.in)}</p>
        </div>
        <div className="bg-zinc-900/40 border border-rose-500/20 p-6 rounded-[2.5rem] shadow-xl relative overflow-hidden">
          <ArrowDownCircle className="absolute -right-2 -top-2 w-20 h-20 text-rose-500/10" />
          <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Saídas Hoje</span>
          <p className="text-3xl font-black text-white mt-2">{formatCentsToBRL(stats.out)}</p>
        </div>
        <div className="bg-zinc-900/40 border border-amber-500/20 p-6 rounded-[2.5rem] shadow-xl relative overflow-hidden">
          <AlertCircle className="absolute -right-2 -top-2 w-20 h-20 text-amber-500/10" />
          <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Pendente Total</span>
          <p className="text-3xl font-black text-white mt-2">{formatCentsToBRL(stats.pending)}</p>
        </div>
        <div className="bg-[#F1C40F] p-6 rounded-[2.5rem] shadow-xl relative overflow-hidden">
          <TrendingUp className="absolute -right-2 -top-2 w-20 h-20 text-[#09090b]/10" />
          <span className="text-[10px] font-black text-[#09090b]/60 uppercase tracking-widest">Status</span>
          <p className="text-3xl font-black text-[#09090b] mt-2 uppercase italic">{stats.in >= stats.out ? 'Saudável' : 'Alerta'}</p>
        </div>
      </div>

      {/* TABELA */}
      <div className="bg-zinc-900/20 border border-zinc-800/50 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-zinc-800/50 bg-zinc-900/40 flex items-center gap-3">
          <Calendar className="w-5 h-5 text-[#F1C40F]" />
          <h2 className="font-black text-white uppercase tracking-widest text-xs italic">Agenda Financeira</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-zinc-500 text-[10px] uppercase font-black tracking-widest bg-zinc-900/60">
                <th className="p-6">Data</th>
                <th className="p-6">Descrição / Origem</th>
                <th className="p-6">Valor</th>
                <th className="p-6">Status</th>
                <th className="p-6 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/30">
              {schedules.map((item) => (
                <tr key={item.id} className="hover:bg-white/[0.02] transition-all">
                  <td className="p-6 font-mono text-xs text-zinc-400">{item.due_date}</td>
                  <td className="p-6">
                    <div className="font-bold text-zinc-200 uppercase text-xs">{item.financial_entries?.description}</div>
                    <div className="text-[10px] text-zinc-500 mt-1">{item.financial_entries?.supplier_name || 'GERAL'}</div>
                  </td>
                  <td className={`p-6 font-black ${item.type === 'INCOME' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {item.type === 'INCOME' ? '+' : '-'} {formatCentsToBRL(item.amount_cents)}
                  </td>
                  <td className="p-6">
                    <span className={`text-[9px] font-black px-3 py-1 rounded-full border ${item.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                      {item.status === 'PAID' ? 'LIQUIDADO' : 'PENDENTE'}
                    </span>
                  </td>
                  <td className="p-6 text-right">
                    {item.status === 'PENDING' && (
                      <button onClick={async () => {
                        await supabase.from('financial_schedules').update({ status: 'PAID', payment_date: todayStr }).eq('id', item.id);
                        fetchData();
                      }} className="bg-white text-[#09090b] text-[10px] font-black px-4 py-2 rounded-xl hover:bg-[#F1C40F] transition-all">BAIXAR</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL COMPLETO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
              <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Novo Lançamento Inteligente</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors"><X size={32}/></button>
            </div>
            
            <form onSubmit={handleSave} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tipo de Lançamento */}
              <div className="md:col-span-2 flex bg-[#09090b] p-1.5 rounded-2xl border border-zinc-800">
                <button type="button" onClick={() => setType('EXPENSE')} className={`flex-1 py-4 rounded-xl text-xs font-black uppercase transition-all ${type === 'EXPENSE' ? 'bg-rose-500 text-white shadow-lg' : 'text-zinc-500'}`}>💸 Saída / Compra</button>
                <button type="button" onClick={() => setType('INCOME')} className={`flex-1 py-4 rounded-xl text-xs font-black uppercase transition-all ${type === 'INCOME' ? 'bg-emerald-500 text-white shadow-lg' : 'text-zinc-500'}`}>💰 Entrada / Receita</button>
              </div>

              {/* Dados Básicos */}
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-2"><Tag size={12}/> Descrição Livre</label>
                  <input required value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-4 py-3.5 text-white focus:border-[#F1C40F] outline-none font-bold" placeholder="Ex: Reposição de Estoque" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-2"><Package size={12}/> Selecionar Produto</label>
                  <select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)} className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-4 py-3.5 text-white focus:border-[#F1C40F] outline-none font-bold">
                    <option value="">Nenhum produto selecionado</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.nome} ({p.sku})</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-2"><Users size={12}/> Fornecedor</label>
                  <select value={selectedSupplier} onChange={e => setSelectedSupplier(e.target.value)} className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-4 py-3.5 text-white focus:border-[#F1C40F] outline-none font-bold">
                    <option value="">Selecione o Fornecedor</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Valores e Datas */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">Vlr. Unitário</label>
                    <input required value={unitValue} onChange={e => setUnitValue(e.target.value)} className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-4 py-3.5 text-white focus:border-[#F1C40F] outline-none font-bold" placeholder="0,00" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">Quantidade</label>
                    <input required type="number" value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-4 py-3.5 text-white focus:border-[#F1C40F] outline-none font-bold" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">Data Compra</label>
                    <input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-4 py-3.5 text-white focus:border-[#F1C40F] outline-none font-bold text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">1º Vencimento</label>
                    <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-4 py-3.5 text-white focus:border-[#F1C40F] outline-none font-bold text-xs" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">Parcelamento</label>
                  <select value={installments} onChange={e => setInstallments(Number(e.target.value))} className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-4 py-3.5 text-white focus:border-[#F1C40F] outline-none font-bold">
                    {[1,2,3,4,5,6,10,12].map(n => <option key={n} value={n}>{n === 1 ? 'À Vista' : `${n}x Parcelado`}</option>)}
                  </select>
                </div>
              </div>

              {/* Resumo e Botão */}
              <div className="md:col-span-2 bg-[#09090b] p-6 rounded-3xl border border-zinc-800 flex justify-between items-center mt-2">
                <div>
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Total do Lançamento</p>
                  <p className="text-3xl font-black text-[#F1C40F] tracking-tighter">
                    {formatCentsToBRL(Math.round(parseFloat(unitValue.replace(',', '.') || '0') * 100) * parseInt(quantity || '0'))}
                  </p>
                </div>
                <button disabled={isSaving} type="submit" className="bg-[#F1C40F] text-[#09090b] font-black px-10 py-5 rounded-2xl hover:scale-105 transition-all flex items-center gap-2 shadow-xl disabled:opacity-50">
                  {isSaving ? <Loader2 className="animate-spin" /> : <><Check size={24} strokeWidth={4}/> SALVAR AGORA</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}