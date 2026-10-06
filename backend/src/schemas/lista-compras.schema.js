import { z } from 'zod';
import { data, booleanQuery, listaIds } from './common.js';

export const listaComprasQuery = z.object({
  de: data.optional(),                 // data de entrega inicial
  ate: data.optional(),                // data de entrega final (inclusive)
  encomendaIds: listaIds.optional(),   // ex.: 1,2,5
  incluirOrcamentos: booleanQuery.default(false),
  considerarEstoqueMinimo: booleanQuery.default(false),
});
