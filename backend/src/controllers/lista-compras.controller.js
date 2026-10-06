import * as service from '../services/lista-compras.service.js';
import { ok } from '../utils/async.js';

export const gerar = ok((req) => service.gerar(req.valid.query));
