import * as repo from '../repositories/auxiliar.repository.js';
import { rowsToCamel, toCamel, bools } from '../utils/case.js';
import { notFound } from '../utils/errors.js';

export const listarUnidades = async () => rowsToCamel(await repo.listarUnidades());
export const listarTiposReceita = async () => rowsToCamel(await repo.listarTiposReceita());

export async function criarTipoReceita({ nome }) {
  const id = await repo.inserirTipoReceita(nome);
  return { id, nome };
}

export async function listarTamanhos(filtro) {
  return (await repo.listarTamanhos(filtro)).map((r) => bools(toCamel(r), 'ativo'));
}

export async function buscarTamanho(id) {
  const t = await repo.buscarTamanho(id);
  if (!t) throw notFound('Tamanho não encontrado');
  return bools(toCamel(t), 'ativo');
}

export async function criarTamanho(dados) {
  const id = await repo.inserirTamanho(dados);
  return buscarTamanho(id);
}

export async function atualizarTamanho(id, dados) {
  await buscarTamanho(id);
  await repo.atualizarTamanho(id, dados);
  return buscarTamanho(id);
}
