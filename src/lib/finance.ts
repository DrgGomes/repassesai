import Decimal from 'decimal.js';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export interface InstallmentInput {
  totalAmountCents: bigint;
  percentages: number[]; // Ex: [50, 50]
  dueDates: string[];    // Ex: ['2026-09-02', '2026-10-02']
}

export function generateInstallments({ totalAmountCents, percentages, dueDates }: InstallmentInput) {
  const total = new Decimal(totalAmountCents.toString());
  let accumulated = new Decimal(0);

  return percentages.map((pct, index) => {
    const isLast = index === percentages.length - 1;
    let installmentCents: Decimal;

    if (isLast) {
      installmentCents = total.minus(accumulated);
    } else {
      const pctDecimal = new Decimal(pct).dividedBy(100);
      installmentCents = total.times(pctDecimal).toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
      accumulated = accumulated.plus(installmentCents);
    }

    return {
      installmentNumber: index + 1,
      dueDate: dueDates[index],
      amountCents: BigInt(installmentCents.toString())
    };
  });
}

export function formatCentsToBRL(cents: bigint | number): string {
  const value = typeof cents === 'bigint' ? Number(cents) : cents;
  return (value / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}