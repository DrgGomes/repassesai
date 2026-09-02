'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { formatCentsToBRL } from '@/lib/finance';
import { Plus, ArrowUpCircle, ArrowDownCircle, Calendar, Filter, FileText } from 'lucide-react';

export default function CaixaPage() {
  const supabase = createClientComponentClient();
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalInToday, setTotalInToday] = useState<bigint>(BigInt(0));
  const [totalOutToday, setTotalOutToday] = useState<bigint>(BigInt(0));

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetchDailySummary();
  }, []);

  async function fetchDailySummary() {
    setLoading(true);
    
    // Busca lançamentos do dia
    const { data, error } = await supabase
      .from('financial_schedules')
      .select('*, financial_entries(description, supplier_name)')
      .eq('due_date', todayStr);

    if (!error && data) {
      setSchedules(data);

      let inSum = BigInt(0);
      let outSum = BigInt(0);

      data.forEach((item: any) => {
        const amt = BigInt(item.amount_cents);
        if (item.type === 'INCOME') inSum += amt;
        if (item.type === 'EXPENSE') outSum += amt;
      });

      setTotalInToday(inSum);
      setTotalOutToday(outSum);
    }
    setLoading(false);
  }

  return (
    <div className="p-6 bg-zinc-950 text-zinc-100 min-h-screen space-y-6">
      {/* Cabeçalho */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fluxo de Caixa & Tesouraria</h1>
          <p className="text-sm text-zinc-400">Previsibilidade de saídas e recebíveis de marketplaces em tempo real.</p>
        </div>
        <button 
          className="bg-amber-400 hover:bg-amber-500 text-zinc-950 font-semibold px-4 py-2 rounded-lg flex items-center gap-2 transition"
          onClick={() => alert('Abrir Modal de Novo Lançamento')}
        >
          <Plus className="w-5 h-5" /> Novo Lançamento
        </button>
      </div>

      {/* Cards de Resumo do Dia */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Entradas Hoje</span>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{formatCentsToBRL(totalInToday)}</p>
          </div>
          <ArrowUpCircle className="w-10 h-10 text-emerald-500/20" />
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Saídas Hoje</span>
            <p className="text-2xl font-bold text-rose-500 mt-1">{formatCentsToBRL(totalOutToday)}</p>
          </div>
          <ArrowDownCircle className="w-10 h-10 text-rose-500/20" />
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Saldo do Dia</span>
            <p className={`text-2xl font-bold mt-1 ${totalInToday - totalOutToday >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
              {formatCentsToBRL(totalInToday - totalOutToday)}
            </p>
          </div>
          <Calendar className="w-10 h-10 text-amber-400/20" />
        </div>
      </div>

      {/* Tabela de Acompanhamento Diário */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-400" /> Pagamentos e Recebimentos de Hoje ({todayStr})
          </h2>
          <button className="text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-md flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filtrar
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-zinc-500">Carregando movimentações...</div>
        ) : schedules.length === 0 ? (
          <div className="text-center py-8 text-zinc-500">Nenhuma movimentação agendada para hoje.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-950 text-zinc-400 uppercase text-xs">
                <tr>
                  <th className="p-3">Descrição / Fornecedor</th>
                  <th className="p-3">Plataforma</th>
                  <th className="p-3">Tipo</th>
                  <th className="p-3">Valor</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {schedules.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-800/50">
                    <td className="p-3">
                      <div className="font-medium text-zinc-200">{item.financial_entries?.description}</div>
                      <div className="text-xs text-zinc-500">{item.financial_entries?.supplier_name || 'Sem fornecedor'}</div>
                    </td>
                    <td className="p-3">
                      <span className="bg-zinc-800 text-zinc-300 text-xs px-2 py-1 rounded font-mono">
                        {item.platform_id || 'GERAL'}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
                        item.type === 'INCOME' ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                      }`}>
                        {item.type === 'INCOME' ? 'ENTRADA' : 'SAÍDA'}
                      </span>
                    </td>
                    <td className="p-3 font-semibold">
                      {formatCentsToBRL(item.amount_cents)}
                    </td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        item.status === 'PAID' ? 'bg-zinc-800 text-emerald-400' : 'bg-amber-950 text-amber-400'
                      }`}>
                        {item.status === 'PAID' ? 'PAGO/RECEBIDO' : 'PENDENTE'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button 
                        onClick={async () => {
                          await supabase.from('financial_schedules').update({ status: 'PAID', payment_date: todayStr }).eq('id', item.id);
                          fetchDailySummary();
                        }}
                        className="text-xs bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold px-3 py-1 rounded"
                      >
                        Baixar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}