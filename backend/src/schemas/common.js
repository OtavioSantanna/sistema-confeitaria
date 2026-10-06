import { z } from 'zod';

// Mensagens de validação em português.
z.config(z.locales.pt());

// Números decimais: aceita 1.5, "1.5" ou "1,5". Sai como string
// (preserva a precisão até o banco / decimal.js).
const decimalString = z
  .union([z.number(), z.string()])
  .transform((v) => String(v).trim().replace(',', '.'))
  .refine((v) => /^-?\d+(\.\d+)?$/.test(v), { message: 'Número inválido' });

export const decimal = decimalString;
export const decimalPositivo = decimalString.refine((v) => Number(v) > 0, {
  message: 'Deve ser maior que zero',
});
export const decimalNaoNegativo = decimalString.refine((v) => Number(v) >= 0, {
  message: 'Não pode ser negativo',
});

export const id = z.coerce.number().int().positive();
export const idOpcional = id.nullish();

export const texto = (max) => z.string().trim().min(1, 'Obrigatório').max(max);
export const textoOpcional = (max) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : null));

// Data/hora: '2026-10-05', '2026-10-05T15:00', '2026-10-05 15:00:00'
export const dataHora = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2})?)?$/, 'Use AAAA-MM-DD ou AAAA-MM-DD HH:mm')
  .transform((v) => {
    const [d, t = '00:00'] = v.split(/[ T]/);
    return `${d} ${t.length === 5 ? `${t}:00` : t}`;
  });

export const data = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use AAAA-MM-DD');

export const booleanQuery = z
  .enum(['true', 'false', '1', '0'])
  .transform((v) => v === 'true' || v === '1');

export const idParams = z.object({ id });

// Lista "1,2,3" na query string.
export const listaIds = z
  .string()
  .transform((v) => v.split(',').map((x) => Number(x.trim())))
  .refine((arr) => arr.length > 0 && arr.every((n) => Number.isInteger(n) && n > 0), {
    message: 'Lista de ids inválida',
  });
