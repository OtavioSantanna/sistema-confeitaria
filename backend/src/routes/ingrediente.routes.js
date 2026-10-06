import { Router } from 'express';
import * as c from '../controllers/ingrediente.controller.js';
import { validate } from '../middlewares/validate.js';
import { idParams } from '../schemas/common.js';
import { criarIngredienteBody, atualizarIngredienteBody, ingredienteQuery } from '../schemas/ingrediente.schema.js';

export const ingredienteRoutes = Router();

ingredienteRoutes.get('/', validate({ query: ingredienteQuery }), c.listar);
ingredienteRoutes.get('/:id', validate({ params: idParams }), c.buscar);
ingredienteRoutes.post('/', validate({ body: criarIngredienteBody }), c.criar);
ingredienteRoutes.put('/:id', validate({ params: idParams, body: atualizarIngredienteBody }), c.atualizar);
ingredienteRoutes.delete('/:id', validate({ params: idParams }), c.desativar);
