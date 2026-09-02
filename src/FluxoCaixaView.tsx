'use client';

import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { formatCentsToBRL, generateSchedules } from './lib/finance';
import { 
  Plus, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Calendar, 
  Paperclip, 
  TrendingUp,
  AlertCircle,
  Loader2,
  LayoutDashboard,
  X,
  Check
} from 'lucide-react';

export default function FluxoCaixaView() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Estados do Formulário
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [installments, setInstallments] = useState(1);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const [stats, setStats] = useState({
    in: BigInt(0),
    out: BigInt(0),
    pending: BigInt(0)
  });

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetchData();
  }, []);

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

    const amountCents = BigInt(Math.round(parseFloat(amount.replace(',', '.')) * 100));
    
    // 1. Cria a Entrada Principal (O Fato Gerador)
    const { data: entry, error: entryError } = await supabase
      .from('financial_entries')
      .insert([{
        description,
        total_amount_cents: amountCents,
        type,
        entry_date: date,
        user_id: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single();

    if (entryError) {
      alert('Erro ao salvar: ' + entryError.message);
      setIsSaving(false);
      return;
    }

    // 2. Gera as Parcelas usando a matemática do lib/finance
    const schedulesToInsert = generateSchedules(amountCents, installments, date, type).map(s => ({
      ...s,
      entry_id: entry.id,
      user_id: entry.user_id
    }));

    const { error: schedError } = await supabase.from('financial_schedules').insert(schedulesToInsert);

    if (schedError) {
      alert('Erro nas parcelas: ' + schedError.message);
    } else {
      setIsModalOpen(false);
      resetForm();
      fetchData();
    }
    setIsSaving(false);
  }

  function resetForm() {
    setDescription('');
    setAmount('');
    setInstallments(1);
    setType('EXPENSE');
  }

  if (loading) return <div className="h-full w-full flex items-center justify-center bg-[#09090b]"><Loader2 className="animate-spin text-[#F1C40F]" size={32} /></div>;

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-700 pb-20">
      
      {/* HEADER COM TÍTULO CORRIGIDO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#09090b] p-6 rounded-3xl border border-zinc-800/50 shadow-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[#F1C40F] mb-1">
            <LayoutDashboard size={14} />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Módulo Ativo</span>
          </div>
          <h1 className="text-5xl font-black tracking-tighter uppercase italic leading-none">
            <span className="text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.2)]">Fluxo de</span> <span className="text-[#F1C40F] drop-shadow-[0_2px_10px_rgba(241,196,15,0.3)]">Caixa</span>
          </h1>
        </div>
        
        <button 
          className="bg-[#F1C40F] hover:bg-[#d4ac0d] text-[#09090b] font-black px-8 py-4 rounded-2xl flex items-center gap-3 transition-all transform hover:scale-105 shadow-xl"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus className="w-5 h-5 stroke-[3px]" /> 
          <span className="uppercase tracking-wider text-sm">Novo Lançamento</span>
        </button>
      </div>

      {/* CARDS DE STATUS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-zinc-900/40 border border-emerald-500/20 p-6 rounded-[2.5rem] shadow-xl">
          <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Entradas Hoje</span>
          <p className="text-3xl font-black text-white mt-2 tracking-tighter">{formatCentsToBRL(stats.in)}</p>
        </div>
        <div className="bg-zinc-900/40 border border-rose-500/20 p-6 rounded-[2.5rem] shadow-xl">
          <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Saídas Hoje</span>
          <p className="text-3xl font-black text-white mt-2 tracking-tighter">{formatCentsToBRL(stats.out)}</p>
        </div>
        <div className="bg-zinc-900/40 border border-amber-500/20 p-6 rounded-[2.5rem] shadow-xl">
          <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Pendente Total</span>
          <p className="text-3xl font-black text-white mt-2 tracking-tighter">{formatCentsToBRL(stats.pending)}</p>
        </div>
        <div className="bg-[#F1C40F] p-6 rounded-[2.5rem] shadow-xl">
          <span className="text-[10px] font-black text-[#09090b]/60 uppercase tracking-widest">Saúde Financeira</span>
          <p className="text-3xl font-black text-[#09090b] mt-2 tracking-tighter uppercase italic">{stats.in >= stats.out ? 'Estável' : 'Alerta'}</p>
        </div>
      </div>

      {/* TABELA DE MOVIMENTAÇÕES */}
      <div className="bg-zinc-900/20 border border-zinc-800/50 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-zinc-500 text-[10px] uppercase font-black tracking-widest bg-zinc-900/60">
                <th className="p-6">Data</th>
                <th className="p-6">Descrição</th>
                <th className="p-6">Valor</th>
                <th className="p-6">Status</th>
                <th className="p-6 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/30">
              {schedules.map((item) => (
                <tr key={item.id} className="hover:bg-white/[0.02] transition-all">
                  <td className="p-6 font-mono text-xs text-zinc-400">{item.due_date}</td>
                  <td className="p-6 font-bold text-zinc-200 uppercase text-xs">{item.financial_entries?.description}</td>
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

      {/* MODAL DE LANÇAMENTO (O CORAÇÃO DO MÓDULO) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
              <h2 className="text-xl font-black text-white uppercase italic">Novo Lançamento</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white"><X size={24}/></button>
            </div>
            
            <form onSubmit={handleSave} className="p-8 space-y-5">
              <div className="flex bg-[#09090b] p-1 rounded-2xl border border-zinc-800">
                <button type="button" onClick={() => setType('EXPENSE')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${type === 'EXPENSE' ? 'bg-rose-500 text-white shadow-lg' : 'text-zinc-500'}`}>Saída</button>
                <button type="button" onClick={() => setType('INCOME')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${type === 'INCOME' ? 'bg-emerald-500 text-white shadow-lg' : 'text-zinc-500'}`}>Entrada</button>
              </div>

              <div>
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">Descrição</label>
                <input required value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-[#F1C40F] outline-none" placeholder="Ex: Compra de Estoque" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">Valor (R$)</label>
                  <input required type="text" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-[#F1C40F] outline-none font-bold" placeholder="0,00" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">Parcelas</label>
                  <select value={installments} onChange={e => setInstallments(Number(e.target.value))} className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-[#F1C40F] outline-none font-bold">
                    {[1,2,3,4,5,6,10,12].map(n => <option key={n} value={n}>{n}x</option>)}
                  </select>
                </div>
              </div>

              <button disabled={isSaving} type="submit" className="w-full bg-[#F1C40F] text-[#09090b] font-black py-4 rounded-2xl hover:scale-[1.02] transition-all flex justify-center items-center gap-2 shadow-xl">
                {isSaving ? <Loader2 className="animate-spin" /> : <><Check size={20} strokeWidth={3}/> SALVAR AGORA</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}