import { Router } from 'express';
import * as c from '../controllers/receita.controller.js';
import { validate } from '../middlewares/validate.js';
import { idParams } from '../schemas/common.js';
import { receitaBody, receitaQuery, simularQuery } from '../schemas/receita.schema.js';

export const receitaRoutes = Router();

receitaRoutes.get('/', validate({ query: receitaQuery }), c.listar);
receitaRoutes.get('/:id', validate({ params: idParams }), c.buscar);
receitaRoutes.get('/:id/calculo', validate({ params: idParams, query: simularQuery }), c.simular);
receitaRoutes.post('/', validate({ body: receitaBody }), c.criar);
receitaRoutes.put('/:id', validate({ params: idParams, body: receitaBody }), c.atualizar);
receitaRoutes.delete('/:id', validate({ params: idParams }), c.desativar);
