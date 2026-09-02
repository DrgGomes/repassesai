import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  // Inicialização do Supabase Admin para ler agendamentos do dia
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const today = new Date().toISOString().split('T')[0];

  const { data: pendingSchedules } = await supabase
    .from('financial_schedules')
    .select('*, financial_entries(description)')
    .eq('due_date', today)
    .eq('status', 'PENDING');

  if (pendingSchedules && pendingSchedules.length > 0) {
    // Aqui você conecta seu provedor de Push, E-mail (Resend/Sendgrid) ou Telegram
    console.log(`[ALERTA CAIXA] Existem ${pendingSchedules.length} contas para hoje!`);
  }

  return NextResponse.json({ status: 'success', totalAlerts: pendingSchedules?.length || 0 });
}