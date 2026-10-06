import { pool } from '../database/pool.js';

// Insere com VALUES (não INSERT ... SELECT): o trigger que atualiza
// ingrediente.estoque_atual não permite ler `ingrediente` no mesmo comando.
export async function inserirMovimentacoes(movs, db = pool) {
  if (!movs.length) return;
  await db.query(
    `INSERT INTO movimentacao_estoque
       (ingrediente_id, tipo, quantidade, quantidade_informada, unidade_informada_id,
        custo_total, encomenda_id, data_movimento, observacao)
     VALUES ?`,
    [
      movs.map((m) => [
        m.ingredienteId, m.tipo, m.quantidade, m.quantidadeInformada ?? null, m.unidadeInformadaId ?? null,
        m.custoTotal ?? null, m.encomendaId ?? null, m.dataMovimento ?? new Date(), m.observacao ?? null,
      ]),
    ],
  );
}

export async function posicao({ ingredienteIds, abaixoMinimo, ativo } = {}, db = pool) {
  const [rows] = await db.query(
    `SELECT * FROM vw_estoque
      WHERE (? IS NULL OR ingrediente_id IN (?))
        AND (? IS NULL OR abaixo_minimo = ?)
        AND (? IS NULL OR ativo = ?)
      ORDER BY ingrediente`,
    [
      ingredienteIds?.length ? 1 : null, ingredienteIds?.length ? ingredienteIds : [0],
      abaixoMinimo ?? null, abaixoMinimo ?? null, ativo ?? null, ativo ?? null,
    ],
  );
  return rows;
}

export async function listarMovimentacoes({ ingredienteId, tipo, de, ate, encomendaId, limite = 200 } = {}, db = pool) {
  const [rows] = await db.query(
    `SELECT m.id, m.ingrediente_id, i.nome AS ingrediente, u.codigo AS unidade, m.tipo, m.quantidade,
            m.quantidade_informada, ui.codigo AS unidade_informada, m.custo_total,
            m.encomenda_id, m.data_movimento, m.observacao
       FROM movimentacao_estoque m
       JOIN ingrediente i    ON i.id = m.ingrediente_id
       JOIN unidade_medida u ON u.id = i.unidade_estoque_id
       LEFT JOIN unidade_medida ui ON ui.id = m.unidade_informada_id
      WHERE (? IS NULL OR m.ingrediente_id = ?)
        AND (? IS NULL OR m.tipo = ?)
        AND (? IS NULL OR m.data_movimento >= ?)
        AND (? IS NULL OR m.data_movimento < ? + INTERVAL 1 DAY)
        AND (? IS NULL OR m.encomenda_id = ?)
      ORDER BY m.data_movimento DESC, m.id DESC
      LIMIT ?`,
    [
      ingredienteId ?? null, ingredienteId ?? null, tipo ?? null, tipo ?? null,
      de ?? null, de ?? null, ate ?? null, ate ?? null, encomendaId ?? null, encomendaId ?? null, limite,
    ],
  );
  return rows;
}
