import { z } from 'zod';
import { id, texto, textoOpcional, decimalPositivo, decimalNaoNegativo, booleanQuery } from './common.js';

const preco = decimalNaoNegativo.nullish().transform((v) => v ?? null);

export const produtoBody = z.object({
  nome: texto(120),
  descricao: textoOpcional(500),
  tipo: z.enum(['simples', 'personalizavel']),
  modoCalculo: z.enum(['tamanho', 'rendimento']),
  precoBase: preco,
  ativo: z.boolean().default(true),
  tamanhos: z.array(z.object({ tamanhoId: id, preco })).default([]),
  componentes: z
    .array(
      z.object({
        id: id.optional(),
        nome: texto(60),
        obrigatorio: z.boolean().default(true),
        quantidadePorUnidade: decimalPositivo.default('1'),
        ordem: z.coerce.number().int().optional(),
        opcoes: z
          .array(
            z.object({
              receitaId: id,
              precoAdicional: decimalNaoNegativo.default('0'),
              padrao: z.boolean().default(false),
            }),
          )
          .min(1, 'Informe ao menos uma receita'),
      }),
    )
    .min(1, 'Informe ao menos um componente'),
});

export const produtoQuery = z.object({
  busca: z.string().trim().optional(),
  tipo: z.enum(['simples', 'personalizavel']).optional(),
  ativo: booleanQuery.optional(),
});
