import { Router } from 'express';
import * as c from '../controllers/produto.controller.js';
import { validate } from '../middlewares/validate.js';
import { idParams } from '../schemas/common.js';
import { produtoBody, produtoQuery } from '../schemas/produto.schema.js';

export const produtoRoutes = Router();

produtoRoutes.get('/', validate({ query: produtoQuery }), c.listar);
produtoRoutes.get('/:id', validate({ params: idParams }), c.buscar);
produtoRoutes.post('/', validate({ body: produtoBody }), c.criar);
produtoRoutes.put('/:id', validate({ params: idParams, body: produtoBody }), c.atualizar);
produtoRoutes.delete('/:id', validate({ params: idParams }), c.desativar);
