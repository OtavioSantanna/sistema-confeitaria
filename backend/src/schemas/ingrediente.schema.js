import { z } from 'zod';
import { id, texto, textoOpcional, decimalPositivo, decimalNaoNegativo, booleanQuery } from './common.js';

const conversao = z.object({ unidadeId: id, quantidade: decimalPositivo });

const base = {
  nome: texto(120),
  unidadeEstoqueId: id,
  estoqueMinimo: decimalNaoNegativo.default('0'),
  embalagemQuantidade: decimalPositivo.nullish().transform((v) => v ?? null),
  embalagemDescricao: textoOpcional(60),
  ativo: z.boolean().default(true),
  observacoes: textoOpcional(500),
};

export const criarIngredienteBody = z.object({
  ...base,
  conversoes: z.array(conversao).default([]),
  estoqueInicial: decimalNaoNegativo.optional(),
});

// No PUT, `conversoes` omitido = mantém as atuais.
export const atualizarIngredienteBody = z.object({
  ...base,
  conversoes: z.array(conversao).optional(),
});

export const ingredienteQuery = z.object({
  busca: z.string().trim().optional(),
  ativo: booleanQuery.optional(),
  abaixoMinimo: booleanQuery.optional(),
});
