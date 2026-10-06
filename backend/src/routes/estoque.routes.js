import { Router } from 'express';
import * as c from '../controllers/estoque.controller.js';
import { validate } from '../middlewares/validate.js';
import { estoqueQuery, movimentacaoBody, movimentacaoQuery } from '../schemas/estoque.schema.js';

export const estoqueRoutes = Router();

estoqueRoutes.get('/', validate({ query: estoqueQuery }), c.posicao);
estoqueRoutes.get('/movimentacoes', validate({ query: movimentacaoQuery }), c.listarMovimentacoes);
estoqueRoutes.post('/movimentacoes', validate({ body: movimentacaoBody }), c.registrar);
