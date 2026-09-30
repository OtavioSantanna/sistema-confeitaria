import { z } from 'zod';
import { id, textoOpcional, decimalPositivo, decimalNaoNegativo, dataHora, data } from './common.js';

const STATUS = ['orcamento', 'confirmada', 'em_producao', 'pronta', 'entregue', 'cancelada'];

export const encomendaBody = z.object({
  clienteId: id,
  dataPedido: dataHora.optional(),
  dataEntrega: dataHora,
  observacoes: textoOpcional(1000),
  valorTotal: decimalNaoNegativo.optional(), // se omitido, soma dos itens
  itens: z
    .array(
      z.object({
        produtoId: id,
        tamanhoId: id.nullish(),
        quantidade: decimalPositivo,
        precoUnitario: decimalNaoNegativo.optional(), // se omitido, usa o preço do cadastro
        observacoes: textoOpcional(500),
        // Omitido: usa a opção padrão de cada componente.
        componentes: z.array(z.object({ componenteId: id, receitaId: id })).optional(),
      }),
    )
    .min(1, 'Informe ao menos um item'),
});

export const statusBody = z.object({
  status: z.enum(STATUS),
  observacao: textoOpcional(300),
});

export const encomendaQuery = z.object({
  status: z
    .string()
    .transform((v) => v.split(',').map((s) => s.trim()))
    .pipe(z.array(z.enum(STATUS)))
    .optional(),
  de: data.optional(),
  ate: data.optional(),
  clienteId: id.optional(),
  busca: z.string().trim().optional(),
});
