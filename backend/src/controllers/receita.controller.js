import * as service from '../services/receita.service.js';
import { ok, created, noContent } from '../utils/async.js';

export const listar = ok((req) => service.listar(req.valid.query));
export const buscar = ok((req) => service.buscar(req.valid.params.id));
export const criar = created((req) => service.criar(req.valid.body));
export const atualizar = ok((req) => service.atualizar(req.valid.params.id, req.valid.body));
export const desativar = noContent((req) => service.desativar(req.valid.params.id));
export const simular = ok((req) => service.simular(req.valid.params.id, req.valid.query));
