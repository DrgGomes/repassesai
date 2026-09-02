'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { formatCentsToBRL } from '@/lib/finance';
import { 
  Plus, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Calendar, 
  Filter, 
  FileText, 
  Paperclip, 
  TrendingUp,
  AlertCircle
} from 'lucide-react';

export default function FluxoCaixaPage() {
  const supabase = createClientComponentClient();
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
    // Busca agendamentos de hoje e futuros para dar o "ar didático"
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

  return (
    <div className="p-6 bg-zinc-950 text-zinc-100 min-h-screen space-y-6">
      {/* Título Didático */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-amber-400 uppercase italic">Fluxo de Caixa</h1>
          <p className="text-zinc-400 max-w-md">
            Aqui você vê o dinheiro real. O que já caiu, o que vai sair e quanto sobra no bolso.
          </p>
        </div>
        <button 
          className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-black px-6 py-3 rounded-xl flex items-center gap-2 transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
          onClick={() => alert('Modal de Lançamento: Em breve você poderá dividir 50/50 aqui.')}
        >
          <Plus className="w-6 h-6" /> NOVO LANÇAMENTO
        </button>
      </div>

      {/* Cards Coloridos */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-emerald-500/10 border-2 border-emerald-500/20 p-5 rounded-2xl">
          <div className="flex justify-between items-start">
            <span className="text-xs font-black text-emerald-500 uppercase">Entradas Hoje</span>
            <ArrowUpCircle className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-3xl font-black text-emerald-400 mt-2">{formatCentsToBRL(stats.in)}</p>
        </div>

        <div className="bg-rose-500/10 border-2 border-rose-500/20 p-5 rounded-2xl">
          <div className="flex justify-between items-start">
            <span className="text-xs font-black text-rose-500 uppercase">Saídas Hoje</span>
            <ArrowDownCircle className="w-5 h-5 text-rose-500" />
          </div>
          <p className="text-3xl font-black text-rose-400 mt-2">{formatCentsToBRL(stats.out)}</p>
        </div>

        <div className="bg-amber-500/10 border-2 border-amber-500/20 p-5 rounded-2xl">
          <div className="flex justify-between items-start">
            <span className="text-xs font-black text-amber-500 uppercase">Total Pendente</span>
            <AlertCircle className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-3xl font-black text-amber-400 mt-2">{formatCentsToBRL(stats.pending)}</p>
        </div>

        <div className="bg-zinc-900 border-2 border-zinc-800 p-5 rounded-2xl">
          <div className="flex justify-between items-start">
            <span className="text-xs font-black text-zinc-500 uppercase">Saúde do Caixa</span>
            <TrendingUp className="w-5 h-5 text-zinc-500" />
          </div>
          <p className="text-3xl font-black text-zinc-100 mt-2">
            {stats.in > stats.out ? 'POSITIVO' : 'ALERTA'}
          </p>
        </div>
      </div>

      {/* Lista de Movimentações */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
          <h2 className="font-black flex items-center gap-2 text-zinc-300">
            <Calendar className="w-5 h-5 text-amber-400" /> PRÓXIMOS DIAS
          </h2>
          <button className="text-xs font-bold text-zinc-500 hover:text-zinc-300 flex items-center gap-1 uppercase tracking-widest">
            <FileText className="w-4 h-4" /> Imprimir Relatório
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-zinc-950 text-zinc-500 text-[10px] uppercase font-black tracking-widest">
              <tr>
                <th className="p-4">Data</th>
                <th className="p-4">Descrição / Fornecedor</th>
                <th className="p-4">Valor</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {schedules.map((item) => (
                <tr key={item.id} className={`hover:bg-zinc-800/30 transition-colors ${item.due_date === todayStr ? 'bg-amber-400/5' : ''}`}>
                  <td className="p-4">
                    <span className="font-mono text-xs text-zinc-400">{item.due_date}</span>
                  </td>
                  <td className="p-4">
                    <div className="font-bold text-zinc-200 uppercase text-sm">{item.financial_entries?.description}</div>
                    <div className="text-[10px] text-zinc-500 flex items-center gap-1">
                      {item.financial_entries?.supplier_name || 'GERAL'}
                      {item.financial_entries?.attachment_url && <Paperclip className="w-3 h-3 text-emerald-500" />}
                    </div>
                  </td>
                  <td className={`p-4 font-black ${item.type === 'INCOME' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {item.type === 'INCOME' ? '+' : '-'} {formatCentsToBRL(item.amount_cents)}
                  </td>
                  <td className="p-4">
                    <span className={`text-[10px] font-black px-2 py-1 rounded-md ${
                      item.status === 'PAID' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-amber-500/20 text-amber-500'
                    }`}>
                      {item.status === 'PAID' ? 'CONCLUÍDO' : 'AGUARDANDO'}
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
                      >
                        DAR BAIXA
                      </button>
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