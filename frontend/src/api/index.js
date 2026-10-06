import { api } from './client.js';

// Endpoints agrupados por recurso.
export const auxiliares = {
  unidades: () => api.get('/unidades'),
  tiposReceita: () => api.get('/tipos-receita'),
  tamanhos: () => api.get('/tamanhos', { ativo: true }),
};

export const ingredientes = {
  listar: (p) => api.get('/ingredientes', p),
  buscar: (id) => api.get(`/ingredientes/${id}`),
  criar: (d) => api.post('/ingredientes', d),
  atualizar: (id, d) => api.put(`/ingredientes/${id}`, d),
};

export const clientes = {
  listar: (p) => api.get('/clientes', p),
  criar: (d) => api.post('/clientes', d),
};

export const receitas = {
  listar: (p) => api.get('/receitas', p),
  buscar: (id) => api.get(`/receitas/${id}`),
  criar: (d) => api.post('/receitas', d),
  atualizar: (id, d) => api.put(`/receitas/${id}`, d),
  desativar: (id) => api.del(`/receitas/${id}`),
};

export const produtos = {
  listar: (p) => api.get('/produtos', p),
  buscar: (id) => api.get(`/produtos/${id}`),
  criar: (d) => api.post('/produtos', d),
  atualizar: (id, d) => api.put(`/produtos/${id}`, d),
  desativar: (id) => api.del(`/produtos/${id}`),
};

export const encomendas = {
  listar: (p) => api.get('/encomendas', p),
  buscar: (id) => api.get(`/encomendas/${id}`),
  criar: (d) => api.post('/encomendas', d),
  atualizar: (id, d) => api.put(`/encomendas/${id}`, d),
  excluir: (id) => api.del(`/encomendas/${id}`),
  status: (id, status, observacao) => api.patch(`/encomendas/${id}/status`, { status, observacao }),
};

export const estoque = {
  posicao: (p) => api.get('/estoque', p),
  movimentacoes: (p) => api.get('/estoque/movimentacoes', p),
  movimentar: (d) => api.post('/estoque/movimentacoes', d),
};

export const listaCompras = (p) => api.get('/lista-compras', p);
