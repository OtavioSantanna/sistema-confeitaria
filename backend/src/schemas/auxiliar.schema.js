import { z } from 'zod';
import { texto, textoOpcional, booleanQuery } from './common.js';

export const tamanhoBody = z.object({
  nome: texto(50),
  descricao: textoOpcional(200),
  ordem: z.coerce.number().int().default(0),
  ativo: z.boolean().default(true),
});

export const tipoReceitaBody = z.object({ nome: texto(50) });

export const tamanhoQuery = z.object({ ativo: booleanQuery.optional() });
