import { pool } from '../database/pool.js';
import { dec } from '../utils/decimal.js';

// Converte quantidades de qualquer unidade para a unidade de ESTOQUE
// do ingrediente. Ordem:
//   1º conversão específica do ingrediente (ingrediente_conversao)
//   2º mesma grandeza: fator_base(origem) / fator_base(estoque)
//   senão: incompatível (retorna null)
export class Conversor {
  constructor(unidades, ingredientes, conversoes) {
    this.unidades = new Map(unidades.map((u) => [u.id, u]));
    this.ingredientes = new Map(ingredientes.map((i) => [i.id, i]));
    this.conversoes = new Map(conversoes.map((c) => [`${c.ingrediente_id}:${c.unidade_id}`, c.quantidade]));
  }

  // Quanto 1 <unidadeId> vale na unidade de estoque do ingrediente.
  fator(ingredienteId, unidadeId) {
    const ing = this.ingredientes.get(ingredienteId);
    if (!ing) return null;
    const especifica = this.conversoes.get(`${ingredienteId}:${unidadeId}`);
    if (especifica != null) return dec(especifica);
    const origem = this.unidades.get(unidadeId);
    const estoque = this.unidades.get(ing.unidade_estoque_id);
    if (!origem || !estoque || origem.grandeza !== estoque.grandeza) return null;
    return dec(origem.fator_base).div(estoque.fator_base);
  }

  paraEstoque(ingredienteId, quantidade, unidadeId) {
    const f = this.fator(ingredienteId, unidadeId);
    return f == null ? null : dec(quantidade).mul(f);
  }

  unidade(id) {
    return this.unidades.get(id);
  }

  ingrediente(id) {
    return this.ingredientes.get(id);
  }
}

// Carrega o necessário para converter os ingredientes informados.
export async function carregarConversor(ingredienteIds, db = pool) {
  const ids = [...new Set(ingredienteIds)];
  const [unidades] = await db.query('SELECT id, codigo, grandeza, fator_base, casas_decimais FROM unidade_medida');
  if (!ids.length) return new Conversor(unidades, [], []);
  const [ingredientes] = await db.query(
    'SELECT id, nome, unidade_estoque_id FROM ingrediente WHERE id IN (?)',
    [ids],
  );
  const [conversoes] = await db.query(
    'SELECT ingrediente_id, unidade_id, quantidade FROM ingrediente_conversao WHERE ingrediente_id IN (?)',
    [ids],
  );
  return new Conversor(unidades, ingredientes, conversoes);
}
