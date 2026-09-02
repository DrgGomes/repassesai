'use client';

import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { formatCentsToBRL } from './lib/finance';
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
  Printer
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
    <div className="max-w-[1400px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* HEADER PREMIUM */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[#F1C40F] mb-1">
            <LayoutDashboard size={16} className="opacity-80" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Gestão de Tesouraria</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic leading-none">
            Fluxo de <span className="text-[#F1C40F]">Caixa</span>
          </h1>
          <p className="text-zinc-500 text-sm font-medium">
            Acompanhe sua liquidez real e saúde financeira em tempo real.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="bg-zinc-900 hover:bg-zinc-800 text-zinc-400 p-3 rounded-2xl transition-all border border-zinc-800">
            <Printer size={20} />
          </button>
          <button 
            className="bg-[#F1C40F] hover:bg-[#d4ac0d] text-[#09090b] font-black px-8 py-4 rounded-2xl flex items-center gap-3 transition-all transform hover:scale-[1.02] active:scale-95 shadow-[0_10px_20px_-5px_rgba(241,196,15,0.3)]"
            onClick={() => alert('Em breve: Modal de Lançamento.')}
          >
            <Plus className="w-5 h-5 stroke-[3px]" /> 
            <span className="uppercase tracking-wider text-sm">Novo Lançamento</span>
          </button>
        </div>
      </div>

      {/* CARDS COM EFEITO GLASS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/50 p-6 rounded-[2rem] shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <ArrowUpCircle size={60} className="text-emerald-500" />
          </div>
          <span className="text-[10px] font-black text-emerald-500/80 uppercase tracking-widest">Entradas Hoje</span>
          <p className="text-3xl font-black text-white mt-2 tracking-tighter">
            {formatCentsToBRL(stats.in)}
          </p>
          <div className="mt-4 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] font-bold text-zinc-500 uppercase">Dinheiro em conta</span>
          </div>
        </div>

        <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/50 p-6 rounded-[2rem] shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <ArrowDownCircle size={60} className="text-rose-500" />
          </div>
          <span className="text-[10px] font-black text-rose-500/80 uppercase tracking-widest">Saídas Hoje</span>
          <p className="text-3xl font-black text-white mt-2 tracking-tighter">
            {formatCentsToBRL(stats.out)}
          </p>
          <div className="mt-4 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
            <span className="text-[10px] font-bold text-zinc-500 uppercase">Pagamentos do dia</span>
          </div>
        </div>

        <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/50 p-6 rounded-[2rem] shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <AlertCircle size={60} className="text-amber-500" />
          </div>
          <span className="text-[10px] font-black text-amber-500/80 uppercase tracking-widest">Pendente Total</span>
          <p className="text-3xl font-black text-white mt-2 tracking-tighter">
            {formatCentsToBRL(stats.pending)}
          </p>
          <div className="mt-4 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
            <span className="text-[10px] font-bold text-zinc-500 uppercase">Aguardando liquidação</span>
          </div>
        </div>

        <div className="bg-[#F1C40F] p-6 rounded-[2rem] shadow-[0_20px_40px_-10px_rgba(241,196,15,0.2)] relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 transition-transform">
            <TrendingUp size={60} className="text-[#09090b]" />
          </div>
          <span className="text-[10px] font-black text-[#09090b]/60 uppercase tracking-widest">Saúde Financeira</span>
          <p className="text-3xl font-black text-[#09090b] mt-2 tracking-tighter uppercase italic">
            {stats.in >= stats.out ? 'Estável' : 'Alerta'}
          </p>
          <div className="mt-4 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#09090b]/40"></span>
            <span className="text-[10px] font-bold text-[#09090b]/60 uppercase">Análise de Liquidez</span>
          </div>
        </div>
      </div>

      {/* TABELA ESTILO SAAS MODERNO */}
      <div className="bg-zinc-900/30 backdrop-blur-sm border border-zinc-800/50 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-zinc-800/50 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-amber-400/10 p-3 rounded-2xl">
              <Calendar className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="font-black text-white uppercase tracking-widest text-sm">Agenda Financeira</h2>
              <p className="text-[10px] text-zinc-500 font-bold uppercase mt-0.5">Próximos lançamentos e histórico</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-[#09090b] p-1 rounded-xl border border-zinc-800">
            <button className="px-4 py-2 text-[10px] font-black uppercase rounded-lg bg-zinc-800 text-white shadow-sm">Todos</button>
            <button className="px-4 py-2 text-[10px] font-black uppercase rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors">Entradas</button>
            <button className="px-4 py-2 text-[10px] font-black uppercase rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors">Saídas</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead>
              <tr className="text-zinc-500 text-[10px] uppercase font-black tracking-[0.2em] bg-zinc-900/50">
                <th className="p-6 border-b border-zinc-800/50">Data</th>
                <th className="p-6 border-b border-zinc-800/50">Descrição / Origem</th>
                <th className="p-6 border-b border-zinc-800/50">Valor</th>
                <th className="p-6 border-b border-zinc-800/50">Status</th>
                <th className="p-6 border-b border-zinc-800/50 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/30">
              {schedules.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-20 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-20">
                      <AlertCircle size={48} />
                      <p className="text-sm font-bold uppercase tracking-widest">Nenhuma movimentação encontrada</p>
                    </div>
                  </td>
                </tr>
              ) : schedules.map((item) => (
                <tr key={item.id} className={`group hover:bg-white/[0.02] transition-all ${item.due_date === todayStr ? 'bg-amber-400/[0.02]' : ''}`}>
                  <td className="p-6">
                    <div className="flex flex-col">
                      <span className="text-white font-bold text-sm">{new Date(item.due_date).toLocaleDateString('pt-BR', {day: '2-digit', month: 'short'})}</span>
                      <span className="text-[10px] text-zinc-600 font-mono uppercase">{item.due_date}</span>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex flex-col gap-1">
                      <div className="font-black text-zinc-200 uppercase text-xs tracking-tight group-hover:text-[#F1C40F] transition-colors">
                        {item.financial_entries?.description}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold text-zinc-500 uppercase bg-zinc-800/50 px-2 py-0.5 rounded">
                          {item.financial_entries?.supplier_name || 'GERAL'}
                        </span>
                        {item.financial_entries?.attachment_url && (
                          <div className="bg-emerald-500/10 p-1 rounded">
                            <Paperclip className="w-3 h-3 text-emerald-500" />
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className={`text-base font-black tracking-tighter ${item.type === 'INCOME' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {item.type === 'INCOME' ? '+' : '-'} {formatCentsToBRL(item.amount_cents)}
                    </div>
                  </td>
                  <td className="p-6">
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${
                      item.status === 'PAID' 
                        ? 'bg-emerald-500/5 text-emerald-500 border-emerald-500/20' 
                        : 'bg-amber-500/5 text-amber-500 border-amber-500/20'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${item.status === 'PAID' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
                      {item.status === 'PAID' ? 'Liquidado' : 'Pendente'}
                    </div>
                  </td>
                  <td className="p-6 text-right">
                    {item.status === 'PENDING' ? (
                      <button 
                        onClick={async () => {
                          await supabase.from('financial_schedules').update({ status: 'PAID', payment_date: todayStr }).eq('id', item.id);
                          fetchData();
                        }}
                        className="bg-white hover:bg-[#F1C40F] text-[#09090b] text-[10px] font-black px-4 py-2 rounded-xl transition-all transform active:scale-90 uppercase tracking-tighter"
                      >
                        Confirmar
                      </button>
                    ) : (
                      <span className="text-[10px] font-black text-zinc-600 uppercase italic">Processado</span>
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