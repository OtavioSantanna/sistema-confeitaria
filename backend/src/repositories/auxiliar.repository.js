import { pool } from '../database/pool.js';

export async function listarUnidades(db = pool) {
  const [rows] = await db.query(
    'SELECT id, codigo, nome, grandeza, fator_base, casas_decimais FROM unidade_medida ORDER BY grandeza, fator_base',
  );
  return rows;
}

export async function listarTiposReceita(db = pool) {
  const [rows] = await db.query('SELECT id, nome FROM tipo_receita ORDER BY nome');
  return rows;
}

export async function listarTamanhos({ ativo } = {}, db = pool) {
  const [rows] = await db.query(
    `SELECT id, nome, descricao, ordem, ativo FROM tamanho
      WHERE (? IS NULL OR ativo = ?) ORDER BY ordem, nome`,
    [ativo ?? null, ativo ?? null],
  );
  return rows;
}

export async function buscarTamanho(id, db = pool) {
  const [[row]] = await db.query('SELECT id, nome, descricao, ordem, ativo FROM tamanho WHERE id = ?', [id]);
  return row;
}

export async function inserirTamanho(t, db = pool) {
  const [r] = await db.query(
    'INSERT INTO tamanho (nome, descricao, ordem, ativo) VALUES (?, ?, ?, ?)',
    [t.nome, t.descricao, t.ordem, t.ativo],
  );
  return r.insertId;
}

export async function atualizarTamanho(id, t, db = pool) {
  await db.query('UPDATE tamanho SET nome = ?, descricao = ?, ordem = ?, ativo = ? WHERE id = ?', [
    t.nome, t.descricao, t.ordem, t.ativo, id,
  ]);
}

export async function inserirTipoReceita(nome, db = pool) {
  const [r] = await db.query('INSERT INTO tipo_receita (nome) VALUES (?)', [nome]);
  return r.insertId;
}
