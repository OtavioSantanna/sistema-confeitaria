import { pool } from '../database/pool.js';

export async function listar({ status, de, ate, clienteId, busca } = {}, db = pool) {
  const [rows] = await db.query(
    `SELECT e.id, e.cliente_id, c.nome AS cliente, c.telefone AS cliente_telefone,
            e.data_pedido, e.data_entrega, e.status, e.valor_total, e.observacoes,
            (SELECT COUNT(*) FROM encomenda_item ei WHERE ei.encomenda_id = e.id) AS total_itens
       FROM encomenda e JOIN cliente c ON c.id = e.cliente_id
      WHERE (? IS NULL OR e.status IN (?))
        AND (? IS NULL OR e.data_entrega >= ?)
        AND (? IS NULL OR e.data_entrega < ? + INTERVAL 1 DAY)
        AND (? IS NULL OR e.cliente_id = ?)
        AND (? IS NULL OR c.nome LIKE ?)
      ORDER BY e.data_entrega, e.id`,
    [
      status?.length ? 1 : null, status?.length ? status : [''],
      de ?? null, de ?? null, ate ?? null, ate ?? null,
      clienteId ?? null, clienteId ?? null, busca ?? null, `%${busca ?? ''}%`,
    ],
  );
  return rows;
}

export async function buscar(id, db = pool, { bloquear = false } = {}) {
  const [[row]] = await db.query(
    `SELECT e.id, e.cliente_id, c.nome AS cliente, c.telefone AS cliente_telefone,
            e.data_pedido, e.data_entrega, e.status, e.valor_total, e.observacoes,
            e.confirmada_em, e.estoque_baixado_em, e.criado_em, e.atualizado_em
       FROM encomenda e JOIN cliente c ON c.id = e.cliente_id
      WHERE e.id = ? ${bloquear ? 'FOR UPDATE' : ''}`,
    [id],
  );
  return row;
}

export async function listarItens(encomendaIds, db = pool) {
  if (!encomendaIds.length) return [];
  const [rows] = await db.query(
    `SELECT ei.id, ei.encomenda_id, ei.produto_id, p.nome AS produto, p.modo_calculo,
            ei.tamanho_id, t.nome AS tamanho, ei.quantidade, ei.preco_unitario, ei.observacoes
       FROM encomenda_item ei
       JOIN produto p      ON p.id = ei.produto_id
       LEFT JOIN tamanho t ON t.id = ei.tamanho_id
      WHERE ei.encomenda_id IN (?)
      ORDER BY ei.encomenda_id, ei.id`,
    [encomendaIds],
  );
  return rows;
}

export async function listarComponentesDosItens(itemIds, db = pool) {
  if (!itemIds.length) return [];
  const [rows] = await db.query(
    `SELECT eic.item_id, eic.componente_id, pc.nome AS componente, pc.quantidade_por_unidade,
            eic.receita_id, r.nome AS receita
       FROM encomenda_item_componente eic
       JOIN produto_componente pc ON pc.id = eic.componente_id
       JOIN receita r             ON r.id = eic.receita_id
      WHERE eic.item_id IN (?)
      ORDER BY eic.item_id, pc.ordem, pc.id`,
    [itemIds],
  );
  return rows;
}

export async function inserir(e, db = pool) {
  const [r] = await db.query(
    'INSERT INTO encomenda (cliente_id, data_pedido, data_entrega, observacoes, valor_total) VALUES (?, COALESCE(?, NOW()), ?, ?, ?)',
    [e.clienteId, e.dataPedido ?? null, e.dataEntrega, e.observacoes, e.valorTotal],
  );
  return r.insertId;
}

export async function atualizar(id, e, db = pool) {
  await db.query(
    `UPDATE encomenda SET cliente_id = ?, data_pedido = COALESCE(?, data_pedido), data_entrega = ?,
            observacoes = ?, valor_total = ?
      WHERE id = ?`,
    [e.clienteId, e.dataPedido ?? null, e.dataEntrega, e.observacoes, e.valorTotal, id],
  );
}

export async function excluir(id, db = pool) {
  await db.query('DELETE FROM encomenda WHERE id = ?', [id]);
}

export async function excluirItens(encomendaId, db = pool) {
  await db.query('DELETE FROM encomenda_item WHERE encomenda_id = ?', [encomendaId]);
}

export async function inserirItem(encomendaId, i, db = pool) {
  const [r] = await db.query(
    'INSERT INTO encomenda_item (encomenda_id, produto_id, tamanho_id, quantidade, preco_unitario, observacoes) VALUES (?, ?, ?, ?, ?, ?)',
    [encomendaId, i.produtoId, i.tamanhoId, i.quantidade, i.precoUnitario, i.observacoes],
  );
  return r.insertId;
}

export async function inserirComponentesDoItem(itemId, componentes, db = pool) {
  if (!componentes.length) return;
  await db.query('INSERT INTO encomenda_item_componente (item_id, componente_id, receita_id) VALUES ?', [
    componentes.map((c) => [itemId, c.componenteId, c.receitaId]),
  ]);
}

export async function atualizarStatus(id, campos, db = pool) {
  await db.query(
    `UPDATE encomenda SET status = ?,
            confirmada_em = ?, estoque_baixado_em = ?
      WHERE id = ?`,
    [campos.status, campos.confirmadaEm, campos.estoqueBaixadoEm, id],
  );
}

// O trigger grava o histórico; aqui só anexamos a observação.
export async function anotarUltimoStatus(encomendaId, observacao, db = pool) {
  await db.query(
    `UPDATE encomenda_status_historico SET observacao = ?
      WHERE encomenda_id = ? ORDER BY id DESC LIMIT 1`,
    [observacao, encomendaId],
  );
}

export async function historico(encomendaId, db = pool) {
  const [rows] = await db.query(
    `SELECT status_anterior, status_novo, alterado_em, observacao
       FROM encomenda_status_historico WHERE encomenda_id = ? ORDER BY id`,
    [encomendaId],
  );
  return rows;
}

// ---------------- snapshot (encomenda_necessidade) ----------------
export async function inserirNecessidades(linhas, db = pool) {
  if (!linhas.length) return;
  await db.query(
    `INSERT INTO encomenda_necessidade
       (encomenda_id, item_id, componente_id, receita_id, receita_nome, fator_escala,
        ingrediente_id, quantidade, unidade_id)
     VALUES ?`,
    [linhas.map((l) => [
      l.encomendaId, l.itemId, l.componenteId, l.receitaId, l.receitaNome, l.fatorEscala,
      l.ingredienteId, l.quantidade, l.unidadeId,
    ])],
  );
}

export async function excluirNecessidades(encomendaId, db = pool) {
  await db.query('DELETE FROM encomenda_necessidade WHERE encomenda_id = ?', [encomendaId]);
}

export async function listarNecessidades(encomendaIds, db = pool) {
  if (!encomendaIds.length) return [];
  const [rows] = await db.query(
    `SELECT encomenda_id, item_id, componente_id, receita_id, receita_nome, fator_escala,
            ingrediente_id, quantidade, unidade_id
       FROM encomenda_necessidade WHERE encomenda_id IN (?) ORDER BY id`,
    [encomendaIds],
  );
  return rows;
}
