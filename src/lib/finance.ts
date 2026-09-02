import Decimal from 'decimal.js';

/**
 * Formata centavos (BigInt) para Real Brasileiro (R$)
 */
export function formatCentsToBRL(cents: bigint | number): string {
  const value = Number(cents) / 100;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Gera parcelas de forma inteligente (50/50, 3x, etc)
 * Se houver sobra de centavos na divisão, joga na primeira parcela.
 */
export function generateSchedules(
  totalAmountCents: bigint, 
  installments: number, 
  startDate: string,
  type: 'INCOME' | 'EXPENSE'
) {
  const amount = new Decimal(totalAmountCents.toString());
  // Divide o valor total pelo número de parcelas e arredonda para baixo
  const installmentValue = amount.dividedBy(installments).toDecimalPlaces(0, Decimal.ROUND_DOWN);
  // Calcula se sobrou algum centavo na divisão
  const remainder = amount.minus(installmentValue.times(installments));

  return Array.from({ length: installments }).map((_, i) => {
    const dueDate = new Date(startDate);
    // Adiciona os meses para as próximas parcelas
    dueDate.setMonth(dueDate.getMonth() + i);
    
    // Na primeira parcela (i === 0), somamos o resto da divisão
    const finalValue = i === 0 ? installmentValue.plus(remainder) : installmentValue;

    return {
      due_date: dueDate.toISOString().split('T')[0],
      amount_cents: BigInt(finalValue.toString()),
      status: 'PENDING',
      type
    };
  });
}