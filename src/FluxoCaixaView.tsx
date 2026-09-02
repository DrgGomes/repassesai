'use client';

import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { formatCentsToBRL } from './lib/finance'; // Corrigido o caminho aqui
import { 
  Plus, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Calendar, 
  Paperclip, 
  TrendingUp,
  AlertCircle,
  Loader2
} from 'lucide-react';

export default function FluxoCaixaView() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
      
      let inSum = BigInt(0);
      let outSum = BigInt(0);
      let pendingSum = BigInt(0);

      data.forEach((item: any) => {
        const amt = BigInt(item.amount_cents);
        if (item.due_date === todayStr) {
          if (item.type === 'INCOME') inSum += amt;
          if (item.type === 'EXPENSE') outSum += amt;
        }
        if (item.status === 'PENDING') {
          pendingSum += amt;
        }
      });

      setStats({ in: inSum, out: outSum, pending: pendingSum });
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[#09090b]">
        <Loader2 className="animate-spin text-[#F1C40F]" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[#F1C40F] uppercase italic">Fluxo de Caixa</h1>
          <p className="text-zinc-400 max-w-md">Dinheiro real: o que já caiu, o que vai sair e a saúde do seu bolso hoje.</p>
        </div>
        <button 
          className="bg-[#F1C40F] hover:bg-[#d4ac0d] text-[#09090b] font-black px-6 py-3 rounded-xl flex items-center gap-2 transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(241,196,15,0.2)]"
          onClick={() => alert('Em breve: Modal de Lançamento com divisão 50/50.')}
        >
          <Plus className="w-6 h-6" /> NOVO LANÇAMENTO
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-2xl">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Entradas Hoje</span>
            <ArrowUpCircle className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-400 mt-2">{formatCentsToBRL(stats.in)}</p>
        </div>

        <div className="bg-rose-500/10 border border-rose-500/20 p-5 rounded-2xl">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Saídas Hoje</span>
            <ArrowDownCircle className="w-5 h-5 text-rose-500" />
          </div>
          <p className="text-2xl font-black text-rose-400 mt-2">{formatCentsToBRL(stats.out)}</p>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/20 p-5 rounded-2xl">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Pendente Total</span>
            <AlertCircle className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-400 mt-2">{formatCentsToBRL(stats.pending)}</p>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-2xl">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Status</span>
            <TrendingUp className="w-5 h-5 text-zinc-500" />
          </div>
          <p className="text-2xl font-black text-zinc-100 mt-2 lowercase">{stats.in > stats.out ? 'saudável' : 'atenção'}</p>
        </div>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/30">
          <h2 className="font-bold flex items-center gap-2 text-zinc-300 uppercase text-sm tracking-widest">
            <Calendar className="w-4 h-4 text-[#F1C40F]" /> Agenda Financeira
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#09090b] text-zinc-500 text-[10px] uppercase font-black tracking-widest">
              <tr>
                <th className="p-4">Data</th>
                <th className="p-4">Descrição</th>
                <th className="p-4">Valor</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {schedules.length === 0 ? (
                <tr><td colSpan={5} className="p-10 text-center text-zinc-500 text-sm italic">Nenhuma movimentação encontrada.</td></tr>
              ) : schedules.map((item) => (
                <tr key={item.id} className={`hover:bg-zinc-800/30 transition-colors ${item.due_date === todayStr ? 'bg-[#F1C40F]/5' : ''}`}>
                  <td className="p-4 font-mono text-xs text-zinc-400">{item.due_date}</td>
                  <td className="p-4">
                    <div className="font-bold text-zinc-200 uppercase text-xs">{item.financial_entries?.description}</div>
                    <div className="text-[10px] text-zinc-500 flex items-center gap-1">
                      {item.financial_entries?.supplier_name || 'GERAL'}
                      {item.financial_entries?.attachment_url && <Paperclip className="w-3 h-3 text-emerald-500" />}
                    </div>
                  </td>
                  <td className={`p-4 font-black text-sm ${item.type === 'INCOME' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {item.type === 'INCOME' ? '+' : '-'} {formatCentsToBRL(item.amount_cents)}
                  </td>
                  <td className="p-4">
                    <span className={`text-[9px] font-black px-2 py-1 rounded-md ${
                      item.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                    }`}>
                      {item.status === 'PAID' ? 'CONCLUÍDO' : 'PENDENTE'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    {item.status === 'PENDING' && (
                      <button 
                        onClick={async () => {
                          await supabase.from('financial_schedules').update({ status: 'PAID', payment_date: todayStr }).eq('id', item.id);
                          fetchData();
                        }}
                        className="bg-zinc-100 hover:bg-white text-zinc-950 text-[10px] font-black px-3 py-1.5 rounded-lg transition-transform active:scale-95"
                      >BAIXAR</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}