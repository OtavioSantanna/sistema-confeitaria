import { pool } from '../database/pool.js';

const CAMPOS = 'id, nome, telefone, email, endereco, observacoes, ativo, criado_em, atualizado_em';

export async function listar({ busca, ativo } = {}, db = pool) {
  const [rows] = await db.query(
    `SELECT ${CAMPOS} FROM cliente
      WHERE (? IS NULL OR nome LIKE ? OR telefone LIKE ?)
        AND (? IS NULL OR ativo = ?)
      ORDER BY nome`,
    [busca ?? null, `%${busca ?? ''}%`, `%${busca ?? ''}%`, ativo ?? null, ativo ?? null],
  );
  return rows;
}

export async function buscar(id, db = pool) {
  const [[row]] = await db.query(`SELECT ${CAMPOS} FROM cliente WHERE id = ?`, [id]);
  return row;
}

export async function inserir(c, db = pool) {
  const [r] = await db.query(
    'INSERT INTO cliente (nome, telefone, email, endereco, observacoes, ativo) VALUES (?, ?, ?, ?, ?, ?)',
    [c.nome, c.telefone, c.email, c.endereco, c.observacoes, c.ativo],
  );
  return r.insertId;
}

export async function atualizar(id, c, db = pool) {
  await db.query(
    'UPDATE cliente SET nome = ?, telefone = ?, email = ?, endereco = ?, observacoes = ?, ativo = ? WHERE id = ?',
    [c.nome, c.telefone, c.email, c.endereco, c.observacoes, c.ativo, id],
  );
}

export async function desativar(id, db = pool) {
  await db.query('UPDATE cliente SET ativo = FALSE WHERE id = ?', [id]);
}
