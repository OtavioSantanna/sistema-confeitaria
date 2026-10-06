import Decimal from 'decimal.js';

// Precisão alta para cálculos intermediários; arredondamos só na saída.
Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

export { Decimal };

export const dec = (v) => new Decimal(v ?? 0);

// Formata para gravar em DECIMAL(14,4) / DECIMAL(12,6).
export const toDb = (d, casas = 4) => new Decimal(d).toDecimalPlaces(casas).toFixed(casas);

// Formata para a resposta da API (string, sem zeros à direita).
export const toApi = (d, casas = 4) => new Decimal(d).toDecimalPlaces(casas).toString();

// Arredonda PARA CIMA (compras/produção: nunca faltar).
export const ceilTo = (d, casas = 0) =>
  new Decimal(d).toDecimalPlaces(casas, Decimal.ROUND_UP);
