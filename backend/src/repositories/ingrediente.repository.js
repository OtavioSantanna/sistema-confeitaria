import { pool } from '../database/pool.js';

const SELECT = `
  SELECT i.id, i.nome, i.unidade_estoque_id, u.codigo AS unidade_estoque,
         i.estoque_atual AS estoque_fisico,
         v.estoque_reservado, v.estoque_disponivel, v.abaixo_minimo,
         i.estoque_minimo, i.embalagem_quantidade, i.embalagem_descricao,
         i.ativo, i.observacoes, i.criado_em, i.atualizado_em
    FROM ingrediente i
    JOIN unidade_medida u ON u.id = i.unidade_estoque_id
    JOIN vw_estoque v     ON v.ingrediente_id = i.id`;

export async function listar({ busca, ativo, abaixoMinimo } = {}, db = pool) {
  const [rows] = await db.query(
    `${SELECT}
      WHERE (? IS NULL OR i.nome LIKE ?)
        AND (? IS NULL OR i.ativo = ?)
        AND (? IS NULL OR v.abaixo_minimo = ?)
      ORDER BY i.nome`,
    [busca ?? null, `%${busca ?? ''}%`, ativo ?? null, ativo ?? null, abaixoMinimo ?? null, abaixoMinimo ?? null],
  );
  return rows;
}

export async function buscar(id, db = pool) {
  const [[row]] = await db.query(`${SELECT} WHERE i.id = ?`, [id]);
  return row;
}

export async function listarConversoes(id, db = pool) {
  const [rows] = await db.query(
    `SELECT c.unidade_id, u.codigo AS unidade, c.quantidade
       FROM ingrediente_conversao c JOIN unidade_medida u ON u.id = c.unidade_id
      WHERE c.ingrediente_id = ? ORDER BY u.codigo`,
    [id],
  );
  return rows;
}

export async function inserir(i, db = pool) {
  const [r] = await db.query(
    `INSERT INTO ingrediente
       (nome, unidade_estoque_id, estoque_minimo, embalagem_quantidade, embalagem_descricao, ativo, observacoes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [i.nome, i.unidadeEstoqueId, i.estoqueMinimo, i.embalagemQuantidade, i.embalagemDescricao, i.ativo, i.observacoes],
  );
  return r.insertId;
}

export async function atualizar(id, i, db = pool) {
  await db.query(
    `UPDATE ingrediente SET nome = ?, unidade_estoque_id = ?, estoque_minimo = ?,
            embalagem_quantidade = ?, embalagem_descricao = ?, ativo = ?, observacoes = ?
      WHERE id = ?`,
    [i.nome, i.unidadeEstoqueId, i.estoqueMinimo, i.embalagemQuantidade, i.embalagemDescricao, i.ativo, i.observacoes, id],
  );
}

export async function desativar(id, db = pool) {
  await db.query('UPDATE ingrediente SET ativo = FALSE WHERE id = ?', [id]);
}

export async function substituirConversoes(id, conversoes, db = pool) {
  await db.query('DELETE FROM ingrediente_conversao WHERE ingrediente_id = ?', [id]);
  if (conversoes.length) {
    await db.query('INSERT INTO ingrediente_conversao (ingrediente_id, unidade_id, quantidade) VALUES ?', [
      conversoes.map((c) => [id, c.unidadeId, c.quantidade]),
    ]);
  }
}

export async function contarMovimentacoes(id, db = pool) {
  const [[{ n }]] = await db.query('SELECT COUNT(*) AS n FROM movimentacao_estoque WHERE ingrediente_id = ?', [id]);
  return n;
}

// Linhas de receitas que usam o ingrediente (para validar conversões).
export async function usosEmReceitas(id, db = pool) {
  const [rows] = await db.query(
    `SELECT r.id AS receita_id, r.nome AS receita, ri.unidade_id, u.codigo AS unidade
       FROM receita_ingrediente ri
       JOIN receita r ON r.id = ri.receita_id
       JOIN unidade_medida u ON u.id = ri.unidade_id
      WHERE ri.ingrediente_id = ?`,
    [id],
  );
  return rows;
}
