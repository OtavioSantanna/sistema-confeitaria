import * as service from '../services/auxiliar.service.js';
import { ok, created } from '../utils/async.js';

export const listarUnidades = ok(() => service.listarUnidades());
export const listarTiposReceita = ok(() => service.listarTiposReceita());
export const criarTipoReceita = created((req) => service.criarTipoReceita(req.valid.body));
export const listarTamanhos = ok((req) => service.listarTamanhos(req.valid.query));
export const buscarTamanho = ok((req) => service.buscarTamanho(req.valid.params.id));
export const criarTamanho = created((req) => service.criarTamanho(req.valid.body));
export const atualizarTamanho = ok((req) => service.atualizarTamanho(req.valid.params.id, req.valid.body));
