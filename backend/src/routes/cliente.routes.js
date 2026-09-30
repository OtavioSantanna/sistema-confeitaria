import { Router } from 'express';
import * as c from '../controllers/cliente.controller.js';
import { validate } from '../middlewares/validate.js';
import { idParams } from '../schemas/common.js';
import { clienteBody, clienteQuery } from '../schemas/cliente.schema.js';

export const clienteRoutes = Router();

clienteRoutes.get('/', validate({ query: clienteQuery }), c.listar);
clienteRoutes.get('/:id', validate({ params: idParams }), c.buscar);
clienteRoutes.post('/', validate({ body: clienteBody }), c.criar);
clienteRoutes.put('/:id', validate({ params: idParams, body: clienteBody }), c.atualizar);
clienteRoutes.delete('/:id', validate({ params: idParams }), c.desativar);
