import { z } from 'zod';
import { texto, textoOpcional, booleanQuery } from './common.js';

export const clienteBody = z.object({
  nome: texto(150),
  telefone: textoOpcional(30),
  email: z.email('E-mail inválido').max(150).nullish().or(z.literal('')).transform((v) => v || null),
  endereco: textoOpcional(300),
  observacoes: textoOpcional(500),
  ativo: z.boolean().default(true),
});

export const clienteQuery = z.object({
  busca: z.string().trim().optional(),
  ativo: booleanQuery.optional(),
});
