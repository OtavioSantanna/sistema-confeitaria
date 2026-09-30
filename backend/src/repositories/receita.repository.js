import { pool } from '../database/pool.js';

export async function listar({ busca, tipoReceitaId, ativo } = {}, db = pool) {
  const [rows] = await db.query(
    `SELECT r.id, r.nome, r.tipo_receita_id, t.nome AS tipo_receita,
            r.rendimento_quantidade, r.rendimento_unidade_id, u.codigo AS rendimento_unidade,
            r.ativo, r.atualizado_em,
            (SELECT COUNT(*) FROM receita_ingrediente ri WHERE ri.receita_id = r.id) AS total_ingredientes
       FROM receita r
       JOIN tipo_receita t   ON t.id = r.tipo_receita_id
       JOIN unidade_medida u ON u.id = r.rendimento_unidade_id
      WHERE (? IS NULL OR r.nome LIKE ?)
        AND (? IS NULL OR r.tipo_receita_id = ?)
        AND (? IS NULL OR r.ativo = ?)
      ORDER BY t.nome, r.nome`,
    [busca ?? null, `%${busca ?? ''}%`, tipoReceitaId ?? null, tipoReceitaId ?? null, ativo ?? null, ativo ?? null],
  );
  return rows;
}

export async function buscar(id, db = pool) {
  const [[row]] = await db.query(
    `SELECT r.id, r.nome, r.tipo_receita_id, t.nome AS tipo_receita,
            r.rendimento_quantidade, r.rendimento_unidade_id, u.codigo AS rendimento_unidade,
            r.modo_preparo, r.observacoes, r.ativo, r.criado_em, r.atualizado_em
       FROM receita r
       JOIN tipo_receita t   ON t.id = r.tipo_receita_id
       JOIN unidade_medida u ON u.id = r.rendimento_unidade_id
      WHERE r.id = ?`,
    [id],
  );
  return row;
}

// Ingredientes de uma ou várias receitas.
export async function listarIngredientes(receitaIds, db = pool) {
  if (!receitaIds.length) return [];
  const [rows] = await db.query(
    `SELECT ri.id, ri.receita_id, ri.ingrediente_id, i.nome AS ingrediente,
            ri.quantidade, ri.unidade_id, u.codigo AS unidade,
            i.unidade_estoque_id, ue.codigo AS unidade_estoque,
            ri.ordem, ri.observacao
       FROM receita_ingrediente ri
       JOIN ingrediente i     ON i.id = ri.ingrediente_id
       JOIN unidade_medida u  ON u.id = ri.unidade_id
       JOIN unidade_medida ue ON ue.id = i.unidade_estoque_id
      WHERE ri.receita_id IN (?)
      ORDER BY ri.receita_id, ri.ordem, ri.id`,
    [receitaIds],
  );
  return rows;
}

export async function listarFatores(receitaIds, db = pool) {
  if (!receitaIds.length) return [];
  const [rows] = await db.query(
    `SELECT f.receita_id, f.tamanho_id, t.nome AS tamanho, f.fator
       FROM receita_fator_tamanho f JOIN tamanho t ON t.id = f.tamanho_id
      WHERE f.receita_id IN (?)
      ORDER BY f.receita_id, t.ordem, t.nome`,
    [receitaIds],
  );
  return rows;
}

export async function inserir(r, db = pool) {
  const [res] = await db.query(
    `INSERT INTO receita (nome, tipo_receita_id, rendimento_quantidade, rendimento_unidade_id, modo_preparo, observacoes, ativo)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [r.nome, r.tipoReceitaId, r.rendimentoQuantidade, r.rendimentoUnidadeId, r.modoPreparo, r.observacoes, r.ativo],
  );
  return res.insertId;
}

export async function atualizar(id, r, db = pool) {
  await db.query(
    `UPDATE receita SET nome = ?, tipo_receita_id = ?, rendimento_quantidade = ?, rendimento_unidade_id = ?,
            modo_preparo = ?, observacoes = ?, ativo = ?
      WHERE id = ?`,
    [r.nome, r.tipoReceitaId, r.rendimentoQuantidade, r.rendimentoUnidadeId, r.modoPreparo, r.observacoes, r.ativo, id],
  );
}

export async function desativar(id, db = pool) {
  await db.query('UPDATE receita SET ativo = FALSE WHERE id = ?', [id]);
}

export async function substituirIngredientes(id, ingredientes, db = pool) {
  await db.query('DELETE FROM receita_ingrediente WHERE receita_id = ?', [id]);
  if (ingredientes.length) {
    await db.query(
      'INSERT INTO receita_ingrediente (receita_id, ingrediente_id, quantidade, unidade_id, ordem, observacao) VALUES ?',
      [ingredientes.map((i, idx) => [id, i.ingredienteId, i.quantidade, i.unidadeId, i.ordem ?? idx + 1, i.observacao])],
    );
  }
}

export async function substituirFatores(id, fatores, db = pool) {
  await db.query('DELETE FROM receita_fator_tamanho WHERE receita_id = ?', [id]);
  if (fatores.length) {
    await db.query('INSERT INTO receita_fator_tamanho (receita_id, tamanho_id, fator) VALUES ?', [
      fatores.map((f) => [id, f.tamanhoId, f.fator]),
    ]);
  }
}

// Tamanhos exigidos pelos produtos (modo 'tamanho') que oferecem a receita
// como opção e que ainda não têm fator cadastrado.
export async function fatoresFaltantesEmProdutos(receitaId, db = pool) {
  const [rows] = await db.query(
    `SELECT DISTINCT p.id AS produto_id, p.nome AS produto, t.id AS tamanho_id, t.nome AS tamanho
       FROM produto_componente_opcao o
       JOIN produto_componente c ON c.id = o.componente_id
       JOIN produto p            ON p.id = c.produto_id AND p.modo_calculo = 'tamanho' AND p.ativo
       JOIN produto_tamanho pt   ON pt.produto_id = p.id
       JOIN tamanho t            ON t.id = pt.tamanho_id
       LEFT JOIN receita_fator_tamanho f ON f.receita_id = o.receita_id AND f.tamanho_id = pt.tamanho_id
      WHERE o.receita_id = ? AND f.receita_id IS NULL`,
    [receitaId],
  );
  return rows;
}
