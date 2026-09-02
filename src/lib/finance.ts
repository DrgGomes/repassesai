import Decimal from 'decimal.js';

export function formatCentsToBRL(cents: bigint | number): string {
  const value = Number(cents) / 100;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function generateSchedules(
  totalAmountCents: bigint, 
  installments: number, 
  startDate: string,
  type: 'INCOME' | 'EXPENSE'
) {
  const amount = new Decimal(totalAmountCents.toString());
  const installmentValue = amount.dividedBy(installments).toDecimalPlaces(0, Decimal.ROUND_DOWN);
  const remainder = amount.minus(installmentValue.times(installments));

  return Array.from({ length: installments }).map((_, i) => {
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + i);
    const finalValue = i === 0 ? installmentValue.plus(remainder) : installmentValue;

    return {
      due_date: dueDate.toISOString().split('T')[0],
      amount_cents: BigInt(finalValue.toString()),
      status: 'PENDING',
      type
    };
  });
}