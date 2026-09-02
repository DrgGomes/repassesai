'use client';

import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { formatCentsToBRL, generateSchedules } from './lib/finance';
import { 
  Plus, ArrowUpCircle, ArrowDownCircle, Calendar, Paperclip, TrendingUp,
  AlertCircle, Loader2, X, Check, Package, Users, Tag, Calculator
} from 'lucide-react';

export default function FluxoCaixaView() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
    const { data: prods } = await supabase.from('produtos').select('id, nome, sku').order('nome');
    const { data: supps } = await supabase.from('suppliers').select('id, name').order('name');
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
          item.type === 'INCOME' ? (inSum += amt) : (outSum += amt);
        }
        if (item.status === 'PENDING') pendingSum += amt;
      });
      setStats({ in: inSum, out: outSum, pending: pendingSum });
    }
    setLoading(false);
  }

  async function quickAddSupplier() {
    const name = prompt("Nome do novo fornecedor:");
    if (!name) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.from('suppliers').insert([{ name, user_id: user?.id }]).select().single();
    if (error) alert("Erro: " + error.message);
    else { setSuppliers(prev => [...prev, data]); setSelectedSupplier(data.id); }
  }

  async function quickAddProduct() {
    const nome = prompt("Nome do novo produto:");
    const sku = prompt("SKU do produto:");
    if (!nome || !sku) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.from('produtos').insert([{ nome, sku, user_id: user?.id }]).select().single();
    if (error) alert("Erro: " + error.message);
    else { setProducts(prev => [...prev, data]); setSelectedProduct(data.id); }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    try {
      const unitCents = Math.round(parseFloat(unitValue.replace(',', '.') || '0') * 100);
      const totalCents = BigInt(unitCents * parseInt(quantity));
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("Sessão expirada.");

      const { data: entry, error: entryError } = await supabase
        .from('financial_entries')
        .insert([{
          description: description || 'Lançamento Manual',
          total_amount_cents: totalCents,
          unit_value_cents: BigInt(unitCents),
          quantity: parseInt(quantity),
          type: type,
          entry_date: entryDate,
          accrual_date: entryDate, // Preenchendo o campo que causou o erro
          product_id: selectedProduct || null,
          supplier_id: selectedSupplier || null,
          user_id: user.id
        }])
        .select().single();

      if (entryError) throw entryError;

      const schedulesToInsert = generateSchedules(totalCents, installments, dueDate, type).map(s => ({
        ...s, entry_id: entry.id, user_id: user.id
      }));

      await supabase.from('financial_schedules').insert(schedulesToInsert);
      setIsModalOpen(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      alert('Erro ao salvar: ' + err.message);
    } finally { setIsSaving(false); }
  }

  function resetForm() {
    setDescription(''); setUnitValue(''); setQuantity('1');
    setSelectedProduct(''); setSelectedSupplier('');
    setInstallments(1);
  }

  if (loading) return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-[#09090b] space-y-4">
      <Loader2 className="animate-spin text-[#F1C40F]" size={48} />
      <p className="text-zinc-500 font-black uppercase tracking-[0.2em] text-[10px]">Sincronizando...</p>
    </div>
  );

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#09090b] p-8 rounded-[2.5rem] border border-zinc-800/50 shadow-2xl">
        <div className="space-y-1">
          <h1 className="text-5xl font-black tracking-tighter uppercase italic leading-none">
            <span className="text-zinc-200">Fluxo de</span> <span className="text-[#F1C40F]">Caixa</span>
          </h1>
          <p className="text-zinc-500 text-sm font-medium">Gestão profissional de entradas e saídas.</p>
        </div>
        <button className="bg-[#F1C40F] hover:bg-[#d4ac0d] text-[#09090b] font-black px-10 py-5 rounded-2xl flex items-center gap-3 transition-all transform hover:scale-105 shadow-xl" onClick={() => setIsModalOpen(true)}>
          <Plus className="w-6 h-6 stroke-[4px]" /> <span className="tracking-widest">NOVO LANÇAMENTO</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Entradas Hoje', val: stats.in, color: 'text-emerald-500', bg: 'border-emerald-500/20', Icon: ArrowUpCircle },
          { label: 'Saídas Hoje', val: stats.out, color: 'text-rose-500', bg: 'border-rose-500/20', Icon: ArrowDownCircle },
          { label: 'Pendente Total', val: stats.pending, color: 'text-amber-500', bg: 'border-amber-500/20', Icon: AlertCircle },
        ].map((card, i) => (
          <div key={i} className={`bg-zinc-900/40 border ${card.bg} p-6 rounded-[2.5rem] shadow-xl relative overflow-hidden group`}>
            <card.Icon className={`absolute -right-2 -top-2 w-20 h-20 ${card.color} opacity-5 group-hover:opacity-10 transition-opacity`} />
            <span className={`text-[10px] font-black ${card.color} uppercase tracking-widest`}>{card.label}</span>
            <p className="text-3xl font-black text-white mt-2 tracking-tighter">{formatCentsToBRL(card.val)}</p>
          </div>
        ))}
        <div className="bg-[#F1C40F] p-6 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
          <TrendingUp className="absolute -right-2 -top-2 w-20 h-20 text-[#09090b] opacity-10" />
          <span className="text-[10px] font-black text-[#09090b]/60 uppercase tracking-widest">Saúde Financeira</span>
          <p className="text-3xl font-black text-[#09090b] mt-2 uppercase italic leading-none">{stats.in >= stats.out ? 'Saudável' : 'Alerta'}</p>
        </div>
      </div>

      <div className="bg-zinc-900/20 border border-zinc-800/50 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-zinc-800/50 bg-zinc-900/40 flex items-center gap-3">
          <Calendar className="w-5 h-5 text-[#F1C40F]" />
          <h2 className="font-black text-white uppercase tracking-[0.2em] text-[10px] italic">Agenda de Vencimentos</h2>
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
                <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="p-6 font-mono text-xs text-zinc-400">{item.due_date}</td>
                  <td className="p-6">
                    <div className="font-bold text-zinc-200 uppercase text-xs group-hover:text-[#F1C40F] transition-colors">{item.financial_entries?.description}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] text-zinc-600 font-black uppercase">{item.financial_entries?.supplier_name || 'GERAL'}</span>
                      {item.financial_entries?.attachment_url && <Paperclip className="w-3 h-3 text-emerald-500" />}
                    </div>
                  </td>
                  <td className={`p-6 font-black text-sm ${item.type === 'INCOME' ? 'text-emerald-400' : 'text-rose-400'}`}>
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
                      }} className="bg-white text-[#09090b] text-[10px] font-black px-4 py-2 rounded-xl hover:bg-[#F1C40F] transition-all transform active:scale-90">BAIXAR</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-3xl rounded-[3rem] shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
              <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter flex items-center gap-3"><Calculator className="text-[#F1C40F]" /> Novo Lançamento</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors"><X size={32}/></button>
            </div>
            <form onSubmit={handleSave} className="p-10 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="md:col-span-2 flex bg-[#09090b] p-1.5 rounded-2xl border border-zinc-800">
                <button type="button" onClick={() => setType('EXPENSE')} className={`flex-1 py-4 rounded-xl text-xs font-black uppercase transition-all ${type === 'EXPENSE' ? 'bg-rose-600 text-white shadow-lg' : 'text-zinc-500'}`}>💸 Saída</button>
                <button type="button" onClick={() => setType('INCOME')} className={`flex-1 py-4 rounded-xl text-xs font-black uppercase transition-all ${type === 'INCOME' ? 'bg-emerald-600 text-white shadow-lg' : 'text-zinc-500'}`}>💰 Entrada</button>
              </div>
              <div className="space-y-5">
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-2"><Tag size={12}/> Descrição</label>
                  <input required value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-[#09090b] border border-zinc-800 rounded-2xl px-5 py-4 text-white focus:border-[#F1C40F] outline-none font-bold" placeholder="Ex: Reposição" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 flex justify-between items-center">
                    <span className="flex items-center gap-2"><Package size={12}/> Produto</span>
                    <button type="button" onClick={quickAddProduct} className="text-[#F1C40F] hover:underline text-[9px] font-black">+ NOVO</button>
                  </label>
                  <select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)} className="w-full bg-[#09090b] border border-zinc-800 rounded-2xl px-5 py-4 text-white focus:border-[#F1C40F] outline-none font-bold">
                    <option value="">Nenhum produto</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 flex justify-between items-center">
                    <span className="flex items-center gap-2"><Users size={12}/> Fornecedor</span>
                    <button type="button" onClick={quickAddSupplier} className="text-[#F1C40F] hover:underline text-[9px] font-black">+ NOVO</button>
                  </label>
                  <select value={selectedSupplier} onChange={e => setSelectedSupplier(e.target.value)} className="w-full bg-[#09090b] border border-zinc-800 rounded-2xl px-5 py-4 text-white focus:border-[#F1C40F] outline-none font-bold">
                    <option value="">Selecione</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">Vlr. Unitário</label>
                    <input required value={unitValue} onChange={e => setUnitValue(e.target.value)} className="w-full bg-[#09090b] border border-zinc-800 rounded-2xl px-5 py-4 text-white focus:border-[#F1C40F] outline-none font-bold" placeholder="0,00" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">Qtd</label>
                    <input required type="number" value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full bg-[#09090b] border border-zinc-800 rounded-2xl px-5 py-4 text-white focus:border-[#F1C40F] outline-none font-bold" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block text-emerald-500">Data Compra</label>
                    <input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} className="w-full bg-[#09090b] border border-zinc-800 rounded-2xl px-4 py-4 text-white focus:border-[#F1C40F] outline-none font-bold text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block text-amber-500">1º Vencimento</label>
                    <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full bg-[#09090b] border border-zinc-800 rounded-2xl px-4 py-4 text-white focus:border-[#F1C40F] outline-none font-bold text-xs" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">Parcelamento</label>
                  <select value={installments} onChange={e => setInstallments(Number(e.target.value))} className="w-full bg-[#09090b] border border-zinc-800 rounded-2xl px-5 py-4 text-white focus:border-[#F1C40F] outline-none font-bold">
                    {[1,2,3,4,5,6,10,12].map(n => <option key={n} value={n}>{n === 1 ? 'Pagamento à Vista' : `${n}x Parcelado`}</option>)}
                  </select>
                </div>
              </div>
              <div className="md:col-span-2 bg-[#050505] p-8 rounded-[2.5rem] border border-zinc-800 flex justify-between items-center mt-4">
                <div>
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Total</p>
                  <p className="text-4xl font-black text-[#F1C40F] tracking-tighter">{formatCentsToBRL(Math.round(parseFloat(unitValue.replace(',', '.') || '0') * 100) * parseInt(quantity || '0'))}</p>
                </div>
                <button disabled={isSaving} type="submit" className="bg-[#F1C40F] text-[#09090b] font-black px-12 py-6 rounded-[1.5rem] hover:scale-105 transition-all flex items-center gap-3 shadow-xl disabled:opacity-50">
                  {isSaving ? <Loader2 className="animate-spin" /> : <><Check size={28} strokeWidth={4}/> SALVAR AGORA</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}