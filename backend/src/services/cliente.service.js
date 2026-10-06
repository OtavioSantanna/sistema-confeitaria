import * as repo from '../repositories/cliente.repository.js';
import { toCamel, bools } from '../utils/case.js';
import { notFound } from '../utils/errors.js';

const formatar = (r) => bools(toCamel(r), 'ativo');

export const listar = async (filtro) => (await repo.listar(filtro)).map(formatar);

export async function buscar(id) {
  const row = await repo.buscar(id);
  if (!row) throw notFound('Cliente não encontrado');
  return formatar(row);
}

export async function criar(dados) {
  return buscar(await repo.inserir(dados));
}

export async function atualizar(id, dados) {
  await buscar(id);
  await repo.atualizar(id, dados);
  return buscar(id);
}

export async function desativar(id) {
  await buscar(id);
  await repo.desativar(id);
}
