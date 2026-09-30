import { z } from 'zod';
import { id, texto, textoOpcional, decimalPositivo, booleanQuery } from './common.js';

export const receitaBody = z.object({
  nome: texto(120),
  tipoReceitaId: id,
  rendimentoQuantidade: decimalPositivo.default('1'),
  rendimentoUnidadeId: id,
  modoPreparo: z.string().trim().max(20000).nullish().transform((v) => v || null),
  observacoes: textoOpcional(500),
  ativo: z.boolean().default(true),
  ingredientes: z
    .array(
      z.object({
        ingredienteId: id,
        quantidade: decimalPositivo,
        unidadeId: id,
        ordem: z.coerce.number().int().optional(),
        observacao: textoOpcional(200),
      }),
    )
    .min(1, 'Informe ao menos um ingrediente'),
  fatores: z.array(z.object({ tamanhoId: id, fator: decimalPositivo })).default([]),
});

export const receitaQuery = z.object({
  busca: z.string().trim().optional(),
  tipoReceitaId: id.optional(),
  ativo: booleanQuery.optional(),
});

export const simularQuery = z.object({
  fator: decimalPositivo.optional(),
  tamanhoId: id.optional(),
  quantidade: decimalPositivo.optional(),
});
