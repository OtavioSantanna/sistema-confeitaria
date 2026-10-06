import { withTransaction, pool } from '../database/pool.js';
import * as repo from '../repositories/produto.repository.js';
import { toCamel, bools } from '../utils/case.js';
import { badRequest, conflict, notFound } from '../utils/errors.js';

export async function listar(filtro) {
  return (await repo.listar(filtro)).map((p) => bools(toCamel(p), 'ativo'));
}

export async function buscar(id, db = pool) {
  const p = await repo.buscar(id, db);
  if (!p) throw notFound('Produto não encontrado');
  const componentes = await repo.listarComponentes([id], db);
  const opcoes = await repo.listarOpcoes(componentes.map((c) => c.id), db);
  return {
    ...bools(toCamel(p), 'ativo'),
    tamanhos: (await repo.listarTamanhos(id, db)).map(toCamel),
    componentes: componentes.map((c) => ({
      id: c.id,
      nome: c.nome,
      obrigatorio: Boolean(c.obrigatorio),
      quantidadePorUnidade: c.quantidade_por_unidade,
      ordem: c.ordem,
      opcoes: opcoes
        .filter((o) => o.componente_id === c.id)
        .map((o) => ({
          receitaId: o.receita_id,
          receita: o.receita,
          receitaAtiva: Boolean(o.receita_ativa),
          precoAdicional: o.preco_adicional,
          padrao: Boolean(o.padrao),
        })),
    })),
  };
}

async function validar(dados, conn) {
  const erros = [];
  const { componentes, tamanhos } = dados;

  const nomes = componentes.map((c) => c.nome.toLowerCase());
  if (new Set(nomes).size !== nomes.length) erros.push('Nomes de componentes repetidos');

  for (const c of componentes) {
    const recs = c.opcoes.map((o) => o.receitaId);
    if (new Set(recs).size !== recs.length) erros.push(`Componente "${c.nome}": receita repetida nas opções`);
    if (c.opcoes.filter((o) => o.padrao).length > 1) erros.push(`Componente "${c.nome}": só uma opção pode ser padrão`);
  }

  if (dados.tipo === 'simples') {
    if (componentes.length !== 1 || componentes[0].opcoes.length !== 1) {
      erros.push('Produto simples deve ter exatamente 1 componente com 1 receita');
    } else {
      componentes[0].opcoes[0].padrao = true;
    }
  }

  if (dados.modoCalculo === 'tamanho') {
    if (!tamanhos.length) erros.push('Produto calculado por tamanho precisa de ao menos 1 tamanho');
    const tIds = tamanhos.map((t) => t.tamanhoId);
    if (new Set(tIds).size !== tIds.length) erros.push('Tamanho repetido');
  } else if (tamanhos.length) {
    erros.push('Produto calculado por rendimento não usa tamanhos');
  }
  if (erros.length) throw badRequest('Produto inválido', erros);

  // Receitas existem?
  const receitaIds = [...new Set(componentes.flatMap((c) => c.opcoes.map((o) => o.receitaId)))];
  const [recs] = await conn.query('SELECT id, nome FROM receita WHERE id IN (?)', [receitaIds]);
  const nomeReceita = new Map(recs.map((r) => [r.id, r.nome]));
  const inexistentes = receitaIds.filter((id) => !nomeReceita.has(id));
  if (inexistentes.length) throw badRequest('Receitas não encontradas', inexistentes);

  // Toda receita precisa de fator para todos os tamanhos do produto.
  if (dados.modoCalculo === 'tamanho') {
    const tIds = tamanhos.map((t) => t.tamanhoId);
    const existentes = new Set(
      (await repo.fatoresExistentes(receitaIds, tIds, conn)).map((f) => `${f.receita_id}:${f.tamanho_id}`),
    );
    const [tams] = await conn.query('SELECT id, nome FROM tamanho WHERE id IN (?)', [tIds]);
    const nomeTam = new Map(tams.map((t) => [t.id, t.nome]));
    const faltando = [];
    for (const r of receitaIds) {
      for (const t of tIds) {
        if (!nomeTam.has(t)) faltando.push(`Tamanho ${t} não existe`);
        else if (!existentes.has(`${r}:${t}`)) faltando.push(`${nomeReceita.get(r)} — ${nomeTam.get(t)}`);
      }
    }
    if (faltando.length) {
      throw badRequest('Cadastre o fator de escala destas receitas para os tamanhos do produto', [...new Set(faltando)]);
    }
  }
}

async function salvarComponentes(produtoId, componentes, conn) {
  const atuais = await repo.listarComponentes([produtoId], conn);
  const idsAtuais = new Set(atuais.map((c) => c.id));

  for (const c of componentes) {
    if (c.id && !idsAtuais.has(c.id)) throw badRequest(`Componente ${c.id} não pertence a este produto`);
  }
  const mantidos = new Set(componentes.filter((c) => c.id).map((c) => c.id));
  const remover = [...idsAtuais].filter((id) => !mantidos.has(id));
  const emUso = await repo.componentesEmUso(remover, conn);
  if (emUso.length) {
    throw conflict(
      'Componentes já usados em encomendas não podem ser removidos (desative o produto e crie outro)',
      emUso.map((c) => c.nome),
    );
  }
  await repo.excluirComponentes(remover, conn);

  for (const [idx, c] of componentes.entries()) {
    const dados = { ...c, ordem: c.ordem ?? idx + 1 };
    const id = c.id ?? (await repo.inserirComponente(produtoId, dados, conn));
    if (c.id) await repo.atualizarComponente(id, dados, conn);
    await repo.substituirOpcoes(id, c.opcoes, conn);
  }
}

export async function criar(dados) {
  return withTransaction(async (conn) => {
    if (dados.componentes.some((c) => c.id)) throw badRequest('Não informe id de componente ao criar produto');
    await validar(dados, conn);
    const id = await repo.inserir(dados, conn);
    await repo.substituirTamanhos(id, dados.tamanhos, conn);
    await salvarComponentes(id, dados.componentes, conn);
    return buscar(id, conn);
  });
}

// Componentes com `id` são atualizados; sem `id` são criados; os
// ausentes são removidos (se não estiverem em uso).
export async function atualizar(id, dados) {
  return withTransaction(async (conn) => {
    if (!(await repo.buscar(id, conn))) throw notFound('Produto não encontrado');
    await validar(dados, conn);
    await repo.atualizar(id, dados, conn);
    await repo.substituirTamanhos(id, dados.tamanhos, conn);
    await salvarComponentes(id, dados.componentes, conn);
    return buscar(id, conn);
  });
}

export async function desativar(id) {
  if (!(await repo.buscar(id))) throw notFound('Produto não encontrado');
  await repo.desativar(id);
}
