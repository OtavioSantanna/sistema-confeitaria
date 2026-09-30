import { z } from 'zod';
import { id, decimal, decimalNaoNegativo, textoOpcional, dataHora, data, booleanQuery, listaIds } from './common.js';

export const movimentacaoBody = z.object({
  ingredienteId: id,
  tipo: z.enum(['entrada', 'saida', 'perda', 'ajuste']),
  quantidade: decimal,
  unidadeId: id.optional(),
  custoTotal: decimalNaoNegativo.optional(),
  dataMovimento: dataHora.optional(),
  observacao: textoOpcional(300),
});

export const estoqueQuery = z.object({
  ingredienteIds: listaIds.optional(),
  abaixoMinimo: booleanQuery.optional(),
  ativo: booleanQuery.optional(),
});

export const movimentacaoQuery = z.object({
  ingredienteId: id.optional(),
  tipo: z.enum(['entrada', 'saida', 'producao', 'perda', 'ajuste']).optional(),
  de: data.optional(),
  ate: data.optional(),
  encomendaId: id.optional(),
  limite: z.coerce.number().int().min(1).max(1000).default(200),
});
