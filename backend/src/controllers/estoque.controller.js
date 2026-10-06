import * as service from '../services/estoque.service.js';
import { ok, created } from '../utils/async.js';

export const posicao = ok((req) => service.posicao(req.valid.query));
export const listarMovimentacoes = ok((req) => service.listarMovimentacoes(req.valid.query));
export const registrar = created((req) => service.registrar(req.valid.body));
