import * as service from '../services/encomenda.service.js';
import { ok, created, noContent } from '../utils/async.js';

export const listar = ok((req) => service.listar(req.valid.query));
export const buscar = ok((req) => service.buscar(req.valid.params.id));
export const criar = created((req) => service.criar(req.valid.body));
export const atualizar = ok((req) => service.atualizar(req.valid.params.id, req.valid.body));
export const excluir = noContent((req) => service.excluir(req.valid.params.id));
export const ingredientes = ok((req) => service.ingredientes(req.valid.params.id));
export const alterarStatus = ok((req) => service.alterarStatus(req.valid.params.id, req.valid.body));
