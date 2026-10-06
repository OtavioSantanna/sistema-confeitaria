import { withTransaction, pool } from '../database/pool.js';
import * as repo from '../repositories/receita.repository.js';
import { carregarConversor } from './conversao.service.js';
import { carregarBase, expandirReceita, consolidar, formatarConsolidado } from './calculo.service.js';
import { toCamel, bools } from '../utils/case.js';
import { badRequest, notFound } from '../utils/errors.js';
import { dec, toApi } from '../utils/decimal.js';

export async function listar(filtro) {
  return (await repo.listar(filtro)).map((r) => bools(toCamel(r), 'ativo'));
}

export async function buscar(id, db = pool) {
  const r = await repo.buscar(id, db);
  if (!r) throw notFound('Receita não encontrada');
  const ingredientes = await repo.listarIngredientes([id], db);
  const conversor = await carregarConversor(ingredientes.map((i) => i.ingrediente_id), db);
  return {
    ...bools(toCamel(r), 'ativo'),
    ingredientes: ingredientes.map((i) => {
      const noEstoque = conversor.paraEstoque(i.ingrediente_id, i.quantidade, i.unidade_id);
      return {
        ingredienteId: i.ingrediente_id,
        ingrediente: i.ingrediente,
        quantidade: i.quantidade,
        unidadeId: i.unidade_id,
        unidade: i.unidade,
        quantidadeEstoque: noEstoque == null ? null : toApi(noEstoque),
        unidadeEstoque: i.unidade_estoque,
        ordem: i.ordem,
        observacao: i.observacao,
      };
    }),
    fatores: (await repo.listarFatores([id], db)).map((f) => ({
      tamanhoId: f.tamanho_id,
      tamanho: f.tamanho,
      fator: f.fator,
    })),
  };
}

async function validar(dados, conn) {
  const ids = dados.ingredientes.map((i) => i.ingredienteId);
  const repetidos = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (repetidos.length) throw badRequest('Ingrediente repetido na receita', [...new Set(repetidos)]);

  const tams = dados.fatores.map((f) => f.tamanhoId);
  if (new Set(tams).size !== tams.length) throw badRequest('Tamanho repetido nos fatores');

  const conversor = await carregarConversor(ids, conn);
  const erros = [];
  for (const i of dados.ingredientes) {
    const ing = conversor.ingrediente(i.ingredienteId);
    if (!ing) erros.push(`Ingrediente ${i.ingredienteId} não existe`);
    else if (!conversor.unidade(i.unidadeId)) erros.push(`Unidade ${i.unidadeId} não existe`);
    else if (conversor.fator(i.ingredienteId, i.unidadeId) == null) {
      const u = conversor.unidade(i.unidadeId).codigo;
      const ue = conversor.unidade(ing.unidade_estoque_id).codigo;
      erros.push(`${ing.nome}: "${u}" não converte para "${ue}". Cadastre a conversão no ingrediente.`);
    }
  }
  if (erros.length) throw badRequest('Ingredientes inválidos', erros);
}

async function salvarDependentes(id, dados, conn) {
  await repo.substituirIngredientes(id, dados.ingredientes, conn);
  await repo.substituirFatores(id, dados.fatores, conn);
  const faltantes = await repo.fatoresFaltantesEmProdutos(id, conn);
  if (faltantes.length) {
    throw badRequest(
      'Produtos que usam esta receita precisam de fator para estes tamanhos',
      faltantes.map((f) => ({ produto: f.produto, tamanhoId: f.tamanho_id, tamanho: f.tamanho })),
    );
  }
}

export async function criar(dados) {
  return withTransaction(async (conn) => {
    await validar(dados, conn);
    const id = await repo.inserir(dados, conn);
    await salvarDependentes(id, dados, conn);
    return buscar(id, conn);
  });
}

// Atualização completa (ingredientes e fatores são substituídos).
// Encomendas já confirmadas NÃO mudam: usam o snapshot gravado.
export async function atualizar(id, dados) {
  return withTransaction(async (conn) => {
    if (!(await repo.buscar(id, conn))) throw notFound('Receita não encontrada');
    await validar(dados, conn);
    await repo.atualizar(id, dados, conn);
    await salvarDependentes(id, dados, conn);
    return buscar(id, conn);
  });
}

export async function desativar(id) {
  if (!(await repo.buscar(id))) throw notFound('Receita não encontrada');
  await repo.desativar(id);
}

// Simulação: quanto de cada ingrediente para um fator, tamanho ou quantidade.
//   ?fator=2.5  |  ?tamanhoId=4  |  ?quantidade=300 (usa o rendimento)
export async function simular(id, { fator, tamanhoId, quantidade }) {
  const { receitas, fatores, conversor } = await carregarBase([id]);
  const receita = receitas.get(id);
  if (!receita) throw notFound('Receita não encontrada');

  let f;
  if (fator) f = dec(fator);
  else if (tamanhoId) {
    f = fatores.get(`${id}:${tamanhoId}`);
    if (!f) throw badRequest('Receita sem fator cadastrado para este tamanho');
  } else if (quantidade) f = dec(quantidade).div(receita.rendimento_quantidade);
  else f = dec(1);

  const linhas = expandirReceita(receita, f, conversor);
  return {
    receitaId: id,
    receita: receita.nome,
    fatorEscala: toApi(f, 6),
    ingredientes: await formatarConsolidado(consolidar(linhas)),
  };
}
