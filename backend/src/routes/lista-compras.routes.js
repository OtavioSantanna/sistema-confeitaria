import { Router } from 'express';
import * as c from '../controllers/lista-compras.controller.js';
import { validate } from '../middlewares/validate.js';
import { listaComprasQuery } from '../schemas/lista-compras.schema.js';

export const listaComprasRoutes = Router();

listaComprasRoutes.get('/', validate({ query: listaComprasQuery }), c.gerar);
