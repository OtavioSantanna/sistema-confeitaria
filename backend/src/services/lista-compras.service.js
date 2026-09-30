// =====================================================================
// Lista de compras
//
// Seleção: encomendas que AINDA PRECISAM SER PRODUZIDAS (confirmadas e,
// opcionalmente, orçamentos) sem baixa de estoque, filtradas por período
// de entrega e/ou ids.
//
// Para cada ingrediente:
//   necessario             = soma do que as encomendas selecionadas usam
//   reservadoOutras        = reservado por confirmadas FORA da seleção
//   disponivelParaSelecao  = max(0, estoque físico - reservadoOutras)
//   comprar                = max(0, necessario [+ mínimo] - disponivelParaSelecao)
//   quantidadeCompra       = comprar arredondado para embalagens inteiras
// Assim o que já está comprometido com outras encomendas confirmadas
// nunca é considerado livre. E a falta de OUTRAS encomendas não entra
// nesta lista (aparece na lista delas) — sem compra em dobro.
// =====================================================================
import { pool } from '../database/pool.js';
import * as estoqueRepo from '../repositories/estoque.repository.js';
import { linhasNecessidade } from './encomenda.service.js';
import { consolidar } from './calculo.service.js';
import { dec, toApi, ceilTo, Decimal } from '../utils/decimal.js';

async function selecionarEncomendas({ de, ate, encomendaIds, incluirOrcamentos }, db) {
  const status = incluirOrcamentos ? ['confirmada', 'orcamento'] : ['confirmada'];
  const [rows] = await db.query(
    `SELECT e.id, e.status, e.data_entrega, e.confirmada_em, c.nome AS cliente
       FROM encomenda e JOIN cliente c ON c.id = e.cliente_id
      WHERE e.status IN (?) AND e.estoque_baixado_em IS NULL
        AND (? IS NULL OR e.id IN (?))
        AND (? IS NULL OR e.data_entrega >= ?)
        AND (? IS NULL OR e.data_entrega < ? + INTERVAL 1 DAY)
      ORDER BY e.data_entrega, e.id`,
    [
      status,
      encomendaIds?.length ? 1 : null, encomendaIds?.length ? encomendaIds : [0],
      de ?? null, de ?? null, ate ?? null, ate ?? null,
    ],
  );
  return rows;
}

export async function gerar(filtro, db = pool) {
  const encomendas = await selecionarEncomendas(filtro, db);
  const avisos = [];
  const linhas = [];
  const reservadoNaSelecao = [];
  const usadas = [];

  for (const e of encomendas) {
    try {
      const { origem, linhas: ls } = await linhasNecessidade(e, db);
      linhas.push(...ls);
      if (e.status === 'confirmada') reservadoNaSelecao.push(...ls);
      usadas.push({ id: e.id, cliente: e.cliente, dataEntrega: e.data_entrega, status: e.status, origem });
    } catch (err) {
      avisos.push(`Encomenda #${e.id} (${e.cliente}) ignorada: ${[err.message, ...(err.detalhes ?? [])].join(' | ')}`);
    }
  }

  const necessidade = new Map(consolidar(linhas).map((c) => [c.ingredienteId, c.quantidade]));
  const reservadoSel = new Map(consolidar(reservadoNaSelecao).map((c) => [c.ingredienteId, c.quantidade]));

  const posicoes = await estoqueRepo.posicao({}, db);
  const [unidades] = await db.query('SELECT codigo, casas_decimais FROM unidade_medida');
  const casas = new Map(unidades.map((u) => [u.codigo, u.casas_decimais]));

  const itens = [];
  for (const p of posicoes) {
    const necessario = necessidade.get(p.ingrediente_id) ?? dec(0);
    const minimo = filtro.considerarEstoqueMinimo ? dec(p.estoque_minimo) : dec(0);
    if (necessario.isZero() && (minimo.isZero() || !p.ativo)) continue;

    const fisico = dec(p.estoque_fisico);
    const reservadoTotal = dec(p.estoque_reservado);
    const reservadoOutras = Decimal.max(reservadoTotal.minus(reservadoSel.get(p.ingrediente_id) ?? 0), 0);
    const disponivelParaSelecao = Decimal.max(fisico.minus(reservadoOutras), 0);
    const comprar = Decimal.max(necessario.plus(minimo).minus(disponivelParaSelecao), 0);
    if (necessario.isZero() && comprar.isZero()) continue;

    let embalagens = null;
    let quantidadeCompra = ceilTo(comprar, casas.get(p.unidade) ?? 2);
    if (p.embalagem_quantidade && comprar.gt(0)) {
      embalagens = comprar.div(p.embalagem_quantidade).ceil();
      quantidadeCompra = embalagens.mul(p.embalagem_quantidade);
    }

    itens.push({
      ingredienteId: p.ingrediente_id,
      ingrediente: p.ingrediente,
      unidade: p.unidade,
      necessario: toApi(necessario),
      estoqueFisico: toApi(fisico),
      reservado: toApi(reservadoTotal),
      reservadoOutrasEncomendas: toApi(reservadoOutras),
      disponivel: toApi(fisico.minus(reservadoTotal)),
      disponivelParaSelecao: toApi(disponivelParaSelecao),
      estoqueMinimo: toApi(p.estoque_minimo),
      comprar: toApi(comprar),
      precisaComprar: comprar.gt(0),
      embalagem: p.embalagem_quantidade
        ? { descricao: p.embalagem_descricao, quantidade: toApi(p.embalagem_quantidade), embalagens: embalagens ? embalagens.toNumber() : 0 }
        : null,
      quantidadeCompra: toApi(quantidadeCompra),
    });
  }

  itens.sort((a, b) => (b.precisaComprar - a.precisaComprar) || a.ingrediente.localeCompare(b.ingrediente, 'pt-BR'));

  return {
    filtros: filtro,
    encomendas: usadas,
    totalParaComprar: itens.filter((i) => i.precisaComprar).length,
    itens,
    avisos,
  };
}
