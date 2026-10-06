import { Router } from 'express';
import * as c from '../controllers/encomenda.controller.js';
import { validate } from '../middlewares/validate.js';
import { idParams } from '../schemas/common.js';
import { encomendaBody, encomendaQuery, statusBody } from '../schemas/encomenda.schema.js';

export const encomendaRoutes = Router();

encomendaRoutes.get('/', validate({ query: encomendaQuery }), c.listar);
encomendaRoutes.get('/:id', validate({ params: idParams }), c.buscar);
encomendaRoutes.get('/:id/ingredientes', validate({ params: idParams }), c.ingredientes);
encomendaRoutes.post('/', validate({ body: encomendaBody }), c.criar);
encomendaRoutes.put('/:id', validate({ params: idParams, body: encomendaBody }), c.atualizar);
encomendaRoutes.patch('/:id/status', validate({ params: idParams, body: statusBody }), c.alterarStatus);
encomendaRoutes.delete('/:id', validate({ params: idParams }), c.excluir);
