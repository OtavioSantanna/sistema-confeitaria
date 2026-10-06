import { useEffect, useState } from 'react';
import { auxiliares } from '../api/index.js';

// Dados de referência que quase não mudam: carregados uma vez e reaproveitados.
const cache = {};
function usarCache(chave, fn) {
  const [dados, setDados] = useState(cache[chave]?.valor ?? null);
  useEffect(() => {
    if (cache[chave]?.valor) return;
    cache[chave] ??= { promessa: fn().then((v) => (cache[chave].valor = v)) };
    cache[chave].promessa.then(setDados).catch(() => delete cache[chave]);
  }, [chave, fn]);
  return dados;
}

export const useUnidades = () => usarCache('unidades', auxiliares.unidades);
export const useTiposReceita = () => usarCache('tipos', auxiliares.tiposReceita);
export const useTamanhos = () => usarCache('tamanhos', auxiliares.tamanhos);

// Unidades que fazem sentido para um ingrediente: mesma grandeza da unidade
// de estoque + unidades com conversão cadastrada (ex.: xícara de farinha).
export function unidadesCompativeis(unidades, ingrediente) {
  if (!unidades || !ingrediente) return [];
  const estoque = unidades.find((u) => u.id === ingrediente.unidadeEstoqueId);
  const comConversao = new Set((ingrediente.conversoes ?? []).map((c) => c.unidadeId));
  return unidades.filter((u) => u.grandeza === estoque?.grandeza || comConversao.has(u.id));
}
