import { pool } from '../database/pool.js';

export async function listar({ busca, tipo, ativo } = {}, db = pool) {
  const [rows] = await db.query(
    `SELECT id, nome, descricao, tipo, modo_calculo, preco_base, ativo, atualizado_em
       FROM produto
      WHERE (? IS NULL OR nome LIKE ?)
        AND (? IS NULL OR tipo = ?)
        AND (? IS NULL OR ativo = ?)
      ORDER BY nome`,
    [busca ?? null, `%${busca ?? ''}%`, tipo ?? null, tipo ?? null, ativo ?? null, ativo ?? null],
  );
  return rows;
}

export async function buscar(id, db = pool) {
  const [[row]] = await db.query(
    `SELECT id, nome, descricao, tipo, modo_calculo, preco_base, ativo, criado_em, atualizado_em
       FROM produto WHERE id = ?`,
    [id],
  );
  return row;
}

export async function listarTamanhos(produtoId, db = pool) {
  const [rows] = await db.query(
    `SELECT pt.tamanho_id, t.nome AS tamanho, pt.preco
       FROM produto_tamanho pt JOIN tamanho t ON t.id = pt.tamanho_id
      WHERE pt.produto_id = ? ORDER BY t.ordem, t.nome`,
    [produtoId],
  );
  return rows;
}

export async function listarComponentes(produtoIds, db = pool) {
  if (!produtoIds.length) return [];
  const [rows] = await db.query(
    `SELECT id, produto_id, nome, obrigatorio, quantidade_por_unidade, ordem
       FROM produto_componente WHERE produto_id IN (?) ORDER BY produto_id, ordem, id`,
    [produtoIds],
  );
  return rows;
}

export async function listarOpcoes(componenteIds, db = pool) {
  if (!componenteIds.length) return [];
  const [rows] = await db.query(
    `SELECT o.componente_id, o.receita_id, r.nome AS receita, r.ativo AS receita_ativa,
            o.preco_adicional, o.padrao
       FROM produto_componente_opcao o JOIN receita r ON r.id = o.receita_id
      WHERE o.componente_id IN (?) ORDER BY o.componente_id, o.padrao DESC, r.nome`,
    [componenteIds],
  );
  return rows;
}

export async function inserir(p, db = pool) {
  const [r] = await db.query(
    'INSERT INTO produto (nome, descricao, tipo, modo_calculo, preco_base, ativo) VALUES (?, ?, ?, ?, ?, ?)',
    [p.nome, p.descricao, p.tipo, p.modoCalculo, p.precoBase, p.ativo],
  );
  return r.insertId;
}

export async function atualizar(id, p, db = pool) {
  await db.query(
    'UPDATE produto SET nome = ?, descricao = ?, tipo = ?, modo_calculo = ?, preco_base = ?, ativo = ? WHERE id = ?',
    [p.nome, p.descricao, p.tipo, p.modoCalculo, p.precoBase, p.ativo, id],
  );
}

export async function desativar(id, db = pool) {
  await db.query('UPDATE produto SET ativo = FALSE WHERE id = ?', [id]);
}

export async function substituirTamanhos(id, tamanhos, db = pool) {
  await db.query('DELETE FROM produto_tamanho WHERE produto_id = ?', [id]);
  if (tamanhos.length) {
    await db.query('INSERT INTO produto_tamanho (produto_id, tamanho_id, preco) VALUES ?', [
      tamanhos.map((t) => [id, t.tamanhoId, t.preco]),
    ]);
  }
}

export async function inserirComponente(produtoId, c, db = pool) {
  const [r] = await db.query(
    'INSERT INTO produto_componente (produto_id, nome, obrigatorio, quantidade_por_unidade, ordem) VALUES (?, ?, ?, ?, ?)',
    [produtoId, c.nome, c.obrigatorio, c.quantidadePorUnidade, c.ordem],
  );
  return r.insertId;
}

export async function atualizarComponente(id, c, db = pool) {
  await db.query(
    'UPDATE produto_componente SET nome = ?, obrigatorio = ?, quantidade_por_unidade = ?, ordem = ? WHERE id = ?',
    [c.nome, c.obrigatorio, c.quantidadePorUnidade, c.ordem, id],
  );
}

export async function excluirComponentes(ids, db = pool) {
  if (ids.length) await db.query('DELETE FROM produto_componente WHERE id IN (?)', [ids]);
}

// Componentes já usados em encomendas não podem ser excluídos.
export async function componentesEmUso(ids, db = pool) {
  if (!ids.length) return [];
  const [rows] = await db.query(
    `SELECT DISTINCT c.id, c.nome FROM encomenda_item_componente eic
       JOIN produto_componente c ON c.id = eic.componente_id WHERE eic.componente_id IN (?)`,
    [ids],
  );
  return rows;
}

export async function substituirOpcoes(componenteId, opcoes, db = pool) {
  await db.query('DELETE FROM produto_componente_opcao WHERE componente_id = ?', [componenteId]);
  if (opcoes.length) {
    await db.query(
      'INSERT INTO produto_componente_opcao (componente_id, receita_id, preco_adicional, padrao) VALUES ?',
      [opcoes.map((o) => [componenteId, o.receitaId, o.precoAdicional, o.padrao])],
    );
  }
}

export async function fatoresExistentes(receitaIds, tamanhoIds, db = pool) {
  if (!receitaIds.length || !tamanhoIds.length) return [];
  const [rows] = await db.query(
    'SELECT receita_id, tamanho_id FROM receita_fator_tamanho WHERE receita_id IN (?) AND tamanho_id IN (?)',
    [receitaIds, tamanhoIds],
  );
  return rows;
}
