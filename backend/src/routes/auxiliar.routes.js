import { Router } from 'express';
import * as c from '../controllers/auxiliar.controller.js';
import { validate } from '../middlewares/validate.js';
import { idParams } from '../schemas/common.js';
import { tamanhoBody, tamanhoQuery, tipoReceitaBody } from '../schemas/auxiliar.schema.js';

export const auxiliarRoutes = Router();

auxiliarRoutes.get('/unidades', c.listarUnidades);
auxiliarRoutes.get('/tipos-receita', c.listarTiposReceita);
auxiliarRoutes.post('/tipos-receita', validate({ body: tipoReceitaBody }), c.criarTipoReceita);
auxiliarRoutes.get('/tamanhos', validate({ query: tamanhoQuery }), c.listarTamanhos);
auxiliarRoutes.get('/tamanhos/:id', validate({ params: idParams }), c.buscarTamanho);
auxiliarRoutes.post('/tamanhos', validate({ body: tamanhoBody }), c.criarTamanho);
auxiliarRoutes.put('/tamanhos/:id', validate({ params: idParams, body: tamanhoBody }), c.atualizarTamanho);
