import { Router } from 'express';
import { getHealth } from '../controllers/health.controller.js';
import { auxiliarRoutes } from './auxiliar.routes.js';
import { ingredienteRoutes } from './ingrediente.routes.js';
import { clienteRoutes } from './cliente.routes.js';
import { receitaRoutes } from './receita.routes.js';
import { produtoRoutes } from './produto.routes.js';
import { encomendaRoutes } from './encomenda.routes.js';
import { estoqueRoutes } from './estoque.routes.js';
import { listaComprasRoutes } from './lista-compras.routes.js';

// Rotas da API v1
export const routes = Router();

routes.get('/health', getHealth);
routes.use('/', auxiliarRoutes); // /unidades, /tipos-receita, /tamanhos
routes.use('/ingredientes', ingredienteRoutes);
routes.use('/clientes', clienteRoutes);
routes.use('/receitas', receitaRoutes);
routes.use('/produtos', produtoRoutes);
routes.use('/encomendas', encomendaRoutes);
routes.use('/estoque', estoqueRoutes);
routes.use('/lista-compras', listaComprasRoutes);
